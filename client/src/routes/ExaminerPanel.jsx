import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // Import Link for internal navigation
import api from '../services/api';
import Modal from '../components/Modal'; // Assuming Modal.jsx is in src/components
import ExaminerBankingDetailsForm from '../components/ExaminerBankingDetailsForm';
import {
  ClipboardDocumentListIcon,
  ClockIcon,
  // QuestionMarkCircleIcon, // Available but not currently used
  EyeIcon, // For view PDF
  PencilSquareIcon, // For Check/Mark
  // AcademicCapIcon // Available but not currently used
} from '@heroicons/react/24/outline';

export default function ExaminerPanel() {
  // --- State for Modals ---
  const [isPendingCopiesModalOpen, setIsPendingCopiesModalOpen] = useState(false);
  const [isCheckedHistoryModalOpen, setIsCheckedHistoryModalOpen] = useState(false);

  // --- Data States ---
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState(''); // Global message for toasts/alerts
  const [profileComplete, setProfileComplete] = useState(true); // Track if banking details are complete
  const [loadingProfile, setLoadingProfile] = useState(true); // Loading state for profile check

  // --- Check profile completeness on mount ---
  useEffect(() => {
    const checkProfile = async () => {
      try {
        const res = await api.get('/examiner/profile');
        setProfileComplete(res.data.profileComplete);
      } catch (err) {
        console.error('Error checking profile:', err);
      } finally {
        setLoadingProfile(false);
      }
    };
    checkProfile();
  }, []);

  // --- Load initial data on mount (only if profile is complete) ---
  useEffect(() => {
    if (!profileComplete || loadingProfile) return;
    
    const fetchInitialData = async () => {
      try {
        const [pendingRes, historyRes] = await Promise.all([
          api.get('/examiner/copies/pending'),
          api.get('/examiner/copies/history')
        ]);
        setPending(pendingRes.data);
        setHistory(historyRes.data);
      } catch (err) {
        console.error('Error loading examiner panel data:', err);
        setMessage('Error loading data. Please refresh the page.');
      }
    };
    fetchInitialData();
  }, [profileComplete, loadingProfile]);

  // --- Handle banking form completion ---
  const handleBankingFormComplete = async () => {
    // Refresh profile status
    try {
      const res = await api.get('/examiner/profile');
      setProfileComplete(res.data.profileComplete);
    } catch (err) {
      console.error('Error refreshing profile:', err);
    }
  };

  // --- Message/Toast Handler ---
  // eslint-disable-next-line no-unused-vars
  const showMessage = (msg, type = 'success') => {
      setMessage(msg);
      // Optionally clear message after some time
      // setTimeout(() => setMessage(''), 5000);
  };

  // Show loading state while checking profile
  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-indigo-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // Show banking form if profile is incomplete
  if (!profileComplete) {
    return <ExaminerBankingDetailsForm onComplete={handleBankingFormComplete} />;
  }


  return (
    <div className="p-8 space-y-8 bg-white min-h-screen font-sans" style={{fontFamily: 'Dosis, sans-serif'}}>
      <div className="flex items-center justify-between mb-12">
        <h1 className="text-5xl font-bold text-gray-900 tracking-tight">
          Examiner Dashboard
        </h1>
        {/* <Link
          to="/examiner/instructions"
          className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
        >
          <AcademicCapIcon className="h-5 w-5" />
          <span>Instructions & Help</span>
        </Link> */}
      </div>

      {/* Global Message/Toast */}
      {message && (
        <div className={`p-4 rounded-lg text-center font-bold ${
            message.includes('Error') ? 'bg-white text-gray-900 border-2 border-gray-900' : 'bg-white text-gray-900 border-2 border-gray-900'
        } mb-8`}>
          {message}
        </div>
      )}

      {/* Help Banner for New Examiners */}
      {/* <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-l-4 border-gray-800 rounded-lg p-6 mb-8 shadow-md">
        <div className="flex items-start space-x-4">
          <AcademicCapIcon className="h-8 w-8 text-black flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Welcome! New to the system?
            </h3>
            <p className="text-gray-700 mb-3">
              Learn about your rights, features, and the performance-based allocation system that rewards fast and reliable examiners.
            </p>
            <Link
              to="/examiner/instructions"
              className="inline-flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
            >
              <span>View Complete Instructions</span>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          <button
            onClick={(e) => e.currentTarget.parentElement.parentElement.style.display = 'none'}
            className="text-gray-400 hover:text-gray-600"
            title="Dismiss"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div> */}

      {/* Feature Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
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
        {/* <div className="bg-white p-8 rounded-xl border-2 border-gray-900 hover:bg-gray-50 transition-all duration-300 flex flex-col items-center justify-center text-center">
          <QuestionMarkCircleIcon className="h-16 w-16 text-gray-900 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Manage Queries</h2>
          <p className="text-gray-600 mb-6 font-bold">Respond to student queries about their marked copies.</p>
          <Link
            to="/examiner/queries" // Link to the new ExaminerQueries page
            className="w-full bg-gray-900 hover:bg-[#1e3a8a] text-white font-bold py-3 px-6 rounded-lg transition duration-200 text-lg flex items-center justify-center"
          >
            <QuestionMarkCircleIcon className="h-5 w-5 mr-2" /> View Queries
          </Link>
        </div> */}
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