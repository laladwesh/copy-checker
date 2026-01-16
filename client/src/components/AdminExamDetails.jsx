import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";
import {
  ArrowLeftIcon,
  EyeIcon, // For viewing copies
  ArrowPathIcon, // For loading spinner and Release/Unrelease button
  CheckCircleIcon, // For toast
  ExclamationCircleIcon, // For toast
  MagnifyingGlassIcon, // For search bar
  DocumentTextIcon, // For PDF icon
  CalendarDaysIcon, // For exam date
  AcademicCapIcon, // For course
  ClipboardDocumentCheckIcon, // For total marks
  BookOpenIcon, // For total pages
  UsersIcon, // For assigned examiners search
  ClipboardDocumentListIcon, // For total copies
  TagIcon, // For exam type
} from "@heroicons/react/24/outline";

export default function AdminExamDetails() {
  const { examId } = useParams();
  const [exam, setExam] = useState(null);
  const [copies, setCopies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [studentSearchTerm, setStudentSearchTerm] = useState(""); // Renamed for clarity: search by student
  const [examinerSearchTerm, setExaminerSearchTerm] = useState(""); // NEW: State for examiner search term

  // State for toast notifications
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState({
    message: "",
    type: "success",
  });

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
      setToastMessage({
        message: `${action} all evaluated copies for this exam...`,
        type: "info",
      });
      setShowToast(true);

      const res = await api.patch(`/admin/copies/${examId}/toggle-release`);

      setToastMessage({
        message: res.data.message,
        type: "success",
      });
      fetchExamDetailsAndCopies(); // Re-fetch data to reflect the changes
    } catch (err) {
      console.error("Error toggling release status for exam copies:", err);
      setToastMessage({
        message: `Failed to toggle release status: ${
          err.response?.data?.message || err.message
        }`,
        type: "error",
      });
    } finally {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000); // Hide toast after 3 seconds
    }
  };

  // Function to toggle release status for a single copy
  const handleToggleSingleCopyRelease = async (
    copyId,
    currentReleaseStatus
  ) => {
    try {
      setToastMessage({
        message: `${
          currentReleaseStatus ? "Unreleasing" : "Releasing"
        } single copy...`,
        type: "info",
      });
      setShowToast(true);

      const res = await api.patch(
        `/admin/copies/single/${copyId}/toggle-release`
      );

      setToastMessage({
        message: res.data.message,
        type: "success",
      });
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
      setToastMessage({
        message: `Failed to toggle single copy release: ${
          err.response?.data?.message || err.message
        }`,
        type: "error",
      });
    } finally {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000); // Hide toast after 3 seconds
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="flex flex-col items-center text-gray-600 text-lg">
          <ArrowPathIcon className="animate-spin h-10 w-10 text-indigo-500" />
          <p className="mt-4">Loading exam details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center py-10 text-xl font-semibold bg-red-50 rounded-lg p-4 border border-red-200">
        <p className="font-bold text-lg mb-2">Error Loading Exam Details:</p>
        <p>{error}</p>
        <p className="text-sm mt-2">Please try refreshing the page.</p>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="text-gray-600 text-center py-10 text-xl font-semibold bg-white rounded-lg p-4 shadow-md">
        Exam not found.
      </div>
    );
  }

  // Format exam date
  const examDate = exam.date ? new Date(exam.date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  }) : 'N/A';

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen font-sans">
      {/* Back Button and Exam Question Paper Link */}
      <div className="flex justify-between items-center mb-6">
        <Link
          to="/admin"
          className="text-indigo-600 hover:underline flex items-center font-medium transition duration-200"
        >
          <ArrowLeftIcon className="w-5 h-5 mr-2" /> Back to Admin Dashboard
        </Link>
        <button
          onClick={() => window.open(exam.driveFile?.id ? `/api/drive/pdf/${exam.driveFile.id}` : '#', "_blank")}
          className="inline-flex items-center justify-center px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 transform hover:scale-105"
        >
          <DocumentTextIcon className="h-5 w-5 mr-2" /> View Exam Question Paper
        </button>
      </div>

      <h1 className="text-4xl font-extrabold text-gray-900 text-center mb-8 tracking-tight">
        Copies for Exam: <span className="text-blue-700">{exam.title}</span>
      </h1>

      {/* NEW: Exam Details Card */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="flex items-center space-x-3">
          <CalendarDaysIcon className="h-6 w-6 text-purple-500" />
          <p className="text-gray-700"><strong className="font-semibold">Date:</strong> {examDate}</p>
        </div>
        <div className="flex items-center space-x-3">
          <AcademicCapIcon className="h-6 w-6 text-green-500" />
          <p className="text-gray-700"><strong className="font-semibold">Course/Batch:</strong> {exam.course || 'N/A'}</p>
        </div>
        <div className="flex items-center space-x-3">
          <TagIcon className="h-6 w-6 text-orange-500" />
          <p className="text-gray-700"><strong className="font-semibold">Exam Type:</strong> {exam.examType || 'N/A'}</p>
        </div>
        <div className="flex items-center space-x-3">
          <ClipboardDocumentCheckIcon className="h-6 w-6 text-red-500" />
          <p className="text-gray-700"><strong className="font-semibold">Total Marks:</strong> {exam.totalMarks || 'N/A'}</p>
        </div>
        <div className="flex items-center space-x-3">
          <BookOpenIcon className="h-6 w-6 text-teal-500" />
          <p className="text-gray-700"><strong className="font-semibold">Total Pages (QP):</strong> {exam.totalPages || 'N/A'}</p>
        </div>
        <div className="flex items-center space-x-3">
          <ClipboardDocumentListIcon className="h-6 w-6 text-blue-500" />
          <p className="text-gray-700"><strong className="font-semibold">Total Copies Uploaded:</strong> {copies.length}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-2 flex justify-between items-center">
          <span>All Answer Copies</span>
          {anyEvaluatedCopies && ( // Only show bulk button if there are evaluated copies
            <button
              onClick={handleToggleReleaseAllCopies}
              className={`px-4 py-2 rounded-md text-white font-medium transition duration-150 flex items-center shadow-md hover:shadow-lg ${
                allEvaluatedCopiesReleased
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-green-500 hover:bg-green-600"
              }`}
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
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <UsersIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              placeholder="Search by examiner name or email..."
              value={examinerSearchTerm}
              onChange={(e) => setExaminerSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
            />
          </div>
        </div>

        {filteredCopies.length === 0 ? (
          <p className="text-gray-600 text-center py-4">
            {studentSearchTerm || examinerSearchTerm ? "No matching copies found." : "No answer copies uploaded for this exam yet."}
          </p>
        ) : (
          <div className="overflow-x-auto max-h-96 overflow-y-auto rounded-lg border border-gray-200 shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Student Name (Email)
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Batch
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Assigned Examiner(s)
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Released to Student
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Answer Copy PDF
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {copy.student?.name || "N/A"} (
                      {copy.student?.email || "N/A"})
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {copy.student?.batch || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          copy.status === "evaluated"
                            ? "bg-green-100 text-green-800"
                            : copy.status === "pending"
                            ? "bg-gray-100 text-gray-800"
                            : "bg-yellow-100 text-yellow-800" // For 'examining' status
                        }`}
                      >
                        {copy.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {copy.examiners && copy.examiners.length > 0
                        ? copy.examiners
                            .map((e) => e.name || e.email)
                            .join(", ")
                        : "Unassigned"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          copy.isReleasedToStudent
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {copy.isReleasedToStudent ? "Yes" : "No"}
                      </span>
                    </td>
                    {/* Answer Copy PDF Link */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {copy.driveFile?.directDownloadLink ? (
                        <a
                          href={copy.driveFile.directDownloadLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          title="View Answer Copy PDF"
                        >
                          <DocumentTextIcon className="h-4 w-4 mr-1" /> View PDF
                        </a>
                      ) : (
                        <span className="text-gray-500">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex items-center justify-end space-x-2">
                      {copy.status === "evaluated" && ( // Only show if copy is evaluated
                        <button
                          onClick={() =>
                            handleToggleSingleCopyRelease(
                              copy._id,
                              copy.isReleasedToStudent
                            )
                          }
                          className={`px-3 py-1.5 rounded-md text-white font-medium transition duration-150 flex items-center shadow-sm hover:shadow-md ${
                            copy.isReleasedToStudent
                              ? "bg-red-500 hover:bg-red-600"
                              : "bg-green-500 hover:bg-green-600"
                          }`}
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
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150"
                        title="View Copy Details"
                      >
                        <EyeIcon className="h-4 w-4 mr-1" /> View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div
          className={`fixed bottom-5 right-5 p-4 rounded-lg shadow-xl flex items-center space-x-3 ${
            toastMessage.type === "success"
              ? "bg-green-500"
              : toastMessage.type === "info"
              ? "bg-blue-500"
              : "bg-red-500"
          } text-white transition-all duration-300 transform`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircleIcon className="h-6 w-6" />
          ) : toastMessage.type === "info" ? (
            <ArrowPathIcon className="h-6 w-6 animate-spin" />
          ) : (
            <ExclamationCircleIcon className="h-6 w-6" />
          )}
          <p className="font-semibold">{toastMessage.message}</p>
        </div>
      )}
    </div>
  );
}
