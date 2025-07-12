import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";
import Modal from "../components/Modal"; // Assuming you have this Modal component
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  PaperAirplaneIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ArrowsPointingInIcon,
  QuestionMarkCircleIcon, // For Raise Query button
  ChatBubbleLeftRightIcon, // For displaying queries
} from "@heroicons/react/24/outline";

// Import react-pdf components
import { Document, Page, pdfjs } from "react-pdf"; //
import 'react-pdf/dist/Page/AnnotationLayer.css'; // Essential for annotations like links
import 'react-pdf/dist/Page/TextLayer.css'; // Essential for selectable text

// Set worker source for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`; //

export default function StudentCopyViewer() {
  const { copyId } = useParams();

  // State for copy data and UI
  const [copy, setCopy] = useState(null);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1); // Current page of the Answer Copy
  const [qpCurrentPage, setQpCurrentPage] = useState(1); // Current page of the Question Paper
  const [studentQueries, setStudentQueries] = useState([]); // NEW: State for student's queries on this copy

  // Toast Notification states
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState({
    message: "",
    type: "success",
  });

  // Zoom States
  const [qpZoomLevel, setQpZoomLevel] = useState(1);
  const [acZoomLevel, setAcZoomLevel] = useState(1);

  const ZOOM_STEP = 0.25;
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 3;

  // Query Modal States
  const [isQueryModalOpen, setIsQueryModalOpen] = useState(false);
  const [queryPage, setQueryPage] = useState("");
  const [queryText, setQueryText] = useState("");
  const [isSubmittingQuery, setIsSubmittingQuery] = useState(false);

  // New states for react-pdf to track total pages
  const [numQpPages, setNumQpPages] = useState(null);
  const [numAcPages, setNumAcPages] = useState(null);

  // Initial loading state for the entire component's data
  const [isLoadingComponent, setIsLoadingComponent] = useState(true);

  // Callback for successful PDF document load (not per page load)
  const onQpDocumentLoadSuccess = useCallback(({ numPages }) => {
    setNumQpPages(numPages);
  }, []);

  const onAcDocumentLoadSuccess = useCallback(({ numPages }) => {
    setNumAcPages(numPages);
  }, []);

  // 1) Load the copy and its queries once on mount
  useEffect(() => {
    const fetchCopyAndQueries = async () => {
      setIsLoadingComponent(true); // Start loading for the component
      try {
        const copyRes = await api.get(`/student/copies/${copyId}`);
        setCopy(copyRes.data);
        setCurrentPage(1);
        setQpCurrentPage(1);

        const queriesRes = await api.get(`/student/queries?copyId=${copyId}`);
        setStudentQueries(queriesRes.data);

      } catch (err) {
        setError(err.response?.data?.error || err.message);
        showTemporaryToast(
          `Error loading copy or queries: ${err.response?.data?.message || err.message}`,
          "error"
        );
      } finally {
        setIsLoadingComponent(false); // End loading for the component
      }
    };
    fetchCopyAndQueries();
  }, [copyId]);

  // 2) Reset zoom when current page of answer copy changes
  useEffect(() => {
    setAcZoomLevel(1);
  }, [currentPage]);

  // 3) Reset zoom when current page of question paper changes
  useEffect(() => {
    setQpZoomLevel(1);
  }, [qpCurrentPage]);

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

  // Query Modal functions
  const openQueryForm = () => {
    setQueryPage(currentPage.toString()); // Pre-fill with current AC page
    setQueryText("");
    setIsQueryModalOpen(true);
  };

  const closeQueryModal = () => {
    setIsQueryModalOpen(false);
  };

  const submitQuery = async () => {
    if (!copy) return;

    if (
      !queryPage ||
      isNaN(Number(queryPage)) ||
      Number(queryPage) <= 0 ||
      Number(queryPage) > copy.totalPages
    ) {
      showTemporaryToast(
        `Please enter a valid page number between 1 and ${copy.totalPages}.`,
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
      await api.post(`/student/copies/${copyId}/queries`, {
        pageNumber: Number(queryPage),
        text: queryText.trim(),
      });
      showTemporaryToast("Query submitted successfully!", "success");
      closeQueryModal();
      // Re-fetch queries after submission to update the list
      const updatedQueriesRes = await api.get(`/student/queries?copyId=${copyId}`);
      setStudentQueries(updatedQueriesRes.data);
    } catch (err) {
      showTemporaryToast(
        `Error submitting query: ${err.response?.data?.message || err.message}`,
        "error"
      );
    } finally {
      setIsSubmittingQuery(false);
    }
  };

  // Early returns for loading and error states
  if (error)
    return (
      <div className="text-red-500 text-center py-10 text-xl font-semibold">
        Error: {error}
      </div>
    );
  if (isLoadingComponent || !copy) // Use isLoadingComponent for initial data fetch
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
          <p className="mt-4">Loading copy details...</p>
        </div>
      </div>
    );

  // Get current page data for Answer Copy
  const currentAcPageData = copy.pages.find(
    (p) => p.pageNumber === currentPage
  );
  const marksAwarded = currentAcPageData?.marksAwarded ?? "N/A";
  const comments = currentAcPageData?.comments?.join("\n") || "No comments.";

  // Calculate total marks (sum of marksAwarded from all pages)
  const totalMarks = copy.pages.reduce(
    (sum, p) => sum + (Number(p.marksAwarded) || 0),
    0
  );

  // Get the PDF URLs instead of image URLs
  const qpPdfUrl = copy.questionPaper?.driveFile?.id
    ? `/api/drive/pdf/${copy.questionPaper.driveFile.id}`
    : "";

  const acPdfUrl = copy.driveFile?.id
    ? `/api/drive/pdf/${copy.driveFile.id}`
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
            to="/student"
            className="text-gray-700 hover:text-indigo-600 flex items-center font-medium transition duration-200"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" /> Back to Dashboard
          </Link>
          <span className="text-gray-500">|</span>
          <span className="text-xl font-bold text-gray-800">Copy Viewer</span>
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
          Viewing:{" "}
          <span className="text-purple-700">{copy.questionPaper.title}</span>
        </h1>

        {/* Total Marks Display */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 max-w-2xl mx-auto mb-8 text-center">
          <h3 className="text-2xl font-bold text-gray-800">
            Your Total Marks:{" "}
            <span className="text-green-700">{totalMarks}</span> /{" "}
            {copy.questionPaper.totalMarks}
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
          {/* Question Paper Section */}
          <div className="lg:col-span-5 bg-white p-6 rounded-xl shadow-lg border border-gray-200 flex flex-col">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 text-center">
              Question Paper
            </h2>
            {/* Page Navigation for Question Paper (using numQpPages) */}
            {numQpPages > 1 && (
              <div className="flex justify-between items-center w-full mb-4 space-x-4">
                <button
                  onClick={() => {
                    setQpCurrentPage((p) => Math.max(1, p - 1));
                  }}
                  disabled={qpCurrentPage === 1}
                  className="flex-1 px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-lg"
                >
                  Prev
                </button>
                <span className="text-lg font-bold text-gray-800">
                  Page {qpCurrentPage} / {numQpPages || "..."}
                </span>
                <button
                  onClick={() => {
                    setQpCurrentPage((p) =>
                      Math.min(numQpPages, p + 1)
                    );
                  }}
                  disabled={qpCurrentPage === numQpPages}
                  className="flex-1 px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-lg"
                >
                  Next
                </button>
              </div>
            )}
            <div className="relative w-full flex-grow h-[400px] rounded-lg overflow-auto border border-gray-300 bg-gray-50 flex items-center justify-center">
              {/* React-PDF Document and Page for Question Paper*/}
              {qpPdfUrl ? (
                <Document
                  file={qpPdfUrl}
                  onLoadSuccess={onQpDocumentLoadSuccess}
                  onLoadError={(err) => {
                    console.error("Error loading QP PDF:", err);
                    setError("Failed to load Question Paper PDF.");
                  }}
                  className="w-full h-full flex items-center justify-center"
                >
                  <Page
                    pageNumber={qpCurrentPage}
                    scale={qpZoomLevel}
                    renderAnnotationLayer={true}
                    renderTextLayer={true}
                    width={550} // Fixed width for better scaling control
                  />
                </Document>
              ) : (
                <div className="text-gray-500 text-center p-4">
                  Question Paper PDF Not Found.
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
            {/* Page Navigation for Answer Copy (using numAcPages) */}
            {numAcPages > 1 && (
              <div className="flex justify-between items-center w-full mb-4 space-x-4">
                <button
                  onClick={() => {
                    setCurrentPage((p) => Math.max(1, p - 1));
                  }}
                  disabled={currentPage === 1}
                  className="flex-1 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-lg"
                >
                  Prev
                </button>
                <span className="text-lg font-bold text-gray-800">
                  Page {currentPage} / {numAcPages || "..."}
                </span>
                <button
                  onClick={() => {
                    setCurrentPage((p) => Math.min(numAcPages, p + 1));
                  }}
                  disabled={currentPage === numAcPages}
                  className="flex-1 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-lg"
                >
                  Next
                </button>
              </div>
            )}
            <div className="relative w-full flex-grow h-[400px] rounded-lg overflow-auto border border-gray-300 bg-gray-50 flex items-center justify-center">
              {/* React-PDF Document and Page for Answer Copy */}
              {acPdfUrl ? (
                <Document
                  file={acPdfUrl}
                  onLoadSuccess={onAcDocumentLoadSuccess}
                  onLoadError={(err) => {
                    console.error("Error loading AC PDF:", err);
                    setError("Failed to load Answer Copy PDF.");
                  }}
                  className="w-full h-full flex items-center justify-center"
                >
                  <Page
                    pageNumber={currentPage}
                    scale={acZoomLevel}
                    renderAnnotationLayer={true}
                    renderTextLayer={true}
                    width={550} // Fixed width for better scaling control
                  />
                </Document>
              ) : (
                <div className="text-gray-500 text-center p-4">
                  Answer Copy PDF Not Found.
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

        {/* Marks and Comments Display & Raise Query Button */}
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
          <button
            onClick={openQueryForm}
            className="w-full bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all duration-200 ease-in-out text-xl font-semibold shadow-md flex items-center justify-center"
          >
            <QuestionMarkCircleIcon className="h-6 w-6 mr-3" /> Raise Query for this Page
          </button>
        </div>

        {/* NEW: Display Raised Queries Section */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 w-full max-w-full mx-auto mb-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-2 flex items-center">
            <ChatBubbleLeftRightIcon className="h-6 w-6 mr-2 text-gray-600" /> Your Raised Queries for this Copy
          </h3>
          {studentQueries.length === 0 ? (
            <p className="text-gray-600 text-center py-4">
              No queries have been raised for this copy yet.
            </p>
          ) : (
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Page</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Your Query</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Response</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action Taken</th> {/* NEW HEADER */}
              </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {studentQueries.map((query) => (
                    <tr key={query._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{query.pageNumber}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{query.text}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      query.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      query.status === 'approved_by_admin' ? 'bg-blue-100 text-blue-800' :
                      query.status === 'rejected_by_admin' ? 'bg-red-100 text-red-800' :
                      query.status === 'resolved_by_admin' ? 'bg-green-100 text-green-800' :
                      query.status === 'resolved_by_examiner' ? 'bg-purple-100 text-purple-800' : // Added for examiner resolution
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {query.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {query.response || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs "> {/* NEW CELL */}
                    {query.action || 'No specific action recorded.'}
                  </td>
                </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>


      </div>

      {/* Raise Query Modal */}
      <Modal
        isOpen={isQueryModalOpen}
        onClose={closeQueryModal}
        title={`Raise Query on: ${copy.questionPaper?.title || "Copy"}`}
      >
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
              Page Number (1 - {copy.totalPages}):
            </label>
            <input
              id="queryPage"
              type="number"
              min="1"
              max={copy.totalPages}
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
      </Modal>
    </div>
  );
}