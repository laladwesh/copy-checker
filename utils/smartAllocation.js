const User = require("../models/User");
const Copy = require("../models/Copy");
const Paper = require("../models/Paper");
const sendEmail = require("./sendEmail");

/**
 * Calculate performance score for an examiner based on various metrics
 * Score range: 0-100 (higher is better)
 */
const calculatePerformanceScore = (examinerStats) => {
  if (!examinerStats) return 50; // Default score for new examiners

  let score = 100;
  
  // Factor 1: Completion Rate (40% weight)
  const completionRate = examinerStats.totalCopiesAssigned > 0 
    ? (examinerStats.totalCopiesEvaluated / examinerStats.totalCopiesAssigned) * 100 
    : 100;
  score = (completionRate * 0.4);
  
  // Factor 2: Speed (30% weight) - Lower average time is better
  // Assuming ideal time is 2 hours per copy, max acceptable is 48 hours
  if (examinerStats.averageCheckingTimeHours > 0) {
    const speedScore = Math.max(0, 100 - ((examinerStats.averageCheckingTimeHours - 2) * 2));
    score += (speedScore * 0.3);
  } else {
    score += 30; // No data yet, give benefit of doubt
  }
  
  // Factor 3: Reliability (20% weight) - Fewer reassignments is better
  const reassignmentPenalty = examinerStats.totalCopiesReassigned * 5; // -5 points per reassignment
  const reliabilityScore = Math.max(0, 100 - reassignmentPenalty);
  score += (reliabilityScore * 0.2);
  
  // Factor 4: Activity (10% weight) - Recent activity is good
  if (examinerStats.lastActiveAt) {
    const hoursSinceActive = (Date.now() - new Date(examinerStats.lastActiveAt)) / (1000 * 60 * 60);
    const activityScore = hoursSinceActive < 24 ? 100 : Math.max(0, 100 - (hoursSinceActive / 24) * 10);
    score += (activityScore * 0.1);
  } else {
    score += 5; // Give some score for new examiners
  }
  
  // Apply warning penalty (-10 points per warning)
  score -= (examinerStats.warningCount || 0) * 10;
  
  return Math.max(0, Math.min(100, score)); // Clamp between 0-100
};

/**
 * Update examiner statistics and performance score
 */
const updateExaminerStats = async (examinerId) => {
  try {
    const examiner = await User.findById(examinerId);
    if (!examiner || examiner.role !== 'examiner') return;

    // Count total copies assigned
    const totalAssigned = await Copy.countDocuments({
      examiners: examinerId
    });

    // Count evaluated copies
    const totalEvaluated = await Copy.countDocuments({
      examiners: examinerId,
      status: 'evaluated'
    });

    // Calculate current workload (pending + examining)
    const currentWorkload = await Copy.countDocuments({
      examiners: examinerId,
      status: { $in: ['pending', 'examining', 're-evaluating'] }
    });

    // Calculate average checking time
    const evaluatedCopies = await Copy.find({
      examiners: examinerId,
      status: 'evaluated',
      assignedAt: { $exists: true },
      evaluationCompletedAt: { $exists: true }
    }).select('assignedAt evaluationCompletedAt');

    let totalCheckingTimeHours = 0;
    let validCopiesCount = 0;

    for (const copy of evaluatedCopies) {
      if (copy.assignedAt && copy.evaluationCompletedAt) {
        const timeInHours = (new Date(copy.evaluationCompletedAt) - new Date(copy.assignedAt)) / (1000 * 60 * 60);
        if (timeInHours > 0 && timeInHours < 720) { // Ignore outliers (> 30 days)
          totalCheckingTimeHours += timeInHours;
          validCopiesCount++;
        }
      }
    }

    const averageCheckingTimeHours = validCopiesCount > 0 
      ? totalCheckingTimeHours / validCopiesCount 
      : 0;

    // Update stats
    examiner.examinerStats = {
      ...examiner.examinerStats,
      totalCopiesAssigned: totalAssigned,
      totalCopiesEvaluated: totalEvaluated,
      currentWorkload: currentWorkload,
      averageCheckingTimeHours: Math.round(averageCheckingTimeHours * 10) / 10,
    };

    // Calculate and update performance score
    examiner.examinerStats.performanceScore = calculatePerformanceScore(examiner.examinerStats);

    await examiner.save();
    return examiner;
  } catch (error) {
    console.error('[ERROR] Error updating examiner stats:', error);
    throw error;
  }
};

