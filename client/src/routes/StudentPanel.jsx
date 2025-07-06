import React, { useState, useEffect } from "react";
import api from "../services/api";
import { Link } from "react-router-dom"; // Import Link for navigation
import {
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  PaperAirplaneIcon,
  DocumentTextIcon, // For View PDF
  QuestionMarkCircleIcon, // For Raise Query
} from "@heroicons/react/24/outline"; // Import icons

export default function StudentPanel() {
  const [copies, setCopies] = useState([]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState({
    message: "",
    type: "success",
  });

  useEffect(() => {
    fetchCopies();
  }, []);

  const fetchCopies = async () => {
    try {
      const r = await api.get("/student/copies");
      setCopies(r.data);
    } catch (err) {
      showTemporaryToast(
        `Error loading copies: ${err.response?.data?.error || err.message}`,
        "error"
      );
    }
  };

  // Toast Notification handler
  const showTemporaryToast = (msg, type = "success") => {
    setToastMessage({ message: msg, type: type });
    setShowToast(true);
    const timer = setTimeout(() => {
      setShowToast(false);
      setToastMessage({ message: "", type: "success" });
    }, 4000); // Hide after 4 seconds
    return () => clearTimeout(timer);
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen font-sans relative">
      {/* Toast Notification */}
      {showToast && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-xl text-white flex items-center space-x-3 transition-all duration-300 transform ${
            toastMessage.type === "success"
              ? "bg-green-500"
              : toastMessage.type === "error"
              ? "bg-red-500"
              : "bg-blue-500"
          } ${
            showToast
              ? "translate-x-0 opacity-100"
              : "translate-x-full opacity-0"
          }`}
        >
          {toastMessage.type === "success" && (
            <CheckCircleIcon className="h-6 w-6" />
          )}
          {toastMessage.type === "error" && (
            <ExclamationCircleIcon className="h-6 w-6" />
          )}
          {toastMessage.type === "info" && (
            <PaperAirplaneIcon className="h-6 w-6" />
          )}
          <span className="font-semibold">{toastMessage.message}</span>
        </div>
      )}

      <h1 className="text-4xl font-extrabold text-gray-900 text-center mb-10 tracking-tight">
        Student Dashboard
      </h1>

      {/* Feature Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Your Checked Copies Card */}
        <div className="bg-white p-8 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col items-center justify-center text-center border border-gray-100">
          <BookOpenIcon className="h-16 w-16 text-indigo-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            Your Checked Copies
          </h2>
          <p className="text-gray-600 mb-6">
            View your graded answer scripts and detailed feedback.
          </p>
          {/* This button could potentially open a larger modal with the list, or navigate to a dedicated page if the list is very long */}
          {/* For now, it just shows the count, the actual links are in the table below */}
          <div className="w-full bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md text-lg">
            View Copies ({copies.length})
          </div>
        </div>

        {/* Placeholder for "Your Queries" Card (Future Expansion) */}
        <div className="bg-white p-8 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col items-center justify-center text-center border border-gray-100 opacity-70 cursor-not-allowed">
          <ChatBubbleLeftRightIcon className="h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            Your Queries
          </h2>
          <p className="text-gray-600 mb-6">
            Track the status of your submitted queries.
          </p>
          <button
            disabled
            className="w-full bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg shadow-md text-lg"
          >
            Coming Soon
          </button>
        </div>
      </div>

      {/* List of Checked Copies */}
      <section className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 mt-10 max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">
          Recently Graded Copies
        </h2>
        {copies.length === 0 ? (
          <p className="text-gray-600 text-center py-4">
            No graded copies available yet. Please check back later!
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Paper Title
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {copies.map((c) => (
                  <tr
                    key={c._id}
                    className="hover:bg-gray-50 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {c.questionPaper?.title || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          c.status === "evaluated" // Changed to 'evaluated'
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      <Link
                        to={`/student/copy/${c._id}`} // Link to the new viewer component
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150"
                      >
                        <DocumentTextIcon className="h-4 w-4 mr-1" /> View Copy
                      </Link>
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