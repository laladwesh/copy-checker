import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api"; // Ensure this path is correct for your axios instance
import {
  ArrowLeftIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ArrowsPointingInIcon,
  ArrowPathIcon,
  BookOpenIcon,
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
  const [numAcPages, setNumAcPages] = useState(null);
  const [acZoomLevel, setAcZoomLevel] = useState(1.25);
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

  const onAcDocumentLoadError = useCallback((err) => {
    console.error("Error loading Answer Copy PDF:", err);
    setIsAcLoading(false);
    setError(
      "Failed to load Answer Copy PDF. Please check the file format or link."
    );
  }, []);

  // Reset zoom on page change
  useEffect(() => {
    setAcZoomLevel(1.25);
  }, [acCurrentPage]);

  const handleZoom = useCallback((action) => {
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
  }, []);

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
      

      <div className="p-6 max-w-screen mx-auto">
        <header className=" mb-6 ">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
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

        <div className=" max-w-md mx-auto mb-6 text-center">
          <h3 className="text-xl font-bold text-gray-800">
            Total Marks:{" "}
            <span className="text-green-700 text-2xl">{totalMarksAwarded}</span>{" "}
            /{" "}
            <span className="text-gray-600 text-xl">{totalPossibleMarks}</span>
          </h3>
        </div>

        <div className="flex flex-col gap-6">
          {/* Question Paper Link */}
          <div className="">
            <div className="flex items-center justify-between">
              {qpPdfUrl ? (
                <a
                  href={qpPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center hover:underline text-indigo-500"
                >
                  {/* <BookOpenIcon className="h-5 w-5 mr-2" /> */}
                  Open Question Paper in New Tab
                </a>
              ) : (
                <div className="text-gray-600">Question paper link not available.</div>
              )}
            </div>
          </div>

          {/* Answer Copy and Evaluation - Side by Side */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Left: Answer Copy Section */}
            <div className="bg-white p-4 rounded-xl shadow-xl border-2 border-gray-300 flex flex-col lg:w-[70%] h-[calc(100vh-120px)]">
            
              <div className="relative w-full flex-grow rounded-lg border-2 border-gray-300 bg-gray-100 overflow-auto flex items-center justify-center">
                {isAcLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10 text-indigo-600 font-medium">
                    <ArrowPathIcon className="animate-spin h-10 w-10 text-indigo-500 mb-2" />
                    <span className="text-lg">Loading Answer Copy...</span>
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
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                    />
                  </Document>
                ) : (
                  <div className="text-gray-500 text-center p-4">
                    Answer Copy Not Found.
                  </div>
                )}
              </div>
            </div>

            {/* Right: Evaluation and Controls */}
            <div className="bg-white p-4 rounded-xl shadow-lg border-2 border-gray-300 flex flex-col lg:w-[30%]">
            {/* Page Navigation */}
            <div className="mb-4 pb-4 border-b-2 border-gray-200">
              {/* <h3 className="text-lg font-bold text-gray-800 mb-3">Page Navigation</h3> */}
              <div className="flex flex-col gap-2">
                <div className="flex gap-2 justify-between items-center">
                  <button
                    onClick={() => setAcCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={acCurrentPage === 1}
                    className="flex px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition font-semibold text-sm shadow-md"
                  >
                    Prev
                  </button>
                  <span className="text-center text-base font-bold text-gray-800">
                  Page {acCurrentPage} / {numAcPages || "..."}
                </span>
                  <button
                    onClick={() =>
                      setAcCurrentPage((p) => Math.min(numAcPages, p + 1))
                    }
                    disabled={!numAcPages || acCurrentPage === numAcPages}
                    className="flex px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition font-semibold text-sm shadow-md"
                  >
                    Next
                  </button>
                </div>
                
              </div>
            </div>

            {/* Page Status */}
            {isPageChecked && (
              <div className="mb-4">
                <span className="flex items-center text-sm font-semibold text-green-700 bg-green-100 px-3 py-2 rounded-lg shadow-sm">
                  <CheckBadgeIcon className="h-5 w-5 mr-2" />
                  Page Checked
                </span>
              </div>
            )}

            {/* Marks Awarded */}
            <div className="mb-4 pb-4 border-b-2 border-gray-200">
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Marks Awarded
              </label>
              <p className="w-full text-center px-3 py-2 border-2 border-gray-300 rounded-lg bg-gray-50 text-gray-900 text-xl font-bold">
                {marksAwarded}
              </p>
            </div>

            {/* Comments */}
            <div className="mb-4 pb-4 border-b-2 border-gray-200 flex-grow">
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Comments for Page {acCurrentPage}
              </label>
              <div className="p-3 border-2 border-gray-300 rounded-lg bg-gray-50 text-gray-800 text-sm whitespace-pre-wrap overflow-y-auto max-h-32">
                {comments}
              </div>
            </div>

            {/* Zoom Controls */}
            <div className="mt-auto">
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Zoom Controls
              </label>
              <div className="flex items-center justify-center space-x-2">
                <button
                  onClick={() => handleZoom("out")}
                  disabled={acZoomLevel <= MIN_ZOOM}
                  className="p-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 disabled:opacity-50 transition shadow-sm"
                  title="Zoom Out"
                >
                  <MagnifyingGlassMinusIcon className="h-5 w-5" />
                </button>
                <span className="text-sm font-medium text-gray-700 bg-indigo-50 px-3 py-1 rounded-md border-2 border-indigo-200 w-16 text-center">
                  {(acZoomLevel * 100).toFixed(0)}%
                </span>
                <button
                  onClick={() => handleZoom("in")}
                  disabled={acZoomLevel >= MAX_ZOOM}
                  className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm"
                  title="Zoom In"
                >
                  <MagnifyingGlassPlusIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleZoom("reset")}
                  disabled={acZoomLevel === 1.0}
                  className="p-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 disabled:opacity-50 transition shadow-sm"
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
    </div>
  );
}
