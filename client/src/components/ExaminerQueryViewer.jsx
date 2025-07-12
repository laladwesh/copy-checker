import React, { useState, useEffect,  useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  PaperAirplaneIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ArrowsPointingInIcon,
  UserCircleIcon, // For student info
  ArrowPathIcon, // Added missing import for ArrowPathIcon
} from "@heroicons/react/24/outline";

// Import react-pdf components
import { Document, Page, pdfjs } from "react-pdf";
import 'react-pdf/dist/Page/AnnotationLayer.css'; // Essential for annotations like links
import 'react-pdf/dist/Page/TextLayer.css'; // Essential for selectable text

// Set worker source for react-pdf
// This is crucial for react-pdf to work correctly.
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function ExaminerQueryViewer() {
  const { queryId } = useParams();

  // State for query and copy data
  const [query, setQuery] = useState(null);
  const [copy, setCopy] = useState(null); // The copy associated with the query
  const [error, setError] = useState(""); // Added error state

  // Page navigation states for Answer Copy
  const [currentPage, setCurrentPage] = useState(1); // Current page of the Answer Copy
  const [acZoomLevel, setAcZoomLevel] = useState(1);
  const [isAcLoading, setIsAcLoading] = useState(true);
  const [acNumPages, setAcNumPages] = useState(null); // Total pages for AC

  // Page navigation states for Question Paper
  const [qpCurrentPage, setQpCurrentPage] = useState(1); // Current page of the Question Paper
  const [qpZoomLevel, setQpZoomLevel] = useState(1);
  const [isQpLoading, setIsQpLoading] = useState(true);
  const [qpNumPages, setQpNumPages] = useState(null); // Total pages for QP

  // UI States (for toast messages and loading)
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState({
    message: "",
    type: "success",
  });

  // Reply state
  const [replyText, setReplyText] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // NEW: States for editing marks, comments, and annotations
  const [marks, setMarks] = useState("");
  const [comments, setComments] = useState("");
  const [annotations, setAnnotations] = useState(""); // Assuming annotations are text-based for now
  const [isUpdatingPage, setIsUpdatingPage] = useState(false);


  const ZOOM_STEP = 0.25;
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 3;

  useEffect(() => {
    const fetchQueryAndCopy = async () => {
      try {
        const queryRes = await api.get(`/examiner/queries/${queryId}`);
        setQuery(queryRes.data);
        setReplyText(queryRes.data.response || ""); // Pre-fill reply if already exists

        // Fetch the full copy details using the copy ID from the query
        if (queryRes.data.copy?._id) {
          setIsAcLoading(true);
          setIsQpLoading(true); // Start loading for QP as well
          const copyRes = await api.get(`/examiner/copies/${queryRes.data.copy._id}`);
          setCopy(copyRes.data);
          setCurrentPage(queryRes.data.pageNumber); // Set AC page to the query page
          setQpCurrentPage(1); // Set QP page to 1

          // NEW: Populate mark/comment fields based on the queried page
          const queriedPage = copyRes.data.pages.find(
            (p) => p.pageNumber === queryRes.data.pageNumber
          );
          if (queriedPage) {
            setMarks(queriedPage.marksAwarded !== undefined ? queriedPage.marksAwarded.toString() : "");
            setComments(queriedPage.comments || "");
            setAnnotations(queriedPage.annotations || "");
          } else {
            setMarks("");
            setComments("");
            setAnnotations("");
          }

        } else {
          setError("Associated copy not found for this query.");
        }
      } catch (err) {
        console.error("Error fetching query or copy:", err);
        setError(err.response?.data?.message || err.message);
        showTemporaryToast(
          `Error loading query: ${err.response?.data?.message || err.message}`,
          "error"
        );
      } finally {
        // These will be set by react-pdf's onLoadSuccess
        // setIsAcLoading(false);
        // setIsQpLoading(false);
      }
    };
    fetchQueryAndCopy();
  }, [queryId]);

  // Reset zoom when current page of answer copy changes
  useEffect(() => {
    setAcZoomLevel(1);
  }, [currentPage]);

  // Reset zoom when current page of question paper changes
  useEffect(() => {
    setQpZoomLevel(1);
  }, [qpCurrentPage]);


  const showTemporaryToast = (msg, type = "success") => {
    setToastMessage({ message: msg, type: type });
    setShowToast(true);
    const timer = setTimeout(() => {
      setShowToast(false);
      setToastMessage({ message: "", type: "success" });
    }, 4000); // Hide after 4 seconds
    return () => clearTimeout(timer);
  };

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
    if (!replyText.trim()) {
      showTemporaryToast("Reply text cannot be empty.", "error");
      return;
    }
    setIsSubmittingReply(true);
    try {
      const res = await api.patch(`/examiner/queries/${queryId}/reply`, {
        response: replyText.trim(),
      });
      setQuery(res.data); // Update query with new status and response
      showTemporaryToast("Reply sent and query resolved!", "success");
    } catch (err) {
      console.error("Error submitting reply:", err);
      showTemporaryToast(
        `Error submitting reply: ${err.response?.data?.message || err.message}`,
        "error"
      );
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // NEW: Handle updating marks/comments/annotations for the current page
  const handleUpdatePageDetails = async () => {
    setIsUpdatingPage(true);
    try {
      const payload = {
        pageNumber: currentPage, // Always update the currently viewed page
        marks: marks === "" ? null : parseFloat(marks), // Send null if empty, else parse
        comments: comments,
        annotations: annotations,
        queryId: query._id,
      };
      const res = await api.patch(`/examiner/copies/${copy._id}/mark-page`, payload);
      setCopy(res.data); // Update the copy state with the new page details
      showTemporaryToast("Page details updated successfully!", "success");
    } catch (err) {
      console.error("Error updating page details:", err);
      showTemporaryToast(
        `Error updating page: ${err.response?.data?.message || err.message}`,
        "error"
      );
    } finally {
      setIsUpdatingPage(false);
    }
  };

  // Handlers for react-pdf Document load success
  const onDocumentLoadSuccessAC = useCallback(({ numPages }) => {
    setAcNumPages(numPages);
    setIsAcLoading(false);
  }, []);

  const onDocumentLoadSuccessQP = useCallback(({ numPages }) => {
    setQpNumPages(numPages);
    setIsQpLoading(false);
  }, []);

  const onDocumentError = useCallback((err) => {
    console.error("Error loading PDF document:", err);
    setError(`Failed to load PDF document: ${err.message}`);
    setIsAcLoading(false); // Ensure loading is off on error
    setIsQpLoading(false); // Ensure loading is off on error
  }, []);

  if (error)
    return (
      <div className="text-red-500 text-center py-10 text-xl font-semibold">
        Error: {error}
      </div>
    );
  if (!query || !copy)
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
          <p className="mt-4">Loading query details...</p>
        </div>
      </div>
    );

    // Construct the PDF URLs directly from driveFile.id
    const acPdfUrl = copy.driveFile?.id
      ? `/api/drive/pdf/${copy.driveFile.id}`
      : null;

    const qpPdfUrl = copy.questionPaper?.driveFile?.id
      ? `/api/drive/pdf/${copy.questionPaper.driveFile.id}`
      : null;

  return (
    <div className="bg-gray-100 min-h-screen font-sans relative p-8">
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

      {/* Back to Queries Button */}
      <Link
        to="/examiner/queries"
        className="text-indigo-600 hover:underline flex items-center mb-6 font-medium"
      >
        <ArrowLeftIcon className="w-5 h-5 mr-2" /> Back to All Queries
      </Link>

      <h1 className="text-4xl font-extrabold text-gray-900 mb-8 text-center tracking-tight">
        Review Query for{" "}
        <span className="text-purple-700">{copy.questionPaper?.title || 'N/A'}</span>
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]"> {/* Adjusted height for better fit */}
        {/* Left Column: Answer Copy Viewer */}
        <div className="lg:col-span-1 bg-white p-4 rounded-xl shadow-lg border border-gray-200 flex flex-col">
          <h3 className="text-xl font-semibold text-gray-800 mb-3 text-center">
            Answer Copy (Page {currentPage} of {acNumPages || 'N/A'})
          </h3>
          <div className="flex justify-between items-center w-full mb-3 space-x-2">
            <button
              onClick={() => {
                setCurrentPage((p) => Math.max(1, p - 1));
                setIsAcLoading(true);
              }}
              disabled={currentPage === 1}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-md"
            >
              Prev
            </button>
            <span className="text-md font-bold text-gray-800">
              Page {currentPage} / {acNumPages || 'N/A'}
            </span>
            <button
              onClick={() => {
                setCurrentPage((p) => Math.min(acNumPages || 1, p + 1));
                setIsAcLoading(true);
              }}
              disabled={currentPage === (acNumPages || 1)}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-md"
            >
              Next
            </button>
          </div>
          <div className="relative w-full flex-grow h-[450px] rounded-lg overflow-auto border border-gray-300 bg-gray-50 flex items-center justify-center">
            {isAcLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 z-10">
                <svg
                  className="animate-spin h-8 w-8 text-indigo-500"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="ml-2 text-gray-700">Loading Answer Copy Page...</span>
              </div>
            )}
            {acPdfUrl ? (
              <Document
                file={acPdfUrl}
                onLoadSuccess={onDocumentLoadSuccessAC}
                onLoadError={onDocumentError}
                loading={""} // Hide default loading text
                className="w-full h-full flex justify-center items-center"
              >
                <Page
                  pageNumber={currentPage}
                  scale={acZoomLevel}
                  renderAnnotationLayer={true}
                  renderTextLayer={true}
                  onRenderSuccess={() => setIsAcLoading(false)}
                  onRenderError={() => setIsAcLoading(false)}
                />
              </Document>
            ) : (
              <div className="text-gray-500 text-center p-4">
                Answer Copy Not Available.
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

        {/* Middle Column: Question Paper Viewer */}
        <div className="lg:col-span-1 bg-white p-4 rounded-xl shadow-lg border border-gray-200 flex flex-col">
          <h3 className="text-xl font-semibold text-gray-800 mb-3 text-center">
            Question Paper (Page {qpCurrentPage} of {qpNumPages || 'N/A'})
          </h3>
          <div className="flex justify-between items-center w-full mb-3 space-x-2">
            <button
              onClick={() => {
                setQpCurrentPage((p) => Math.max(1, p - 1));
                setIsQpLoading(true);
              }}
              disabled={qpCurrentPage === 1}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-md"
            >
              Prev
            </button>
            <span className="text-md font-bold text-gray-800">
              Page {qpCurrentPage} / {qpNumPages || 'N/A'}
            </span>
            <button
              onClick={() => {
                setQpCurrentPage((p) => Math.min(qpNumPages || 1, p + 1));
                setIsQpLoading(true);
              }}
              disabled={qpCurrentPage === (qpNumPages || 1)}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-md"
            >
              Next
            </button>
          </div>
          <div className="relative w-full flex-grow h-[450px] rounded-lg overflow-auto border border-gray-300 bg-gray-50 flex items-center justify-center">
            {isQpLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 z-10">
                <svg
                  className="animate-spin h-8 w-8 text-indigo-500"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="ml-2 text-gray-700">Loading Question Paper Page...</span>
              </div>
            )}
            {qpPdfUrl ? (
              <Document
                file={qpPdfUrl}
                onLoadSuccess={onDocumentLoadSuccessQP}
                onLoadError={onDocumentError}
                loading={""} // Hide default loading text
                className="w-full h-full flex justify-center items-center"
              >
                <Page
                  pageNumber={qpCurrentPage}
                  scale={qpZoomLevel}
                  renderAnnotationLayer={true}
                  renderTextLayer={true}
                  onRenderSuccess={() => setIsQpLoading(false)}
                  onRenderError={() => setIsQpLoading(false)}
                />
              </Document>
            ) : (
              <div className="text-gray-500 text-center p-4">
                Question Paper Not Available.
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

        {/* Rightmost Column: Query Details and Reply */}
        <div className="lg:col-span-1 bg-white p-4 rounded-xl shadow-lg border border-gray-200 flex flex-col">
          <h3 className="text-xl font-semibold text-gray-800 mb-3 text-center">Query Details & Reply</h3>
          <div className="mb-4 p-4 border rounded-md bg-gray-50 flex-grow">
            <p className="text-sm text-gray-600 mb-2">
              <UserCircleIcon className="inline-block h-5 w-5 mr-1 text-gray-500" />
              <strong>Student:</strong> {query.raisedBy?.name || 'N/A'} ({query.raisedBy?.email || 'N/A'})
            </p>
            <p className="text-sm text-gray-600 mb-2"><strong>Exam:</strong> {copy.questionPaper?.title || 'N/A'}</p>
            <p className="text-sm text-gray-600 mb-2"><strong>Page Number:</strong> {query.pageNumber}</p>
            <p className="text-sm text-gray-600 mb-2"><strong>Status:</strong>{" "}
              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                query.status === 'approved_by_admin' ? 'bg-yellow-100 text-yellow-800' :
                query.status === 'resolved_by_examiner' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {query.status.replace(/_/g, ' ')}
              </span>
            </p>
            <div className="mt-3 p-3 border-t border-gray-200 bg-white rounded-md">
              <p className="text-gray-800 font-bold mb-2">Student's Query:</p>
              <p className="text-gray-700 whitespace-pre-wrap">{query.text}</p>
            </div>
            {query.response && (
              <div className="mt-4 p-3 border-t border-gray-200 bg-white rounded-md">
                <p className="text-gray-800 font-bold mb-2">Your Response:</p>
                <p className="text-gray-700 whitespace-pre-wrap">{query.response}</p>
              </div>
            )}
          </div>

          {/* NEW: Marks, Comments, Annotations Input Fields */}
          <div className="mt-4 p-4 border rounded-md bg-white">
            <h4 className="text-lg font-semibold text-gray-800 mb-3">Update Page Details (Page {currentPage})</h4>
            <div className="mb-3">
              <label htmlFor="marks" className="block text-sm font-medium text-gray-700">
                Marks Awarded:
              </label>
              <input
                type="number"
                id="marks"
                value={marks}
                onChange={(e) => setMarks(e.target.value)}
                className="w-full p-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., 10"
              />
            </div>
            <div className="mb-3">
              <label htmlFor="comments" className="block text-sm font-medium text-gray-700">
                Comments:
              </label>
              <textarea
                id="comments"
                rows="3"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="w-full p-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 resize-y"
                placeholder="Add comments for this page..."
              ></textarea>
            </div>
            <button
              onClick={handleUpdatePageDetails}
              disabled={isUpdatingPage || query.status === 'resolved_by_examiner'}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:shadow-outline transition duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdatingPage ? (
                <>
                  <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" /> Updating...
                </>
              ) : (
                "Update Page Details"
              )}
            </button>
          </div>
          {/* END NEW: Marks, Comments, Annotations Input Fields */}

          {query.status === 'resolved_by_examiner' ? (
            <p className="text-center text-sm text-green-600 mt-4">
              This query has already been resolved by you.
            </p>
          ) : (
            <form onSubmit={handleReplySubmit} className="mt-auto pt-4">
              <div className="mb-4">
                <label htmlFor="replyText" className="block text-gray-700 text-base font-medium mb-2">
                  Your Reply:
                </label>
                <textarea
                  id="replyText"
                  rows="4"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:ring-2 focus:ring-indigo-500 resize-y"
                  placeholder="Type your response here..."
                  required
                ></textarea>
              </div>
              <button
                type="submit"
                disabled={isSubmittingReply || query.status !== 'approved_by_admin'} // Only enable if approved by admin
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingReply ? (
                  <>
                    <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    <PaperAirplaneIcon className="h-5 w-5 mr-2" /> Send Reply & Resolve
                  </>
                )}
              </button>
              {query.status !== 'approved_by_admin' && (
                <p className="text-sm text-red-500 text-center mt-3">
                  This query is not in a state to be replied to (Status: {query.status.replace(/_/g, ' ')}).
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}