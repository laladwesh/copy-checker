import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ClockIcon, 
  ChartBarIcon, 
  ArrowPathIcon,
  BellAlertIcon,
  CpuChipIcon,
  Cog6ToothIcon,
  CalendarDaysIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

export default function AdminAllocationGuide() {
  return (
    <div className="min-h-screen bg-white py-8 px-4" style={{fontFamily: 'Dosis, sans-serif'}}>
      <div className="max-w-full mx-auto">
        
        {/* Header */}
        <div className="bg-white rounded-lg border-2 border-gray-900 p-8 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Smart Copy Reallocation System</h1>
              <p className="text-gray-700 mt-2 font-semibold">Complete guide to automated examiner workload management and performance-based allocation</p>
            </div>
            <Link to="/admin" className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 font-bold">Admin Dashboard</Link>
          </div>
        </div>

        {/* Overview */}
        <div className="bg-white rounded-lg border-2 border-gray-900 p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <CpuChipIcon className="h-6 w-6 mr-2" />
            System Overview
          </h2>
          <p className="text-gray-700 font-semibold leading-relaxed mb-4">
            The Smart Reallocation System prevents copies from sitting idle by automatically monitoring examiner activity, 
            scoring examiner performance, and redistributing work to faster, more reliable examiners. The system runs 
            continuously in the background with scheduled jobs and provides manual controls for administrators.
          </p>
          <div className="bg-gray-100 border-2 border-gray-900 rounded-lg p-4">
            <h3 className="font-bold text-gray-900 mb-2">Key Benefits</h3>
            <ul className="list-disc list-inside text-gray-700 font-semibold space-y-1">
              <li>Prevents answer copies from becoming idle for extended periods</li>
              <li>Automatically reassigns copies from slow or inactive examiners</li>
              <li>Rewards high-performing examiners with more work</li>
              <li>Sends email warnings before reassignment occurs</li>
              <li>Maintains detailed performance metrics for all examiners</li>
            </ul>
          </div>
        </div>

        {/* Performance Scoring Section */}
        <div className="bg-white rounded-lg border-2 border-gray-900 p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <ChartBarIcon className="h-6 w-6 mr-2" />
            Performance Scoring Algorithm
          </h2>
          <p className="text-gray-700 font-semibold mb-4">
            Each examiner receives a performance score (0-100) calculated from multiple weighted factors:
          </p>
          
          <div className="space-y-4">
            <ScoreComponent 
              title="Completion Rate (40% weight)"
              formula="(totalCopiesEvaluated / totalCopiesAssigned) × 100"
              description="Percentage of assigned copies that have been successfully evaluated. Higher completion rates indicate reliability."
              example="If examiner completed 80 out of 100 copies: (80/100) × 100 = 80 points × 0.4 = 32 points"
            />
            
            <ScoreComponent 
              title="Speed Score (30% weight)"
              formula="max(0, 100 - (averageCheckingTimeHours × 2))"
              description="Faster examiners score higher. Each hour of average checking time reduces the score by 2 points."
              example="If average time is 10 hours: 100 - (10 × 2) = 80 points × 0.3 = 24 points"
            />
            
            <ScoreComponent 
              title="Reliability Score (20% weight)"
              formula="max(0, 100 - (reassignmentCount × 5))"
              description="Penalizes examiners who have had copies reassigned away from them. Each reassignment costs 5 points."
              example="If 3 copies were reassigned: 100 - (3 × 5) = 85 points × 0.2 = 17 points"
            />
            
            <ScoreComponent 
              title="Activity Score (10% weight)"
              formula="100 if active in last 7 days, else 50"
              description="Recent activity boosts score. Examiners active within the last week get full points."
              example="Active yesterday: 100 × 0.1 = 10 points. Inactive 10 days: 50 × 0.1 = 5 points"
            />
          </div>

          <div className="mt-6 bg-gray-900 text-white rounded-lg p-4">
            <h3 className="font-bold mb-2">Final Performance Score Example</h3>
            <p className="text-sm font-semibold">
              Completion (32) + Speed (24) + Reliability (17) + Activity (10) = <span className="text-xl font-bold">83/100</span>
            </p>
          </div>
        </div>

        {/* Copy Distribution Section */}
        <div className="bg-white rounded-lg border-2 border-gray-900 p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <ArrowPathIcon className="h-6 w-6 mr-2" />
            Smart Distribution Algorithm
          </h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-gray-900 mb-2">Capacity Calculation</h3>
              <div className="bg-gray-100 border-2 border-gray-900 rounded-lg p-4">
                <code className="text-sm font-bold text-gray-900">
                  examinerCapacity = max(1, Math.floor((performanceScore / 20) - currentWorkload))
                </code>
                <p className="text-gray-700 font-semibold mt-2">
                  Higher performance scores allow more concurrent copies. Current workload reduces available capacity.
                </p>
                <div className="mt-3 space-y-1 text-sm text-gray-700 font-semibold">
                  <p>• Performance score 100 with 0 workload → capacity = 5 copies</p>
                  <p>• Performance score 80 with 2 current copies → capacity = 2 copies</p>
                  <p>• Performance score 40 with 1 current copy → capacity = 1 copy</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-2">Distribution Process</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-700 font-semibold">
                <li>System retrieves all active examiners assigned to the exam</li>
                <li>Calculates current performance score and capacity for each examiner</li>
                <li>Sorts examiners by performance score (highest first)</li>
                <li>Distributes copies round-robin based on available capacity</li>
                <li>Updates examiner stats and copy assignment timestamps</li>
                <li>Sends email notifications to newly assigned examiners</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Auto Reallocation Section */}
        <div className="bg-white rounded-lg border-2 border-gray-900 p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <ClockIcon className="h-6 w-6 mr-2" />
            Automatic Reallocation Parameters
          </h2>
          
          <div className="space-y-4">
            <ParameterCard
              name="Idle Threshold"
              value="24 hours"
              description="If a copy remains untouched (not examined) for 24 hours after assignment, it becomes eligible for reallocation."
              impact="Copies exceeding this threshold are automatically reassigned to available examiners."
            />
            
            <ParameterCard
              name="Warning Threshold"
              value="12 hours"
              description="When a copy has been idle for 12 hours, the assigned examiner receives a warning email notification."
              impact="Gives examiners advance notice before their copies are reassigned. No action taken yet."
            />
            
            <ParameterCard
              name="Peak Hours Idle Threshold"
              value="12 hours (during 9 AM - 6 PM)"
              description="During peak working hours (9 AM to 6 PM), the idle threshold is reduced to 12 hours for faster turnaround."
              impact="More aggressive reallocation during business hours to maximize productivity."
            />
            
            <ParameterCard
              name="Peak Hours Warning Threshold"
              value="6 hours (during 9 AM - 6 PM)"
              description="During peak hours, warning emails are sent after just 6 hours of inactivity."
              impact="Earlier warnings during high-activity periods."
            />
          </div>

          <div className="mt-6 bg-yellow-50 border-2 border-yellow-600 rounded-lg p-4">
            <h3 className="font-bold text-yellow-900 mb-2 flex items-center">
              <BellAlertIcon className="h-5 w-5 mr-2" />
              Warning System
            </h3>
            <p className="text-sm text-yellow-900 font-semibold">
              Before any copy is reassigned, the system sends an email warning to the examiner. If the examiner 
              begins working on the copy (status changes to "examining") before the idle threshold, reallocation 
              is cancelled. Multiple warnings increase the examiner's warningCount, which affects future assignments.
            </p>
          </div>
        </div>

        {/* Scheduled Jobs Section */}
        <div className="bg-white rounded-lg border-2 border-gray-900 p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <CalendarDaysIcon className="h-6 w-6 mr-2" />
            Scheduled Background Jobs
          </h2>
          
          <div className="space-y-4">
            <JobCard
              name="Hourly Auto-Reallocation"
              schedule="Every hour (*/60 * * * *)"
              action="Checks for idle copies and reallocates using 24hr idle / 12hr warning thresholds"
              parameters="idleThreshold: 24 hours, warningThreshold: 12 hours"
            />
            
            <JobCard
              name="Peak Hours Aggressive Reallocation"
              schedule="Every 2 hours during 9 AM - 6 PM (0 */2 9-18 * * *)"
              action="More aggressive reallocation during business hours using reduced thresholds"
              parameters="idleThreshold: 12 hours, warningThreshold: 6 hours"
            />
            
            <JobCard
              name="Examiner Stats Update"
              schedule="Every 6 hours (0 */6 * * *)"
              action="Recalculates performance scores and stats for all examiners based on current copy data"
              parameters="Updates: completion rate, average time, reassignment count, performance score"
            />
            
            <JobCard
              name="Daily Performance Report"
              schedule="Daily at 8:00 AM (0 8 * * *)"
              action="Generates summary report of idle copies, pending reassignments, and examiner performance"
              parameters="Can be configured to send email digest to administrators"
            />
          </div>
        </div>

        {/* Data Tracking Section */}
        <div className="bg-white rounded-lg border-2 border-gray-900 p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <Cog6ToothIcon className="h-6 w-6 mr-2" />
            Tracked Data & Timestamps
          </h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="border-2 border-gray-900 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 mb-3">Copy-Level Tracking</h3>
              <ul className="space-y-2 text-sm text-gray-700 font-semibold">
                <li><strong>assignedAt:</strong> Timestamp when copy was assigned to examiner</li>
                <li><strong>evaluationStartedAt:</strong> When examiner first opened/edited the copy</li>
                <li><strong>lastUpdatedByExaminer:</strong> Most recent activity timestamp</li>
                <li><strong>evaluationCompletedAt:</strong> When examiner marked copy as complete</li>
                <li><strong>reassignmentCount:</strong> Number of times copy has been reassigned</li>
              </ul>
            </div>
            
            <div className="border-2 border-gray-900 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 mb-3">Examiner Stats Tracking</h3>
              <ul className="space-y-2 text-sm text-gray-700 font-semibold">
                <li><strong>totalCopiesAssigned:</strong> Lifetime assigned copies</li>
                <li><strong>totalCopiesEvaluated:</strong> Successfully completed copies</li>
                <li><strong>totalCopiesReassigned:</strong> Copies taken away due to inactivity</li>
                <li><strong>averageCheckingTimeHours:</strong> Mean time from assignment to completion</li>
                <li><strong>currentWorkload:</strong> Number of pending copies right now</li>
                <li><strong>performanceScore:</strong> Calculated score (0-100)</li>
                <li><strong>lastActiveAt:</strong> Most recent examiner activity</li>
                <li><strong>warningCount:</strong> Number of warnings received</li>
                <li><strong>isActive:</strong> Boolean flag for examiner availability</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Admin Controls Section */}
        <div className="bg-white rounded-lg border-2 border-gray-900 p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <ShieldCheckIcon className="h-6 w-6 mr-2" />
            Manual Admin Controls
          </h2>
          
          <div className="space-y-3">
            <ControlCard
              endpoint="POST /api/admin/exams/:examId/smart-distribute"
              name="Smart Distribute Copies"
              description="Manually trigger intelligent distribution of unassigned copies to examiners based on performance scores."
              body='{ "copyIds": ["id1", "id2", ...] }'
            />
            
            <ControlCard
              endpoint="POST /api/admin/auto-reallocate"
              name="Trigger Auto Reallocation"
              description="Immediately run the reallocation algorithm with custom thresholds instead of waiting for scheduled job."
              body='{ "idleThresholdHours": 24, "warningThresholdHours": 12 }'
            />
            
            <ControlCard
              endpoint="POST /api/admin/copies/:copyId/reallocate"
              name="Manual Copy Reallocation"
              description="Manually reassign a specific copy from one examiner to another, bypassing automatic logic."
              body='{ "newExaminerId": "examiner_id" }'
            />
            
            <ControlCard
              endpoint="POST /api/admin/examiners/:examinerId/update-stats"
              name="Update Examiner Stats"
              description="Force recalculation of an individual examiner's performance score and statistics."
              body='{ }'
            />
            
            <ControlCard
              endpoint="POST /api/admin/examiners/:examinerId/toggle-active"
              name="Toggle Examiner Active Status"
              description="Enable or disable an examiner from receiving new copy assignments."
              body='{ }'
            />
            
            <ControlCard
              endpoint="GET /api/admin/idle-copies"
              name="Get Idle Copies"
              description="Retrieve list of all copies that have been idle for specified hours."
              body='Query: ?idleHours=24'
            />
            
            <ControlCard
              endpoint="GET /api/admin/examiner-performance"
              name="Get Performance Dashboard"
              description="View detailed performance metrics, scores, and workload for all examiners."
              body='No body required'
            />
          </div>
        </div>

        {/* Email Notifications */}
        <div className="bg-white rounded-lg border-2 border-gray-900 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <BellAlertIcon className="h-6 w-6 mr-2" />
            Email Notification System
          </h2>
          
          <div className="space-y-4">
            <div className="border-2 border-gray-900 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 mb-2">Warning Email (before reallocation)</h3>
              <p className="text-sm text-gray-700 font-semibold mb-2">
                Sent when copy is idle for warning threshold duration (12 hours normal, 6 hours peak)
              </p>
              <div className="bg-gray-100 p-3 rounded">
                <p className="text-xs font-bold text-gray-900">Subject: Warning - Copy Idle for [X] hours</p>
                <p className="text-xs text-gray-700 font-semibold mt-1">
                  Informs examiner their assigned copy has been inactive and will be reassigned if not started soon.
                </p>
              </div>
            </div>
            
            <div className="border-2 border-gray-900 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 mb-2">Reallocation Notice (after reassignment)</h3>
              <p className="text-sm text-gray-700 font-semibold mb-2">
                Sent when copy is reassigned after exceeding idle threshold (24 hours normal, 12 hours peak)
              </p>
              <div className="bg-gray-100 p-3 rounded">
                <p className="text-xs font-bold text-gray-900">Subject: Copy Reassigned - [Copy ID]</p>
                <p className="text-xs text-gray-700 font-semibold mt-1">
                  Notifies old examiner their copy was reassigned and new examiner they have a new assignment.
                </p>
              </div>
            </div>
            
            <div className="border-2 border-gray-900 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 mb-2">Assignment Notification</h3>
              <p className="text-sm text-gray-700 font-semibold mb-2">
                Sent whenever copies are distributed (manually or automatically)
              </p>
              <div className="bg-gray-100 p-3 rounded">
                <p className="text-xs font-bold text-gray-900">Subject: New Copies Assigned</p>
                <p className="text-xs text-gray-700 font-semibold mt-1">
                  Lists newly assigned copies and provides links to begin evaluation.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// --- Reusable Components ---

