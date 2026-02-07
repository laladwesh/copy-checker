import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import Modal from "../components/Modal"; // Assuming you have this Modal component
import {
  ArrowLeftIcon,
  ClipboardDocumentCheckIcon,
  PaperAirplaneIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ArrowsPointingInIcon,
} from "@heroicons/react/24/outline";
import { toastSuccess, toastError, toastInfo } from "../utils/hotToast";

// Import react-pdf components
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css"; // Essential for annotations like links
import "react-pdf/dist/Page/TextLayer.css"; // Essential for selectable text

// Set worker source for react-pdf
// This is crucial for react-pdf to work correctly.
// Using unpkg CDN for robustness. Make sure the pdfjs.version matches your installed react-pdf version.
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Draggable Mark Component (numeric value)
const DraggableMark = ({ value, onDragStart }) => {
  const handleDragStart = (e) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('markValue', String(value));
    onDragStart(value);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="cursor-move select-none"
      style={{ touchAction: 'none' }}
    >
      <div className="w-12 h-12 flex items-center justify-center bg-gray-900 text-white rounded-full text-sm font-bold hover:scale-105 transition shadow-lg">
        {Number(value).toFixed(value % 1 === 0 ? 0 : 1)}
      </div>
    </div>
  );
};

function CopyChecker() {
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
  // Pool of draggable numeric marks (examiner can add from grid or custom input)
  const [marksPool, setMarksPool] = useState([]); // e.g. [0, 0.5, 1, ...]

  // UI States
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // For Save & Next button loading

  // React-pdf states for Answer Copy
  const [acNumPages, setAcNumPages] = useState(null);
  const [isAcLoading, setIsAcLoading] = useState(true);

  // Blank page identification UI state (transient only during this session)
  const [isBlankModalOpen, setIsBlankModalOpen] = useState(true); // open immediately on landing
  const [blankPagesArr, setBlankPagesArr] = useState([]); // store as array (transient)
  // Zoom States
  const [acZoomLevel, setAcZoomLevel] = useState(1.25); // Initial zoom level for AC

  // Pan States for zoom and pan feature
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [startPanPos, setStartPanPos] = useState({ x: 0, y: 0 });

  // Draggable marks state - stores marks for each page
  const [pageMarks, setPageMarks] = useState({}); // { pageNumber: [{ value, x, y, id }] }
  const [draggedMarkValue, setDraggedMarkValue] = useState(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const ZOOM_STEP = 0.25;
  const MIN_ZOOM = 0.5; // Adjusted min zoom for better flexibility
  const MAX_ZOOM = 3;

  // 1) Load the copy once on mount
  useEffect(() => {
    const fetchCopy = async () => {
      try {
          const res = await api.get(`/examiner/copies/${copyId}`);
          setCopy(res.data);

          // Load existing marks from server with safety checks
          const loadedMarks = {};
          if (res.data && res.data.pages && Array.isArray(res.data.pages)) {
            res.data.pages.forEach(page => {
              if (page.pageMarks && Array.isArray(page.pageMarks) && page.pageMarks.length > 0) {
                loadedMarks[page.pageNumber] = page.pageMarks.map(mark => ({
                  value: typeof mark.value !== 'undefined' ? Number(mark.value) : (mark.type === 'wrong' ? 0 : 1),
                  x: Number(mark.x) || 0,
                  y: Number(mark.y) || 0,
                  id: Math.random().toString(36).substr(2, 9)
                }));
              } else if (page.marks && Array.isArray(page.marks) && page.marks.length > 0) {
                // Legacy support: map type -> value (correct->1, wrong->0)
                loadedMarks[page.pageNumber] = page.marks.map(mark => ({
                  value: mark.type === 'wrong' ? 0 : 1,
                  x: Number(mark.x) || 0,
                  y: Number(mark.y) || 0,
                  id: Math.random().toString(36).substr(2, 9)
                }));
              }
            });
          }
          setPageMarks(loadedMarks);
        
        // Set Answer Copy to page 1 on load
        setCurrentPage(1);
        // Reset loading state after initial document fetch
        setIsAcLoading(true); // Will be set to false by onRenderSuccessAC
        // Clear any temporary saved pages from previous session
        setJustSavedPages(new Set());
      } catch (err) {
        setError(err.response?.data?.error || err.message);
        toastError(`Error loading copy: ${err.response?.data?.message || err.message}`);
        setIsAcLoading(false); // Ensure loading is off if there's an error
      }
    };
    fetchCopy();
  }, [copyId]);

  // No persistent storage: blank page selections are transient and cleared on refresh.
  const toggleBlankPage = (pageNumber) => {
    setBlankPagesArr((prev) => {
      const has = prev.includes(pageNumber);
      if (has) return prev.filter((p) => p !== pageNumber);
      return [...prev, pageNumber].sort((a, b) => a - b);
    });
  };

  const findNextNonBlank = (fromPage) => {
    if (!copy) return fromPage;
    let p = fromPage + 1;
    while (p <= copy.totalPages) {
      if (!blankPagesArr.includes(p)) return p;
      p += 1;
    }
    return fromPage; // no non-blank ahead
  };

  // 2) Prefill marks/comments when current page of answer copy changes or copy data changes
  // Also, reset zoom for AC when page changes.
  useEffect(() => {
    if (!copy) return;
    const foundPageData = copy.pages.find((p) => p.pageNumber === currentPage);
    if (foundPageData) {
      setMarks(""); // Keep custom input empty when loading
      setComments(foundPageData.comments ?? "");

      // Ensure any server-saved pageMarks are loaded into UI mapping
      if (Array.isArray(foundPageData.pageMarks) && foundPageData.pageMarks.length > 0) {
        setPageMarks(prev => ({
          ...prev,
          [currentPage]: foundPageData.pageMarks.map(m => ({ value: Number(m.value || 0), x: Number(m.x) || 0, y: Number(m.y) || 0, id: Math.random().toString(36).substr(2,9) }))
        }));
      }
    } else {
      setMarks("");
      setComments("");
    }

    // Reset zoom and pan when AC page changes, and set loading to true
    setAcZoomLevel(1.25);
    setPanX(0);
    setPanY(0);
    setIsAcLoading(true);
  }, [currentPage, copy]);

  // Only use server-side data to determine if a page is truly checked/saved
  // A page is checked ONLY if it has lastAnnotatedBy set (meaning it was actually saved)
  const checkedPages = (copy?.pages || []).filter((p) => Boolean(p.lastAnnotatedBy)).map((p) => p.pageNumber);
  const checkedPagesSet = new Set(checkedPages);
  // Combine server-checked pages with blank-identified pages (transient) so blanks count as checked for the session
  const combinedCheckedSet = new Set([...checkedPages, ...blankPagesArr]);
  const totalChecked = combinedCheckedSet.size;

  // Add a mark value into the pool (from grid or custom input)
  const addToPool = (value) => {
    const v = parseFloat(value);
    if (isNaN(v) || v < 0) {
      toastError('Enter a valid mark value');
      return;
    }
    setMarksPool(prev => {
      if (prev.includes(v)) return prev;
      return [...prev, v].sort((a,b) => a - b);
    });
    setMarks('');
    toastSuccess(`${v} added to marking tools`);
  };

  const getCurrentPageMarkValue = () => {
    const placed = Array.isArray(pageMarks[currentPage]) ? pageMarks[currentPage] : [];
    const placedSum = placed.reduce((s, m) => s + Number(m.value || 0), 0);
    if (placedSum > 0) return placedSum;
    if (marks !== '' && !isNaN(parseFloat(marks))) return parseFloat(marks);
    return 0;
  };

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

  // Safe PDF URLs (do not rely on later-initialized variables)
  const qpPdfUrlSafe = copy?.questionPaper?.driveFile?.id
    ? `/api/drive/pdf/${copy.questionPaper.driveFile.id}`
    : "";
  const acPdfUrlSafe = copy?.driveFile?.id ? `/api/drive/pdf/${copy.driveFile.id}` : "";

  // Toasts provided via react-hot-toast helpers (toastSuccess/toastError/toastInfo)

  // Early returns
  if (error)
    return (
      <div className="text-red-500 text-center py-10 text-xl font-semibold">
        Error: {error}
      </div>
    );
  if (!copy)
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
          <p className="mt-4">Loading copy details...</p>
        </div>
        {/* Still show the blank-page identification modal immediately so the user can begin marking while the copy loads in background */}
        <Modal
          isOpen={isBlankModalOpen}
          onClose={() => setIsBlankModalOpen(false)}
          title="Identify Blank Pages"
        >
          <div className="max-h-[70vh] overflow-y-auto pr-2 -mr-2">
            {acPdfUrlSafe ? (
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {Array.from({ length: acNumPages || 0 }, (_, i) => {
                  const pageNum = i + 1;
                  const isMarkedBlank = blankPagesArr.includes(pageNum);
                  return (
                    <div key={pageNum} className={`p-1 border rounded cursor-pointer flex flex-col items-center ${isMarkedBlank ? 'ring-2 ring-yellow-400 bg-yellow-50' : ''}`} onClick={() => toggleBlankPage(pageNum)}>
                      <div className="w-full flex items-center justify-center overflow-hidden" style={{ height: 140 }}>
                        <Document file={acPdfUrlSafe}>
                          <Page pageNumber={pageNum} scale={0.45} renderTextLayer={false} renderAnnotationLayer={false} />
                        </Document>
                      </div>
                      <div className="text-xs text-gray-700 mt-1">Page {pageNum}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-gray-600">Answer copy PDF not available for thumbnail rendering.</div>
            )}
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
            <button onClick={() => setIsBlankModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Done</button>
          </div>
        </Modal>
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
  // Drag and drop handlers
  const handleDragStart = (value) => {
    setDraggedMarkValue(value);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);

    const markValueRaw = e.dataTransfer.getData('markValue');
    const markValue = parseFloat(markValueRaw);
    if (isNaN(markValue)) return; // invalid drop

    // Find the actual PDF canvas/page element within the container
    const pdfContainer = e.currentTarget;
    const transformedContainer = pdfContainer.querySelector('[style*="transform"]');
    const pdfCanvas = pdfContainer.querySelector('.react-pdf__Page');

    if (!pdfCanvas || !transformedContainer) {
      console.warn('PDF canvas not found');
      return;
    }

    // Get bounding rectangles
    const canvasRect = pdfCanvas.getBoundingClientRect();

    // Safety check
    if (!canvasRect || canvasRect.width === 0 || canvasRect.height === 0) return;

    // Calculate position relative to the transformed container (which is the parent of marks)
    const transformedRect = transformedContainer.getBoundingClientRect();

    // Get mouse position relative to the transformed container
    let mouseX = e.clientX - transformedRect.left;
    let mouseY = e.clientY - transformedRect.top;

    // Convert to percentage of the transformed container
    const x = Math.max(0, Math.min(100, (mouseX / transformedRect.width) * 100));
    const y = Math.max(0, Math.min(100, (mouseY / transformedRect.height) * 100));

    const newMark = {
      value: markValue,
      x,
      y,
      id: Math.random().toString(36).substr(2, 9)
    };

    setPageMarks(prev => ({
      ...prev,
      [currentPage]: [...(prev[currentPage] || []), newMark]
    }));

    setDraggedMarkValue(null);
    toastSuccess(`${markValue} mark added to page ${currentPage}`);
  };

  const removeMark = (markId) => {
    setPageMarks(prev => ({
      ...prev,
      [currentPage]: (prev[currentPage] || []).filter(mark => mark.id !== markId)
    }));
    toastInfo('Mark removed');
  };

  // Pan event handlers for click-and-drag panning
  const handlePanStart = (e) => {
    // Only start panning with middle mouse button or Ctrl+Left click
    if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
      e.preventDefault();
      setIsPanning(true);
      setStartPanPos({ x: e.clientX - panX, y: e.clientY - panY });
      e.currentTarget.style.cursor = 'grabbing';
    }
  };

  const handlePanMove = (e) => {
    if (isPanning) {
      e.preventDefault();

      // Calculate new pan positions
      let newPanX = e.clientX - startPanPos.x;
      let newPanY = e.clientY - startPanPos.y;

      // Calculate boundaries based on zoom level
      // The more zoomed in, the more pan range is allowed
      const zoomFactor = acZoomLevel - 1; // 0 at 1x zoom, increases with zoom
      const maxPanX = 300 * zoomFactor; // Max horizontal pan in pixels
      const maxPanY = 300 * zoomFactor; // Max vertical pan in pixels

      // Clamp pan values within boundaries
      newPanX = Math.max(-maxPanX, Math.min(maxPanX, newPanX));
      newPanY = Math.max(-maxPanY, Math.min(maxPanY, newPanY));

      setPanX(newPanX);
      setPanY(newPanY);
    }
  };

  const handlePanEnd = (e) => {
    if (isPanning) {
      setIsPanning(false);
      e.currentTarget.style.cursor = acZoomLevel > 1.25 ? 'grab' : 'default';
    }
  };

  const resetPan = () => {
    setPanX(0);
    setPanY(0);
    toastInfo('Pan reset');
  };

  // Handler: save this page's marks, then advance
  const handleSavePage = async () => {
    if (isSaving) return; // Prevent multiple submissions while saving
    setIsSaving(true);
    try {
      const placed = Array.isArray(pageMarks[currentPage]) ? pageMarks[currentPage] : [];
      const pageMarksPayload = placed
        .filter(mark => mark && typeof mark.value === 'number' && typeof mark.x === 'number' && typeof mark.y === 'number')
        .map(mark => ({ value: Number(mark.value), x: Math.max(0, Math.min(100, mark.x)), y: Math.max(0, Math.min(100, mark.y)) }));

      const marksAwarded = pageMarksPayload.reduce((s, m) => s + Number(m.value || 0), 0);

      // Check if total marks would exceed the maximum allowed
      const currentPageData = copy.pages.find((p) => p.pageNumber === currentPage);
      const currentPageMarksAwarded = currentPageData?.marksAwarded || 0;
      const newTotalMarks = totalMarks - currentPageMarksAwarded + marksAwarded;
      const maxMarks = copy.questionPaper?.totalMarks || 0;

      if (newTotalMarks > maxMarks) {
        toastError(`Cannot save! Total marks would be ${newTotalMarks.toFixed(2)} which exceeds the maximum allowed marks of ${maxMarks}.`);
        setIsSaving(false);
        return;
      }

      const payload = {
        pageNumber: currentPage,
        marks: marksAwarded,
        comments: String(comments || ''),
        pageMarks: pageMarksPayload
      };

      const res = await api.patch(`/examiner/copies/${copyId}/mark-page`, payload);
      setCopy(res.data); // Update local copy state with new data from server

      // Mark this page as just saved for temporary UI feedback
      setJustSavedPages((prev) => {
        const next = new Set(Array.from(prev));
        next.add(currentPage);
        return next;
      });
      toastSuccess("Page marks saved successfully!");

      // Advance to the next non-blank page only if available, otherwise show review
      if (currentPage < copy.totalPages) {
        const next = findNextNonBlank(currentPage);
        if (next > currentPage) {
          setCurrentPage(next);
        } else {
          // No non-blank ahead - behave like last page
          setIsAcLoading(false);
          setShowReviewModal(true);
          toastInfo("You've reached the last page. Please review and submit.");
        }
      } else {
        setIsAcLoading(false); // Stop loading state if on last page
        setShowReviewModal(true); // Show review modal if on last page
        toastInfo("You've reached the last page. Please review and submit.");
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      toastError(`Error saving marks: ${err.response?.data?.message || err.message}`);
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
        toastSuccess("All pages marked! You can now confirm final submission.");
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
      toastError(`Error completing copy: ${err.response?.data?.message || err.message}`);
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
        // Reset pan when zoom is reset
        setPanX(0);
        setPanY(0);
      }
      return parseFloat(newZoom.toFixed(2));
    });
  };

  

  return (
    <div className="bg-white min-h-screen font-sans relative" style={{fontFamily: 'Dosis, sans-serif'}}>
      {" "}
      {/* Added relative for toast positioning */}
      {/* Toasts are provided globally via react-hot-toast */}
      {/* Top Navigation Bar */}
     
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
          <h3 className="text-xl font-bold text-gray-900 mb-3">
            Marking Progress: {totalChecked} of {copy.totalPages} pages
            checked ({completionPercentage.toFixed(1)}%)
          </h3>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-gray-900 h-4 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
        </div>
        {/* Main layout: Answer Copy center-expanded, controls + marking on right sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
          <div className="lg:col-span-9 bg-white flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-2 px-4">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-900">Answer Copy</h2>
                <div className="text-xs text-gray-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                  <strong>Max:</strong> {copy.questionPaper?.totalMarks || 'N/A'} <span className={(function(){
                      const currentPageData = copy.pages.find((p) => p.pageNumber === currentPage);
                      const currentPageMarks = currentPageData?.marksAwarded || 0;
                      const pageMarksVal = getCurrentPageMarkValue();
                      const newTotalMarks = totalMarks - currentPageMarks + pageMarksVal;
                      const maxMarks = copy.questionPaper?.totalMarks || 0;
                      return newTotalMarks > maxMarks ? 'text-red-600 font-bold' : 'text-green-600 font-semibold';
                    })()}></span>
                </div>
              </div>
              {/* Page check indicator */}
              <div className="flex items-center space-x-2">
                {(function(){
                  const isChecked = combinedCheckedSet.has(currentPage);
                  return (
                    <>
                      <span className={`h-3 w-3 rounded-full ${isChecked ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className="text-sm text-gray-700">{isChecked ? 'Checked' : 'Not checked'}</span>
                    </>
                  );
                })()}
              </div>
            </div>
            <div
              className={`relative w-full overflow-hidden flex items-center justify-center ${isDraggingOver ? 'ring-4 ring-blue-500 ring-opacity-50' : ''}`}
              style={{
                height: 'calc(100vh - 180px)',
                cursor: isPanning ? 'grabbing' : (acZoomLevel > 1.25 ? 'grab' : 'default')
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onMouseDown={handlePanStart}
              onMouseMove={handlePanMove}
              onMouseUp={handlePanEnd}
              onMouseLeave={handlePanEnd}
            >
              {isAcLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 z-10">
                  <svg className="animate-spin h-8 w-8 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="ml-2 text-gray-700">Loading...</span>
                </div>
              )}
              {acPdfUrl ? (
                <div
                  style={{
                    transform: `translate(${panX}px, ${panY}px)`,
                    transition: isPanning ? 'none' : 'transform 0.1s ease-out',
                    position: 'relative'
                  }}
                >
                  <Document file={acPdfUrl} onLoadSuccess={onDocumentLoadSuccessAC} onLoadError={onDocumentLoadErrorAC} className="w-full h-full flex justify-center items-center">
                    <Page pageNumber={currentPage} scale={acZoomLevel} renderAnnotationLayer={true} renderTextLayer={true} onRenderSuccess={onRenderSuccessAC} customTextRenderer={({ str, itemIndex }) => (
                      <span key={itemIndex} className="react-pdf__Page__textContent__text" style={{ opacity: 0 }}>{str}</span>
                    )} />
                  </Document>

                  {/* Render placed marks on the current page - inside transformed container */}
                  {pageMarks[currentPage] && Array.isArray(pageMarks[currentPage]) && pageMarks[currentPage]
                    .filter(mark => mark && mark.id && typeof mark.value === 'number' && typeof mark.x === 'number' && typeof mark.y === 'number')
                    .map((mark) => (
                    <div
                      key={mark.id}
                      className="absolute cursor-pointer group"
                      style={{
                        left: `${mark.x}%`,
                        top: `${mark.y}%`,
                        transform: 'translate(-50%, -50%)',
                        zIndex: 20
                      }}
                      onClick={() => removeMark(mark.id)}
                      title="Click to remove"
                    >
                      <div className={`w-12 h-12 flex items-center justify-center rounded-full text-white text-sm font-bold shadow-lg transition ${mark.value > 0 ? 'bg-green-500 group-hover:bg-green-600' : 'bg-red-500 group-hover:bg-red-600'}`}>
                        {Number(mark.value % 1 === 0 ? mark.value : mark.value.toFixed(1))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 text-center p-2">Answer Copy PDF Not Found.</div>
              )}
            </div>

            {/* Horizontal Page Navigation moved below the PDF viewer to use vertical space for the document */}
            <div className="w-full bg-white p-3 mt-3 flex items-center justify-center overflow-x-auto">
              <div className="flex flex-wrap gap-2 justify-center">
                {Array.from({ length: acNumPages || 0 }, (_, i) => i + 1).map((pageNum) => {
                  const isChecked = combinedCheckedSet.has(pageNum);
                  const isCurrentPage = pageNum === currentPage;
                  const isBlank = blankPagesArr.includes(pageNum);
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-10 h-10 rounded-full text-sm font-bold transition relative flex items-center justify-center ${
                        isCurrentPage
                          ? 'bg-gray-900 text-white shadow-md ring-2 ring-gray-700'
                          : isBlank
                          ? 'bg-red-200 text-red-900 hover:bg-red-300'
                          : isChecked
                          ? 'bg-green-500 text-white hover:bg-green-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      title={`Page ${pageNum}${isChecked ? ' (Checked)' : ''}${isBlank ? ' (Identified as blank)' : ''}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Sidebar - Marking and Controls */}
          <aside className="lg:col-span-3 flex flex-col space-y-4">
            {/* Draggable Marking Tools */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-4 rounded-md border-2 border-dashed border-blue-300 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-3 text-center">Marking Tools</h3>
              <p className="text-xs text-gray-600 mb-3 text-center">Drag and drop marks onto the answer copy</p>
              <div className="flex justify-center gap-3 flex-wrap">
                {marksPool.length === 0 ? (
                  <div className="text-xs text-gray-500">Add values from the grid below or enter a custom mark</div>
                ) : (
                  marksPool.map((v) => (
                    <div key={v} className="flex flex-col items-center mr-2 mb-2">
                      <DraggableMark value={v} onDragStart={handleDragStart} />
                      <span className="text-xs text-gray-700 mt-1 font-medium">{v % 1 === 0 ? v : v.toFixed(1)}</span>
                    </div>
                  ))
                )}
              </div>
              {pageMarks[currentPage] && pageMarks[currentPage].length > 0 && (
                <div className="mt-3 text-xs text-center text-gray-600 bg-white p-2 rounded">
                  {pageMarks[currentPage].length} mark(s) on this page
                  <div className="text-xs text-gray-500 mt-1">Click marks to remove</div>
                </div>
              )}
            </div>
            
            <div className="bg-white p-3 rounded-md border border-gray-200">
              {/* <h3 className="text-lg font-semibold text-gray-800 mb-3">Viewing Controls</h3> */}
              <div className="text-center mb-3">
                {/* <div className="text-sm text-gray-600">Page</div> */}
                <div className="text-lg font-bold text-gray-800">
                  Page Number : {currentPage} / {acNumPages || "..."}
                  {(function(){
                    const currentPageData = copy.pages.find((p) => p.pageNumber === currentPage);
                    const savedMarks = currentPageData?.marksAwarded || 0;
                    const currentMarks = getCurrentPageMarkValue();
                    const hasUnsavedChanges = currentMarks !== savedMarks && currentMarks > 0;
                    
                    if (savedMarks > 0) {
                      return <span className="text-base text-green-600 mx-4">Page Total : {savedMarks}</span>;
                    } else if (hasUnsavedChanges) {
                      return (
                        <>
                          <span className="text-sm text-orange-600 ml-2">({currentMarks})</span>
                          <div className="text-xs text-orange-600 mt-1">Please save</div>
                        </>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <button onClick={() => handleZoom("ac", "out")} disabled={acZoomLevel === MIN_ZOOM} className="p-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition" title="Zoom Out"><MagnifyingGlassMinusIcon className="h-5 w-5" /></button>
                  <button onClick={() => handleZoom("ac", "in")} disabled={acZoomLevel === MAX_ZOOM} className="p-2 bg-gray-900 text-white rounded-lg hover:bg-[#1e3a8a] disabled:opacity-50 disabled:cursor-not-allowed transition" title="Zoom In"><MagnifyingGlassPlusIcon className="h-5 w-5" /></button>
                  <button onClick={() => handleZoom("ac", "reset")} disabled={acZoomLevel === 1.25} className="p-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition" title="Reset Zoom"><ArrowsPointingInIcon className="h-5 w-5" /></button>
                </div>
                <div className="text-sm text-gray-600">{acZoomLevel.toFixed(2)}x</div>
              </div>

              <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-gray-700">
                <strong>Pan Tip:</strong> Hold <kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded text-xs font-mono">Ctrl</kbd> and drag to pan, or use middle mouse button
                {(panX !== 0 || panY !== 0) && (
                  <button onClick={resetPan} className="ml-2 text-blue-600 hover:text-blue-800 underline font-semibold">
                    Reset Pan
                  </button>
                )}
              </div>

              <div className="mt-2 flex gap-2">
                {qpPdfUrl ? (
                  <a href={qpPdfUrl} target="_blank" rel="noopener noreferrer" className="flex-1 bg-gray-900 text-white px-3 py-1 rounded-md hover:bg-[#1e3a8a] text-sm font-bold flex items-center justify-center" title="Open Question Paper">
                     Question Paper
                  </a>
                ) : (
                  <button disabled className="flex-1 bg-gray-300 text-gray-500 px-3 py-1 rounded-md text-sm font-bold flex items-center justify-center cursor-not-allowed" title="Question paper not available">
                     Question Paper
                  </button>
                )}
                <button onClick={() => setIsBlankModalOpen(true)} className="flex-1 bg-red-100 text-red-900 px-3 py-1 rounded-md hover:bg-red-200 text-sm font-bold flex items-center justify-center" title="Identify blank pages">
                  Identify Blank Pages
                </button>
              </div>
            </div>

            <div className="bg-white p-3 rounded-md border border-gray-200 max-h-[calc(100vh-400px)] overflow-y-auto">
              <div className="mb-3">
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {Array.from({ length: 21 }, (_, i) => i * 0.5).map((markValue) => {
                    const currentPageData = copy.pages.find((p) => p.pageNumber === currentPage);
                    const currentPageMarksSaved = currentPageData?.marksAwarded || 0;
                    const placedSum = Array.isArray(pageMarks[currentPage]) ? pageMarks[currentPage].reduce((s, m) => s + Number(m.value || 0), 0) : 0;
                    const candidate = placedSum > 0 ? placedSum : markValue;
                    const newTotalMarks = totalMarks - currentPageMarksSaved + candidate;
                    const maxMarks = copy.questionPaper?.totalMarks || 0;
                    const wouldExceed = newTotalMarks > maxMarks;
                    return (
                      <button
                        key={markValue}
                        onClick={() => addToPool(markValue)}
                        disabled={wouldExceed}
                        className={`px-2 py-1 rounded text-xs font-bold transition ${
                          marksPool.includes(markValue)
                            ? 'bg-gray-900 text-white shadow-md'
                            : wouldExceed
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        title={wouldExceed ? `Would exceed max marks (${maxMarks})` : ''}
                      >
                        {markValue}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <input 
                    id="marks" 
                    type="number" 
                    min="0" 
                    step="0.5" 
                    value={marks} 
                    onChange={(e) => setMarks(e.target.value)} 
                    className="flex-1 px-2 py-1 border border-gray-300 rounded-md text-sm" 
                    placeholder="Enter custom mark" 
                  />
                  <button
                    onClick={() => addToPool(marks)}
                    className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-xs font-bold whitespace-nowrap"
                    title="Add mark to tools"
                  >
                    Add to Tools
                  </button>
                </div>
              </div>
              <div className="mb-3">
                <label htmlFor="comments" className="block text-sm font-bold text-gray-900 mb-1">Comments:</label>
                <textarea id="comments" rows={3} value={comments} onChange={(e) => setComments(e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm resize-y" placeholder="Add comments..."></textarea>
              </div>
              {(function(){
                const currentPageData = copy.pages.find((p) => p.pageNumber === currentPage);
                const currentPageMarks = currentPageData?.marksAwarded || 0;
                const pageMarksVal = getCurrentPageMarkValue();
                const newTotalMarks = totalMarks - currentPageMarks + pageMarksVal;
                const maxMarks = copy.questionPaper?.totalMarks || 0;
                const wouldExceed = newTotalMarks > maxMarks;
                const hasMarks = pageMarksVal > 0;
                return wouldExceed && hasMarks ? (
                  <div className="mb-2 p-2 bg-red-50 border border-red-300 rounded text-xs text-red-700">
                    <strong> Warning:</strong> These marks would exceed the maximum total marks allowed ({maxMarks}). Please reduce the marks.
                  </div>
                ) : null;
              })()}
              <div className="flex justify-end">
                <button onClick={handleSavePage} disabled={isSaving || (function(){
                  const currentPageData = copy.pages.find((p) => p.pageNumber === currentPage);
                  const currentPageMarks = currentPageData?.marksAwarded || 0;
                  const pageMarksVal = getCurrentPageMarkValue();
                  const newTotalMarks = totalMarks - currentPageMarks + pageMarksVal;
                  const maxMarks = copy.questionPaper?.totalMarks || 0;
                  const hasMarks = pageMarksVal > 0;
                  return hasMarks && newTotalMarks > maxMarks;
                })()} className="bg-gray-900 text-white px-3 py-1 rounded-md hover:bg-[#1e3a8a] disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-bold flex items-center">
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
              <div className="text-sm font-bold text-gray-900">Total: <span className="text-gray-900">{totalMarks}</span></div>
              <div className="mt-3">
                <button onClick={() => setShowReviewModal(true)} className="w-full bg-gray-900 text-white px-3 py-1 rounded-md hover:bg-[#1e3a8a] text-sm font-bold">Review & Submit</button>
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
                    const isChecked = combinedCheckedSet.has(page.pageNumber);
                    return (
                      <div
                        key={page.pageNumber}
                        className={`bg-gray-50 p-4 rounded-lg border ${isChecked ? 'border-gray-700' : 'border-gray-200'} shadow-sm`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-lg font-bold text-gray-900">Page {page.pageNumber}</h4>
                          <div className="flex items-center space-x-2">
                            <span className={`h-3 w-3 rounded-full ${isChecked ? 'bg-green-500' : 'bg-gray-300'}`} />
                            <span className="text-sm text-gray-700">{isChecked ? 'Checked' : 'Not checked'}</span>
                          </div>
                        </div>
                        <p className="text-gray-700 font-bold">
                          <strong>Marks:</strong>{" "}
                          <span className="font-bold text-gray-900">{page.marksAwarded ?? "N/A"}</span>
                        </p>
                        <p className="text-gray-700 font-bold">
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
            <div className="text-lg font-bold text-gray-900 pt-2">
              Total Marks:{" "}
              <span className="text-gray-900">{totalMarks}</span>
            </div>
            <button
              onClick={() => setShowReviewModal(false)}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-bold transition"
            >
              Keep Checking
            </button>
            <button
              onClick={handleFinalSubmit}
              disabled={totalChecked !== copy.totalPages} // Only enable if all pages are checked/saved
              className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-[#1e3a8a] font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
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
        {/* Blank Pages Identification Modal */}
        <Modal
          isOpen={isBlankModalOpen}
          onClose={() => setIsBlankModalOpen(false)}
          title="Identify Blank Pages"
        >
          <div className="max-h-[70vh] overflow-y-auto pr-2 -mr-2">
              {acPdfUrl ? (
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {Array.from({ length: acNumPages || 0 }, (_, i) => {
                  const pageNum = i + 1;
                  const isMarkedBlank = blankPagesArr.includes(pageNum);
                  return (
                    <div key={pageNum} className={`p-1 border rounded cursor-pointer flex flex-col items-center ${isMarkedBlank ? 'ring-2 ring-red-500 bg-red-50' : ''}`} onClick={() => toggleBlankPage(pageNum)}>
                      <div className="w-full flex items-center justify-center overflow-hidden relative" style={{ height: 140 }}>
                        <Document file={acPdfUrl}>
                          <Page pageNumber={pageNum} scale={0.45} renderTextLayer={false} renderAnnotationLayer={false} />
                        </Document>
                        {isMarkedBlank && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                              <line x1="0" y1="0" x2="100" y2="100" stroke="red" strokeWidth="3" />
                              <line x1="100" y1="0" x2="0" y2="100" stroke="red" strokeWidth="3" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-700 mt-1">Page {pageNum}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-gray-600">Answer copy PDF not available for thumbnail rendering.</div>
            )}
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
            <button onClick={() => setIsBlankModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Done</button>
          </div>
        </Modal>
      </div>
    </div>
  );
}

export default CopyChecker;