import React, { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../services/api";
// import Modal from "./Modal"; // Assuming you have this Modal component
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  PaperAirplaneIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ArrowsPointingInIcon,
  ChatBubbleLeftRightIcon, // For query details
  UserCircleIcon, // For student info
  ArrowPathIcon, // Added missing import for ArrowPathIcon
} from "@heroicons/react/24/outline";

export default function ExaminerQueryViewer() {
  const { queryId } = useParams(); // Get queryId from URL
  const navigate = useNavigate();

  // State for query and copy data
  const [query, setQuery] = useState(null);
  const [copy, setCopy] = useState(null); // The copy associated with the query
  const [error, setError] = useState(""); // Added error state

  // Page navigation states
  const [currentPage, setCurrentPage] = useState(1); // Current page of the Answer Copy
  const [qpCurrentPage, setQpCurrentPage] = useState(1); // Current page of the Question Paper

  // UI States (for toast messages and loading)
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState({
    message: "",
    type: "success",
  });
  const [isLoadingQuery, setIsLoadingQuery] = useState(true); // For initial query/copy load
  const [isQpLoading, setIsQpLoading] = useState(true); // For QP image loading
  const [isAcLoading, setIsAcLoading] = useState(true); // For AC image loading
  const [isSubmittingReply, setIsSubmittingReply] = useState(false); // For reply submission

  // Zoom States
  const [qpZoomLevel, setQpZoomLevel] = useState(1);
  const [acZoomLevel, setAcZoomLevel] = useState(1);

  const ZOOM_STEP = 0.25;
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 3;

  const [replyText, setReplyText] = useState(''); // State for the reply text

  // 1) Load the query and associated copy once on mount
  useEffect(() => {
    const fetchQueryAndCopy = async () => {
      setIsLoadingQuery(true);
      try {
        // Fetch the specific query details
        const queryRes = await api.get(`/examiner/queries/${queryId}`); // Assuming you'll add this backend endpoint
        const fetchedQuery = queryRes.data;
        setQuery(fetchedQuery);

        // Fetch the associated copy details using copy._id from the query
        // This might be a separate endpoint, or your query endpoint could populate the entire copy.
        // For simplicity, let's assume the query endpoint populates 'copy' and 'questionPaper' fully.
        // If not, you'd need another API call like api.get(`/examiner/copies/${fetchedQuery.copy._id}`);
        setCopy(fetchedQuery.copy);

        // Set initial pages based on the query
        setCurrentPage(fetchedQuery.pageNumber); // Go directly to the queried page
        setQpCurrentPage(1); // Usually start QP from page 1, or adjust if query specifies QP page

      } catch (err) {
        setError(err.response?.data?.error || err.message);
        showTemporaryToast(
          `Error loading query/copy: ${err.response?.data?.message || err.message}`,
          "error"
        );
      } finally {
        setIsLoadingQuery(false);
      }
    };
    fetchQueryAndCopy();
  }, [queryId]);

  // Reset zoom when page changes
  useEffect(() => {
    setAcZoomLevel(1);
  }, [currentPage]);

  useEffect(() => {
    setQpZoomLevel(1);
  }, [qpCurrentPage]);


  // Toast Notification handler
  const showTemporaryToast = (message, type = "success") => {
    setToastMessage({ message, type });
    setShowToast(true);
    const timer = setTimeout(() => {
      setShowToast(false);
      setToastMessage({ message: "", type: "success" });
    }, 4000); // Hide after 4 seconds
    return () => clearTimeout(timer);
  };

  // Handler for zooming images
  const handleZoom = (type, action) => {
    if (type === "qp") {
      setQpZoomLevel((prevZoom) => {
        let newZoom = prevZoom;
        if (action === "in") {
          newZoom = Math.min(MAX_ZOOM, prevZoom + ZOOM_STEP);
        } else if (action === "out") {
          newZoom = Math.max(MIN_ZOOM, prevZoom - ZOOM_STEP);
        } else if (action === "reset") {
          newZoom = MIN_ZOOM;
        }
        return parseFloat(newZoom.toFixed(2));
      });
    } else if (type === "ac") {
      setAcZoomLevel((prevZoom) => {
        let newZoom = prevZoom;
        if (action === "in") {
          newZoom = Math.min(MAX_ZOOM, prevZoom + ZOOM_STEP);
        } else if (action === "out") {
          newZoom = Math.max(MIN_ZOOM, prevZoom - ZOOM_STEP);
        } else if (action === "reset") {
          newZoom = MIN_ZOOM;
        }
        return parseFloat(newZoom.toFixed(2));
      });
    }
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!query || !replyText.trim()) {
      showTemporaryToast('Reply cannot be empty.', 'error');
      return;
    }

    setIsSubmittingReply(true);
    showTemporaryToast('Submitting reply...', 'info');

    try {
      // Assuming this endpoint updates the query status and adds the response
      await api.post(`/examiner/queries/${query._id}/reply`, { response: replyText });
      showTemporaryToast('Reply submitted successfully!', 'success');
      setReplyText(''); // Clear reply text
      // Optionally, navigate back to the queries list or update the query status in UI
      navigate('/examiner/queries');
    } catch (err) {
      console.error("Error submitting reply:", err);
      showTemporaryToast(`Error submitting reply: ${err.response?.data?.error || err.message}`, 'error');
    } finally {
      setIsSubmittingReply(false);
    }
  };


  // Early returns
  if (isLoadingQuery || !query || !copy)
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="flex flex-col items-center text-gray-600 text-lg">
          <svg
            className="animate-spin h-10 w-10 text-indigo-500"
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
          <p className="mt-4">Loading query and copy details...</p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="text-red-500 text-center py-10 text-xl font-semibold">
        Error: {error}
      </div>
    );

  // Get current page data for Answer Copy
  const currentAcPageData = copy.pages.find(
    (p) => p.pageNumber === currentPage
  );
  const marksAwarded = currentAcPageData?.marksAwarded ?? "N/A";
  const comments = currentAcPageData?.comments?.join("\n") || "No comments.";

  // Get image URLs
  const qpImageUrl = copy.questionPaper?.driveFile?.id
    ? `/api/drive/page-image/${copy.questionPaper.driveFile.id}/${qpCurrentPage}`
    : "";
  const acImageUrl = copy.driveFile?.id
    ? `/api/drive/page-image/${copy.driveFile.id}/${currentPage}`
    : "";

  return (
    <div className="bg-gray-100 min-h-screen font-sans relative">
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

      {/* Top Navigation Bar */}
      <nav className="bg-white shadow-sm py-4 px-8 border-b border-gray-200 flex justify-between items-center w-full">
        <div className="flex items-center space-x-4">
          <Link
            to="/examiner/queries"
            className="text-gray-700 hover:text-indigo-600 flex items-center font-medium transition duration-200"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" /> Back to Queries
          </Link>
          <span className="text-gray-500">|</span>
          <span className="text-xl font-bold text-gray-800">Query Details</span>
        </div>
        <div>
          <Link
            to="/logout"
            className="text-gray-700 hover:text-red-600 font-medium transition duration-200"
          >
            Logout
          </Link>
        </div>
      </nav>

      <div className="p-8">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-8 text-center tracking-tight">
          Query from{" "}
          <span className="text-indigo-700">{query.raisedBy?.email || 'N/A'}</span> on{" "}
          <span className="text-purple-700">{copy.questionPaper?.title || 'N/A'}</span> (Page {query.pageNumber})
        </h1>

        {/* Query Details Section */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 max-w-4xl mx-auto mb-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-2 flex items-center">
            <ChatBubbleLeftRightIcon className="h-6 w-6 mr-2 text-gray-600" /> Student's Query
          </h3>
          <p className="p-3 bg-gray-100 rounded-md border border-gray-200 text-gray-800 italic text-lg whitespace-pre-wrap">
            {query.text}
          </p>
          {query.status === 'resolved' && query.response && (
            <div className="mt-4">
              <h4 className="text-lg font-semibold text-gray-800 mb-2">Your Previous Reply:</h4>
              <p className="p-3 bg-blue-50 rounded-md border border-blue-200 text-blue-800 whitespace-pre-wrap">
                {query.response}
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
          {/* Question Paper Section */}
          <div className="lg:col-span-5 bg-white p-6 rounded-xl shadow-lg border border-gray-200 flex flex-col">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 text-center">
              Question Paper
            </h2>
            {copy.questionPaper.totalPages > 1 && (
              <div className="flex justify-between items-center w-full mb-4 space-x-4">
                <button
                  onClick={() => {
                    setQpCurrentPage((p) => Math.max(1, p - 1));
                    setIsQpLoading(true);
                  }}
                  disabled={qpCurrentPage === 1}
                  className="flex-1 px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-lg"
                >
                  Prev
                </button>
                <span className="text-lg font-bold text-gray-800">
                  Page {qpCurrentPage} / {copy.questionPaper.totalPages}
                </span>
                <button
                  onClick={() => {
                    setQpCurrentPage((p) =>
                      Math.min(copy.questionPaper.totalPages, p + 1)
                    );
                    setIsQpLoading(true);
                  }}
                  disabled={qpCurrentPage === copy.questionPaper.totalPages}
                  className="flex-1 px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-lg"
                >
                  Next
                </button>
              </div>
            )}
            <div className="relative w-full flex-grow h-[400px] rounded-lg overflow-auto border border-gray-300 bg-gray-50 flex items-center justify-center">
              {isQpLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 z-10">
                  <ArrowPathIcon className="animate-spin h-8 w-8 text-indigo-500" />
                  <span className="ml-2 text-gray-700">Loading...</span>
                </div>
              )}
              {qpImageUrl ? (
                <img
                  src={qpImageUrl}
                  alt={`Question Paper Page ${qpCurrentPage}`}
                  className="w-full h-full object-contain"
                  style={{
                    transform: `scale(${qpZoomLevel})`,
                    transformOrigin: "center center",
                  }}
                  onLoad={() => setIsQpLoading(false)}
                  onError={() => setIsQpLoading(false)}
                />
              ) : (
                <div className="text-gray-500 text-center p-4">
                  Question Paper Page Not Found.
                </div>
              )}
            </div>
            <div className="flex items-center justify-center mt-4 space-x-2">
              <button
                onClick={() => handleZoom("qp", "out")}
                disabled={qpZoomLevel === MIN_ZOOM}
                className="p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                title="Zoom Out"
              >
                <MagnifyingGlassMinusIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleZoom("qp", "in")}
                disabled={qpZoomLevel === MAX_ZOOM}
                className="p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                title="Zoom In"
              >
                <MagnifyingGlassPlusIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleZoom("qp", "reset")}
                disabled={qpZoomLevel === MIN_ZOOM}
                className="p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                title="Reset Zoom"
              >
                <ArrowsPointingInIcon className="h-5 w-5" />
              </button>
              <span className="text-sm text-gray-600">
                {qpZoomLevel.toFixed(2)}x
              </span>
            </div>
          </div>

          {/* Answer Copy Section */}
          <div className="lg:col-span-7 bg-white p-6 rounded-xl shadow-lg border border-gray-200 flex flex-col">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 text-center">
              Answer Copy
            </h2>
            <div className="flex justify-between items-center w-full mb-4 space-x-4">
              <button
                onClick={() => {
                  setCurrentPage((p) => Math.max(1, p - 1));
                  setIsAcLoading(true);
                }}
                disabled={currentPage === 1}
                className="flex-1 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-lg"
              >
                Prev
              </button>
              <span className="text-lg font-bold text-gray-800">
                Page {currentPage} / {copy.totalPages}
              </span>
              <button
                onClick={() => {
                  setCurrentPage((p) => Math.min(copy.totalPages, p + 1));
                  setIsAcLoading(true);
                }}
                disabled={currentPage === copy.totalPages}
                className="flex-1 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-lg"
              >
                Next
              </button>
            </div>
            <div className="relative w-full flex-grow h-[400px] rounded-lg overflow-auto border border-gray-300 bg-gray-50 flex items-center justify-center">
              {isAcLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 z-10">
                  <ArrowPathIcon className="animate-spin h-8 w-8 text-indigo-500" />
                  <span className="ml-2 text-gray-700">Loading...</span>
                </div>
              )}
              {acImageUrl ? (
                <img
                  src={acImageUrl}
                  alt={`Answer Copy Page ${currentPage}`}
                  className="w-full h-full object-contain"
                  style={{
                    transform: `scale(${acZoomLevel})`,
                    transformOrigin: "center center",
                  }}
                  onLoad={() => setIsAcLoading(false)}
                  onError={() => setIsAcLoading(false)}
                />
              ) : (
                <div className="text-gray-500 text-center p-4">
                  Answer Copy Page Not Found.
                </div>
              )}
            </div>
            <div className="flex items-center justify-center mt-4 space-x-2">
              <button
                onClick={() => handleZoom("ac", "out")}
                disabled={acZoomLevel === MIN_ZOOM}
                className="p-2 bg-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                title="Zoom Out"
              >
                <MagnifyingGlassMinusIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleZoom("ac", "in")}
                disabled={acZoomLevel === MAX_ZOOM}
                className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                title="Zoom In"
              >
                <MagnifyingGlassPlusIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleZoom("ac", "reset")}
                disabled={acZoomLevel === MIN_ZOOM}
                className="p-2 bg-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                title="Reset Zoom"
              >
                <ArrowsPointingInIcon className="h-5 w-5" />
              </button>
              <span className="text-sm text-gray-600">
                {acZoomLevel.toFixed(2)}x
              </span>
            </div>
          </div>
        </div>

        {/* Marks and Comments Display & Reply Form */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 w-full max-w-full mx-auto mb-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">
            Evaluation for Page {currentPage}
          </h3>
          <div className="mb-4">
            <label className="block text-base font-medium text-gray-700 mb-1">
              Marks Awarded:
            </label>
            <p className="w-full md:w-32 px-3 py-1.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 text-base">
              {marksAwarded}
            </p>
          </div>
          <div className="mb-6">
            <label className="block text-base font-medium text-gray-700 mb-1">
              Comments:
            </label>
            <p className="w-full px-3 py-1.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 text-base whitespace-pre-wrap">
              {comments}
            </p>
          </div>

          {/* Reply Form */}
          <form onSubmit={handleReplySubmit} className="space-y-4 mt-6 pt-4 border-t border-gray-200">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Your Reply</h3>
            <div>
              <label htmlFor="replyText" className="block text-gray-700 text-sm font-bold mb-2">Reply to Student:</label>
              <textarea
                id="replyText"
                rows={5}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:ring-2 focus:ring-indigo-500 resize-y"
                placeholder="Type your response here..."
                required
              ></textarea>
            </div>
            <button
              type="submit"
              disabled={isSubmittingReply || query.status === 'resolved'} // Disable if already resolved
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmittingReply ? (
                <>
                  <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" /> Sending...
                </>
              ) : (
                <>
                  <PaperAirplaneIcon className="h-5 w-5 mr-2" /> {query.status === 'resolved' ? 'Query Resolved' : 'Send Reply'}
                </>
              )}
            </button>
            {query.status === 'resolved' && (
              <p className="text-sm text-green-600 text-center mt-3">
                This query has already been resolved.
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}