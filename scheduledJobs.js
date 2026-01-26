const cron = require('node-cron');
const { autoReallocateIdleCopies, updateExaminerStats } = require('./utils/smartAllocation');
const User = require('./models/User');

/**
 * Initialize scheduled jobs for copy checking automation
 */
const initializeScheduledJobs = () => {
  console.log('Initializing scheduled jobs for copy checking automation...');

  // Job 1: Auto-reallocate idle copies every hour
  // Runs at minute 0 of every hour
  cron.schedule('0 * * * *', async () => {
    console.log('[Scheduled Job] Running auto-reallocation of idle copies...');
    try {
      const result = await autoReallocateIdleCopies(24, 12); // 24hrs idle, 12hrs warning
      console.log('[SUCCESS] Auto-reallocation completed:', {
        warned: result.warned.length,
        reallocated: result.reallocated.length,
        errors: result.errors.length
      });
    } catch (error) {
      console.error('[ERROR] Error in scheduled auto-reallocation:', error);
    }
  });

  // Job 2: Update all examiner statistics every 6 hours
  // Runs at minute 0 of every 6th hour (00:00, 06:00, 12:00, 18:00)
  cron.schedule('0 */6 * * *', async () => {
    console.log('[SCHEDULED JOB] Updating all examiner statistics...');
    try {
      const examiners = await User.find({ role: 'examiner' });
      let successCount = 0;
      let errorCount = 0;

      for (const examiner of examiners) {
        try {
          await updateExaminerStats(examiner._id);
          successCount++;
        } catch (error) {
          console.error(`[ERROR] Error updating stats for examiner ${examiner._id}:`, error);
          errorCount++;
        }
      }

      console.log(`[SUCCESS] Examiner statistics update completed: ${successCount} success, ${errorCount} errors`);
    } catch (error) {
      console.error('[ERROR] Error in scheduled stats update:', error);
    }
  });

  // Job 3: More aggressive reallocation during peak hours (9 AM to 6 PM)
  // Runs every 2 hours during business hours with stricter thresholds
  cron.schedule('0 9-18/2 * * *', async () => {
    console.log('[SCHEDULED JOB] Running peak-hour aggressive reallocation...');
    try {
      const result = await autoReallocateIdleCopies(12, 6); // 12hrs idle, 6hrs warning (more aggressive)
      console.log(`[SUCCESS] Peak-hour reallocation completed:`, {
        warned: result.warned.length,
        reallocated: result.reallocated.length,
        errors: result.errors.length
      });
    } catch (error) {
      console.error('[ERROR] Error in peak-hour reallocation:', error);
    }
  });

  // Job 4: Daily performance report at 8 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('[SCHEDULED JOB] Generating daily performance report...');
    try {
      const examiners = await User.find({ role: 'examiner' }).select('name email examinerStats');
      
      const report = {
        date: new Date().toLocaleDateString(),
        totalExaminers: examiners.length,
        activeExaminers: examiners.filter(e => e.examinerStats?.isActive !== false).length,
        topPerformers: examiners
          .filter(e => (e.examinerStats?.performanceScore || 0) >= 80)
          .map(e => ({ name: e.name, score: e.examinerStats?.performanceScore })),
        needsAttention: examiners
          .filter(e => (e.examinerStats?.performanceScore || 0) < 50 && (e.examinerStats?.currentWorkload || 0) > 0)
          .map(e => ({ name: e.name, score: e.examinerStats?.performanceScore, workload: e.examinerStats?.currentWorkload })),
      };

      console.log('[REPORT] Daily Performance Report:', JSON.stringify(report, null, 2));
      
      // You can also send this report via email to admins
      // const admins = await User.find({ role: 'admin' });
      // for (const admin of admins) {
      //   await sendEmail({ to: admin.email, subject: 'Daily Performance Report', html: ... });
      // }
      
    } catch (error) {
      console.error('[ERROR] Error generating daily report:', error);
    }
  });

  console.log('[SUCCESS] Scheduled jobs initialized successfully!');
  console.log('[INFO] Active schedules:');
  console.log('   - Auto-reallocation: Every hour');
  console.log('   - Stats update: Every 6 hours');
  console.log('   - Peak-hour aggressive reallocation: Every 2 hours (9 AM - 6 PM)');
  console.log('   - Daily performance report: 8 AM daily');
};

module.exports = { initializeScheduledJobs };
