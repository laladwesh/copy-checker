import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { Document, Page, pdfjs } from "react-pdf";
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import {
  MagnifyingGlassIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ArrowsPointingInIcon,
  ArrowLeftIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import { toastSuccess, toastError } from "../utils/hotToast";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

/**
 * AdminManageQueries - Dedicated page for managing student queries
 * Features: Filter by exam, status tabs, search, view query details with PDF viewers
 */
export default function AdminManageQueries() {
  const navigate = useNavigate();

  // Core data states
  const [queries, setQueries] = useState([]);

  // Filter and search states
  const [selectedExamForQueryView, setSelectedExamForQueryView] = useState("");
  const [activeQueryTab, setActiveQueryTab] = useState("pending");
  const [querySearchTerm, setQuerySearchTerm] = useState("");

  // Query viewer states
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [selectedCopyForQueryView, setSelectedCopyForQueryView] = useState(null);
  const [isViewingQuery, setIsViewingQuery] = useState(false);

  // PDF viewer states - Answer Copy
  const [queryViewerCurrentPage, setQueryViewerCurrentPage] = useState(1);
  const [queryViewerZoomLevel, setQueryViewerZoomLevel] = useState(1.0);
  const [isQueryViewerAcLoading, setIsQueryViewerAcLoading] = useState(true);
  const [numAcPages, setNumAcPages] = useState(null);

  // Form states
  const [replyText, setReplyText] = useState("");
  const [isSubmittingQueryAction, setIsSubmittingQueryAction] = useState(false);

  // Toasts provided via react-hot-toast helpers

  const ZOOM_STEP = 0.25;
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 3;

  // Use toastSuccess/toastError/toastInfo helpers for notifications

  // Fetch queries data
  const fetchData = useCallback(async () => {
    try {
      const queriesRes = await api.get("/admin/queries");
      setQueries(queriesRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
        toastError("Failed to load data.");
    }
    }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get unique exam titles with IDs for filter dropdown
  const uniqueExamTitlesWithIds = useMemo(() => {
    const uniqueMap = new Map();
    queries.forEach((q) => {
      if (q.copy?.questionPaper?._id && q.copy?.questionPaper?.title) {
        uniqueMap.set(q.copy.questionPaper._id, {
          _id: q.copy.questionPaper._id,
          title: q.copy.questionPaper.title,
        });
      }
    });
    return Array.from(uniqueMap.values()).sort((a, b) =>
      a.title.localeCompare(b.title)
    );
  }, [queries]);

  // Filter queries based on exam selection, status, and search term
  const getFilteredQueries = () => {
    let filtered = queries;

    // Filter by selected exam
    if (selectedExamForQueryView) {
      filtered = filtered.filter(
        (q) => q.copy?.questionPaper?._id === selectedExamForQueryView
      );
    }

    // Filter by active tab status
    filtered = filtered.filter((q) => q.status === activeQueryTab);

    // Filter by search term
    if (querySearchTerm.trim()) {
      const searchLower = querySearchTerm.toLowerCase();
      filtered = filtered.filter(
        (q) =>
          q.raisedBy?.name?.toLowerCase().includes(searchLower) ||
          q.raisedBy?.email?.toLowerCase().includes(searchLower) ||
          q.text?.toLowerCase().includes(searchLower) ||
          q.copy?.questionPaper?.title?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  };

  // Open query viewer with full details
  const handleOpenQueryModal = async (query) => {
    setSelectedQuery(query);
    setReplyText(query.response || "");
    setIsViewingQuery(true);
    setQueryViewerCurrentPage(query.pageNumber || 1);
    setQueryViewerZoomLevel(1.0);
    setIsQueryViewerAcLoading(true);
    setNumAcPages(null);

    // Fetch the copy details
    try {
      const copyRes = await api.get(`/admin/copies/view/${query.copy._id}`);
      setSelectedCopyForQueryView(copyRes.data);
    } catch (error) {
      console.error("Error fetching copy details:", error);
        toastError("Failed to load copy details.");
    }
  };

  // Close query viewer and reset states
  const handleCloseQueryViewer = () => {
    setIsViewingQuery(false);
    setSelectedQuery(null);
    setReplyText("");
    setSelectedCopyForQueryView(null);
    setQueryViewerCurrentPage(1);
    setQueryViewerZoomLevel(1.0);
    fetchData();
  };

  // Approve query and forward to examiner
  const handleApproveQuery = async () => {
    if (!selectedQuery) return;
    setIsSubmittingQueryAction(true);
    try {
      await api.patch(`/admin/queries/${selectedQuery._id}/approve`);
      toastSuccess("Query approved and forwarded to examiner!");
      handleCloseQueryViewer();
    } catch (error) {
      console.error("Error approving query:", error);
      toastError(`Error approving query: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsSubmittingQueryAction(false);
    }
  };

  // Reject query
  const handleRejectQuery = async () => {
    if (!selectedQuery) return;
    setIsSubmittingQueryAction(true);
    try {
      await api.patch(`/admin/queries/${selectedQuery._id}/reject`);
      toastSuccess("Query rejected!");
      handleCloseQueryViewer();
    } catch (error) {
      console.error("Error rejecting query:", error);
      toastError(`Error rejecting query: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsSubmittingQueryAction(false);
    }
  };

  // Resolve query with admin response
  const handleResolveQuery = async () => {
    if (!selectedQuery || !replyText.trim()) {
      toastError("Please provide a response to resolve the query.");
      return;
    }
    setIsSubmittingQueryAction(true);
    try {
      await api.patch(`/admin/queries/${selectedQuery._id}/resolve`, {
        responseText: replyText,
      });
      toastSuccess("Query resolved successfully with your reply!");
      handleCloseQueryViewer();
    } catch (error) {
      console.error("Error resolving query:", error);
      toastError(`Error resolving query: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsSubmittingQueryAction(false);
    }
  };

  // Handle zoom controls for PDF viewers
  const handleQueryViewerZoom = useCallback((type, action) => {
    setQueryViewerZoomLevel((prevZoom) => {
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

  // PDF document load handlers
  const onAcDocumentLoadSuccess = useCallback(({ numPages }) => {
    setNumAcPages(numPages);
    setIsQueryViewerAcLoading(false);
  }, []);

  const onAcDocumentLoadError = useCallback((error) => {
    console.error("Error loading Answer Copy PDF:", error);
    setNumAcPages(0);
    setIsQueryViewerAcLoading(false);
  }, []);

  return (
    <div className="min-h-screen bg-white p-6" style={{fontFamily: 'Dosis, sans-serif'}}>
      {/* Toasts are provided globally via react-hot-toast */}

      {!isViewingQuery ? (
        // Query List View
        <div className="mx-auto">
          <div className="mb-8">
            <button
              onClick={() => navigate("/admin")}
              className="flex items-center gap-2 text-gray-900 hover:text-[#1e3a8a] mb-4 font-bold transition"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              Back to Admin Panel
            </button>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Manage Student Queries
            </h1>
            <p className="text-gray-600 font-bold">
              Review, approve, reject, or resolve student queries for all exams
            </p>
          </div>

          <div className="bg-white rounded-xl border-2 border-gray-900 p-6 mb-6">
            <div className="mb-6">
              <label
                htmlFor="selectExamForQueries"
                className="block text-sm font-bold text-gray-700 mb-2"
              >
                Filter by Exam:
              </label>
              <select
                id="selectExamForQueries"
                value={selectedExamForQueryView}
                onChange={(e) => setSelectedExamForQueryView(e.target.value)}
                className="w-full p-3 border-2 border-gray-900 rounded-lg focus:outline-none focus:border-[#1e3a8a] bg-white font-bold"
              >
                <option value="">All Exams</option>
                {uniqueExamTitlesWithIds.map((exam) => (
                  <option key={exam._id} value={exam._id}>
                    {exam.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex border-b-2 border-gray-900 mb-6 overflow-x-auto no-scrollbar">
              <button
                className={`py-3 px-6 text-sm font-bold whitespace-nowrap ${
                  activeQueryTab === "pending"
                    ? "border-b-2 border-gray-900 text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                } transition duration-150`}
                onClick={() => setActiveQueryTab("pending")}
              >
                Pending (
                {
                  queries.filter(
                    (q) =>
                      q.status === "pending" &&
                      (!selectedExamForQueryView ||
                        q.copy?.questionPaper?._id === selectedExamForQueryView)
                  ).length
                }
                )
              </button>
              <button
                className={`py-3 px-6 text-sm font-bold whitespace-nowrap ${
                  activeQueryTab === "approved_by_admin"
                    ? "border-b-2 border-gray-900 text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                } transition duration-150`}
                onClick={() => setActiveQueryTab("approved_by_admin")}
              >
                Approved (
                {
                  queries.filter(
                    (q) =>
                      q.status === "approved_by_admin" &&
                      (!selectedExamForQueryView ||
                        q.copy?.questionPaper?._id === selectedExamForQueryView)
                  ).length
                }
                )
              </button>
              <button
                className={`py-3 px-6 text-sm font-bold whitespace-nowrap ${
                  activeQueryTab === "rejected_by_admin"
                    ? "border-b-2 border-gray-900 text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                } transition duration-150`}
                onClick={() => setActiveQueryTab("rejected_by_admin")}
              >
                Rejected (
                {
                  queries.filter(
                    (q) =>
                      q.status === "rejected_by_admin" &&
                      (!selectedExamForQueryView ||
                        q.copy?.questionPaper?._id === selectedExamForQueryView)
                  ).length
                }
                )
              </button>
              <button
                className={`py-3 px-6 text-sm font-bold whitespace-nowrap ${
                  activeQueryTab === "resolved_by_admin"
                    ? "border-b-2 border-gray-900 text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                } transition duration-150`}
                onClick={() => setActiveQueryTab("resolved_by_admin")}
              >
                Resolved by Admin (
                {
                  queries.filter(
                    (q) =>
                      q.status === "resolved_by_admin" &&
                      (!selectedExamForQueryView ||
                        q.copy?.questionPaper?._id === selectedExamForQueryView)
                  ).length
                }
                )
              </button>
              <button
                className={`py-3 px-6 text-sm font-bold whitespace-nowrap ${
                  activeQueryTab === "resolved_by_examiner"
                    ? "border-b-2 border-gray-900 text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                } transition duration-150`}
                onClick={() => setActiveQueryTab("resolved_by_examiner")}
              >
                Resolved by Examiner (
                {
                  queries.filter(
                    (q) =>
                      q.status === "resolved_by_examiner" &&
                      (!selectedExamForQueryView ||
                        q.copy?.questionPaper?._id === selectedExamForQueryView)
                  ).length
                }
                )
              </button>
            </div>

            <div className="mb-6 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search queries by student, exam, or query text..."
                className="block w-full pl-10 pr-3 py-3 border-2 border-gray-900 rounded-lg bg-white placeholder-gray-500 focus:outline-none focus:border-[#1e3a8a] font-bold"
                value={querySearchTerm}
                onChange={(e) => setQuerySearchTerm(e.target.value)}
              />
            </div>

            <div className="overflow-x-auto rounded-lg border-2 border-gray-900">
              {getFilteredQueries().length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg font-bold">
                    No queries found in this category
                  </p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-white border-b-2 border-gray-900 sticky top-0">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                        Student Name
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                        Exam Title
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                        Page
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                        Query Text
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getFilteredQueries().map((query) => (
                      <tr key={query._id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                          {query.raisedBy?.name || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-700">
                          {query.copy?.questionPaper?.title || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-700">
                          {query.pageNumber}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-700 truncate max-w-xs">
                          {query.text}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-white text-gray-900 border-2 border-gray-900">
                            {query.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold">
                          <button
                            onClick={() => handleOpenQueryModal(query)}
                            className="flex items-center gap-2 text-gray-900 hover:text-[#1e3a8a] font-bold transition"
                          >
                            <EyeIcon className="h-5 w-5" />
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      ) : (
        // Query Viewer with PDFs
        <div className="mx-auto">
          <div className="mb-6">
            <button
              onClick={handleCloseQueryViewer}
              className="flex items-center gap-2 text-gray-900 hover:text-[#1e3a8a] mb-4 font-bold transition"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              Back to Query List
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              Query Details - {selectedQuery?.copy?.questionPaper?.title || "N/A"}
            </h1>
          </div>

          {/* Question Paper Link */}
          <div className="bg-white p-6 rounded-xl border-2 border-gray-900 mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <svg className="h-6 w-6 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Question Paper
            </h3>
            {selectedCopyForQueryView?.questionPaper?.driveFile?.id ? (
              <a
                href={`/api/drive/pdf/${selectedCopyForQueryView.questionPaper.driveFile.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-[#1e3a8a] font-bold transition"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open Question Paper in New Tab
              </a>
            ) : (
              <div className="text-gray-600">Question paper link not available.</div>
            )}
          </div>

          <div className="flex flex-col lg:flex-row gap-6 pb-8">
            {/* Left Column: Answer Copy Viewer - 80% width */}
            <div className="bg-white p-6 rounded-xl border-2 border-gray-900 flex flex-col lg:w-[80%]">
              <h3 className="text-xl font-bold text-gray-800 mb-4 text-center border-b-2 border-gray-900 pb-3">
                Answer Copy
              </h3>
              <div className="flex justify-between items-center w-full mb-4 space-x-2">
                <button
                  onClick={() => {
                    setQueryViewerCurrentPage((p) => Math.max(1, p - 1));
                    setIsQueryViewerAcLoading(true);
                  }}
                  disabled={queryViewerCurrentPage === 1}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
                >
                  Previous
                </button>
                <span className="text-sm font-bold text-gray-800 whitespace-nowrap">
                  Page {queryViewerCurrentPage} / {numAcPages || "N/A"}
                </span>
                <button
                  onClick={() => {
                    setQueryViewerCurrentPage((p) => Math.min(numAcPages || 1, p + 1));
                    setIsQueryViewerAcLoading(true);
                  }}
                  disabled={queryViewerCurrentPage === (numAcPages || 1)}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
                >
                  Next
                </button>
              </div>
              <div className="relative w-full flex-grow min-h-[500px] rounded-lg overflow-auto border-2 border-gray-900 bg-gray-50 flex items-center justify-center">
                {isQueryViewerAcLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10">
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
                    <span className="ml-3 text-gray-700 font-bold">Loading...</span>
                  </div>
                )}
                {selectedCopyForQueryView?.driveFile?.directDownloadLink ? (
                  <Document
                    file={selectedCopyForQueryView.driveFile.directDownloadLink}
                    onLoadSuccess={onAcDocumentLoadSuccess}
                    onLoadError={onAcDocumentLoadError}
                    className="w-full h-full flex justify-center items-center"
                  >
                    <Page
                      pageNumber={queryViewerCurrentPage}
                      scale={queryViewerZoomLevel}
                      renderAnnotationLayer={true}
                      renderTextLayer={true}
                    />
                  </Document>
                ) : (
                  <div className="text-gray-500 text-center p-6">
                    Answer Copy Not Available
                  </div>
                )}
              </div>
              <div className="flex items-center justify-center mt-4 space-x-3">
                <button
                  onClick={() => handleQueryViewerZoom("ac", "out")}
                  disabled={queryViewerZoomLevel <= MIN_ZOOM}
                  className="p-2 bg-white border-2 border-gray-900 text-gray-900 rounded-lg hover:bg-gray-900 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
                  title="Zoom Out"
                >
                  <MagnifyingGlassMinusIcon className="h-6 w-6" />
                </button>
                <button
                  onClick={() => handleQueryViewerZoom("ac", "in")}
                  disabled={queryViewerZoomLevel >= MAX_ZOOM}
                  className="p-2 bg-gray-900 text-white rounded-lg hover:bg-[#1e3a8a] disabled:opacity-50 disabled:cursor-not-allowed transition"
                  title="Zoom In"
                >
                  <MagnifyingGlassPlusIcon className="h-6 w-6" />
                </button>
                <button
                  onClick={() => handleQueryViewerZoom("ac", "reset")}
                  disabled={queryViewerZoomLevel === MIN_ZOOM}
                  className="p-2 bg-white border-2 border-gray-900 text-gray-900 rounded-lg hover:bg-gray-900 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
                  title="Reset Zoom"
                >
                  <ArrowsPointingInIcon className="h-6 w-6" />
                </button>
                <span className="text-sm font-bold text-gray-700 bg-white border-2 border-gray-900 px-3 py-1 rounded-md">
                  {queryViewerZoomLevel.toFixed(2)}x
                </span>
              </div>
            </div>

            {/* Right Column: Query Details and Actions - 20% width */}
            <div className="bg-white p-6 rounded-xl border-2 border-gray-900 flex flex-col lg:w-[20%]">
              <h3 className="text-xl font-bold text-gray-800 mb-4 text-center border-b-2 border-gray-900 pb-3">
                Query Information
              </h3>
              <div className="flex-grow space-y-4">
                <div className="p-4 bg-white rounded-lg border-2 border-gray-900">
                  <p className="text-sm text-gray-700 mb-2 font-bold">
                    <strong className="text-gray-900">Student:</strong>{" "}
                    {selectedQuery?.raisedBy?.name} ({selectedQuery?.raisedBy?.email})
                  </p>
                  <p className="text-sm text-gray-700 mb-2 font-bold">
                    <strong className="text-gray-900">Exam:</strong>{" "}
                    {selectedQuery?.copy?.questionPaper?.title}
                  </p>
                  <p className="text-sm text-gray-700 mb-2 font-bold">
                    <strong className="text-gray-900">Page Number:</strong>{" "}
                    {selectedQuery?.pageNumber}
                  </p>
                  <p className="text-sm text-gray-700 font-bold">
                    <strong className="text-gray-900">Status:</strong>{" "}
                    <span className="ml-2 px-3 py-1 inline-flex text-xs font-bold rounded-full bg-white text-gray-900 border-2 border-gray-900">
                      {selectedQuery?.status?.replace(/_/g, " ")}
                    </span>
                  </p>
                </div>

                <div className="p-4 border-2 border-gray-900 bg-white rounded-lg">
                  <p className="text-gray-900 font-bold mb-2 text-sm">Student's Query:</p>
                  <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed font-bold">
                    {selectedQuery?.text}
                  </p>
                </div>

                {selectedQuery?.response && (
                  <div className="p-4 border-2 border-gray-900 bg-white rounded-lg">
                    <p className="text-gray-900 font-bold mb-2 text-sm">Admin's Response:</p>
                    <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed font-bold">
                      {selectedQuery?.response}
                    </p>
                  </div>
                )}

                {selectedQuery?.action && (
                  <div className="p-4 border-2 border-gray-900 bg-white rounded-lg">
                    <p className="text-gray-900 font-bold mb-2 text-sm">Action Taken:</p>
                    <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed font-bold">
                      {selectedQuery?.action}
                    </p>
                  </div>
                )}
              </div>

              {selectedQuery?.status === "resolved_by_admin" ||
              selectedQuery?.status === "rejected_by_admin" ? (
                <div className="mt-6 p-4 bg-white border-2 border-gray-900 rounded-lg text-center">
                  <p className="text-sm text-gray-600 font-bold">
                    This query has been {selectedQuery?.status?.replace(/_/g, " ")}.
                    <br />
                    No further actions available.
                  </p>
                </div>
              ) : (
                <div className="mt-6 pt-6 border-t-2 border-gray-900">
                  <h4 className="text-lg font-bold mb-4 text-gray-900">Admin Actions</h4>

                  {selectedQuery?.status === "pending" && (
                    <div className="mb-6">
                      <label
                        htmlFor="adminReply"
                        className="block text-gray-800 text-sm font-bold mb-2"
                      >
                        Reply and Resolve Query:
                      </label>
                      <textarea
                        id="adminReply"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows="4"
                        className="border-2 border-gray-900 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:border-[#1e3a8a] resize-y font-bold"
                        placeholder="Type your response here to resolve this query..."
                      ></textarea>
                      <button
                        onClick={handleResolveQuery}
                        disabled={isSubmittingQueryAction || !replyText.trim()}
                        className="mt-3 bg-gray-900 text-white py-3 px-6 rounded-lg w-full hover:bg-[#1e3a8a] disabled:opacity-50 disabled:cursor-not-allowed font-bold transition"
                      >
                        {isSubmittingQueryAction ? "Resolving..." : "Reply & Resolve"}
                      </button>
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    {selectedQuery?.status === "pending" && (
                      <>
                        <button
                          onClick={handleApproveQuery}
                          disabled={isSubmittingQueryAction}
                          className="w-full py-3 px-6 bg-gray-900 text-white rounded-lg hover:bg-[#1e3a8a] font-bold disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                          {isSubmittingQueryAction
                            ? "Approving..."
                            : "Approve (Forward to Examiner)"}
                        </button>
                        <button
                          onClick={handleRejectQuery}
                          disabled={isSubmittingQueryAction}
                          className="w-full py-3 px-6 bg-gray-900 text-white rounded-lg hover:bg-[#1e3a8a] font-bold disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                          {isSubmittingQueryAction ? "Rejecting..." : "Reject Query"}
                        </button>
                      </>
                    )}
                    <button
                      onClick={handleCloseQueryViewer}
                      className="w-full py-3 px-6 bg-white border-2 border-gray-900 text-gray-900 rounded-lg hover:bg-gray-100 font-bold transition"
                    >
                      Close & Go Back
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