/**
 * Smart distribution algorithm that assigns copies based on examiner performance
 * Prioritizes high-performing examiners with lower workload
 */
const smartDistributeCopies = async (examId, copyIds = null) => {
  try {
    const paper = await Paper.findById(examId).populate('assignedExaminers');
    if (!paper || !paper.assignedExaminers || paper.assignedExaminers.length === 0) {
      throw new Error('No examiners assigned to this exam');
    }

    // Get copies to distribute
    let copiesToDistribute;
    if (copyIds && copyIds.length > 0) {
      copiesToDistribute = await Copy.find({
        _id: { $in: copyIds },
        questionPaper: examId,
        status: 'pending'
      });
    } else {
      copiesToDistribute = await Copy.find({
        questionPaper: examId,
        status: 'pending',
        $or: [
          { examiners: { $size: 0 } },
          { examiners: { $exists: false } }
        ]
      });
    }

    if (copiesToDistribute.length === 0) {
      return { message: 'No copies to distribute', assignedCount: 0 };
    }

    // Update stats for all examiners
    for (const examiner of paper.assignedExaminers) {
      await updateExaminerStats(examiner._id);
    }

    // Refresh examiner data with updated stats
    const examiners = await User.find({
      _id: { $in: paper.assignedExaminers.map(e => e._id) },
      'examinerStats.isActive': { $ne: false }
    }).sort({ 'examinerStats.performanceScore': -1, 'examinerStats.currentWorkload': 1 });

    if (examiners.length === 0) {
      throw new Error('No active examiners available');
    }

    // Calculate capacity for each examiner based on performance score
    // Higher performing examiners get more capacity
    const examinerCapacities = examiners.map(examiner => {
      const baseCapacity = 10; // Base number of copies
      const performanceMultiplier = (examiner.examinerStats.performanceScore || 50) / 50; // 0.0 to 2.0
      const workloadFactor = Math.max(0.5, 1 - (examiner.examinerStats.currentWorkload / 20)); // Reduce if already loaded
      return {
        examiner,
        capacity: Math.ceil(baseCapacity * performanceMultiplier * workloadFactor),
        allocated: 0
      };
    });

    // Sort by performance score (highest first)
    examinerCapacities.sort((a, b) => 
      (b.examiner.examinerStats.performanceScore || 50) - (a.examiner.examinerStats.performanceScore || 50)
    );

    let assignedCount = 0;
    let currentExaminerIndex = 0;

    // Distribute copies intelligently
    for (const copy of copiesToDistribute) {
      // Find examiner with available capacity
      let assigned = false;
      let attempts = 0;

      while (!assigned && attempts < examinerCapacities.length) {
        const currentAllocation = examinerCapacities[currentExaminerIndex];
        
        if (currentAllocation.allocated < currentAllocation.capacity) {
          copy.examiners = [currentAllocation.examiner._id];
          copy.assignedAt = new Date();
          copy.status = 'pending';
          await copy.save();

          currentAllocation.allocated++;
          currentAllocation.examiner.examinerStats.currentWorkload++;
          await currentAllocation.examiner.save();

          assignedCount++;
          assigned = true;
        }

        currentExaminerIndex = (currentExaminerIndex + 1) % examinerCapacities.length;
        attempts++;
      }

      // If no examiner has capacity, distribute anyway in round-robin
      if (!assigned) {
        const fallbackExaminer = examinerCapacities[currentExaminerIndex % examinerCapacities.length].examiner;
        copy.examiners = [fallbackExaminer._id];
        copy.assignedAt = new Date();
        await copy.save();
        assignedCount++;
        currentExaminerIndex = (currentExaminerIndex + 1) % examinerCapacities.length;
      }
    }

    return {
      message: `${assignedCount} copies distributed smartly based on examiner performance`,
      assignedCount,
      distributionDetails: examinerCapacities.map(ec => ({
        examinerName: ec.examiner.name,
        performanceScore: ec.examiner.examinerStats.performanceScore,
        copiesAssigned: ec.allocated
      }))
    };

  } catch (error) {
    console.error('[ERROR] Error in smart distribution:', error);
    throw error;
  }
};

/**
 * Auto-reallocate idle copies from slow/inactive examiners
 * This should be run periodically (e.g., every hour)
 */
