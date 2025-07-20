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
import { CheckBadgeIcon } from "@heroicons/react/24/solid";

// Import react-pdf components
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Set worker source for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function AdminCopyViewer() {
  const { copyId } = useParams();
  const [copy, setCopy] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [acCurrentPage, setAcCurrentPage] = useState(1);
  const [qpCurrentPage, setQpCurrentPage] = useState(1);

  const [numAcPages, setNumAcPages] = useState(null);
  const [numQpPages, setNumQpPages] = useState(null);

  // Zoom states
  const [qpZoomLevel, setQpZoomLevel] = useState(1.0);
  const [acZoomLevel, setAcZoomLevel] = useState(1.0);

  // Pan (translation) states
  const [qpTranslate, setQpTranslate] = useState({ x: 0, y: 0 });
  const [acTranslate, setAcTranslate] = useState({ x: 0, y: 0 });

  // Panning state refs
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const activeViewerRef = useRef(null); // 'qp' or 'ac'

  const [isQpLoading, setIsQpLoading] = useState(true);
  const [isAcLoading, setIsAcLoading] = useState(true);

  const ZOOM_STEP = 0.2;
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 3.0;

  // --- Data Fetching and PDF Load Handlers ---
  useEffect(() => {
    const fetchCopyDetails = async () => {
      setIsLoading(true);
      setError("");
      try {
        const res = await api.get(`/admin/copies/view/${copyId}`);
        setCopy(res.data);
      } catch (err) {
        console.error("Error fetching copy details:", err);
        setError(
          err.response?.data?.message ||
            err.message ||
            "Failed to fetch copy details."
        );
      } finally {
        setIsLoading(false);
      }
    };
    fetchCopyDetails();
  }, [copyId]);

  const onAcDocumentLoadSuccess = useCallback(({ numPages }) => {
    setNumAcPages(numPages);
    setIsAcLoading(false);
  }, []);

  const onQpDocumentLoadSuccess = useCallback(({ numPages }) => {
    setNumQpPages(numPages);
    setIsQpLoading(false);
  }, []);

  const onAcDocumentLoadError = useCallback((err) => {
    console.error("Error loading Answer Copy PDF:", err);
    setIsAcLoading(false);
    setError(
      "Failed to load Answer Copy PDF. Please check the file format or link."
    );
  }, []);

  const onQpDocumentLoadError = useCallback((err) => {
    console.error("Error loading Question Paper PDF:", err);
    setIsQpLoading(false);
    setError((prev) =>
      prev
        ? `${prev} And failed to load Question Paper PDF.`
        : "Failed to load Question Paper PDF."
    );
  }, []);

  // --- Pan and Zoom Logic ---

  // Reset zoom and pan on page change
  useEffect(() => {
    setAcZoomLevel(1.0);
    setAcTranslate({ x: 0, y: 0 });
  }, [acCurrentPage]);

  useEffect(() => {
    setQpZoomLevel(1.0);
    setQpTranslate({ x: 0, y: 0 });
  }, [qpCurrentPage]);

  const handleZoom = useCallback((type, action) => {
    const setZoom = type === "qp" ? setQpZoomLevel : setAcZoomLevel;
    const setTranslate = type === "qp" ? setQpTranslate : setAcTranslate;

    setZoom((prevZoom) => {
      let newZoom = prevZoom;
      if (action === "in") {
        newZoom = Math.min(MAX_ZOOM, prevZoom + ZOOM_STEP);
      } else if (action === "out") {
        newZoom = Math.max(MIN_ZOOM, prevZoom - ZOOM_STEP);
      } else if (action === "reset") {
        newZoom = 1.0;
        setTranslate({ x: 0, y: 0 }); // Also reset pan
      }
      return parseFloat(newZoom.toFixed(2));
    });
  }, []);

  const handlePanStart = useCallback(
    (e, viewerType) => {
      const zoomLevel = viewerType === "qp" ? qpZoomLevel : acZoomLevel;
      if (zoomLevel <= 1) return; // Only allow panning when zoomed in

      e.preventDefault();
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY };
      activeViewerRef.current = viewerType;
      document.body.style.cursor = "grabbing";
    },
    [qpZoomLevel, acZoomLevel]
  );

  const handlePanMove = useCallback((e) => {
    if (!isPanningRef.current) return;
    e.preventDefault();

    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;

    panStartRef.current = { x: e.clientX, y: e.clientY };

    if (activeViewerRef.current === "qp") {
      setQpTranslate((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    } else if (activeViewerRef.current === "ac") {
      setAcTranslate((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    }
  }, []);

  const handlePanEnd = useCallback(() => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      activeViewerRef.current = null;
      document.body.style.cursor = "default";
    }
  }, []);

  // Attach global listeners for panning
  useEffect(() => {
    window.addEventListener("mousemove", handlePanMove);
    window.addEventListener("mouseup", handlePanEnd);
    window.addEventListener("mouseleave", handlePanEnd);

    return () => {
      window.removeEventListener("mousemove", handlePanMove);
      window.removeEventListener("mouseup", handlePanEnd);
      window.removeEventListener("mouseleave", handlePanEnd);
    };
  }, [handlePanMove, handlePanEnd]);

  // --- Render Logic ---

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

  const currentAcPageData = copy.pages.find(
    (p) => p.pageNumber === acCurrentPage
  );
  const isPageChecked = !!currentAcPageData?.lastAnnotatedBy;
  const marksAwarded = currentAcPageData?.marksAwarded ?? "N/A";
  const comments = currentAcPageData?.comments?.join("\n") || "No comments.";

  const qpPdfUrl = copy.questionPaper?.driveFile?.directDownloadLink || "";
  const acPdfUrl = copy.driveFile?.directDownloadLink || "";

  const totalMarksAwarded = copy.pages.reduce(
    (sum, page) => sum + (page.marksAwarded || 0),
    0
  );
  const totalPossibleMarks = copy.questionPaper?.totalMarks || "N/A";

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-200 min-h-screen font-sans antialiased">
      <nav className="bg-white shadow-md py-4 px-8 border-b border-gray-200 flex justify-between items-center w-full sticky top-0 z-30">
        <div className="flex items-center space-x-6">
          <Link
            to={`/admin/exams/${copy.questionPaper._id}`}
            className="text-gray-700 hover:text-indigo-600 flex items-center font-medium transition"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" /> Back to Exam Copies
          </Link>
          <span className="text-gray-400 text-2xl font-light">|</span>
          <h1 className="text-2xl font-extrabold text-gray-800">
            Admin Copy Viewer
          </h1>
        </div>
        <Link
          to="/logout"
          className="text-red-500 hover:text-red-700 font-medium transition px-4 py-2 border border-red-400 rounded-md hover:bg-red-50"
        >
          Logout
        </Link>
      </nav>

      <div className="p-6 max-w-screen-2xl mx-auto">
        <header className="text-center mb-6 bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <h2 className="text-4xl font-extrabold text-gray-900 mb-2">
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

        <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-200 max-w-md mx-auto mb-6 text-center">
          <h3 className="text-xl font-bold text-gray-800">
            Total Marks:{" "}
            <span className="text-green-700 text-2xl">{totalMarksAwarded}</span>{" "}
            /{" "}
            <span className="text-gray-600 text-xl">{totalPossibleMarks}</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Question Paper Section */}
          <div className="lg:col-span-5 bg-white p-4 rounded-xl shadow-xl border border-gray-200 flex flex-col h-[calc(100vh-240px)]">
            <h2 className="text-xl font-bold text-gray-800 mb-3 text-center pb-3 border-b border-gray-200">
              Question Paper
            </h2>
            <div className="flex justify-between items-center w-full mb-3 space-x-4">
              <button
                onClick={() => setQpCurrentPage((p) => Math.max(1, p - 1))}
                disabled={qpCurrentPage === 1}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition font-semibold"
              >
                Prev
              </button>
              <span className="text-md font-bold text-gray-800 whitespace-nowrap">
                Page {qpCurrentPage} / {numQpPages || "..."}
              </span>
              <button
                onClick={() =>
                  setQpCurrentPage((p) => Math.min(numQpPages, p + 1))
                }
                disabled={!numQpPages || qpCurrentPage === numQpPages}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition font-semibold"
              >
                Next
              </button>
            </div>
            <div className="relative w-full flex-grow rounded-lg border border-gray-300 bg-gray-100 overflow-hidden">
              <div
                onMouseDown={(e) => handlePanStart(e, "qp")}
                className={`flex items-center justify-center ${
                  qpZoomLevel > 1 ? "cursor-grab" : ""
                }`}
                style={{
                  width: "100%",
                  height: "100%",
                  transform: `translate(${qpTranslate.x}px, ${qpTranslate.y}px) scale(${qpZoomLevel})`,
                  transformOrigin: "top left",
                  transition: isPanningRef.current ? "none" : "transform 0.1s",
                }}
              >
                {isQpLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10 text-indigo-600 font-medium">
                    <ArrowPathIcon className="animate-spin h-8 w-8 text-indigo-500 mb-2" />
                    <span>Loading QP...</span>
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
                      scale={1}
                      renderTextLayer={true}
                    />
                  </Document>
                ) : (
                  <div className="text-gray-500 text-center p-4">
                    Question Paper Not Found.
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-center mt-3 space-x-2">
              <button
                onClick={() => handleZoom("qp", "out")}
                disabled={qpZoomLevel <= MIN_ZOOM}
                className="p-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 disabled:opacity-50 transition"
                title="Zoom Out"
              >
                <MagnifyingGlassMinusIcon className="h-5 w-5" />
              </button>
              <span className="text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1 rounded-md border border-gray-200 w-20 text-center">
                {(qpZoomLevel * 100).toFixed(0)}%
              </span>
              <button
                onClick={() => handleZoom("qp", "in")}
                disabled={qpZoomLevel >= MAX_ZOOM}
                className="p-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 disabled:opacity-50 transition"
                title="Zoom In"
              >
                <MagnifyingGlassPlusIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleZoom("qp", "reset")}
                disabled={qpZoomLevel === 1.0}
                className="p-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 disabled:opacity-50 transition"
                title="Reset Zoom"
              >
                <ArrowsPointingInIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Answer Copy Section */}
          <div className="lg:col-span-7 bg-white p-4 rounded-xl shadow-xl border border-gray-200 flex flex-col h-[calc(100vh-240px)]">
            <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">Answer Copy</h2>
              <div className="flex items-center space-x-3">
                {isPageChecked && (
                  <span className="flex items-center text-sm font-semibold text-green-700 bg-green-100 px-3 py-1.5 rounded-full shadow-sm">
                    <CheckBadgeIcon className="h-5 w-5 mr-1.5" />
                    Page Checked
                  </span>
                )}
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-600">
                    Marks:
                  </span>
                  <p className="w-16 text-center px-3 py-1 border border-gray-300 rounded-md bg-gray-50 text-gray-900 text-lg font-bold">
                    {marksAwarded}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center w-full mb-3 space-x-4">
              <button
                onClick={() => setAcCurrentPage((p) => Math.max(1, p - 1))}
                disabled={acCurrentPage === 1}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition font-semibold shadow-sm"
              >
                Prev
              </button>
              <span className="text-md font-bold text-gray-800 whitespace-nowrap">
                Page {acCurrentPage} / {numAcPages || "..."}
              </span>
              <button
                onClick={() =>
                  setAcCurrentPage((p) => Math.min(numAcPages, p + 1))
                }
                disabled={!numAcPages || acCurrentPage === numAcPages}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition font-semibold shadow-sm"
              >
                Next
              </button>
            </div>
            <div className="relative w-full flex-grow rounded-lg border border-gray-300 bg-gray-100 overflow-hidden">
              <div
                onMouseDown={(e) => handlePanStart(e, "ac")}
                className={`flex items-center justify-center ${
                  acZoomLevel > 1 ? "cursor-grab" : ""
                }`}
                style={{
                  width: "100%",
                  height: "100%",
                  transform: `translate(${acTranslate.x}px, ${acTranslate.y}px) scale(${acZoomLevel})`,
                  transformOrigin: "top left",
                  transition: isPanningRef.current ? "none" : "transform 0.1s",
                }}
              >
                {isAcLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10 text-indigo-600 font-medium">
                    <ArrowPathIcon className="animate-spin h-8 w-8 text-indigo-500 mb-2" />
                    <span>Loading AC...</span>
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
                      scale={1}
                      renderTextLayer={true}
                    />
                  </Document>
                ) : (
                  <div className="text-gray-500 text-center p-4">
                    Answer Copy Not Found.
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between mt-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Comments for Page {acCurrentPage}
                </label>
                <div className="h-10 p-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-800 text-sm whitespace-pre-wrap overflow-y-auto">
                  {comments}
                </div>
              </div>
              <div className="flex items-center justify-end space-x-2 pl-4">
                <button
                  onClick={() => handleZoom("ac", "out")}
                  disabled={acZoomLevel <= MIN_ZOOM}
                  className="p-2 bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200 disabled:opacity-50 transition"
                  title="Zoom Out"
                >
                  <MagnifyingGlassMinusIcon className="h-5 w-5" />
                </button>
                <span className="text-sm font-medium text-gray-700 bg-indigo-50 px-3 py-1 rounded-md border border-indigo-200 w-20 text-center">
                  {(acZoomLevel * 100).toFixed(0)}%
                </span>
                <button
                  onClick={() => handleZoom("ac", "in")}
                  disabled={acZoomLevel >= MAX_ZOOM}
                  className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 transition"
                  title="Zoom In"
                >
                  <MagnifyingGlassPlusIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleZoom("ac", "reset")}
                  disabled={acZoomLevel === 1.0}
                  className="p-2 bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200 disabled:opacity-50 transition"
                  title="Reset Zoom"
                >
                  <ArrowsPointingInIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
