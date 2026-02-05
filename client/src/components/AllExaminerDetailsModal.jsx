import React, { useState, useEffect } from 'react';
import Modal from './Modal'; // Assuming your generic Modal component
// import api from '../services/api'; // Not directly used in this component, props handle data
import { AcademicCapIcon, ClipboardDocumentCheckIcon, BookOpenIcon, UserCircleIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'; // Added MagnifyingGlassIcon

export default function AllExaminerDetailsModal({ isOpen, onClose, examiners, copies, exams }) {
  // State to store processed examiner stats
  const [examinerStats, setExaminerStats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [examinerSearchTerm, setExaminerSearchTerm] = useState(''); // NEW: State for search term

  // Function to calculate stats
  // This function will run whenever 'examiners', 'copies', or 'exams' props change
  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal is closed
      setExaminerStats([]);
      setIsLoading(true);
      setError(null);
      setExaminerSearchTerm(''); // Reset search term on close
      return;
    }

    if (!examiners || !copies || !exams) {
      setError("Missing data for examiner statistics.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const stats = {};

      // Initialize stats for all examiners
      examiners.forEach(examiner => {
        stats[examiner._id] = {
          _id: examiner._id,
          name: examiner.name,
          email: examiner.email,
          department: examiner.department || 'N/A',
          totalCopiesAssigned: 0,
          totalCopiesEvaluated: 0,
          examDetails: {}, // { examId: { title: "Exam Name", assigned: N, evaluated: M } }
        };
      });

      // Process copies to build detailed stats
      copies.forEach(copy => {
        // Ensure copy.examiners is an array and contains at least one examiner
        if (Array.isArray(copy.examiners) && copy.examiners.length > 0) {
          copy.examiners.forEach(assignedExaminer => {
            // Handle both populated examiner objects and just their IDs
            const examinerId = assignedExaminer._id ? assignedExaminer._id.toString() : assignedExaminer.toString();

            if (stats[examinerId]) { // Ensure the examiner is in our initial list
              stats[examinerId].totalCopiesAssigned++;

              // Only count as 'evaluated' if the copy status is explicitly 'evaluated'
              if (copy.status === 'evaluated') {
                stats[examinerId].totalCopiesEvaluated++;
              }

              const examId = copy.questionPaper?._id;
              if (examId) {
                const examTitle = exams.find(e => e._id === examId)?.title || 'Unknown Exam';

                if (!stats[examinerId].examDetails[examId]) {
                  stats[examinerId].examDetails[examId] = {
                    title: examTitle,
                    assigned: 0,
                    evaluated: 0,
                  };
                }
                stats[examinerId].examDetails[examId].assigned++;
                if (copy.status === 'evaluated') {
                  stats[examinerId].examDetails[examId].evaluated++;
                }
              }
            }
          });
        }
      });

      // Convert the stats object to an array for rendering
      setExaminerStats(Object.values(stats));
    } catch (err) {
      console.error("Error calculating examiner stats:", err);
      setError("Failed to calculate examiner statistics.");
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, examiners, copies, exams]); // Re-run effect if these props change

  // Filter examiner stats based on search term (guard missing fields)
  const _term = (examinerSearchTerm || "").toLowerCase().trim();
  const filteredExaminerStats = _term
    ? examinerStats.filter((examiner) => {
        const name = String(examiner?.name || "").toLowerCase();
        const email = String(examiner?.email || "").toLowerCase();
        return name.includes(_term) || email.includes(_term);
      })
    : examinerStats;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Examiner Performance & Payments" large>
      {isLoading ? (
        <div className="flex flex-col justify-center items-center py-10">
          <svg className="animate-spin h-10 w-10 text-indigo-600 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-lg text-gray-700">Loading examiner statistics...</p>
        </div>
      ) : error ? (
        <div className="text-center py-10 text-red-600 bg-red-50 rounded-lg p-4 border border-red-200">
          <p className="font-semibold text-xl mb-2">Oops! Something went wrong.</p>
          <p>{error}</p>
          <p className="text-sm mt-2">Please ensure all necessary data (examiners, copies, exams) is loaded correctly in the Admin Panel.</p>
        </div>
      ) : (
        <div className="space-y-6 max-h-[70vh] overflow-y-auto p-2 custom-scrollbar"> {/* Added custom-scrollbar class */}
          {/* Search Bar */}
          <div className="mb-6 sticky top-0 bg-white z-10 py-2 rounded-lg shadow-sm border border-gray-200">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                type="text"
                placeholder="Search examiners by name or email..."
                value={examinerSearchTerm}
                onChange={(e) => setExaminerSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          {filteredExaminerStats.length === 0 ? (
            <p className="text-center text-gray-600 py-5">
              {examinerSearchTerm ? "No examiners found matching your search." : "No examiner data available."}
            </p>
          ) : (
            filteredExaminerStats.map(examiner => (
              <div key={examiner._id} className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-200">
                <div className="flex items-center mb-4 pb-3 border-b border-gray-200">
                  <UserCircleIcon className="h-10 w-10 text-indigo-600 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="text-2xl font-extrabold text-gray-900">{examiner.name}</h3>
                    <p className="text-gray-600 text-sm mt-1">{examiner.email}</p>
                    {examiner.department && (
                      <p className="text-gray-500 text-sm font-semibold mt-0.5">Department: {examiner.department}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center text-gray-700 bg-blue-50 p-3 rounded-md border border-blue-100">
                    <ClipboardDocumentCheckIcon className="h-6 w-6 mr-2 text-green-600 flex-shrink-0" />
                    <div className="flex flex-col">
                      <strong className="text-sm">Total Copies Evaluated:</strong>
                      <span className="text-2xl font-bold text-green-800">{examiner.totalCopiesEvaluated}</span>
                    </div>
                  </div>
                  <div className="flex items-center text-gray-700 bg-purple-50 p-3 rounded-md border border-purple-100">
                    <AcademicCapIcon className="h-6 w-6 mr-2 text-purple-600 flex-shrink-0" />
                    <div className="flex flex-col">
                      <strong className="text-sm">Total Copies Assigned:</strong>
                      <span className="text-2xl font-bold text-purple-800">{examiner.totalCopiesAssigned}</span>
                    </div>
                  </div>
                </div>

                {Object.keys(examiner.examDetails).length > 0 && (
                  <div className="mt-6 border-t pt-4 border-gray-200">
                    <h4 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                      <BookOpenIcon className="h-5 w-5 mr-2 text-orange-500" />
                      Performance by Exam:
                    </h4>
                    <ul className="space-y-3">
                      {Object.values(examiner.examDetails).map((exam, idx) => (
                        <li key={idx} className="bg-gray-100 p-4 rounded-lg shadow-sm border border-gray-200 flex justify-between items-center transition-colors duration-150 hover:bg-gray-200">
                          <span className="font-medium text-gray-800 text-base">{exam.title}:</span>
                          <span className="text-base text-gray-700">
                            <span className="font-bold text-green-700">{exam.evaluated}</span> / {exam.assigned} evaluated
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {Object.keys(examiner.examDetails).length === 0 && (
                  <p className="text-sm text-gray-500 mt-4 text-center">No specific exam evaluation data available yet.</p>
                )}
              </div>
            ))
          )}
        </div>
      )}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
        <button
          onClick={onClose}
          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold transition duration-150"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
