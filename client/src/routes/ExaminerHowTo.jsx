import React from 'react';
import { Link } from 'react-router-dom';
import { DocumentTextIcon, ClipboardDocumentListIcon, PencilSquareIcon, ClockIcon, ChatBubbleBottomCenterTextIcon } from '@heroicons/react/24/outline';

export default function ExaminerHowTo() {
  return (
    <div className="min-h-screen bg-white py-8 px-4" style={{fontFamily: 'Dosis, sans-serif'}}>
      <div className="max-w-full mx-auto">
        <div className="bg-white rounded-lg border-2 border-gray-900 p-8 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">How to Use — Examiner</h1>
              <p className="text-gray-700 mt-2 font-semibold">Practical step-by-step guide to evaluating copies in the system.</p>
            </div>
            <Link to="/" className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-[#1e3a8a] font-bold">Home</Link>
          </div>
        </div>

        <div className="grid gap-6">
          <section className="bg-white rounded-lg border-2 border-gray-900 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center"><DocumentTextIcon className="h-6 w-6 text-gray-900 mr-2"/>Before You Start</h2>
            <ul className="list-disc list-inside text-gray-700 font-semibold">
              <li>Ensure you are using a stable internet connection and modern browser (Chrome/Edge/Firefox).</li>
              <li>Do not share your account or token. Maintain confidentiality.</li>
              <li>Familiarize yourself with the question paper (available when viewing a copy).</li>
            </ul>
          </section>

          <section className="bg-white rounded-lg border-2 border-gray-900 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center"><ClipboardDocumentListIcon className="h-6 w-6 text-gray-900 mr-2"/>Accessing Your Assigned Copies</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700 font-semibold">
              <li>Open the Examiner Dashboard at <code>/examiner</code>.</li>
              <li>Click <strong>Pending Copies</strong> to view items assigned to you.</li>
              <li>Each copy shows a Copy ID, exam title, and status.</li>
              <li>Click <strong>Check/Mark</strong> to open the copy viewer.</li>
            </ol>
          </section>

          <section className="bg-white rounded-lg border-2 border-gray-900 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center"><PencilSquareIcon className="h-6 w-6 text-gray-900 mr-2"/>Checking & Marking Workflow</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700 font-semibold">
              <li>Reference the question paper panel shown alongside the student answer PDF.</li>
              <li>Navigate pages and enter numeric marks for each page into the provided field.</li>
              <li>Add comments where helpful; use annotations for highlights or corrections.</li>
              <li>Your changes are saved automatically — you can leave and return later.</li>
              <li>When all pages are marked, click <strong>Confirm & Finish</strong> to complete the evaluation.</li>
              <li>Once completed the copy status changes to <code>evaluated</code> and is removed from your pending list.</li>
            </ol>
            <div className="mt-4 bg-gray-100 border border-gray-900 p-3 rounded">
              <p className="font-bold text-gray-900">Timing guidelines</p>
              <p className="text-sm text-gray-700 font-semibold mt-1">Start within 12 hours of assignment to avoid a warning; complete within 24 hours to avoid automatic reassignment.</p>
            </div>
          </section>

          <section className="bg-white rounded-lg border-2 border-gray-900 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center"><ClockIcon className="h-6 w-6 text-gray-900 mr-2"/>Queries & Communication</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700 font-semibold">
              <li>Students can raise queries; admins approve queries for your review.</li>
              <li>Approved queries appear in your <strong>Queries</strong> page.</li>
              <li>Open a query to see the relevant page and provide a clear professional response.</li>
              <li>Submit the reply; the student and admin will receive the response.</li>
            </ol>
          </section>

          <section className="bg-white rounded-lg border-2 border-gray-900 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center"><DocumentTextIcon className="h-6 w-6 text-gray-900 mr-2"/>History & Records</h2>
            <p className="text-gray-700 font-semibold">
              Your evaluated copies are stored in your history. You can review past evaluations in read-only mode to check your decisions and comments.
            </p>
          </section>

          <section className="bg-white rounded-lg border-2 border-gray-900 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3">Troubleshooting</h2>
            <ul className="list-disc list-inside text-gray-700 font-semibold">
              <li>If PDFs do not load, try reloading the page or use the "View PDF" link which uses the backend proxy.</li>
              <li>If auto-save fails briefly, your local changes will retry; contact admin if problems persist.</li>
              <li>For email or notification issues, contact the admin team.</li>
            </ul>
          </section>

          <div className="text-center mt-4">
            <Link to="/examiner" className="inline-block bg-gray-900 text-white px-8 py-4 rounded-lg hover:bg-[#1e3a8a] transition font-bold text-lg">Return to Dashboard</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
