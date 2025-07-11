import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api"; // Ensure this path is correct for your axios instance
import {
  ArrowLeftIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ArrowsPointingInIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

// Import react-pdf components
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css"; // Essential for annotations like links
import "react-pdf/dist/Page/TextLayer.css"; // Essential for selectable text

// Set worker source for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function AdminCopyViewer() {
  const { copyId } = useParams();
  const [copy, setCopy] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [acCurrentPage, setAcCurrentPage] = useState(1); // Current page of the Answer Copy
  const [qpCurrentPage, setQpCurrentPage] = useState(1); // Current page of the Question Paper

  // Number of pages for PDFs
  const [numAcPages, setNumAcPages] = useState(null);
  const [numQpPages, setNumQpPages] = useState(null);

  // Zoom states
  const [qpZoomLevel, setQpZoomLevel] = useState(1.0); // Initialize as float
  const [acZoomLevel, setAcZoomLevel] = useState(1.0); // Initialize as float

  const [isQpLoading, setIsQpLoading] = useState(true); // State for QP PDF loading
  const [isAcLoading, setIsAcLoading] = useState(true); // State for AC PDF loading

  const ZOOM_STEP = 0.2; // Smaller, smoother zoom steps
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 3.0;

  // Refs for PDF container dimensions (though 'width' prop is removed from Page,
  // these refs are still useful for general container sizing if needed for other elements)
  const qpContainerRef = useRef(null);
  const acContainerRef = useRef(null);
  // We no longer need to store container width for the Page component directly,
  // but keeping the state for potential future use or debugging.
  const [qpContainerWidth, setQpContainerWidth] = useState(null);
  const [acContainerWidth, setAcContainerWidth] = useState(null);

  // Debounced resize observer for PDF containers
  const updateContainerWidths = useCallback(() => {
    if (qpContainerRef.current) {
      setQpContainerWidth(qpContainerRef.current.offsetWidth);
    }
    if (acContainerRef.current) {
      setAcContainerWidth(acContainerRef.current.offsetWidth);
    }
  }, []);
  const resizeTimeoutRef = useRef(null);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      // Debounce the resize event to prevent excessive re-renders
      if (resizeTimeoutRef.current) {
        // <-- CHANGE THIS LINE
        clearTimeout(resizeTimeoutRef.current); // <-- CHANGE THIS LINE
      }
      resizeTimeoutRef.current = setTimeout(updateContainerWidths, 100); // eslint-disable-line no-invalid-this
    });

    if (qpContainerRef.current) {
      observer.observe(qpContainerRef.current);
    }
    if (acContainerRef.current) {
      observer.observe(acContainerRef.current);
    }

    // Initial width set
    updateContainerWidths();

    return () => {
      if (qpContainerRef.current) observer.unobserve(qpContainerRef.current);
      if (acContainerRef.current) observer.unobserve(acContainerRef.current);
      if (resizeTimeoutRef.current) {
        // <-- CHANGE THIS LINE
        clearTimeout(resizeTimeoutRef.current);
      } // eslint-disable-line no-invalid-this
    };
  }, [updateContainerWidths]);

  useEffect(() => {
    const fetchCopyDetails = async () => {
      setIsLoading(true);
      setError(""); // Clear previous errors
      try {
        const res = await api.get(`/admin/copies/view/${copyId}`);
        setCopy(res.data);
        setAcCurrentPage(1); // Reset to page 1 on new copy load
        setQpCurrentPage(1); // Reset to page 1 on new copy load

        // Reset PDF loading states when new data is fetched
        setIsAcLoading(true);
        setIsQpLoading(true);
      } catch (err) {
        console.error("Error fetching copy details:", err);
        setError(
          err.response?.data?.message ||
            err.message ||
            "Failed to fetch copy details."
        );
        // If copy details fail to load, ensure PDF loading states are set to false
        setIsAcLoading(false);
        setIsQpLoading(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCopyDetails();
  }, [copyId]);

  // Handlers for when PDF documents load
  const onAcDocumentLoadSuccess = useCallback(({ numPages }) => {
    setNumAcPages(numPages);
    setIsAcLoading(false); // Mark Answer Copy PDF as loaded
  }, []);

  const onQpDocumentLoadSuccess = useCallback(({ numPages }) => {
    setNumQpPages(numPages);
    setIsQpLoading(false); // Mark Question Paper PDF as loaded
  }, []);

  // Handlers for when PDF documents fail to load
  const onAcDocumentLoadError = useCallback((err) => {
    console.error("Error loading Answer Copy PDF:", err);
    setIsAcLoading(false); // Stop loading animation
    setError(
      "Failed to load Answer Copy PDF. Please check the file format or link."
    );
  }, []);

  const onQpDocumentLoadError = useCallback((err) => {
    console.error("Error loading Question Paper PDF:", err);
    setIsQpLoading(false); // Stop loading animation
    setError((prev) =>
      prev
        ? prev + " Failed to load Question Paper PDF."
        : "Failed to load Question Paper PDF."
    );
  }, []);

  // Reset zoom when current page changes (for smooth transition on page change)
  useEffect(() => {
    setAcZoomLevel(1.0);
  }, [acCurrentPage]);

  useEffect(() => {
    setQpZoomLevel(1.0);
  }, [qpCurrentPage]);

  // Handler for zooming PDFs (now affects scale of the <Page> component)
  const handleZoom = useCallback(
    (type, action) => {
      const setZoom = type === "qp" ? setQpZoomLevel : setAcZoomLevel;
      // const currentZoom = type === "qp" ? qpZoomLevel : acZoomLevel; // This variable is not used

      setZoom((prevZoom) => {
        let newZoom = prevZoom;
        if (action === "in") {
          newZoom = Math.min(MAX_ZOOM, prevZoom + ZOOM_STEP);
        } else if (action === "out") {
          newZoom = Math.max(MIN_ZOOM, prevZoom - ZOOM_STEP);
        } else if (action === "reset") {
          newZoom = 1.0; // Reset to 1 (actual size within the container)
        }
        return parseFloat(newZoom.toFixed(2));
      });
    },
    [MIN_ZOOM, MAX_ZOOM, ZOOM_STEP]
  ); // Removed qpZoomLevel, acZoomLevel from dependencies as they are accessed via prevZoom

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="flex flex-col items-center text-gray-600 text-lg">
          <ArrowPathIcon className="animate-spin h-10 w-10 text-indigo-500" />
          <p className="mt-4">Loading copy details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 text-center py-10 text-2xl font-semibold bg-red-50 border border-red-200 rounded-lg mx-auto my-10 p-6">
        Error: {error}
      </div>
    );
  }

  if (!copy) {
    return (
      <div className="text-gray-700 text-center py-10 text-2xl font-semibold bg-white border border-gray-200 rounded-lg mx-auto my-10 p-6">
        Copy not found.
      </div>
    );
  }

  // Get current page data for Answer Copy
  const currentAcPageData = copy.pages.find(
    (p) => p.pageNumber === acCurrentPage
  );
  const marksAwarded = currentAcPageData?.marksAwarded ?? "N/A";
  const comments = currentAcPageData?.comments?.join("\n") || "No comments.";

  const qpPdfUrl = copy.questionPaper?.driveFile?.directDownloadLink || "";
  const acPdfUrl = copy.driveFile?.directDownloadLink || "";

  // Calculate total marks awarded
  const totalMarksAwarded = copy.pages.reduce(
    (sum, page) => sum + (page.marksAwarded || 0),
    0
  );
  const totalPossibleMarks = copy.questionPaper?.totalMarks || "N/A";

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-200 min-h-screen font-sans antialiased relative">
      {/* Top Navigation Bar */}
      <nav className="bg-white shadow-md py-4 px-8 border-b border-gray-200 flex justify-between items-center w-full sticky top-0 z-20">
        <div className="flex items-center space-x-6">
          <Link
            to={`/admin/exams/${copy.questionPaper._id}`}
            className="text-gray-700 hover:text-indigo-600 flex items-center font-medium transition duration-300 transform hover:scale-105"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" /> Back to Exam Copies
          </Link>
          <span className="text-gray-400 text-2xl font-light">|</span>
          <h1 className="text-2xl font-extrabold text-gray-800 flex items-center">
            <span className="text-indigo-600 mr-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-7 h-7"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m5.23 6.485 3.279 3.279-3.279 3.279m0-6.558 3.279 3.279-3.279 3.279M9 11.25l3-3m-3 0-3 3m7.5-6.75a2.25 2.25 0 1 0 0 4.5h.75a2.25 2.25 0 1 1 0 4.5h.75a2.25 2.25 0 1 1 0 4.5H12a2.25 2.25 0 1 0 0 4.5H12.75"
                />
              </svg>
            </span>
            Admin Copy Viewer
          </h1>
        </div>
        <div>
          <Link
            to="/logout"
            className="text-red-500 hover:text-red-700 font-medium transition duration-300 transform hover:scale-105 px-4 py-2 border border-red-400 rounded-md hover:bg-red-50"
          >
            Logout
          </Link>
        </div>
      </nav>

      <div className="p-8 max-w-screen-2xl mx-auto">
        <header className="text-center mb-10 bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <h2 className="text-4xl font-extrabold text-gray-900 mb-2 leading-tight">
            Viewing Copy for:{" "}
            <span className="text-purple-700">
              {copy.questionPaper?.title || "N/A"}
            </span>
          </h2>
          <p className="text-xl text-indigo-700 font-semibold">
            Student: {copy.student?.name || "N/A"} (
            <span className="text-gray-600">
              {copy.student?.email || "N/A"} 
            </span>
            ) {copy.student?.batch ? `${copy.student.batch}` : ""}
          </p>
        </header>

        {/* Total Marks Display */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 max-w-md mx-auto mb-10 text-center">
          <h3 className="text-2xl font-bold text-gray-800">
            Total Marks Awarded:{" "}
            <span className="text-green-700 text-3xl">{totalMarksAwarded}</span>{" "}
            /{" "}
            <span className="text-gray-600 text-2xl">{totalPossibleMarks}</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
          {/* Question Paper Section */}
          <div className="lg:col-span-5 bg-white p-6 rounded-xl shadow-xl border border-gray-200 flex flex-col h-[calc(100vh-250px)]">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center pb-2 border-b border-gray-200">
              Question Paper
            </h2>
            <div className="flex justify-between items-center w-full mb-4 space-x-4">
              <button
                onClick={() => setQpCurrentPage((p) => Math.max(1, p - 1))}
                disabled={qpCurrentPage === 1}
                className="flex-1 px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold text-lg"
              >
                Prev
              </button>
              <span className="text-lg font-bold text-gray-800">
                Page {qpCurrentPage} / {numQpPages || "..."}
              </span>
              <button
                onClick={() =>
                  setQpCurrentPage((p) => Math.min(numQpPages, p + 1))
                }
                disabled={qpCurrentPage === numQpPages}
                className="flex-1 px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold text-lg"
              >
                Next
              </button>
            </div>
            <div
              ref={qpContainerRef}
              className="relative w-full flex-grow rounded-lg overflow-auto border border-gray-300 bg-gray-50 p-2"
            >
              {isQpLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white bg-opacity-80 z-10 text-indigo-600 text-lg font-medium">
                  <ArrowPathIcon className="animate-spin h-10 w-10 text-indigo-500 mb-3" />
                  <span>Loading Question Paper...</span>
                </div>
              )}
              {qpPdfUrl ? (
                <Document
                  file={qpPdfUrl}
                  onLoadSuccess={onQpDocumentLoadSuccess}
                  onLoadError={onQpDocumentLoadError}
                >
                  <Page
                    pageNumber={qpCurrentPage}
                    scale={qpZoomLevel}
                    // REMOVED 'width' PROP
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    loading={
                      <div className="flex flex-col items-center text-indigo-600 font-medium">
                        <ArrowPathIcon className="animate-spin h-8 w-8 text-indigo-500 mb-2" />
                        <span>Loading page...</span>
                      </div>
                    }
                  />
                </Document>
              ) : (
                <div className="text-gray-500 text-center p-4 text-lg">
                  Question Paper PDF Not Found or Link Invalid.
                </div>
              )}
            </div>
            <div className="flex items-center justify-center mt-4 space-x-3">
              <button
                onClick={() => handleZoom("qp", "out")}
                disabled={qpZoomLevel <= MIN_ZOOM}
                className="p-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition transform hover:scale-110 shadow-sm"
                title="Zoom Out"
              >
                <MagnifyingGlassMinusIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleZoom("qp", "in")}
                disabled={qpZoomLevel >= MAX_ZOOM}
                className="p-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition transform hover:scale-110 shadow-sm"
                title="Zoom In"
              >
                <MagnifyingGlassPlusIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleZoom("qp", "reset")}
                disabled={qpZoomLevel === 1.0}
                className="p-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition transform hover:scale-110 shadow-sm"
                title="Reset Zoom"
              >
                <ArrowsPointingInIcon className="h-5 w-5" />
              </button>
              <span className="text-md font-medium text-gray-700 bg-gray-100 px-3 py-1 rounded-md border border-gray-200">
                {qpZoomLevel.toFixed(2)}x
              </span>
            </div>
          </div>

          {/* Answer Copy Section */}
          <div className="lg:col-span-7 bg-white p-6 rounded-xl shadow-xl border border-gray-200 flex flex-col h-[calc(100vh-250px)]">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center pb-2 border-b border-gray-200">
              Answer Copy
            </h2>
            <div className="flex justify-between items-center w-full mb-4 space-x-4">
              <button
                onClick={() => setAcCurrentPage((p) => Math.max(1, p - 1))}
                disabled={acCurrentPage === 1}
                className="flex-1 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold text-lg shadow-md"
              >
                Prev
              </button>
              <span className="text-lg font-bold text-gray-800">
                Page {acCurrentPage} / {numAcPages || "..."}
              </span>
              <button
                onClick={() =>
                  setAcCurrentPage((p) => Math.min(numAcPages, p + 1))
                }
                disabled={acCurrentPage === numAcPages}
                className="flex-1 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold text-lg shadow-md"
              >
                Next
              </button>
            </div>
            <div
              ref={acContainerRef}
              className="relative w-full flex-grow rounded-lg overflow-auto border border-gray-300 bg-gray-50 p-2"
            >
              {isAcLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white bg-opacity-80 z-10 text-indigo-600 text-lg font-medium">
                  <ArrowPathIcon className="animate-spin h-10 w-10 text-indigo-500 mb-3" />
                  <span>Loading Answer Copy...</span>
                </div>
              )}
              {acPdfUrl ? (
                <Document
                  file={acPdfUrl}
                  onLoadSuccess={onAcDocumentLoadSuccess}
                  onLoadError={onAcDocumentLoadError}
                >
                  <Page
                    pageNumber={acCurrentPage}
                    scale={acZoomLevel}
                    // REMOVED 'width' PROP
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    loading={
                      <div className="flex flex-col items-center text-indigo-600 font-medium">
                        <ArrowPathIcon className="animate-spin h-8 w-8 text-indigo-500 mb-2" />
                        <span>Loading page...</span>
                      </div>
                    }
                  />
                </Document>
              ) : (
                <div className="text-gray-500 text-center p-4 text-lg">
                  Answer Copy PDF Not Found or Link Invalid.
                </div>
              )}
            </div>
            <div className="flex items-center justify-center mt-4 space-x-3">
              <button
                onClick={() => handleZoom("ac", "out")}
                disabled={acZoomLevel <= MIN_ZOOM}
                className="p-2 bg-indigo-200 text-indigo-700 rounded-full hover:bg-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed transition transform hover:scale-110 shadow-sm"
                title="Zoom Out"
              >
                <MagnifyingGlassMinusIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleZoom("ac", "in")}
                disabled={acZoomLevel >= MAX_ZOOM}
                className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition transform hover:scale-110 shadow-sm"
                title="Zoom In"
              >
                <MagnifyingGlassPlusIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleZoom("ac", "reset")}
                disabled={acZoomLevel === 1.0}
                className="p-2 bg-indigo-200 text-indigo-700 rounded-full hover:bg-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed transition transform hover:scale-110 shadow-sm"
                title="Reset Zoom"
              >
                <ArrowsPointingInIcon className="h-5 w-5" />
              </button>
              <span className="text-md font-medium text-gray-700 bg-indigo-50 px-3 py-1 rounded-md border border-indigo-200">
                {acZoomLevel.toFixed(2)}x
              </span>
            </div>
          </div>
        </div>

        {/* Marks and Comments Display */}
        <div className="bg-white p-8 rounded-xl shadow-xl border border-gray-200 w-full max-w-full mx-auto">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 border-b-2 border-gray-200 pb-3">
            Evaluation for Page{" "}
            <span className="text-indigo-600">{acCurrentPage}</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-2">
                Marks Awarded:
              </label>
              <p className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 text-xl font-bold">
                {marksAwarded}
              </p>
            </div>
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-2">
                Comments:
              </label>
              <div className="min-h-[80px] px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 text-base whitespace-pre-wrap overflow-y-auto max-h-40">
                {comments}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
