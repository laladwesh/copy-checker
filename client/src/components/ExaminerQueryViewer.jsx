import React, { useState, useEffect,  useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";
import {
  ArrowLeftIcon,
  PaperAirplaneIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ArrowsPointingInIcon,
  ArrowPathIcon, // Added missing import for ArrowPathIcon
  BookOpenIcon,
} from "@heroicons/react/24/outline";
import { toastSuccess, toastError } from "../utils/hotToast";

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
  const [acZoomLevel, setAcZoomLevel] = useState(1.25);
  const [isAcLoading, setIsAcLoading] = useState(true);
  const [acNumPages, setAcNumPages] = useState(null); // Total pages for AC

  // UI States (for loading)

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
          const copyRes = await api.get(`/examiner/copies/${queryRes.data.copy._id}`);
          setCopy(copyRes.data);
          setCurrentPage(queryRes.data.pageNumber); // Set AC page to the query page

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
        toastError(`Error loading query: ${err.response?.data?.message || err.message}`);
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
    setAcZoomLevel(1.25);
  }, [currentPage]);

  // Use toastSuccess/toastError/toastInfo for notifications

  const handleZoom = (action) => {
    setAcZoomLevel((prevZoom) => {
      let newZoom = prevZoom;
      if (action === "in") {
        newZoom = Math.min(MAX_ZOOM, prevZoom + ZOOM_STEP);
      } else if (action === "out") {
        newZoom = Math.max(MIN_ZOOM, prevZoom - ZOOM_STEP);
      } else if (action === "reset") {
        newZoom = 1.25;
      }
      return parseFloat(newZoom.toFixed(2));
    });
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) {
      toastError("Reply text cannot be empty.");
      return;
    }
    setIsSubmittingReply(true);
    try {
      const res = await api.patch(`/examiner/queries/${queryId}/reply`, {
        response: replyText.trim(),
      });
      setQuery(res.data); // Update query with new status and response
      toastSuccess("Reply sent and query resolved!");
    } catch (err) {
      console.error("Error submitting reply:", err);
      toastError(`Error submitting reply: ${err.response?.data?.message || err.message}`);
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
      toastSuccess("Page details updated successfully!");
    } catch (err) {
      console.error("Error updating page details:", err);
      toastError(`Error updating page: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsUpdatingPage(false);
    }
  };

  // Handlers for react-pdf Document load success
  const onDocumentLoadSuccessAC = useCallback(({ numPages }) => {
    setAcNumPages(numPages);
    setIsAcLoading(false);
  }, []);

  const onDocumentError = useCallback((err) => {
    console.error("Error loading PDF document:", err);
    setError(`Failed to load PDF document: ${err.message}`);
    setIsAcLoading(false); // Ensure loading is off on error
  }, []);

  if (error)
    return (
      <div className="text-red-500 text-center py-10 text-xl font-semibold">
        Error: {error}
      </div>
    );
  if (!query || !copy)
    return (
      <div className="flex justify-center items-center h-screen bg-white">
        <div className="flex flex-col items-center text-gray-600 text-lg font-bold">
          <svg
            className="animate-spin h-10 w-10 text-gray-900"
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
    <div className="bg-white min-h-screen font-sans relative p-2" style={{fontFamily: 'Dosis, sans-serif'}}>
      {/* Toasts are provided globally via react-hot-toast */}

      {/* Back to Queries Button */}
      <Link
        to="/examiner/queries"
        className="text-gray-900 hover:text-[#1e3a8a] hover:underline flex items-center mb-6 font-bold"
      >
        <ArrowLeftIcon className="w-5 h-5 mr-2" /> Back to All Queries
      </Link>

      <h1 className="text-4xl font-extrabold text-gray-900 mb-8 text-center tracking-tight">
        Review Query for{" "}
        <span className="text-gray-900">{copy.questionPaper?.title || 'N/A'}</span>
      </h1>

      <div className="flex flex-col lg:flex-row gap-3 h-[calc(100vh-120px)]">
        {/* Left Column: Answer Copy Viewer - Takes more width */}
        <div className="bg-white p-3 rounded-lg border border-gray-300 flex flex-col lg:w-[75%]">
          {/* <h3 className="text-lg font-semibold text-gray-800 mb-2 text-center">
            Answer Copy (Page {currentPage} of {acNumPages || 'N/A'})
          </h3> */}
          <div className="flex justify-between items-center w-full mb-2 space-x-2">
            <button
              onClick={() => {
                setCurrentPage((p) => Math.max(1, p - 1));
                setIsAcLoading(true);
              }}
              disabled={currentPage === 1}
              className=" px-3 py-1.5 bg-gray-900 text-white rounded-md hover:bg-[#1e3a8a] disabled:opacity-50 disabled:cursor-not-allowed transition font-bold text-sm"
            >
              Prev
            </button>
            <span className="text-base font-bold text-gray-900">
              Page {currentPage} / {acNumPages || 'N/A'}
            </span>
            <button
              onClick={() => {
                setCurrentPage((p) => Math.min(acNumPages || 1, p + 1));
                setIsAcLoading(true);
              }}
              disabled={currentPage === (acNumPages || 1)}
              className=" px-3 py-1.5 bg-gray-900 text-white rounded-md hover:bg-[#1e3a8a] disabled:opacity-50 disabled:cursor-not-allowed transition font-bold text-sm"
            >
              Next
            </button>
          </div>
          <div className="relative w-full flex-grow rounded-lg overflow-auto border-2 border-gray-300 bg-gray-50 flex items-center justify-center">
            {isAcLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 z-10">
                <svg
                  className="animate-spin h-10 w-10 text-gray-900"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="ml-2 text-lg text-gray-700">Loading Answer Copy...</span>
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
            
            {/* Render examiner's marks on the current page (read-only) */}
            {copy && copy.pages && Array.isArray(copy.pages) && (() => {
              const pageData = copy.pages.find(p => p && p.pageNumber === currentPage);
              if (pageData && pageData.pageMarks && Array.isArray(pageData.pageMarks) && pageData.pageMarks.length > 0) {
                return pageData.pageMarks
                  .filter(mark => mark && typeof mark.value === 'number' && typeof mark.x === 'number' && typeof mark.y === 'number')
                  .map((mark, idx) => (
                  <div
                    key={idx}
                    className="absolute pointer-events-none"
                    style={{
                      left: `${mark.x}%`,
                      top: `${mark.y}%`,
                      transform: 'translate(-50%, -50%)',
                      zIndex: 20
                    }}
                  >
                    <div className={`w-12 h-12 flex items-center justify-center rounded-full text-white text-sm font-bold shadow-lg ${mark.value > 0 ? 'bg-green-500' : 'bg-red-500'}`}>
                      {Number(mark.value % 1 === 0 ? mark.value : mark.value.toFixed(1))}
                    </div>
                  </div>
                ));
              }
              return null;
            })()}
          </div>
          <div className="flex items-center justify-center mt-2 space-x-2">
            <button
              onClick={() => handleZoom("out")}
              disabled={acZoomLevel === MIN_ZOOM}
              className="p-2.5 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
              title="Zoom Out"
            >
              <MagnifyingGlassMinusIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => handleZoom("in")}
              disabled={acZoomLevel === MAX_ZOOM}
              className="p-2.5 bg-gray-900 text-white rounded-lg hover:bg-[#1e3a8a] disabled:opacity-50 disabled:cursor-not-allowed transition"
              title="Zoom In"
            >
              <MagnifyingGlassPlusIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => handleZoom("reset")}
              disabled={acZoomLevel === MIN_ZOOM}
              className="p-2.5 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
              title="Reset Zoom"
            >
              <ArrowsPointingInIcon className="h-5 w-5" />
            </button>
            <span className="text-sm text-gray-600 font-bold">
              {acZoomLevel.toFixed(2)}x
            </span>
          </div>
        </div>

        {/* Right Column: Query Details and Reply - Takes less width */}
        <div className="bg-white p-3 rounded-lg border border-gray-300 flex flex-col overflow-y-auto lg:w-[25%]">
          <h3 className="text-lg font-bold text-gray-900 mb-2 text-center">Query Details & Reply</h3>
          <div className="mb-2 p-2 border rounded-md bg-gray-50">
            <p className="text-sm text-gray-600 mb-2">
              {/* <UserCircleIcon className="inline-block h-5 w-5 mr-1 text-gray-500" /> */}
              {/* <strong>Student:</strong> {query.raisedBy?.name || 'N/A'} ({query.raisedBy?.email || 'N/A'}) */}
            </p>
            <p className="text-sm text-gray-600 mb-1"><strong className="font-bold">Exam:</strong> {copy.questionPaper?.title || 'N/A'}</p>
            {qpPdfUrl && (
              <p className="text-sm text-gray-600 mb-1">
                <strong className="font-bold">Question Paper:</strong>{" "}
                <a href={qpPdfUrl} target="_blank" rel="noopener noreferrer" className="text-gray-900 hover:text-[#1e3a8a] underline font-bold">
                  Open PDF
                </a>
              </p>
            )}
            <p className="text-sm text-gray-600 mb-1"><strong className="font-bold">Page Number:</strong> {query.pageNumber}</p>
            <p className="text-sm text-gray-600 mb-1"><strong className="font-bold">Status:</strong>{" "}
              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                query.status === 'approved_by_admin' ? 'bg-yellow-100 text-yellow-800' :
                query.status === 'resolved_by_examiner' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {query.status.replace(/_/g, ' ')}
              </span>
            </p>
            <div className="mt-2 p-2 border-t border-gray-200 bg-white rounded-md">
              <p className="text-gray-800 font-bold mb-1 text-sm">Student's Query:</p>
              <p className="text-gray-700 whitespace-pre-wrap text-sm">{query.text}</p>
            </div>
            {query.response && (
              <div className="mt-2 p-2 border-t border-gray-200 bg-white rounded-md">
                <p className="text-gray-800 font-bold mb-1 text-sm">Your Response:</p>
                <p className="text-gray-700 whitespace-pre-wrap text-sm">{query.response}</p>
              </div>
            )}
          </div>

          {/* Marks, Comments, Annotations Input Fields */}
          <div className="mt-2 p-2 border rounded-md bg-white">
            <h4 className="text-base font-bold text-gray-900 mb-2">Update Page Details (Page {currentPage})</h4>
            <div className="mb-2">
              <label htmlFor="marks" className="block text-sm font-bold text-gray-900">
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
            <div className="mb-2">
              <label htmlFor="comments" className="block text-sm font-bold text-gray-900">
                Comments:
              </label>
              <textarea
                id="comments"
                rows="2"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="w-full p-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 resize-y text-sm"
                placeholder="Add comments for this page..."
              ></textarea>
            </div>
            <button
              onClick={handleUpdatePageDetails}
              disabled={isUpdatingPage || query.status === 'resolved_by_examiner'}
              className="w-full bg-gray-900 hover:bg-[#1e3a8a] text-white font-bold py-1.5 px-3 rounded-md focus:outline-none focus:shadow-outline transition duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed text-sm"
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

          {query.status === 'resolved_by_examiner' ? (
            <p className="text-center text-sm text-green-600 mt-2">
              This query has already been resolved by you.
            </p>
          ) : (
            <form onSubmit={handleReplySubmit} className="mt-2 pt-2 border-t">
              <div className="mb-2">
                <label htmlFor="replyText" className="block text-gray-900 text-sm font-bold mb-1">
                  Your Reply:
                </label>
                <textarea
                  id="replyText"
                  rows="3"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-2 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:ring-2 focus:ring-indigo-500 resize-y text-sm"
                  placeholder="Type your response here..."
                  required
                ></textarea>
              </div>
              <button
                type="submit"
                disabled={isSubmittingReply || query.status !== 'approved_by_admin'} // Only enable if approved by admin
                className="w-full bg-gray-900 hover:bg-[#1e3a8a] text-white font-bold py-1.5 px-3 rounded focus:outline-none focus:shadow-outline transition duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed text-sm"
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
                <p className="text-sm text-red-500 text-center mt-2">
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