function ScoreComponent({ title, formula, description, example }) {
  return (
    <div className="border-2 border-gray-900 rounded-lg p-4">
      <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
      <code className="text-sm bg-gray-100 px-2 py-1 rounded text-gray-900 font-bold">{formula}</code>
      <p className="text-sm text-gray-700 font-semibold mt-2">{description}</p>
      <p className="text-xs text-gray-600 font-semibold mt-2 italic">Example: {example}</p>
    </div>
  );
}

function ParameterCard({ name, value, description, impact }) {
  return (
    <div className="border-2 border-gray-900 rounded-lg p-4">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold text-gray-900">{name}</h3>
        <span className="bg-gray-900 text-white px-3 py-1 rounded text-sm font-bold">{value}</span>
      </div>
      <p className="text-sm text-gray-700 font-semibold mb-2">{description}</p>
      <div className="bg-gray-100 p-2 rounded">
        <p className="text-xs text-gray-900 font-bold">Impact: <span className="font-semibold">{impact}</span></p>
      </div>
    </div>
  );
}

function JobCard({ name, schedule, action, parameters }) {
  return (
    <div className="border-2 border-gray-900 rounded-lg p-4">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold text-gray-900">{name}</h3>
        <code className="bg-gray-900 text-white px-2 py-1 rounded text-xs font-bold">{schedule}</code>
      </div>
      <p className="text-sm text-gray-700 font-semibold mb-2">{action}</p>
      <p className="text-xs text-gray-600 font-semibold">Parameters: {parameters}</p>
    </div>
  );
}

function ControlCard({ endpoint, name, description, body }) {
  return (
    <div className="border-2 border-gray-900 rounded-lg p-4">
      <code className="text-xs bg-gray-900 text-white px-2 py-1 rounded font-bold">{endpoint}</code>
      <h3 className="font-bold text-gray-900 mt-2 mb-1">{name}</h3>
      <p className="text-sm text-gray-700 font-semibold mb-2">{description}</p>
      {body && <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-900 font-semibold">{body}</code>}
    </div>
  );
}
