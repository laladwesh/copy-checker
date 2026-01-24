import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // Import Link for internal navigation
import api from '../services/api';
import Modal from '../components/Modal'; // Assuming Modal.jsx is in src/components
import {
  ClipboardDocumentListIcon,
  ClockIcon,
  QuestionMarkCircleIcon,
  EyeIcon, // For view PDF
  PencilSquareIcon // For Check/Mark
} from '@heroicons/react/24/outline';

export default function ExaminerPanel() {
  // --- State for Modals ---
  const [isPendingCopiesModalOpen, setIsPendingCopiesModalOpen] = useState(false);
  const [isCheckedHistoryModalOpen, setIsCheckedHistoryModalOpen] = useState(false);

  // --- Data States ---
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState(''); // Global message for toasts/alerts

  // --- Load initial data on mount ---
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [pendingRes, historyRes] = await Promise.all([
        api.get('/examiner/copies/pending'),
        api.get('/examiner/copies/history')
      ]);
      setPending(pendingRes.data);
      setHistory(historyRes.data);
    } catch (error) {
      console.error("Error fetching initial data:", error);
      showMessage(`Error loading data: ${error.message}`, 'error');
    }
  };

  // --- Message/Toast Handler ---
  const showMessage = (msg, type = 'success') => {
      setMessage(msg);
      // Optionally clear message after some time
      // setTimeout(() => setMessage(''), 5000);
  };


  return (
    <div className="p-8 space-y-8 bg-white min-h-screen font-sans" style={{fontFamily: 'Dosis, sans-serif'}}>
      <h1 className="text-5xl font-bold text-gray-900 text-center mb-12 tracking-tight">
        Examiner Dashboard
      </h1>

      {/* Global Message/Toast */}
      {message && (
        <div className={`p-4 rounded-lg text-center font-bold ${
            message.includes('Error') ? 'bg-white text-gray-900 border-2 border-gray-900' : 'bg-white text-gray-900 border-2 border-gray-900'
        } mb-8`}>
          {message}
        </div>
      )}

      {/* Feature Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Pending Copies Card */}
        <div className="bg-white p-8 rounded-xl border-2 border-gray-900 hover:bg-gray-50 transition-all duration-300  flex flex-col items-center justify-center text-center">
          <ClipboardDocumentListIcon className="h-16 w-16 text-gray-900 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Pending Copies</h2>
          <p className="text-gray-600 mb-6 font-bold">Copies assigned to you that are awaiting evaluation.</p>
          <button
            onClick={() => setIsPendingCopiesModalOpen(true)}
            className="w-full bg-gray-900 hover:bg-[#1e3a8a] text-white font-bold py-3 px-6 rounded-lg transition duration-200 text-lg"
          >
            View Pending ({pending.length})
          </button>
        </div>

        {/* Checked History Card */}
        <div className="bg-white p-8 rounded-xl border-2 border-gray-900 hover:bg-gray-50 transition-all duration-300 flex flex-col items-center justify-center text-center">
          <ClockIcon className="h-16 w-16 text-gray-900 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Checked History</h2>
          <p className="text-gray-600 mb-6 font-bold">Review copies you have already evaluated.</p>
          <button
            onClick={() => setIsCheckedHistoryModalOpen(true)}
            className="w-full bg-gray-900 hover:bg-[#1e3a8a] text-white font-bold py-3 px-6 rounded-lg transition duration-200 text-lg"
          >
            View History ({history.length})
          </button>
        </div>

        {/* Manage Queries Card (New Page) */}
        <div className="bg-white p-8 rounded-xl border-2 border-gray-900 hover:bg-gray-50 transition-all duration-300 flex flex-col items-center justify-center text-center">
          <QuestionMarkCircleIcon className="h-16 w-16 text-gray-900 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Manage Queries</h2>
          <p className="text-gray-600 mb-6 font-bold">Respond to student queries about their marked copies.</p>
          <Link
            to="/examiner/queries" // Link to the new ExaminerQueries page
            className="w-full bg-gray-900 hover:bg-[#1e3a8a] text-white font-bold py-3 px-6 rounded-lg transition duration-200 text-lg flex items-center justify-center"
          >
            <QuestionMarkCircleIcon className="h-5 w-5 mr-2" /> View Queries
          </Link>
        </div>
      </div>

      {/* --- Modals --- */}

      {/* Pending Copies Modal */}
      <Modal
        isOpen={isPendingCopiesModalOpen}
        onClose={() => setIsPendingCopiesModalOpen(false)}
        title="Pending Copies for Evaluation"
      >
        {pending.length === 0 ? (
          <p className="text-gray-600 text-center py-4 font-bold">You have no pending copies to evaluate. Great job!</p>
        ) : (
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y-2 divide-gray-900">
              <thead className="bg-white border-b-2 border-gray-900">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Candidate (Anonymous)</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Paper</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y-2 divide-gray-900">
                {pending.map(c => (
                  <tr key={c._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">Anonymous</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">{c.questionPaper?.title || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold space-x-2">
                      <a
                        href={c.driveFile?.id ? `/api/drive/pdf/${c.driveFile.id}` : '#'} // Use internal API endpoint
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1 border-2 border-gray-900 text-sm font-bold rounded-md text-gray-900 bg-white hover:bg-gray-900 hover:text-white focus:outline-none transition"
                      >
                        <EyeIcon className="h-4 w-4 mr-1" /> View PDF
                      </a>
                      <Link
                        to={`/examiner/check/${c._id}`} // Use Link for internal navigation
                        target="_blank" // Open in new tab as before, but using Link
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1 border-2 border-gray-900 text-sm font-bold rounded-md text-white bg-gray-900 hover:bg-[#1e3a8a] focus:outline-none transition"
                      >
                        <PencilSquareIcon className="h-4 w-4 mr-1" /> Check Copy
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* Checked History Modal */}
      <Modal
        isOpen={isCheckedHistoryModalOpen}
        onClose={() => setIsCheckedHistoryModalOpen(false)}
        title="Evaluated Copies History"
      >
        {history.length === 0 ? (
          <p className="text-gray-600 text-center py-4 font-bold">No evaluated copies in your history.</p>
        ) : (
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y-2 divide-gray-900">
              <thead className="bg-white border-b-2 border-gray-900">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Candidate (Anonymous)</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Paper</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">View</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y-2 divide-gray-900">
                {history.map(c => (
                  <tr key={c._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">Anonymous</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">{c.questionPaper?.title || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-bold rounded-full ${
                        c.status === 'completed' ? 'bg-white text-gray-900 border-2 border-gray-900' : 'bg-white text-gray-900 border-2 border-gray-900'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold">
                      <a
                        href={`/examiner/copies/view/${c._id}` || '#'}
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1 border-2 border-gray-900 text-sm font-bold rounded-md text-gray-900 bg-white hover:bg-gray-900 hover:text-white focus:outline-none transition"
                      >
                        <EyeIcon className="h-4 w-4 mr-1" /> View PDF
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
}