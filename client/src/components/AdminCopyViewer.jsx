import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";
import {
  ArrowLeftIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ArrowsPointingInIcon,
  ArrowPathIcon, // For loading spinner
} from "@heroicons/react/24/outline";

export default function AdminCopyViewer() {
  const { copyId } = useParams();
  const [copy, setCopy] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentPage, setCurrentPage] = useState(1); // Current page of the Answer Copy
  const [qpCurrentPage, setQpCurrentPage] = useState(1); // Current page of the Question Paper

  // Zoom States
  const [qpZoomLevel, setQpZoomLevel] = useState(1);
  const [acZoomLevel, setAcZoomLevel] = useState(1);

  const [isQpLoading, setIsQpLoading] = useState(false);
  const [isAcLoading, setIsAcLoading] = useState(false);

  const ZOOM_STEP = 0.25;
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 3;

  useEffect(() => {
    const fetchCopyDetails = async () => {
      setIsLoading(true);
      try {
        // NEW: Backend endpoint needed for admin to view any copy
        const res = await api.get(`/admin/copies/view/${copyId}`);
        setCopy(res.data);
        setCurrentPage(1); // Start at page 1
        setQpCurrentPage(1); // Start QP at page 1
      } catch (err) {
        console.error("Error fetching copy details:", err);
        setError(err.response?.data?.message || err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCopyDetails();
  }, [copyId]);

  // Reset zoom when current page of answer copy changes
  useEffect(() => {
    setAcZoomLevel(1);
  }, [currentPage]);

  // Reset zoom when current page of question paper changes
  useEffect(() => {
    setQpZoomLevel(1);
  }, [qpCurrentPage]);

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
    (p) => p.pageNumber === currentPage
  );
  const marksAwarded = currentAcPageData?.marksAwarded ?? "N/A";
  const comments = currentAcPageData?.comments?.join("\n") || "No comments.";

  // Get image URLs
  const qpImageUrl = copy.questionPaper?.driveFile?.id
    ? `/api/drive/page-image/${copy.questionPaper.driveFile.id}/${qpCurrentPage}`
    : "";
  const acImageUrl = copy.driveFile?.id
    ? `/api/drive/page-image/${copy.driveFile.id}/${currentPage}`
    : "";

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
            to={`/admin/exams/${copy.questionPaper._id}`} // Link back to the specific exam details
            className="text-gray-700 hover:text-indigo-600 flex items-center font-medium transition duration-200"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" /> Back to Exam Copies
          </Link>
          <span className="text-gray-500">|</span>
          <span className="text-xl font-bold text-gray-800">
            Copy Viewer (Admin)
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
            {copy.questionPaper?.totalPages > 1 && (
              <div className="flex justify-between items-center w-full mb-4 space-x-4">
                <button
                  onClick={() => {
                    setQpCurrentPage((p) => Math.max(1, p - 1));
                    setIsLoading(true); // Indicate loading for image change
                  }}
                  disabled={qpCurrentPage === 1}
                  className="flex-1 px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-lg"
                >
                  Prev
                </button>
                <span className="text-lg font-bold text-gray-800">
                  Page {qpCurrentPage} / {copy.questionPaper.totalPages}
                </span>
                <button
                  onClick={() => {
                    setQpCurrentPage((p) =>
                      Math.min(copy.questionPaper.totalPages, p + 1)
                    );
                    setIsQpLoading(true); // Indicate loading for image change
                  }}
                  disabled={qpCurrentPage === copy.questionPaper.totalPages}
                  className="flex-1 px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-lg"
                >
                  Next
                </button>
              </div>
            )}
            <div className="relative w-full flex-grow h-[400px] rounded-lg overflow-auto border border-gray-300 bg-gray-50 flex items-center justify-center">
              {isQpLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 z-10">
                  <ArrowPathIcon className="animate-spin h-8 w-8 text-indigo-500" />
                  <span className="ml-2 text-gray-700">Loading...</span>
                </div>
              )}
              {qpImageUrl ? (
                <img
                  src={qpImageUrl}
                  alt={`Question Paper Page ${qpCurrentPage}`}
                  className="w-full h-full object-contain"
                  style={{
                    transform: `scale(${qpZoomLevel})`,
                    transformOrigin: "center center",
                  }}
                  onLoad={() => setIsQpLoading(false)}
                  onError={() => setIsQpLoading(false)}
                />
              ) : (
                <div className="text-gray-500 text-center p-4">
                  Question Paper Page Not Found.
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
            <div className="flex justify-between items-center w-full mb-4 space-x-4">
              <button
                onClick={() => {
                  setCurrentPage((p) => Math.max(1, p - 1));
                  setIsAcLoading(true);
                }}
                disabled={currentPage === 1}
                className="flex-1 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-lg"
              >
                Prev
              </button>
              <span className="text-lg font-bold text-gray-800">
                Page {currentPage} / {copy.totalPages}
              </span>
              <button
                onClick={() => {
                  setCurrentPage((p) => Math.min(copy.totalPages, p + 1));
                  setIsAcLoading(true);
                }}
                disabled={currentPage === copy.totalPages}
                className="flex-1 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-lg"
              >
                Next
              </button>
            </div>
            <div className="relative w-full flex-grow h-[400px] rounded-lg overflow-auto border border-gray-300 bg-gray-50 flex items-center justify-center">
              {isAcLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 z-10">
                  <ArrowPathIcon className="animate-spin h-8 w-8 text-indigo-500" />
                  <span className="ml-2 text-gray-700">Loading...</span>
                </div>
              )}
              {acImageUrl ? (
                <img
                  src={acImageUrl}
                  alt={`Answer Copy Page ${currentPage}`}
                  className="w-full h-full object-contain"
                  style={{
                    transform: `scale(${acZoomLevel})`,
                    transformOrigin: "center center",
                  }}
                  onLoad={() => setIsAcLoading(false)}
                  onError={() => setIsAcLoading(false)}
                />
              ) : (
                <div className="text-gray-500 text-center p-4">
                  Answer Copy Page Not Found.
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

        {/* Marks and Comments Display */}
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
        </div>
      </div>
    </div>
  );
}
