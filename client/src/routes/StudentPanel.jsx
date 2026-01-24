import React, { useState, useEffect } from "react";
import api from "../services/api";
import { Link } from "react-router-dom"; // Import Link for navigation
import {
  BookOpenIcon,
  CheckCircleIcon,
  DocumentTextIcon, // For View PDF
  QuestionMarkCircleIcon, // For Raise Query
} from "@heroicons/react/24/outline"; // Import icons
import { toastError, toastSuccess, toastInfo } from "../utils/hotToast";

export default function StudentPanel() {
  const [copies, setCopies] = useState([]);
  const [studentQueries, setStudentQueries] = useState([]); // NEW: State for student queries
  // Using global react-hot-toast via helpers

  useEffect(() => {
    fetchCopies();
    fetchStudentQueries(); // NEW: Fetch all queries for the student
  }, []);

  const fetchCopies = async () => {
    try {
      const r = await api.get("/student/copies");
      setCopies(r.data);
    } catch (err) {
      toastError(`Error loading copies: ${err.response?.data?.error || err.message}`);
    }
  };

  // NEW: Fetch all queries for the logged-in student
  const fetchStudentQueries = async () => {
    try {
      // Assuming an endpoint like /student/queries exists that returns all queries for the logged-in student
      const res = await api.get("/student/queries");
      setStudentQueries(res.data);
    } catch (err) {
      console.error("Error fetching student queries:", err);
      toastError(`Error loading queries: ${err.response?.data?.error || err.message}`);
    }
  };

  // Toasts handled via `react-hot-toast` helpers: `toastSuccess`, `toastError`, `toastInfo`.

  return (
    <div className="w-full p-4" style={{fontFamily: 'Dosis, sans-serif'}}>
      {/* Toasts shown via global Toaster (react-hot-toast) */}

      <h1 className="text-3xl font-bold text-gray-900 mb-6">Student Panel</h1>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200 flex items-center space-x-4">
          <BookOpenIcon className="h-10 w-10 text-gray-900" />
          <div>
            <p className="text-gray-600 font-bold">Total Copies</p>
            <p className="text-2xl font-bold text-gray-900">{copies.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 flex items-center space-x-4">
          <CheckCircleIcon className="h-10 w-10 text-gray-900" />
          <div>
            <p className="text-gray-600 font-bold">Evaluated Copies</p>
            <p className="text-2xl font-bold text-gray-900">
              {copies.filter((c) => c.status === "evaluated").length}
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 flex items-center space-x-4">
          <QuestionMarkCircleIcon className="h-10 w-10 text-gray-900" />
          <div>
            <p className="text-gray-600 font-bold">Pending Queries</p>
            <p className="text-2xl font-bold text-gray-900">
              {studentQueries.filter((q) => q.status === "pending").length}
            </p>
          </div>
        </div>
      </div>

      {/* Your Answer Copies Section */}
      <section className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-xl font-bold mb-4 text-gray-900">Your Answer Copies</h2>
        {copies.length === 0 ? (
          <p className="text-gray-600 text-center py-8">No answer copies uploaded for you yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Exam Title</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {copies.map((c) => (
                  <tr key={c._id}>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      {c.questionPaper?.title || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          c.status === "evaluated" && c.isReleasedToStudent // Changed to 'evaluated' and released
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {c.status === "evaluated" && c.isReleasedToStudent
                          ? "Evaluated & Released"
                          : c.status === "evaluated"
                          ? "Evaluated (Not Released)"
                          : c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold space-x-3">
                      {c.status === "evaluated" && c.isReleasedToStudent && (
                        <Link
                          to={`/student/copy/${c._id}`} // Link to the new viewer component
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-bold rounded-md text-white bg-gray-900 hover:bg-[#1e3a8a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition duration-150"
                        >
                          <DocumentTextIcon className="h-4 w-4 mr-1" /> View Copy
                        </Link>
                      )}
                      {/* You might add a "View Queries" button here if you want a separate query list for students */}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* NEW: Your Queries Section for Students */}
      <section className="bg-white p-6 rounded-lg border border-gray-200 mt-8">
        <h2 className="text-xl font-bold mb-4 text-gray-900">Your Raised Queries</h2>
        {studentQueries.length === 0 ? (
          <p className="text-gray-600 text-center py-8">You haven't raised any queries yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Exam Title</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Page</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Query Text</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Admin Response</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {studentQueries.map((q) => (
                  <tr key={q._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{q.copy?.questionPaper?.title || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{q.pageNumber}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 truncate max-w-xs">{q.text}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        q.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        q.status === 'approved_by_admin' ? 'bg-blue-100 text-blue-800' :
                        q.status === 'rejected_by_admin' ? 'bg-red-100 text-red-800' :
                        q.status === 'resolved_by_admin' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {q.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {q.response || (q.status === 'pending' ? 'Awaiting admin review...' : 'No response yet.')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}