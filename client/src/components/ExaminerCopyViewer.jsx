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
import 'react-pdf/dist/Page/AnnotationLayer.css'; // Essential for annotations like links
import 'react-pdf/dist/Page/TextLayer.css'; // Essential for selectable text

// Set worker source for react-pdf
// This is crucial for react-pdf to work correctly.
// Using unpkg CDN for robustness. Make sure the pdfjs.version matches your installed react-pdf version.
// You might need to run 'npm view react-pdf version' or 'yarn info react-pdf version' to get it.
// As of my last knowledge update, a common version is around 5.x or 6.x.
// If you face issues, replace 'pdfjs.version' with the exact version number you have (e.g., '6.2.2')
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
// If the above doesn't work, try using a specific version, e.g.:
// pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@2.16.105/build/pdf.worker.min.mjs`;
// Or if you specifically added the worker to public:
// pdfjs.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL}/pdf.worker.min.mjs`; // Keep this if you're sure about your public path

export default function ExaminerCopyViewer() {
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
  const [qpZoomLevel, setQpZoomLevel] = useState(1);
  const [acZoomLevel, setAcZoomLevel] = useState(1);

  const [isQpLoading, setIsQpLoading] = useState(true); // State for QP PDF loading
  const [isAcLoading, setIsAcLoading] = useState(true); // State for AC PDF loading

  const ZOOM_STEP = 0.25;
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 3;

  useEffect(() => {
    const fetchCopyDetails = async () => {
      setIsLoading(true);
      setError(""); // Clear previous errors
      try {
        const res = await api.get(`/examiner/copies/view/${copyId}`);
        setCopy(res.data);
        setAcCurrentPage(1); // Reset to page 1 on new copy load
        setQpCurrentPage(1); // Reset to page 1 on new copy load

        // Reset PDF loading states when new data is fetched
        setIsAcLoading(true);
        setIsQpLoading(true);

        // Debugging logs for PDF URLs
        // console.log("Fetched Copy Data:", res.data);
        // console.log("QP PDF URL:", res.data.questionPaper?.driveFile?.directDownloadLink);
        // console.log("AC PDF URL:", res.data.driveFile?.directDownloadLink);


      } catch (err) {
        console.error("Error fetching copy details:", err);
        setError(err.response?.data?.message || err.message || "Failed to fetch copy details.");
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
    console.log("Answer Copy PDF Loaded Successfully. Pages:", numPages);
  }, []);

  const onQpDocumentLoadSuccess = useCallback(({ numPages }) => {
    setNumQpPages(numPages);
    setIsQpLoading(false); // Mark Question Paper PDF as loaded
    console.log("Question Paper PDF Loaded Successfully. Pages:", numPages);
  }, []);

  // Handlers for when PDF documents fail to load
  const onAcDocumentLoadError = useCallback((err) => {
    console.error("Error loading Answer Copy PDF:", err);
    setIsAcLoading(false); // Stop loading animation
    setError("Failed to load Answer Copy PDF. Please check the file format or link.");
  }, []);

  const onQpDocumentLoadError = useCallback((err) => {
    console.error("Error loading Question Paper PDF:", err);
    setIsQpLoading(false); // Stop loading animation
    setError(prev => prev ? prev + " Failed to load Question Paper PDF." : "Failed to load Question Paper PDF.");
  }, []);


  // Reset zoom when current page changes (for smooth transition on page change)
  useEffect(() => {
    setAcZoomLevel(1);
  }, [acCurrentPage]);

  useEffect(() => {
    setQpZoomLevel(1);
  }, [qpCurrentPage]);


  // Handler for zooming PDFs (now affects scale of the <Page> component)
  const handleZoom = useCallback((type, action) => {
    if (type === "qp") {
      setQpZoomLevel((prevZoom) => {
        let newZoom = prevZoom;
        if (action === "in") {
          newZoom = Math.min(MAX_ZOOM, prevZoom + ZOOM_STEP);
        } else if (action === "out") {
          newZoom = Math.max(MIN_ZOOM, prevZoom - ZOOM_STEP);
        } else if (action === "reset") {
          newZoom = 1; // Reset to 1 (actual size within the container)
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
          newZoom = 1; // Reset to 1 (actual size within the container)
        }
        return parseFloat(newZoom.toFixed(2));
      });
    }
  }, [MIN_ZOOM, MAX_ZOOM, ZOOM_STEP]); // Dependencies for useCallback

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
      <div className="text-red-500 text-center py-10 text-xl font-semibold">
        Error: {error}
      </div>
    );
  }

  if (!copy) {
    return (
      <div className="text-gray-600 text-center py-10 text-xl font-semibold">
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

  // *** CRITICAL CHANGE: Use directDownloadLink from backend response ***
  // Ensure your backend provides these links as per our last discussion
  const qpPdfUrl = copy.questionPaper?.driveFile?.directDownloadLink || '';
  const acPdfUrl = copy.driveFile?.directDownloadLink || '';


  // Calculate total marks awarded
  const totalMarksAwarded = copy.pages.reduce(
    (sum, page) => sum + (page.marksAwarded || 0),
    0
  );
  const totalPossibleMarks = copy.questionPaper?.totalMarks || "N/A";

  return (
    <div className="bg-gray-100 min-h-screen font-sans relative">
      {/* Top Navigation Bar */}
      <nav className="bg-white shadow-sm py-4 px-8 border-b border-gray-200 flex justify-between items-center w-full">
        <div className="flex items-center space-x-4">
          <Link
            to={`/examiner`}
            className="text-gray-700 hover:text-indigo-600 flex items-center font-medium transition duration-200"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" /> Back to Examiner Panel
          </Link>
          <span className="text-gray-500">|</span>
          <span className="text-xl font-bold text-gray-800">
            Copy Viewer (Examiner)
          </span>
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
          Viewing Copy for:{" "}
          <span className="text-purple-700">
            {copy.questionPaper?.title || "N/A"}
          </span>
          <br />
          <span className="text-indigo-700 text-2xl">
            Student: {copy.student?.name || "N/A"} (
            {copy.student?.email || "N/A"})
          </span>
        </h1>

        {/* Total Marks Display */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 max-w-2xl mx-auto mb-8 text-center">
          <h3 className="text-2xl font-bold text-gray-800">
            Total Marks:{" "}
            <span className="text-green-700">{totalMarksAwarded}</span> /{" "}
            {totalPossibleMarks}
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
          {/* Question Paper Section */}
          <div className="lg:col-span-5 bg-white p-6 rounded-xl shadow-lg border border-gray-200 flex flex-col">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 text-center">
              Question Paper
            </h2>
            <div className="flex justify-between items-center w-full mb-4 space-x-4">
              <button
                onClick={() => setQpCurrentPage((p) => Math.max(1, p - 1))}
                disabled={qpCurrentPage === 1}
                className="flex-1 px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-lg"
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
                className="flex-1 px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-lg"
              >
                Next
              </button>
            </div>
            <div className="relative w-full flex-grow h-[600px] rounded-lg overflow-auto border border-gray-300 bg-gray-50 flex items-center justify-center">
              {isQpLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 z-10">
                  <ArrowPathIcon className="animate-spin h-8 w-8 text-indigo-500" />
                  <span className="ml-2 text-gray-700">Loading Question Paper...</span>
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
                    renderTextLayer={false}
                    renderAnnotationLayer={true}
                    loading={
                      <div className="flex flex-col items-center">
                        <ArrowPathIcon className="animate-spin h-8 w-8 text-indigo-500" />
                        <span className="ml-2 text-gray-700">Loading page...</span>
                      </div>
                    }
                  />
                </Document>
              ) : (
                <div className="text-gray-500 text-center p-4">
                  Question Paper PDF Not Found or Link Invalid.
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

          {/* Answer Copy Section */}
          <div className="lg:col-span-7 bg-white p-6 rounded-xl shadow-lg border border-gray-200 flex flex-col">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 text-center">
              Answer Copy
            </h2>
            <div className="flex justify-between items-center w-full mb-4 space-x-4">
              <button
                onClick={() =>
                  setAcCurrentPage((p) => Math.max(1, p - 1))
                }
                disabled={acCurrentPage === 1}
                className="flex-1 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-lg"
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
                className="flex-1 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-lg"
              >
                Next
              </button>
            </div>
            <div className="relative w-full flex-grow h-[600px] rounded-lg overflow-auto border border-gray-300 bg-gray-50 flex items-center justify-center">
              {isAcLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 z-10">
                  <ArrowPathIcon className="animate-spin h-8 w-8 text-indigo-500" />
                  <span className="ml-2 text-gray-700">Loading Answer Copy...</span>
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
                    renderTextLayer={false}
                    renderAnnotationLayer={true}
                    loading={
                      <div className="flex flex-col items-center">
                        <ArrowPathIcon className="animate-spin h-8 w-8 text-indigo-500" />
                        <span className="ml-2 text-gray-700">Loading page...</span>
                      </div>
                    }
                  />
                </Document>
              ) : (
                <div className="text-gray-500 text-center p-4">
                  Answer Copy PDF Not Found or Link Invalid.
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

        {/* Marks and Comments Display */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 w-full max-w-full mx-auto mb-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">
            Evaluation for Page {acCurrentPage}
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
        </div>
      </div>
    </div>
  );
}