const autoReallocateIdleCopies = async (idleThresholdHours = 24, warningThresholdHours = 12) => {
  try {
    const results = {
      warned: [],
      reallocated: [],
      errors: []
    };

    // Find copies that are pending/examining for too long
    const idleDate = new Date(Date.now() - idleThresholdHours * 60 * 60 * 1000);
    const warningDate = new Date(Date.now() - warningThresholdHours * 60 * 60 * 1000);

    const idleCopies = await Copy.find({
      status: { $in: ['pending', 'examining'] },
      assignedAt: { $lt: idleDate },
      examiners: { $exists: true, $not: { $size: 0 } }
    }).populate('examiners questionPaper');

    const warningCopies = await Copy.find({
      status: { $in: ['pending', 'examining'] },
      assignedAt: { $lt: warningDate, $gte: idleDate },
      examiners: { $exists: true, $not: { $size: 0 } }
    }).populate('examiners questionPaper');

    // Send warnings for copies approaching idle threshold
    for (const copy of warningCopies) {
      if (copy.examiners && copy.examiners[0]) {
        const examiner = copy.examiners[0];
        const hoursIdle = Math.floor((Date.now() - new Date(copy.assignedAt)) / (1000 * 60 * 60));
        
        try {
          await sendEmail({
            to: examiner.email,
            subject: 'Reminder: Copy Pending for Evaluation',
            html: `
              <h2>Dear ${examiner.name},</h2>
              <p>This is a friendly reminder that you have a copy assigned for evaluation that has been pending for <strong>${hoursIdle} hours</strong>.</p>
              <p><strong>Exam:</strong> ${copy.questionPaper?.title || 'N/A'}</p>
              <p><strong>Copy ID:</strong> ${copy._id}</p>
              <p>Please complete the evaluation soon to avoid automatic reallocation.</p>
              <p><strong>If not checked within ${idleThresholdHours - hoursIdle} hours, this copy will be automatically reassigned to another examiner.</strong></p>
              <p>Thank you for your cooperation!</p>
            `
          });

          // Update warning count
          examiner.examinerStats.warningCount = (examiner.examinerStats.warningCount || 0) + 1;
          await examiner.save();

          results.warned.push({
            copyId: copy._id,
            examinerId: examiner._id,
            examinerName: examiner.name,
            hoursIdle
          });
        } catch (emailError) {
          console.error('[ERROR] Error sending warning email:', emailError);
        }
      }
    }

    // Reallocate idle copies
    for (const copy of idleCopies) {
      if (copy.examiners && copy.examiners[0]) {
        const oldExaminer = copy.examiners[0];
        const paper = copy.questionPaper;

        try {
          // Update old examiner stats
          oldExaminer.examinerStats.totalCopiesReassigned = (oldExaminer.examinerStats.totalCopiesReassigned || 0) + 1;
          oldExaminer.examinerStats.currentWorkload = Math.max(0, (oldExaminer.examinerStats.currentWorkload || 0) - 1);
          oldExaminer.examinerStats.performanceScore = calculatePerformanceScore(oldExaminer.examinerStats);
          await oldExaminer.save();

          // Find best available examiner for reallocation
          const availableExaminers = await User.find({
            _id: { $in: paper.assignedExaminers, $ne: oldExaminer._id },
            role: 'examiner',
            'examinerStats.isActive': { $ne: false }
          }).sort({ 
            'examinerStats.performanceScore': -1,
            'examinerStats.currentWorkload': 1
          }).limit(1);

          if (availableExaminers.length > 0) {
            const newExaminer = availableExaminers[0];
            
            // Reassign copy
            copy.examiners = [newExaminer._id];
            copy.assignedAt = new Date();
            copy.reassignmentCount = (copy.reassignmentCount || 0) + 1;
            copy.status = 'pending';
            await copy.save();

            // Update new examiner stats
            newExaminer.examinerStats.currentWorkload = (newExaminer.examinerStats.currentWorkload || 0) + 1;
            await newExaminer.save();

            // Send notification to old examiner
            try {
              await sendEmail({
                to: oldExaminer.email,
                subject: 'Copy Reassigned Due to Inactivity',
                html: `
                  <h2>Dear ${oldExaminer.name},</h2>
                  <p>A copy assigned to you has been automatically reassigned to another examiner due to prolonged inactivity.</p>
                  <p><strong>Exam:</strong> ${paper?.title || 'N/A'}</p>
                  <p><strong>Copy ID:</strong> ${copy._id}</p>
                  <p><strong>Time idle:</strong> ${Math.floor((Date.now() - new Date(copy.assignedAt)) / (1000 * 60 * 60))} hours</p>
                  <p><strong>This may affect your performance score and future copy allocations.</strong></p>
                  <p>Please ensure timely evaluation of assigned copies.</p>
                `
              });
            } catch (emailError) {
              console.error('[ERROR] Error sending reassignment notification:', emailError);
            }

            // Send notification to new examiner
            try {
              await sendEmail({
                to: newExaminer.email,
                subject: 'New Copy Assigned for Evaluation',
                html: `
                  <h2>Dear ${newExaminer.name},</h2>
                  <p>A new copy has been assigned to you for evaluation.</p>
                  <p><strong>Exam:</strong> ${paper?.title || 'N/A'}</p>
                  <p><strong>Copy ID:</strong> ${copy._id}</p>
                  <p>Please evaluate this copy at your earliest convenience.</p>
                  <p>Login to your dashboard to start checking.</p>
                `
              });
            } catch (emailError) {
              console.error('[ERROR] Error sending new assignment notification:', emailError);
            }

            results.reallocated.push({
              copyId: copy._id,
              fromExaminer: { id: oldExaminer._id, name: oldExaminer.name },
              toExaminer: { id: newExaminer._id, name: newExaminer.name },
              hoursIdle: Math.floor((Date.now() - new Date(copy.assignedAt)) / (1000 * 60 * 60))
            });
          }
        } catch (error) {
          console.error(`[ERROR] Error reallocating copy ${copy._id}:`, error);
          results.errors.push({
            copyId: copy._id,
            error: error.message
          });
        }
      }
    }

    return results;
  } catch (error) {
    console.error('[ERROR] Error in auto-reallocation:', error);
    throw error;
  }
};

