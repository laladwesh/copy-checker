import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";
import {
  ArrowLeftIcon,
  EyeIcon, // For viewing copies
  ArrowPathIcon, // For loading spinner and Release/Unrelease button
  CheckCircleIcon,
  ExclamationCircleIcon,
  MagnifyingGlassIcon, // For search bar
  DocumentTextIcon, // For PDF icon
  CalendarDaysIcon, // For exam date
  AcademicCapIcon, // For course
  ClipboardDocumentCheckIcon, // For total marks
  BookOpenIcon, // For total pages
  UsersIcon, // For assigned examiners search
  ClipboardDocumentListIcon, // For total copies
  TagIcon, // For exam type
  TrashIcon,
} from "@heroicons/react/24/outline";
import Modal from "../components/Modal";
import { toastSuccess, toastError, toastInfo } from "../utils/hotToast";

export default function AdminExamDetails() {
  const { examId } = useParams();
  const [exam, setExam] = useState(null);
  const [copies, setCopies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [studentSearchTerm, setStudentSearchTerm] = useState(""); // Renamed for clarity: search by student
  const [examinerSearchTerm, setExaminerSearchTerm] = useState(""); // NEW: State for examiner search term

  // Selection & bulk-delete states for copies
  const [selectedCopyIds, setSelectedCopyIds] = useState([]);
  const [selectAllCopies, setSelectAllCopies] = useState(false);
  const [isDeletingCopies, setIsDeletingCopies] = useState(false);

  // (Using react-hot-toast) — no local toast state required

  // Deletion modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteMode, setDeleteMode] = useState(null); // 'single' | 'bulk'
  const [pendingDeleteIds, setPendingDeleteIds] = useState([]);
  const [deleteMessage, setDeleteMessage] = useState("");

  // Function to fetch exam details and copies
  const fetchExamDetailsAndCopies = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/admin/exams/${examId}/copies`);
      setExam(response.data.exam);
      setCopies(response.data.copies);
    } catch (err) {
      console.error("Error fetching exam details or copies:", err);
      setError(err.response?.data?.message || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExamDetailsAndCopies();
  }, [examId]); // Depend on examId to refetch if URL param changes

  const handleToggleReleaseAllCopies = async () => {
    try {
      const evaluatedCopies = copies.filter((c) => c.status === "evaluated");
      const anyEvaluatedAndReleased = evaluatedCopies.some(
        (c) => c.isReleasedToStudent
      );

      const action = anyEvaluatedAndReleased ? "Unreleasing" : "Releasing";
      toastInfo(`${action} all evaluated copies for this exam...`);

      const res = await api.patch(`/admin/copies/${examId}/toggle-release`);

      toastSuccess(res.data.message);
      fetchExamDetailsAndCopies(); // Re-fetch data to reflect the changes
    } catch (err) {
      console.error("Error toggling release status for exam copies:", err);
      toastError(`Failed to toggle release status: ${err.response?.data?.message || err.message}`);
    }
  };

  // Function to toggle release status for a single copy
  const handleToggleSingleCopyRelease = async (
    copyId,
    currentReleaseStatus
  ) => {
    try {
      toastInfo(`${currentReleaseStatus ? "Unreleasing" : "Releasing"} single copy...`);

      const res = await api.patch(
        `/admin/copies/single/${copyId}/toggle-release`
      );

      toastSuccess(res.data.message);
      // Update the specific copy's release status in the local state
      setCopies((prevCopies) =>
        prevCopies.map((copy) =>
          copy._id === copyId
            ? { ...copy, isReleasedToStudent: !currentReleaseStatus }
            : copy
        )
      );
    } catch (err) {
      console.error("Error toggling single copy release status:", err);
      toastError(`Failed to toggle single copy release: ${err.response?.data?.message || err.message}`);
    }
  };

  // Determine the overall release status for the bulk button text
  const evaluatedCopiesForExam = copies.filter((c) => c.status === "evaluated");
  const allEvaluatedCopiesReleased =
    evaluatedCopiesForExam.length > 0 &&
    evaluatedCopiesForExam.every((c) => c.isReleasedToStudent);
  const anyEvaluatedCopies = evaluatedCopiesForExam.length > 0;

  // Filter copies based on student search term AND examiner search term
  const filteredCopies = copies.filter(
    (copy) =>
      (copy.student?.name.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
       copy.student?.email.toLowerCase().includes(studentSearchTerm.toLowerCase())) &&
      (examinerSearchTerm === "" || // If examiner search is empty, don't filter by examiner
       (copy.examiners && copy.examiners.some(examiner =>
         examiner.name.toLowerCase().includes(examinerSearchTerm.toLowerCase()) ||
         examiner.email.toLowerCase().includes(examinerSearchTerm.toLowerCase())
       )))
  );

  // Handlers for selecting copies and bulk delete (use modal confirmations)
  const handleCopyCheckboxChange = (copyId) => {
    setSelectedCopyIds((prev) =>
      prev.includes(copyId) ? prev.filter((id) => id !== copyId) : [...prev, copyId]
    );
  };

  const handleSelectAllCopies = (e) => {
    const checked = e.target.checked;
    setSelectAllCopies(checked);
    if (checked) {
      setSelectedCopyIds(filteredCopies.map((c) => c._id));
    } else {
      setSelectedCopyIds([]);
    }
  };

  const promptDeleteSelectedCopies = () => {
    if (selectedCopyIds.length === 0) {
      toastInfo("No copies selected.");
      return;
    }
    setDeleteMode("bulk");
    setPendingDeleteIds(selectedCopyIds.slice());
    setDeleteMessage(`Delete ${selectedCopyIds.length} selected copy(s)? This will remove associated queries and Drive files.`);
    setShowDeleteModal(true);
  };

  const promptDeleteSingle = (copyId) => {
    setDeleteMode("single");
    setPendingDeleteIds([copyId]);
    setDeleteMessage("Delete this copy? This will remove associated queries and Drive files.");
    setShowDeleteModal(true);
  };

  const performPendingDelete = async () => {
    if (!pendingDeleteIds || pendingDeleteIds.length === 0) return;
    setIsDeletingCopies(true);
    try {
      if (deleteMode === "single") {
        const id = pendingDeleteIds[0];
        await api.delete(`/admin/copies/${id}`);
      } else {
        await api.delete(`/admin/copies`, { data: { copyIds: pendingDeleteIds } });
      }
      toastSuccess("Deletion successful.");
      setSelectedCopyIds((prev) => prev.filter((id) => !pendingDeleteIds.includes(id)));
      setPendingDeleteIds([]);
      setSelectAllCopies(false);
      fetchExamDetailsAndCopies();
    } catch (err) {
      console.error("Error deleting copies:", err);
      toastError(`Error: ${err.response?.data?.message || err.message}`);
    } finally {
      setShowDeleteModal(false);
      setIsDeletingCopies(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-white" style={{fontFamily: 'Dosis, sans-serif'}}>
        <div className="flex flex-col items-center text-gray-600 text-lg">
          <ArrowPathIcon className="animate-spin h-10 w-10 text-gray-900" />
          <p className="mt-4 font-bold">Loading exam details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-gray-900 text-center py-10 text-xl font-bold bg-white rounded-lg p-4 border-2 border-gray-900" style={{fontFamily: 'Dosis, sans-serif'}}>
        <p className="font-bold text-lg mb-2">Error Loading Exam Details:</p>
        <p>{error}</p>
        <p className="text-sm mt-2">Please try refreshing the page.</p>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="text-gray-600 text-center py-10 text-xl font-bold bg-white rounded-lg p-4 border-2 border-gray-900" style={{fontFamily: 'Dosis, sans-serif'}}>
        Exam not found.
      </div>
    );
  }

  // Format exam date
  const examDate = exam.date ? new Date(exam.date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  }) : 'N/A';

  return (
    <div className="p-8 space-y-8 bg-white min-h-screen" style={{fontFamily: 'Dosis, sans-serif'}}>
      {/* Back Button and Exam Question Paper Link */}
      <div className="flex justify-between items-center mb-6">
        <Link
          to="/admin"
          className="text-gray-900 hover:text-[#1e3a8a] flex items-center font-bold transition duration-200"
        >
          <ArrowLeftIcon className="w-5 h-5 mr-2" /> Back to Admin Dashboard
        </Link>
        <button
          onClick={() => window.open(exam.driveFile?.id ? `/api/drive/pdf/${exam.driveFile.id}` : '#', "_blank")}
          className="inline-flex items-center justify-center px-5 py-2 bg-gray-900 text-white font-bold rounded-lg hover:bg-[#1e3a8a] focus:outline-none transition duration-150"
        >
          <DocumentTextIcon className="h-5 w-5 mr-2" /> View Exam Question Paper
        </button>
      </div>

      <h1 className="text-4xl font-bold text-gray-900 text-center mb-8">
        Copies for Exam: <span className="text-[#1e3a8a]">{exam.title}</span>
      </h1>

      {/* NEW: Exam Details Card */}
      <div className="bg-white p-6 rounded-xl border-2 border-gray-900 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="flex items-center space-x-3">
          <CalendarDaysIcon className="h-6 w-6 text-gray-900" />
          <p className="text-gray-700"><strong className="font-bold">Date:</strong> {examDate}</p>
        </div>
        <div className="flex items-center space-x-3">
          <AcademicCapIcon className="h-6 w-6 text-gray-900" />
          <p className="text-gray-700"><strong className="font-bold">Course/Batch:</strong> {exam.course || 'N/A'}</p>
        </div>
        <div className="flex items-center space-x-3">
          <TagIcon className="h-6 w-6 text-gray-900" />
          <p className="text-gray-700"><strong className="font-bold">Exam Type:</strong> {exam.examType || 'N/A'}</p>
        </div>
        <div className="flex items-center space-x-3">
          <ClipboardDocumentCheckIcon className="h-6 w-6 text-gray-900" />
          <p className="text-gray-700"><strong className="font-bold">Total Marks:</strong> {exam.totalMarks || 'N/A'}</p>
        </div>
        <div className="flex items-center space-x-3">
          <BookOpenIcon className="h-6 w-6 text-gray-900" />
          <p className="text-gray-700"><strong className="font-bold">Total Pages (QP):</strong> {exam.totalPages || 'N/A'}</p>
        </div>
        <div className="flex items-center space-x-3">
          <ClipboardDocumentListIcon className="h-6 w-6 text-gray-900" />
          <p className="text-gray-700"><strong className="font-bold">Total Copies Uploaded:</strong> {copies.length}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border-2 border-gray-900">
        <h2 className="text-2xl font-bold text-gray-800 mb-4  border-gray-900 pb-2 flex justify-between items-center">
          <span>All Answer Copies</span>
          {anyEvaluatedCopies && ( // Only show bulk button if there are evaluated copies
            <button
              onClick={handleToggleReleaseAllCopies}
              className="px-4 py-2 rounded-md text-white font-bold transition duration-150 flex items-center bg-gray-900 hover:bg-[#1e3a8a]"
            >
              <ArrowPathIcon className="h-5 w-5 inline-block mr-2" />
              {allEvaluatedCopiesReleased ? "Unrelease All" : "Release All"}
            </button>
          )}
        </h2>

        {/* Search Bars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Student Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              placeholder="Search by student name or email..."
              value={studentSearchTerm}
              onChange={(e) => setStudentSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          {/* Examiner Search Bar */}
         
          {/* Examiner Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <UsersIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              placeholder="Search by examiner name or email..."
              value={examinerSearchTerm}
              onChange={(e) => setExaminerSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border-2 border-gray-900 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:border-[#1e3a8a] sm:text-sm font-bold"
            />
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div />
          <div className="flex items-center space-x-2">
            <button
              onClick={promptDeleteSelectedCopies}
              disabled={selectedCopyIds.length === 0 || isDeletingCopies}
              className="inline-flex items-center px-3 py-2 border-2 border-gray-900 text-sm font-bold rounded-md text-white bg-gray-900 hover:bg-[#1e3a8a] disabled:opacity-50 disabled:cursor-not-allowed transition duration-150"
            >
              {isDeletingCopies ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" /> Deleting...
                </>
              ) : (
                <>
                  <DocumentTextIcon className="h-4 w-4 mr-2" /> Delete Selected ({selectedCopyIds.length})
                </>
              )}
            </button>
          </div>
        </div>

        {filteredCopies.length === 0 ? (
          <p className="text-gray-600 text-center py-4">
            {studentSearchTerm || examinerSearchTerm ? "No matching copies found." : "No answer copies uploaded for this exam yet."}
          </p>
        ) : (
          <div className="overflow-x-auto max-h-96 overflow-y-auto rounded-lg border-2 border-gray-900">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white border-b-2 border-gray-900 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                      checked={selectAllCopies}
                      onChange={handleSelectAllCopies}
                    />
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider"
                  >
                    Student Name (Email)
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider"
                  >
                    Batch
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider"
                  >
                    Assigned Examiner(s)
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider"
                  >
                    Released to Student
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider"
                  >
                    Answer Copy PDF
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCopies.map((copy) => (
                  <tr
                    key={copy._id}
                    className="hover:bg-gray-50 transition-colors duration-150"
                  >
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                        checked={selectedCopyIds.includes(copy._id)}
                        onChange={() => handleCopyCheckboxChange(copy._id)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                      {copy.student?.name || "N/A"} (
                      {copy.student?.email || "N/A"})
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                      {copy.student?.batch || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className="px-2 inline-flex text-xs leading-5 font-bold rounded-full border-2 border-gray-900 bg-white text-gray-900"
                      >
                        {copy.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-bold">
                      {copy.examiners && copy.examiners.length > 0
                        ? copy.examiners
                            .map((e) => e.name || e.email)
                            .join(", ")
                        : "Unassigned"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className="px-2 inline-flex text-xs leading-5 font-bold rounded-full border-2 border-gray-900 bg-white text-gray-900"
                      >
                        {copy.isReleasedToStudent ? "Yes" : "No"}
                      </span>
                    </td>
                    {/* Answer Copy PDF Link */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {copy.driveFile?.id ? (
                        <a
                          href={`/api/drive/pdf/${copy.driveFile.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-1 border-2 border-gray-900 text-sm font-bold rounded-md text-gray-900 bg-white hover:bg-gray-900 hover:text-white focus:outline-none transition duration-150"
                          title="View Answer Copy PDF"
                        >
                          <DocumentTextIcon className="h-4 w-4 mr-1" /> View PDF
                        </a>
                      ) : (
                        <span className="text-gray-500 font-bold">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold flex items-center justify-end space-x-2">
                      {copy.status === "evaluated" && ( // Only show if copy is evaluated
                        <button
                          onClick={() =>
                            handleToggleSingleCopyRelease(
                              copy._id,
                              copy.isReleasedToStudent
                            )
                          }
                          className="px-3 py-1.5 rounded-md text-white font-bold transition duration-150 flex items-center bg-gray-900 hover:bg-[#1e3a8a]"
                          title={
                            copy.isReleasedToStudent
                              ? "Unrelease this copy"
                              : "Release this copy"
                          }
                        >
                          <ArrowPathIcon className="h-4 w-4 inline-block mr-1" />
                          {copy.isReleasedToStudent ? "Unrelease" : "Release"}
                        </button>
                      )}
                      <Link
                        to={`/admin/copies/view/${copy._id}`}
                        className="inline-flex items-center px-3 py-1.5 border-2 border-gray-900 text-sm font-bold rounded-md text-white bg-gray-900 hover:bg-[#1e3a8a] focus:outline-none transition duration-150"
                        title="View Copy Details"
                      >
                        <EyeIcon className="h-4 w-4 mr-1" /> View Details
                      </Link>

                      <button
                        onClick={() => promptDeleteSingle(copy._id)}
                        className="inline-flex items-center px-3 py-1.5 border-2 border-gray-900 text-sm font-bold rounded-md text-white bg-gray-900 hover:bg-[#1e3a8a] focus:outline-none transition duration-150"
                        title="Delete Copy"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Toasts are provided globally via react-hot-toast */}

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title={deleteMode === "single" ? "Delete Copy" : "Delete Copies"}
      >
        <div className="p-4 text-center" style={{fontFamily: 'Dosis, sans-serif'}}>
          <p className="text-lg text-gray-700 mb-6 font-bold">{deleteMessage}</p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="px-6 py-2 bg-white border-2 border-gray-900 text-gray-900 rounded-lg hover:bg-gray-100 font-bold transition"
            >
              Cancel
            </button>
            <button
              onClick={performPendingDelete}
              className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-[#1e3a8a] font-bold transition"
            >
              {isDeletingCopies ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}