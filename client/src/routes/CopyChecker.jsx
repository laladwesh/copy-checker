import React, { useState, useEffect, useCallback } from "react";
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
  const [marks, setMarks] = useState("");
  const [comments, setComments] = useState("");
  // Track pages saved in current session only (for temporary UI feedback)
  const [justSavedPages, setJustSavedPages] = useState(new Set());

  // UI States
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState({
    message: "",
    type: "success",
  });
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // For Save & Next button loading

  // React-pdf states for Answer Copy
  const [acNumPages, setAcNumPages] = useState(null);
  const [isAcLoading, setIsAcLoading] = useState(true);

  // Zoom States
  const [acZoomLevel, setAcZoomLevel] = useState(1.25); // Initial zoom level for AC

  const ZOOM_STEP = 0.25;
  const MIN_ZOOM = 0.5; // Adjusted min zoom for better flexibility
  const MAX_ZOOM = 3;

  // 1) Load the copy once on mount
  useEffect(() => {
    const fetchCopy = async () => {
      try {
        const res = await api.get(`/examiner/copies/${copyId}`);
        setCopy(res.data);
        // Set Answer Copy to page 1 on load
        setCurrentPage(1);
        // Reset loading state after initial document fetch
        setIsAcLoading(true); // Will be set to false by onRenderSuccessAC
        // Clear any temporary saved pages from previous session
        setJustSavedPages(new Set());
      } catch (err) {
        setError(err.response?.data?.error || err.message);
        showTemporaryToast(
          `Error loading copy: ${err.response?.data?.message || err.message}`,
          "error"
        );
        setIsAcLoading(false); // Ensure loading is off if there's an error
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
    setAcZoomLevel(1.25);
    setIsAcLoading(true);
  }, [currentPage, copy]);

  // Only use server-side data to determine if a page is truly checked/saved
  // A page is checked ONLY if it has lastAnnotatedBy set (meaning it was actually saved)
  const checkedPages = (copy?.pages || [])
    .filter((p) => Boolean(p.lastAnnotatedBy))
    .map((p) => p.pageNumber);
  const checkedPagesSet = new Set(checkedPages);
  const totalChecked = checkedPages.length;

  // (Question Paper is provided as an external link in the sidebar)

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

  // Calculate completion percentage for the timeline (use combined saved state)
  const completionPercentage =
    copy.totalPages > 0 ? (totalChecked / copy.totalPages) * 100 : 0;

  // Handler: save this page’s marks, then advance
  const handleSavePage = async () => {
    if (isSaving) return; // Prevent multiple submissions while saving
    setIsSaving(true);
    try {
      if (marks === "" || isNaN(parseFloat(marks))) {
        showTemporaryToast("Please enter a valid number for marks.", "error");
        setIsSaving(false);
        return;
      }
      if (parseFloat(marks) < 0) {
        showTemporaryToast("Marks cannot be negative.", "error");
        setIsSaving(false);
        return;
      }
      // Check if total marks would exceed the maximum allowed
      const currentPageData = copy.pages.find((p) => p.pageNumber === currentPage);
      const currentPageMarks = currentPageData?.marksAwarded || 0;
      const newTotalMarks = totalMarks - currentPageMarks + parseFloat(marks);
      const maxMarks = copy.questionPaper?.totalMarks || 0;
      
      if (newTotalMarks > maxMarks) {
        showTemporaryToast(
          `Cannot save! Total marks would be ${newTotalMarks.toFixed(2)} which exceeds the maximum allowed marks of ${maxMarks}.`,
          "error"
        );
        setIsSaving(false);
        return;
      }
      const payload = {
        pageNumber: currentPage,
        marks: parseFloat(marks), // Use parseFloat to support decimal marks
        comments,
      };
      const res = await api.patch(`/examiner/copies/${copyId}/mark-page`, payload);
      setCopy(res.data); // Update local copy state with new data from server
      // Mark this page as just saved for temporary UI feedback
      setJustSavedPages((prev) => {
        const next = new Set(Array.from(prev));
        next.add(currentPage);
        return next;
      });
      showTemporaryToast("Page marks saved successfully!", "success");

      // Advance to the next page only if it's not the last page
      if (currentPage < copy.totalPages) {
        setCurrentPage((p) => p + 1);
      } else {
        setIsAcLoading(false); // Stop loading state if on last page
        // question-paper loading not used here (QP is opened via link)
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
    // Only answer-copy zoom is needed in this view; ignore QP
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
      <div className="p-4">
        {" "}
        {/* Main content padding */}
        {/* <div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-8 text-center tracking-tight">
            Checking:{" "}
            <span className="text-indigo-700">{copy.student.name}</span> (
            <span className="text-indigo-700">{copy.student.email}</span>) —{" "}
            <span className="text-purple-700">{copy.questionPaper.title}</span>
          </h1>
        </div> */}
        {/* Completion Timeline */}
        <div className="bg-white p-3 rounded-md border border-gray-200 max-w-6xl mx-auto mb-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-3">
            Marking Progress: {totalChecked} of {copy.totalPages} pages
            checked ({completionPercentage.toFixed(1)}%)
          </h3>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-indigo-600 h-4 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
        </div>
        {/* Main layout: Answer Copy center-expanded, controls + marking on right sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
          <div className="lg:col-span-10 bg-white flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-2">
              <h2 className="text-2xl p-4 font-semibold text-gray-800 text-center">Answer Copy</h2>
              {/* Page check indicator */}
              <div className="flex items-center space-x-2 mr-2">
                {(function(){
                  const isChecked = checkedPagesSet.has(currentPage);
                  return (
                    <>
                      <span className={`h-3 w-3 rounded-full ${isChecked ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className="text-sm text-gray-700">{isChecked ? 'Checked' : 'Not checked'}</span>
                    </>
                  );
                })()}
              </div>
            </div>
            <div className="relative w-full overflow-auto flex items-center justify-center" style={{ height: 'calc(100vh - 180px)' }}>
              {isAcLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 z-10">
                  <svg className="animate-spin h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="ml-2 text-gray-700">Loading...</span>
                </div>
              )}
              {acPdfUrl ? (
                <Document file={acPdfUrl} onLoadSuccess={onDocumentLoadSuccessAC} onLoadError={onDocumentLoadErrorAC} className="w-full h-full flex justify-center items-center">
                  <Page pageNumber={currentPage} scale={acZoomLevel} renderAnnotationLayer={true} renderTextLayer={true} onRenderSuccess={onRenderSuccessAC} customTextRenderer={({ str, itemIndex }) => (
                    <span key={itemIndex} className="react-pdf__Page__textContent__text" style={{ opacity: 0 }}>{str}</span>
                  )} />
                </Document>
              ) : (
                <div className="text-gray-500 text-center p-2">Answer Copy PDF Not Found.</div>
              )}
            </div>

            {/* Horizontal Page Navigation moved below the PDF viewer to use vertical space for the document */}
            <div className="w-full bg-white p-3 mt-3 flex items-center justify-center overflow-x-auto">
              <div className="flex flex-wrap gap-2 justify-center">
                {Array.from({ length: acNumPages || 0 }, (_, i) => i + 1).map((pageNum) => {
                  const isChecked = checkedPagesSet.has(pageNum);
                  const isCurrentPage = pageNum === currentPage;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-10 h-10 rounded-full text-sm font-semibold transition relative flex items-center justify-center ${
                        isCurrentPage
                          ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300'
                          : isChecked
                          ? 'bg-green-500 text-white hover:bg-green-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      title={`Page ${pageNum}${isChecked ? ' (Checked)' : ''}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Sidebar - Marking and Controls */}
          <aside className="lg:col-span-2 flex flex-col space-y-4">
            <div className="bg-white p-3 rounded-md border border-gray-200">
              {/* <h3 className="text-lg font-semibold text-gray-800 mb-3">Viewing Controls</h3> */}
              <div className="text-center mb-3">
                <div className="text-sm text-gray-600">Page</div>
                <div className="text-lg font-bold text-gray-800">{currentPage} / {acNumPages || "..."}</div>
              </div>

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <button onClick={() => handleZoom("ac", "out")} disabled={acZoomLevel === MIN_ZOOM} className="p-2 bg-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed transition" title="Zoom Out"><MagnifyingGlassMinusIcon className="h-5 w-5" /></button>
                  <button onClick={() => handleZoom("ac", "in")} disabled={acZoomLevel === MAX_ZOOM} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition" title="Zoom In"><MagnifyingGlassPlusIcon className="h-5 w-5" /></button>
                  <button onClick={() => handleZoom("ac", "reset")} disabled={acZoomLevel === 1.25} className="p-2 bg-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed transition" title="Reset Zoom"><ArrowsPointingInIcon className="h-5 w-5" /></button>
                </div>
                <div className="text-sm text-gray-600">{acZoomLevel.toFixed(2)}x</div>
              </div>

              <div className="mt-2">
                <h4 className="text-sm font-medium text-gray-700 mb-1">Question Paper</h4>
                {qpPdfUrl ? (
                  <a href={qpPdfUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Open Question Paper (new tab)</a>
                ) : (
                  <div className="text-gray-500">Question paper link not available.</div>
                )}
              </div>
            </div>

            <div className="bg-white p-3 rounded-md border border-gray-200 max-h-[calc(100vh-400px)] overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-800 mb-2 sticky top-0 bg-white pb-2">Marking for Page {currentPage}</h3>
              <div className="mb-2 text-xs text-gray-600 bg-blue-50 p-2 rounded border border-blue-200">
                <strong>Max Total Marks:</strong> {copy.questionPaper?.totalMarks || 'N/A'} | <strong>Current Total:</strong> <span className={(function(){
                  const currentPageData = copy.pages.find((p) => p.pageNumber === currentPage);
                  const currentPageMarks = currentPageData?.marksAwarded || 0;
                  const newTotalMarks = totalMarks - currentPageMarks + (parseFloat(marks) || 0);
                  const maxMarks = copy.questionPaper?.totalMarks || 0;
                  return newTotalMarks > maxMarks ? 'text-red-600 font-bold' : 'text-green-600 font-semibold';
                })()}>{(function(){
                  const currentPageData = copy.pages.find((p) => p.pageNumber === currentPage);
                  const currentPageMarks = currentPageData?.marksAwarded || 0;
                  const newTotalMarks = totalMarks - currentPageMarks + (parseFloat(marks) || 0);
                  return newTotalMarks.toFixed(2);
                })()}</span>
              </div>
              <div className="mb-3">
                <label htmlFor="marks" className="block text-sm font-medium text-gray-700 mb-2">Marks Awarded:</label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {Array.from({ length: 21 }, (_, i) => i * 0.5).map((markValue) => {
                    const currentPageData = copy.pages.find((p) => p.pageNumber === currentPage);
                    const currentPageMarks = currentPageData?.marksAwarded || 0;
                    const newTotalMarks = totalMarks - currentPageMarks + markValue;
                    const maxMarks = copy.questionPaper?.totalMarks || 0;
                    const wouldExceed = newTotalMarks > maxMarks;
                    return (
                      <button
                        key={markValue}
                        onClick={() => setMarks(markValue.toString())}
                        disabled={wouldExceed}
                        className={`px-2 py-1 rounded text-xs font-medium transition ${
                          parseFloat(marks) === markValue
                            ? 'bg-blue-600 text-white shadow-md'
                            : wouldExceed
                            ? 'bg-red-100 text-red-400 cursor-not-allowed'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        title={wouldExceed ? `Would exceed max marks (${maxMarks})` : ''}
                      >
                        {markValue}
                      </button>
                    );
                  })}
                </div>
                <input id="marks" type="number" min="0" step="0.5" value={marks} onChange={(e) => setMarks(e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm" placeholder="Or type custom marks" />
              </div>
              <div className="mb-3">
                <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-1">Comments:</label>
                <textarea id="comments" rows={3} value={comments} onChange={(e) => setComments(e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm resize-y" placeholder="Add comments..."></textarea>
              </div>
              {(function(){
                const currentPageData = copy.pages.find((p) => p.pageNumber === currentPage);
                const currentPageMarks = currentPageData?.marksAwarded || 0;
                const newTotalMarks = totalMarks - currentPageMarks + (parseFloat(marks) || 0);
                const maxMarks = copy.questionPaper?.totalMarks || 0;
                const wouldExceed = newTotalMarks > maxMarks;
                return wouldExceed && marks !== '' && !isNaN(parseFloat(marks)) ? (
                  <div className="mb-2 p-2 bg-red-50 border border-red-300 rounded text-xs text-red-700">
                    <strong>⚠️ Warning:</strong> These marks would exceed the maximum total marks allowed ({maxMarks}). Please reduce the marks.
                  </div>
                ) : null;
              })()}
              <div className="flex justify-end">
                <button onClick={handleSavePage} disabled={isSaving || (function(){
                  const currentPageData = copy.pages.find((p) => p.pageNumber === currentPage);
                  const currentPageMarks = currentPageData?.marksAwarded || 0;
                  const newTotalMarks = totalMarks - currentPageMarks + (parseFloat(marks) || 0);
                  const maxMarks = copy.questionPaper?.totalMarks || 0;
                  return marks !== '' && !isNaN(parseFloat(marks)) && newTotalMarks > maxMarks;
                })()} className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm flex items-center">
                  {isSaving ? (
                    <svg className="animate-spin h-4 w-4 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : (
                    <ClipboardDocumentCheckIcon className="h-4 w-4 mr-2" />
                  )}
                  {isSaving ? "Saving" : "Save"}
                </button>
              </div>
            </div>

            <div className="bg-white p-3 rounded-md border border-gray-200">
              <div className="text-sm font-semibold text-gray-800">Total: <span className="text-green-700">{totalMarks}</span></div>
              <div className="mt-3">
                <button onClick={() => setShowReviewModal(true)} className="w-full bg-purple-600 text-white px-3 py-1 rounded-md hover:bg-purple-700 text-sm">Review & Submit</button>
              </div>
            </div>
          </aside>
        </div>
        {/* Mark Allocation Form */}
        {/* Running Total & Review Button */}
        {/* <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-xl shadow-lg border border-gray-200 max-w-4xl mx-auto">
          <div className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-4 md:mb-0">
            Total Marks: <span className="text-green-700">{totalMarks}</span>
          </div>
          <button
            onClick={() => setShowReviewModal(true)}
            className="bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 ease-in-out text-xl font-semibold shadow-md flex items-center justify-center"
          >
            <PaperAirplaneIcon className="h-6 w-6 mr-3" /> Review & Submit Final
          </button>
        </div> */}
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
                  .map((page) => {
                    const isChecked = checkedPagesSet.has(page.pageNumber);
                    return (
                      <div
                        key={page.pageNumber}
                        className={`bg-gray-50 p-4 rounded-lg border ${isChecked ? 'border-green-200' : 'border-gray-200'} shadow-sm`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-lg font-bold text-gray-800">Page {page.pageNumber}</h4>
                          <div className="flex items-center space-x-2">
                            <span className={`h-3 w-3 rounded-full ${isChecked ? 'bg-green-500' : 'bg-gray-300'}`} />
                            <span className="text-sm text-gray-700">{isChecked ? 'Checked' : 'Not checked'}</span>
                          </div>
                        </div>
                        <p className="text-gray-700">
                          <strong>Marks:</strong>{" "}
                          <span className="font-semibold text-green-700">{page.marksAwarded ?? "N/A"}</span>
                        </p>
                        <p className="text-gray-700">
                          <strong>Comments:</strong>{" "}
                          {page.comments || "No comments."}
                        </p>
                      </div>
                    );
                  })}
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
              disabled={totalChecked !== copy.totalPages} // Only enable if all pages are checked/saved
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm & Finish
            </button>
          </div>
          {totalChecked !== copy.totalPages && (
            <p className="text-sm text-red-500 text-center mt-3">
              *You must save every page (click Save) before confirming final
              submission. {copy.totalPages - totalChecked} page(s) left.
            </p>
          )}
        </Modal>
      </div>
    </div>
  );
}