/**
 * Manual reallocation - Admin can force reallocate specific copies
 */
const manualReallocate = async (copyId, newExaminerId) => {
  try {
    const copy = await Copy.findById(copyId).populate('examiners questionPaper');
    if (!copy) {
      throw new Error('Copy not found');
    }

    const newExaminer = await User.findById(newExaminerId);
    if (!newExaminer || newExaminer.role !== 'examiner') {
      throw new Error('Invalid examiner');
    }

    const oldExaminer = copy.examiners && copy.examiners[0];

    // Update old examiner stats if exists
    if (oldExaminer) {
      oldExaminer.examinerStats.totalCopiesReassigned = (oldExaminer.examinerStats.totalCopiesReassigned || 0) + 1;
      oldExaminer.examinerStats.currentWorkload = Math.max(0, (oldExaminer.examinerStats.currentWorkload || 0) - 1);
      await oldExaminer.save();
    }

    // Update copy
    copy.examiners = [newExaminerId];
    copy.assignedAt = new Date();
    copy.reassignmentCount = (copy.reassignmentCount || 0) + 1;
    copy.status = 'pending';
    await copy.save();

    // Update new examiner stats
    newExaminer.examinerStats.currentWorkload = (newExaminer.examinerStats.currentWorkload || 0) + 1;
    await newExaminer.save();

    // Send notifications
    if (oldExaminer) {
      try {
        await sendEmail({
          to: oldExaminer.email,
          subject: 'Copy Reassigned by Admin',
          html: `
            <h2>Dear ${oldExaminer.name},</h2>
            <p>A copy has been manually reassigned by an administrator.</p>
            <p><strong>Exam:</strong> ${copy.questionPaper?.title || 'N/A'}</p>
            <p><strong>Copy ID:</strong> ${copy._id}</p>
          `
        });
      } catch (e) {
        console.error('[ERROR] Error sending notification to old examiner:', e);
      }
    }

    try {
      await sendEmail({
        to: newExaminer.email,
        subject: 'New Copy Assigned for Evaluation',
        html: `
          <h2>Dear ${newExaminer.name},</h2>
          <p>A copy has been assigned to you by an administrator.</p>
          <p><strong>Exam:</strong> ${copy.questionPaper?.title || 'N/A'}</p>
          <p><strong>Copy ID:</strong> ${copy._id}</p>
          <p>Please evaluate this copy at your earliest convenience.</p>
        `
      });
    } catch (e) {
      console.error('[ERROR] Error sending notification to new examiner:', e);
    }

    return {
      message: 'Copy reallocated successfully',
      copy,
      fromExaminer: oldExaminer ? { id: oldExaminer._id, name: oldExaminer.name } : null,
      toExaminer: { id: newExaminer._id, name: newExaminer.name }
    };
  } catch (error) {
    console.error('[ERROR] Error in manual reallocation:', error);
    throw error;
  }
};

module.exports = {
  calculatePerformanceScore,
  updateExaminerStats,
  smartDistributeCopies,
  autoReallocateIdleCopies,
  manualReallocate
};
