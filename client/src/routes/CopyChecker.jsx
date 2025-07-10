import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import Modal from "../components/Modal"; // Assuming you have this Modal component
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ClipboardDocumentCheckIcon,
  ExclamationCircleIcon,
  PaperAirplaneIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ArrowsPointingInIcon,
} from "@heroicons/react/24/outline";

// Import react-pdf components
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css"; // Essential for annotations like links
import "react-pdf/dist/Page/TextLayer.css"; // Essential for selectable text

// Set worker source for react-pdf
// This is crucial for react-pdf to work correctly.
// Using unpkg CDN for robustness. Make sure the pdfjs.version matches your installed react-pdf version.
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function CopyChecker() {
  const { copyId } = useParams();
  const navigate = useNavigate();

  // State
  const [copy, setCopy] = useState(null);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1); // Current page of the Answer Copy
  const [qpCurrentPage, setQpCurrentPage] = useState(1); // Current page of the Question Paper
  const [marks, setMarks] = useState("");
  const [comments, setComments] = useState("");

  // UI States
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState({
    message: "",
    type: "success",
  });
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // For Save & Next button loading

  // React-pdf states for Question Paper
  const [qpNumPages, setQpNumPages] = useState(null);
  const [isQpLoading, setIsQpLoading] = useState(true);

  // React-pdf states for Answer Copy
  const [acNumPages, setAcNumPages] = useState(null);
  const [isAcLoading, setIsAcLoading] = useState(true);

  // Zoom States
  const [qpZoomLevel, setQpZoomLevel] = useState(1); // Initial zoom level for QP
  const [acZoomLevel, setAcZoomLevel] = useState(1); // Initial zoom level for AC

  const ZOOM_STEP = 0.25;
  const MIN_ZOOM = 0.5; // Adjusted min zoom for better flexibility
  const MAX_ZOOM = 3;

  // 1) Load the copy once on mount
  useEffect(() => {
    const fetchCopy = async () => {
      try {
        const res = await api.get(`/examiner/copies/${copyId}`);
        setCopy(res.data);
        // Set both Answer Copy and Question Paper to page 1 on load
        setCurrentPage(1);
        setQpCurrentPage(1);
        // Reset loading states after initial document fetch
        setIsAcLoading(true); // Will be set to false by onRenderSuccessAC
        setIsQpLoading(true); // Will be set to false by onRenderSuccessQP
      } catch (err) {
        setError(err.response?.data?.error || err.message);
        showTemporaryToast(
          `Error loading copy: ${err.response?.data?.message || err.message}`,
          "error"
        );
        setIsAcLoading(false); // Ensure loading is off if there's an error
        setIsQpLoading(false); // Ensure loading is off if there's an error
      }
    };
    fetchCopy();
  }, [copyId]);

  // 2) Prefill marks/comments when current page of answer copy changes or copy data changes
  // Also, reset zoom for AC when page changes.
  useEffect(() => {
    if (!copy) return;
    const foundPageData = copy.pages.find((p) => p.pageNumber === currentPage);
    if (foundPageData) {
      setMarks(foundPageData.marksAwarded ?? "");
      setComments(foundPageData.comments ?? "");
    } else {
      setMarks("");
      setComments("");
    }

    // Reset zoom when AC page changes, and set loading to true
    setAcZoomLevel(1);
    setIsAcLoading(true);
  }, [currentPage, copy]);

  // Reset zoom for QP when page changes, and set loading to true
  useEffect(() => {
    if (!copy || !copy.questionPaper) return;
    setQpZoomLevel(1);
    setIsQpLoading(true);
  }, [qpCurrentPage, copy]);

  const onDocumentLoadSuccessQP = useCallback(({ numPages }) => {
    setQpNumPages(numPages);
    setIsQpLoading(false); // Document loaded, but page rendering still needs to happen
  }, []);

  const onDocumentLoadErrorQP = useCallback((error) => {
    console.error("Error loading QP document:", error);
    setIsQpLoading(false);
    setError("Failed to load Question Paper PDF.");
  }, []);

  const onRenderSuccessQP = useCallback(() => {
    setIsQpLoading(false); // Page finished rendering
  }, []);

  const onDocumentLoadSuccessAC = useCallback(({ numPages }) => {
    setAcNumPages(numPages);
    setIsAcLoading(false); // Document loaded, but page rendering still needs to happen
  }, []);

  const onDocumentLoadErrorAC = useCallback((error) => {
    console.error("Error loading AC document:", error);
    setIsAcLoading(false);
    setError("Failed to load Answer Copy PDF.");
  }, []);

  const onRenderSuccessAC = useCallback(() => {
    setIsAcLoading(false); // Page finished rendering
  }, []);

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

  // Early returns
  if (error)
    return (
      <div className="text-red-500 text-center py-10 text-xl font-semibold">
        Error: {error}
      </div>
    );
  if (!copy)
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

  // Calculate running total of all saved pages
  const totalMarks = copy.pages.reduce(
    (sum, p) => sum + (Number(p.marksAwarded) || 0),
    0
  );

  // Calculate completion percentage for the timeline
  const markedPagesCount = copy.pages.filter(
    (page) => page.lastAnnotatedBy != null
  ).length;
  const completionPercentage =
    copy.totalPages > 0 ? (markedPagesCount / copy.totalPages) * 100 : 0;

  // Handler: save this page’s marks, then advance
  const handleSavePage = async () => {
    if (isSaving) return; // Prevent multiple submissions while saving
    setIsSaving(true);
    try {
      if (marks === "" || isNaN(parseInt(marks))) {
        showTemporaryToast("Please enter a valid number for marks.", "error");
        return;
      }
      if (parseInt(marks) < 0) {
        showTemporaryToast("Marks cannot be negative.", "error");
        return;
      }

      const payload = {
        pageNumber: currentPage,
        marks: parseInt(marks), // Use parseInt here
        comments,
      };
      const res = await api.patch(`/examiner/copies/${copyId}/mark-page`, payload);
      setCopy(res.data); // Update local copy state with new data from server
      showTemporaryToast("Page marks saved successfully!", "success");

      // Advance to the next page only if it's not the last page
      if (currentPage < copy.totalPages) {
        setCurrentPage((p) => p + 1);
      } else {
        setIsAcLoading(false); // Stop loading state if on last page
        setIsQpLoading(false); // Stop loading state if on last page
        setShowReviewModal(true); // Show review modal if on last page
        showTemporaryToast(
          "You've reached the last page. Please review and submit.",
          "info"
        );
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      showTemporaryToast(
        `Error saving marks: ${err.response?.data?.message || err.message}`,
        "error"
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Get the current page URL for Question Paper PDF
  const qpPdfUrl = copy.questionPaper?.driveFile?.id
    ? `/api/drive/pdf/${copy.questionPaper.driveFile.id}`
    : "";

  // Get the current page URL for Answer Copy PDF
  const acPdfUrl = copy.driveFile?.id
    ? `/api/drive/pdf/${copy.driveFile.id}`
    : "";

  const handleFinalSubmit = async () => {
    try {
      if (copy.status !== "evaluated") {
        const res = await api.patch(`/examiner/copies/${copyId}/complete`);
        setCopy(res.data); // Update local copy state with new data from server
        showTemporaryToast(
          "All pages marked! You can now confirm final submission.",
          "success"
        );
        setTimeout(() => {
          navigate("/examiner"); // Navigate back to examiner dashboard
        }, 500); // Give time for toast to be seen
        return;
      }
      setShowReviewModal(false);
      setTimeout(() => {
        navigate("/examiner"); // Navigate back to examiner dashboard
      }, 500); // Give time for toast to be seen
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      showTemporaryToast(
        `Error completing copy: ${err.response?.data?.message || err.message}`,
        "error"
      );
    }
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
          newZoom = 1; // Reset to default 1x zoom
        }
        return parseFloat(newZoom.toFixed(2)); // To prevent floating point inaccuracies
      });
    } else if (type === "ac") {
      setAcZoomLevel((prevZoom) => {
        let newZoom = prevZoom;
        if (action === "in") {
          newZoom = Math.min(MAX_ZOOM, prevZoom + ZOOM_STEP);
        } else if (action === "out") {
          newZoom = Math.max(MIN_ZOOM, prevZoom - ZOOM_STEP);
        } else if (action === "reset") {
          newZoom = 1; // Reset to default 1x zoom
        }
        return parseFloat(newZoom.toFixed(2));
      });
    }
  };

  

  return (
    <div className="bg-gray-100 min-h-screen font-sans relative">
      {" "}
      {/* Added relative for toast positioning */}
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
            to="/examiner"
            className="text-gray-700 hover:text-indigo-600 flex items-center font-medium transition duration-200"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" /> Back to Dashboard
          </Link>
          <span className="text-gray-500">|</span>
          <span className="text-xl font-bold text-gray-800">Copy-Check</span>
        </div>
        <div>
          {/* Add other navigation options here if needed, e.g., Profile, Logout */}
          <Link
            to="/logout"
            className="text-gray-700 hover:text-red-600 font-medium transition duration-200"
          >
            Logout
          </Link>
        </div>
      </nav>
      <div className="p-8">
        {" "}
        {/* Main content padding */}
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-8 text-center tracking-tight">
            Checking:{" "}
            <span className="text-indigo-700">{copy.student.name}</span> (
            <span className="text-indigo-700">{copy.student.email}</span>) —{" "}
            <span className="text-purple-700">{copy.questionPaper.title}</span>
          </h1>
        </div>
        {/* Completion Timeline */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 max-w-6xl mx-auto mb-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-3">
            Marking Progress: {markedPagesCount} of {copy.totalPages} pages
            marked ({completionPercentage.toFixed(1)}%)
          </h3>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-indigo-600 h-4 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 w-full max-w-full mx-auto mb-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">
            Marking for Page {currentPage}
          </h3>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div className="flex-grow">
              <label
                htmlFor="marks"
                className="block text-base font-medium text-gray-700 mb-1"
              >
                Marks Awarded:
              </label>
              <input
                id="marks"
                type="number"
                min="0"
                value={marks}
                onChange={(e) => setMarks(e.target.value)}
                className="w-full md:w-32 px-3 py-1.5 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-base appearance-none"
                placeholder="e.g., 10"
              />
            </div>
            {/* Moved the Save button here, alongside the marks input on larger screens */}
            <button
              onClick={handleSavePage}
              disabled={isSaving}
              className="w-full md:w-auto bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 ease-in-out text-xl font-semibold shadow-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <svg
                  className="animate-spin h-6 w-6 mr-3 text-white"
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
                <ClipboardDocumentCheckIcon className="h-6 w-6 mr-3" />
              )}
              {isSaving ? "Saving..." : "Save & Next Page"}
            </button>
          </div>

          <div className="mb-4">
            {" "}
            {/* Reduced mb from mb-6 to mb-4 */}
            <label
              htmlFor="comments"
              className="block text-base font-medium text-gray-700 mb-1"
            >
              Comments / Annotations:
            </label>
            <textarea
              id="comments"
              rows={2}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-base resize-y"
              placeholder="Add any comments or annotations for this page..."
            ></textarea>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
          {/* Question Paper Section - Takes 5/12 width on large screens */}
          <div className="lg:col-span-5 bg-white p-6 rounded-xl shadow-lg border border-gray-200 flex flex-col">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 text-center">
              Question Paper
            </h2>
            {qpNumPages > 1 && (
              <div className="flex justify-between items-center w-full mb-4 space-x-4">
                {/* Page navigation for QP */}
                <button
                  onClick={() => {
                    setQpCurrentPage((p) => Math.max(1, p - 1));
                    // setIsQpLoading(true); // This is now handled by useEffect for qpCurrentPage
                  }}
                  disabled={qpCurrentPage === 1}
                  className="flex-1 px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-lg"
                >
                  Prev
                </button>
                <span className="text-lg font-bold text-gray-800">
                  Page {qpCurrentPage} / {qpNumPages || "..."}
                </span>
                <button
                  onClick={() => {
                    setQpCurrentPage((p) =>
                      Math.min(qpNumPages, p + 1)
                    );
                    // setIsQpLoading(true); // This is now handled by useEffect for qpCurrentPage
                  }}
                  disabled={qpCurrentPage === qpNumPages}
                  className="flex-1 px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-lg"
                >
                  Next
                </button>
              </div>
            )}
            <div className="relative w-full flex-grow h-[400px] rounded-lg overflow-auto border border-gray-300 bg-gray-50 flex items-center justify-center">
              {isQpLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 z-10 rounded-lg">
                  <svg
                    className="animate-spin h-8 w-8 text-indigo-500"
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
                  <span className="ml-2 text-gray-700">Loading...</span>
                </div>
              )}
              {qpPdfUrl ? (
                <Document
                  file={qpPdfUrl}
                  onLoadSuccess={onDocumentLoadSuccessQP}
                  onLoadError={onDocumentLoadErrorQP}
                  className="w-full h-full flex justify-center items-center" // Center the document
                >
                  <Page
                    pageNumber={qpCurrentPage}
                    scale={qpZoomLevel}
                    renderAnnotationLayer={true}
                    renderTextLayer={true}
                    onRenderSuccess={onRenderSuccessQP} // Add this
                    customTextRenderer={({ str, itemIndex }) => (
                      <span
                        key={itemIndex}
                        className="react-pdf__Page__textContent__text"
                        style={{ opacity: 0 }}
                      >
                        {str}
                      </span>
                    )} // Hide text layer to prevent double text
                  />
                </Document>
              ) : (
                <div className="text-gray-500 text-center p-4">
                  Question Paper PDF Not Found.
                </div>
              )}
            </div>
            <div className="flex items-center justify-center mt-4 space-x-2">
              {" "}
              {/* Zoom controls centered below QP */}
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
                disabled={qpZoomLevel === 1}
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

          {/* Answer Copy Section - Takes 7/12 width on large screens */}
          <div className="lg:col-span-7 bg-white p-6 rounded-xl shadow-lg border border-gray-200 flex flex-col">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 text-center">
              Answer Copy
            </h2>
            <div className="flex justify-between items-center w-full mb-4 space-x-4">
              {" "}
              {/* Page navigation for AC */}
              <button
                onClick={() => {
                  setCurrentPage((p) => Math.max(1, p - 1));
                  // setIsAcLoading(true); // This is now handled by useEffect for currentPage
                }}
                disabled={currentPage === 1}
                className="flex-1 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-lg"
              >
                Prev
              </button>
              <span className="text-lg font-bold text-gray-800">
                Page {currentPage} / {acNumPages || "..."}
              </span>
              <button
                onClick={() => {
                  setCurrentPage((p) => Math.min(acNumPages, p + 1));
                  // setIsAcLoading(true); // This is now handled by useEffect for currentPage
                }}
                disabled={currentPage === acNumPages}
                className="flex-1 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-lg"
              >
                Next
              </button>
            </div>
            <div className="relative w-full flex-grow h-[400px] rounded-lg overflow-auto border border-gray-300 bg-gray-50 flex items-center justify-center">
              {isAcLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 z-10 rounded-lg">
                  <svg
                    className="animate-spin h-8 w-8 text-indigo-500"
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
                  <span className="ml-2 text-gray-700">Loading...</span>
                </div>
              )}
              {acPdfUrl ? (
                <Document
                  file={acPdfUrl}
                  onLoadSuccess={onDocumentLoadSuccessAC}
                  onLoadError={onDocumentLoadErrorAC}
                  className="w-full h-full flex justify-center items-center" // Center the document
                >
                  <Page
                    pageNumber={currentPage}
                    scale={acZoomLevel}
                    renderAnnotationLayer={true}
                    renderTextLayer={true}
                    onRenderSuccess={onRenderSuccessAC} // Add this
                    customTextRenderer={({ str, itemIndex }) => (
                      <span
                        key={itemIndex}
                        className="react-pdf__Page__textContent__text"
                        style={{ opacity: 0 }}
                      >
                        {str}
                      </span>
                    )} // Hide text layer to prevent double text
                  />
                </Document>
              ) : (
                <div className="text-gray-500 text-center p-4">
                  Answer Copy PDF Not Found.
                </div>
              )}
            </div>
            <div className="flex items-center justify-center mt-4 space-x-2">
              {" "}
              {/* Zoom controls centered below AC */}
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
                disabled={acZoomLevel === 1}
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
        {/* Mark Allocation Form */}
        {/* Running Total & Review Button */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-xl shadow-lg border border-gray-200 max-w-4xl mx-auto">
          <div className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-4 md:mb-0">
            Total Marks: <span className="text-green-700">{totalMarks}</span>
          </div>
          <button
            onClick={() => setShowReviewModal(true)}
            className="bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 ease-in-out text-xl font-semibold shadow-md flex items-center justify-center"
          >
            <PaperAirplaneIcon className="h-6 w-6 mr-3" /> Review & Submit Final
          </button>
        </div>
        {/* Completion Status */}
        {copy.status === "evaluated" && ( // Changed from 'completed' to 'evaluated' based on examiner.controller.js
          <div className="text-center text-xl text-green-600 font-semibold bg-green-50 p-4 rounded-lg mt-6 max-w-4xl mx-auto border border-green-200">
            This copy has been fully marked. Ready for final review.
          </div>
        )}
        {/* Review Modal */}
        <Modal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          title="Review Marked Pages"
        >
          <div className="max-h-[70vh] overflow-y-auto pr-2 -mr-2">
            {" "}
            {/* Added overflow for scrollable content */}
            {copy.pages.length === 0 ? (
              <p className="text-gray-600 text-center py-4">
                No pages have been marked yet.
              </p>
            ) : (
              <div className="space-y-6">
                {copy.pages
                  .sort((a, b) => a.pageNumber - b.pageNumber)
                  .map((page) => (
                    <div
                      key={page.pageNumber}
                      className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm"
                    >
                      <h4 className="text-lg font-bold text-gray-800 mb-2">
                        Page {page.pageNumber}
                      </h4>
                      <p className="text-gray-700">
                        <strong>Marks:</strong>{" "}
                        <span className="font-semibold text-green-700">
                          {page.marksAwarded ?? "N/A"}
                        </span>
                      </p>
                      <p className="text-gray-700">
                        <strong>Comments:</strong>{" "}
                        {page.comments || "No comments."}
                      </p>
                      {/* Optionally, add a small thumbnail here if you have a way to generate/fetch them */}
                      {/* <img src={`/api/drive/page-thumbnail/${copy.driveFile.id}/${page.pageNumber}`} alt={`Page ${page.pageNumber}`} className="mt-2 w-24 h-auto border rounded" /> */}
                    </div>
                  ))}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
            {/* Total marks showing*/}
            <div className="text-lg font-semibold text-gray-800 pt-2">
              Total Marks:{" "}
              <span className="text-green-700">{totalMarks}</span>
            </div>
            <button
              onClick={() => setShowReviewModal(false)}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold transition"
            >
              Keep Checking
            </button>
            <button
              onClick={handleFinalSubmit}
              disabled={markedPagesCount !== copy.totalPages} // Only enable if all pages are marked
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm & Finish
            </button>
          </div>
          {markedPagesCount !== copy.totalPages && (
            <p className="text-sm text-red-500 text-center mt-3">
              *You must mark all {copy.totalPages} pages before confirming final
              submission.
            </p>
          )}
        </Modal>
      </div>
    </div>
  );
}