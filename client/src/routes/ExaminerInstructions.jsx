import React from 'react';
import { Link } from 'react-router-dom';
import {
  AcademicCapIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  ChatBubbleBottomCenterTextIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  UserGroupIcon,
  BoltIcon,
  ChartBarIcon,
  EyeSlashIcon,
  PencilSquareIcon,
  ArrowPathIcon,
  BellAlertIcon,
} from '@heroicons/react/24/outline';

export default function ExaminerInstructions() {
  return (
    <div className="min-h-screen bg-white py-8 px-4" style={{fontFamily: 'Dosis, sans-serif'}}>
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg border-2 border-gray-900 p-8 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <AcademicCapIcon className="h-12 w-12 text-gray-900" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Examiner Guide & Instructions
                </h1>
                <p className="text-gray-600 mt-1 font-semibold">
                  Everything you need to know about checking copies and your rights
                </p>
              </div>
            </div>
            <Link
              to="/examiner"
              className="bg-gray-900 text-white px-6 py-3 rounded-lg hover:bg-[#1e3a8a] transition font-bold"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Quick Overview */}
        <div className="bg-white rounded-lg border-2 border-gray-900 p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <ShieldCheckIcon className="h-7 w-7 text-gray-900 mr-2" />
            Your Role & Rights
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-900">
              <h3 className="font-bold text-gray-900 mb-2">What You CAN Do</h3>
              <ul className="space-y-2 text-sm text-gray-700 font-semibold">
                <li>• View and evaluate assigned answer copies</li>
                <li>• Award marks to individual pages</li>
                <li>• Add comments and annotations</li>
                <li>• Mark copies as complete when finished</li>
                <li>• Respond to student queries (when approved by admin)</li>
                <li>• View your checking history</li>
                <li>• Track your pending copies</li>
              </ul>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-900">
              <h3 className="font-bold text-gray-900 mb-2">What You CANNOT Do</h3>
              <ul className="space-y-2 text-sm text-gray-700 font-semibold">
                <li>• See student names or personal information</li>
                <li>• View copies not assigned to you</li>
                <li>• Edit question papers</li>
                <li>• Delete or remove copies</li>
                <li>• Approve/reject student queries (admin only)</li>
                <li>• Access other examiners' work</li>
                <li>• See your performance score directly</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Performance Tracking Alert */}
        <div className="bg-gray-50 border-2 border-gray-900 rounded-lg p-6 mb-6">
          <div className="flex items-start">
            <BellAlertIcon className="h-8 w-8 text-gray-900 mr-3 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                New: Performance-Based Copy Allocation
              </h2>
              <p className="text-gray-700 mb-3 font-semibold">
                Our system now tracks your checking performance to ensure fair and efficient copy distribution.
              </p>
              <div className="bg-white rounded-lg border border-gray-300 p-4 space-y-2">
                <div className="flex items-center space-x-2">
                  <ClockIcon className="h-5 w-5 text-gray-900" />
                  <span className="text-sm font-bold">Your checking speed is monitored</span>
                </div>
                <div className="flex items-center space-x-2">
                  <ChartBarIcon className="h-5 w-5 text-gray-900" />
                  <span className="text-sm font-bold">Fast & reliable examiners get more copies</span>
                </div>
                <div className="flex items-center space-x-2">
                  <ExclamationTriangleIcon className="h-5 w-5 text-gray-900" />
                  <span className="text-sm font-bold">Idle copies (greater than 12hrs) trigger warnings</span>
                </div>
                <div className="flex items-center space-x-2">
                  <ArrowPathIcon className="h-5 w-5 text-gray-900" />
                  <span className="text-sm font-bold">Copies idle greater than 24hrs are automatically reassigned</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Features */}
        <div className="bg-white rounded-lg border-2 border-gray-900 p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <ClipboardDocumentCheckIcon className="h-7 w-7 text-gray-900 mr-2" />
            Main Features & How to Use Them
          </h2>

          <div className="space-y-6">
            {/* Feature 1: Pending Copies */}
            <div className="border-l-4 border-gray-900 pl-4 py-2">
              <h3 className="text-xl font-semibold text-gray-900 mb-2 flex items-center">
                <ClipboardDocumentCheckIcon className="h-6 w-6 text-gray-900 mr-2" />
                1. Pending Copies - Your Active Work
              </h3>
              <p className="text-gray-700 mb-3 font-semibold">
                View all copies currently assigned to you that need checking.
              </p>
              <div className="bg-gray-50 rounded-lg border border-gray-300 p-4 space-y-2">
                <p className="font-bold text-gray-900">How to use:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700 font-semibold">
                  <li>Click "Pending Copies" on your dashboard</li>
                  <li>See list of all copies waiting for evaluation</li>
                  <li>Click "Check/Mark" to start evaluating a copy</li>
                  <li>Click "View PDF" to preview without marking</li>
                </ol>
                <div className="bg-gray-100 border-2 border-gray-900 rounded p-3 mt-3">
                  <p className="text-sm text-gray-900 font-bold">
                    <strong>Time Matters:</strong> Start checking within 12 hours to avoid warnings. 
                    Complete within 24 hours to prevent automatic reassignment.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 2: Copy Checking */}
            <div className="border-l-4 border-gray-900 pl-4 py-2">
              <h3 className="text-xl font-semibold text-gray-900 mb-2 flex items-center">
                <PencilSquareIcon className="h-6 w-6 text-gray-900 mr-2" />
                2. Checking & Marking Copies
              </h3>
              <p className="text-gray-700 mb-3 font-semibold">
                Evaluate answer copies page by page with annotations and marks.
              </p>
              <div className="bg-gray-50 rounded-lg border border-gray-300 p-4 space-y-2">
                <p className="font-bold text-gray-900">Step-by-step process:</p>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 font-semibold">
                  <li><strong>View Question Paper:</strong> Reference material is shown side-by-side</li>
                  <li><strong>Navigate Pages:</strong> Use page navigation to check each page</li>
                  <li><strong>Award Marks:</strong> Enter marks for each page (numeric values)</li>
                  <li><strong>Add Comments:</strong> Provide feedback or notes (optional)</li>
                  <li><strong>Use Annotations:</strong> Draw marks, highlights, or corrections on the PDF</li>
                  <li><strong>Save Progress:</strong> Your work is saved automatically</li>
                  <li><strong>Complete Check:</strong> Click "Confirm & Finish" when all pages are marked</li>
                </ol>
                <div className="bg-gray-100 border-2 border-gray-900 rounded p-3 mt-3">
                  <p className="text-sm text-gray-900 font-bold">
                    <strong>Pro Tip:</strong> You can save your progress and return later. The copy 
                    status changes to "Examining" so admins know you're working on it.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 3: Student Anonymity */}
            <div className="border-l-4 border-gray-900 pl-4 py-2">
              <h3 className="text-xl font-semibold text-gray-900 mb-2 flex items-center">
                <EyeSlashIcon className="h-6 w-6 text-gray-900 mr-2" />
                3. Student Anonymity Protection
              </h3>
              <p className="text-gray-700 mb-3 font-semibold">
                All copies are completely anonymous to ensure fair evaluation.
              </p>
              <div className="bg-gray-50 rounded-lg border border-gray-300 p-4 space-y-2">
                <p className="font-bold text-gray-900">What this means:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 font-semibold">
                  <li>You cannot see student names, email, or any personal information</li>
                  <li>Each copy is identified only by Copy ID</li>
                  <li>This ensures unbiased, merit-based evaluation</li>
                  <li>Student details are revealed to them after evaluation is complete</li>
                </ul>
              </div>
            </div>

            {/* Feature 4: Queries */}
            <div className="border-l-4 border-gray-900 pl-4 py-2">
              <h3 className="text-xl font-semibold text-gray-900 mb-2 flex items-center">
                <ChatBubbleBottomCenterTextIcon className="h-6 w-6 text-gray-900 mr-2" />
                4. Responding to Student Queries
              </h3>
              <p className="text-gray-700 mb-3 font-semibold">
                Students can raise queries about their evaluation, which admins approve for your review.
              </p>
              <div className="bg-gray-50 rounded-lg border border-gray-300 p-4 space-y-2">
                <p className="font-bold text-gray-900">Query workflow:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700 font-semibold">
                  <li>Student raises a query (e.g., "Why marks deducted on page 3?")</li>
                  <li>Admin reviews and approves it for examiner response</li>
                  <li>You see approved queries in your "Queries" section</li>
                  <li>Click on the query to see details and the specific page</li>
                  <li>Provide a clear, professional response</li>
                  <li>Submit your reply - student receives it</li>
                </ol>
                <div className="bg-gray-100 border-2 border-gray-900 rounded p-3 mt-3">
                  <p className="text-sm text-gray-900 font-bold">
                    <strong>Best Practice:</strong> Be specific in your responses. Refer to page numbers 
                    and explain your marking criteria clearly. This reduces follow-up queries.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 5: History */}
            <div className="border-l-4 border-gray-900 pl-4 py-2">
              <h3 className="text-xl font-semibold text-gray-900 mb-2 flex items-center">
                <DocumentTextIcon className="h-6 w-6 text-gray-900 mr-2" />
                5. Checked History - Your Past Work
              </h3>
              <p className="text-gray-700 mb-3 font-semibold">
                Review all copies you have successfully evaluated.
              </p>
              <div className="bg-gray-50 rounded-lg border border-gray-300 p-4 space-y-2">
                <p className="font-bold text-gray-900">Features:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 font-semibold">
                  <li>See complete list of your evaluated copies</li>
                  <li>View exam name, date, and evaluation details</li>
                  <li>Re-open copies to review your marking (read-only)</li>
                  <li>Track your overall contribution</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Performance & Best Practices */}
        <div className="bg-white rounded-lg border-2 border-gray-900 p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <BoltIcon className="h-7 w-7 text-gray-900 mr-2" />
            Performance Tips & Best Practices
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Best Practices */}
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-gray-900">Best Practices</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <CheckCircleIcon className="h-5 w-5 text-gray-900 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-gray-900">Check copies promptly</p>
                    <p className="text-sm text-gray-600 font-semibold">Start within a few hours of assignment</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircleIcon className="h-5 w-5 text-gray-900 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-gray-900">Complete in one session if possible</p>
                    <p className="text-sm text-gray-600 font-semibold">Faster completion = better performance score</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircleIcon className="h-5 w-5 text-gray-900 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-gray-900">Be thorough but efficient</p>
                    <p className="text-sm text-gray-600 font-semibold">Quality matters, but so does speed</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircleIcon className="h-5 w-5 text-gray-900 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-gray-900">Add clear comments</p>
                    <p className="text-sm text-gray-600 font-semibold">Reduces student queries later</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircleIcon className="h-5 w-5 text-gray-900 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-gray-900">Mark all pages before completing</p>
                    <p className="text-sm text-gray-600 font-semibold">System requires complete evaluation</p>
                  </div>
                </div>
              </div>
            </div>

            {/* What Affects Performance */}
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-gray-900">What Affects Your Performance</h3>
              <div className="space-y-3">
                <div className="bg-gray-50 p-3 rounded-lg border-2 border-gray-900">
                  <p className="font-bold text-gray-900">Positive Factors</p>
                  <ul className="text-sm text-gray-700 font-semibold mt-2 space-y-1">
                    <li>• Fast checking time (ideal: 2-4 hours per copy)</li>
                    <li>• High completion rate</li>
                    <li>• Regular activity</li>
                    <li>• Consistent reliability</li>
                  </ul>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg border-2 border-gray-900">
                  <p className="font-bold text-gray-900">Negative Factors</p>
                  <ul className="text-sm text-gray-700 font-semibold mt-2 space-y-1">
                    <li>• Copies idle for more than 12 hours (warnings)</li>
                    <li>• Copies reassigned due to inactivity</li>
                    <li>• Very slow checking time (more than 24 hours)</li>
                    <li>• Incomplete evaluations</li>
                  </ul>
                </div>
                <div className="bg-gray-100 p-3 rounded-lg border border-gray-900">
                  <p className="text-sm text-gray-900 font-bold">
                    <strong>Remember:</strong> Better performers get priority for new copy assignments 
                    and more copies to check, which means more payment opportunities!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Warning System */}
        <div className="bg-white rounded-lg border-2 border-gray-900 p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <ExclamationTriangleIcon className="h-7 w-7 text-gray-900 mr-2" />
            Automated Warning & Reallocation System
          </h2>
          <div className="space-y-4">
            <p className="text-gray-700 font-semibold">
              To ensure fair and timely copy checking, our system monitors copy status and takes automatic actions:
            </p>

            <div className="space-y-3">
              {/* Timeline */}
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-24 text-right">
                  <span className="inline-block bg-gray-50 text-gray-900 border-2 border-gray-900 px-3 py-1 rounded-full text-sm font-bold">
                    0-12 hrs
                  </span>
                </div>
                <div className="flex-1 bg-gray-50 p-3 rounded-lg border-2 border-gray-900">
                  <p className="font-bold text-gray-900">Normal Period</p>
                  <p className="text-sm text-gray-700 font-semibold">Check the copy at your convenience. No warnings.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-24 text-right">
                  <span className="inline-block bg-gray-50 text-gray-900 border-2 border-gray-900 px-3 py-1 rounded-full text-sm font-bold">
                    12-24 hrs
                  </span>
                </div>
                <div className="flex-1 bg-gray-50 p-3 rounded-lg border-2 border-gray-900">
                  <p className="font-bold text-gray-900">Warning Period</p>
                  <p className="text-sm text-gray-700 font-semibold">
                    You'll receive an email reminder. Please complete the copy soon to avoid reassignment.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-24 text-right">
                  <span className="inline-block bg-gray-50 text-gray-900 border-2 border-gray-900 px-3 py-1 rounded-full text-sm font-bold">
                    24+ hrs
                  </span>
                </div>
                <div className="flex-1 bg-gray-50 p-3 rounded-lg border-2 border-gray-900">
                  <p className="font-bold text-gray-900">Auto-Reassignment</p>
                  <p className="text-sm text-gray-700 font-semibold">
                    Copy is automatically reassigned to another examiner. You'll receive a notification. 
                    This affects your performance score and future allocations.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-100 border-2 border-gray-900 p-4 mt-4">
              <p className="text-sm text-gray-900 font-bold">
                <strong>Note:</strong> During peak hours (9 AM - 6 PM), the system uses more aggressive 
                thresholds (6hr warning, 12hr reassignment) to ensure faster processing.
              </p>
            </div>
          </div>
        </div>

        {/* Contact & Support */}
        <div className="bg-white rounded-lg border-2 border-gray-900 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <UserGroupIcon className="h-7 w-7 text-gray-900 mr-2" />
            Need Help?
          </h2>
          <div className="space-y-3 text-gray-700 font-semibold">
            <p>
              If you have questions or encounter any issues:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>Contact the admin team through the proper channels</li>
              <li>Report technical issues immediately</li>
              <li>Raise concerns about copy assignments through official channels</li>
            </ul>
            <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-900 mt-4">
              <p className="font-bold text-gray-900">Remember:</p>
              <p className="text-sm text-gray-700 font-semibold mt-1">
                Your role is crucial in maintaining academic integrity and providing fair evaluations. 
                Work diligently, be responsive, and maintain professionalism in all interactions.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-6 text-center">
          <Link
            to="/examiner"
            className="inline-block bg-gray-900 text-white px-8 py-4 rounded-lg hover:bg-[#1e3a8a] transition font-bold text-lg"
          >
            Go to Your Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
