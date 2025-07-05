import React, { useState, useEffect } from "react";
import api from "../services/api";
import Modal from "../components/Modal"; // Import the Modal component
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
  const [message, setMessage] = useState(""); // For global toast messages
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState({
    message: "",
    type: "success",
  });

  // Query Modal States
  const [isQueryModalOpen, setIsQueryModalOpen] = useState(false);
  const [selectedCopyForQuery, setSelectedCopyForQuery] = useState(null);
  const [queryPage, setQueryPage] = useState(""); // Changed to empty string for initial input
  const [queryText, setQueryText] = useState("");
  const [isSubmittingQuery, setIsSubmittingQuery] = useState(false);

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

  const openQueryForm = (copy) => {
    setSelectedCopyForQuery(copy);
    setQueryPage(""); // Reset for new query
    setQueryText(""); // Reset for new query
    setIsQueryModalOpen(true);
  };

  const closeQueryModal = () => {
    setIsQueryModalOpen(false);
    setSelectedCopyForQuery(null);
  };

  const submitQuery = async () => {
    if (!selectedCopyForQuery) return;

    if (
      !queryPage ||
      isNaN(Number(queryPage)) ||
      Number(queryPage) <= 0 ||
      Number(queryPage) > selectedCopyForQuery.totalPages
    ) {
      showTemporaryToast(
        `Please enter a valid page number between 1 and ${selectedCopyForQuery.totalPages}.`,
        "error"
      );
      return;
    }
    if (!queryText.trim()) {
      showTemporaryToast("Query text cannot be empty.", "error");
      return;
    }

    setIsSubmittingQuery(true);
    try {
      await api.post(`/student/copies/${selectedCopyForQuery._id}/query`, {
        pageNumber: Number(queryPage),
        text: queryText.trim(),
      });
      showTemporaryToast(
        "Query submitted successfully for approval!",
        "success"
      );
      closeQueryModal();
      // Optionally, refresh copies if query status is shown on the main list
      // fetchCopies();
    } catch (err) {
      showTemporaryToast(
        `Error submitting query: ${err.response?.data?.error || err.message}`,
        "error"
      );
    } finally {
      setIsSubmittingQuery(false);
    }
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
          <button
            onClick={() => {
              /* This button could potentially open a larger modal with the list, or navigate to a dedicated page if the list is very long */
            }}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition duration-200 text-lg"
          >
            View Copies ({copies.length})
          </button>
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
                  {/* Removed Examiner column for student anonymity */}
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
                    {/* Removed Examiner display for student anonymity */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          c.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      <a
                        href={c.driveFile?.link || "#"} // Ensure driveFile.link is available
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150"
                      >
                        <DocumentTextIcon className="h-4 w-4 mr-1" /> View PDF
                      </a>
                      <button
                        onClick={() => openQueryForm(c)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition duration-150"
                      >
                        <QuestionMarkCircleIcon className="h-4 w-4 mr-1" />{" "}
                        Raise Query
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Raise Query Modal */}
      <Modal
        isOpen={isQueryModalOpen}
        onClose={closeQueryModal}
        title={`Raise Query on: ${
          selectedCopyForQuery?.questionPaper?.title || "Selected Copy"
        }`}
      >
        {selectedCopyForQuery && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitQuery();
            }}
            className="space-y-5 p-2"
          >
            <div>
              <label
                htmlFor="queryPage"
                className="block text-gray-700 text-base font-medium mb-2"
              >
                Page Number (1 - {selectedCopyForQuery.totalPages}):
              </label>
              <input
                id="queryPage"
                type="number"
                min="1"
                max={selectedCopyForQuery.totalPages}
                value={queryPage}
                onChange={(e) => setQueryPage(e.target.value)}
                className="w-full md:w-32 px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-base appearance-none"
                placeholder="e.g., 5"
                required
              />
            </div>
            <div>
              <label
                htmlFor="queryText"
                className="block text-gray-700 text-base font-medium mb-2"
              >
                Your Query:
              </label>
              <textarea
                id="queryText"
                rows="4"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-base resize-y"
                placeholder="Type your question or concern about the marking on this page..."
                required
              ></textarea>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={closeQueryModal}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold transition duration-150"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingQuery}
                className="inline-flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 font-semibold transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingQuery ? (
                  <svg
                    className="animate-spin h-5 w-5 mr-3 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : (
                  <PaperAirplaneIcon className="h-5 w-5 mr-2" />
                )}
                {isSubmittingQuery ? "Submitting..." : "Submit Query"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
