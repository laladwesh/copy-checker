import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api"; // Your Axios instance
import Modal from "../components/Modal"; // Assuming you have a generic Modal component
import ScanCopyUploadModal from "../components/ScanCopyUploadModal"; // Assuming you have this component
import {
  UserGroupIcon,
  ClipboardDocumentListIcon,
  BookOpenIcon,
  ArrowPathIcon,
  CloudArrowUpIcon,
  UsersIcon, // For assigning examiners to exam
  CheckCircleIcon, // For toast
  ExclamationCircleIcon, // For toast
  PaperAirplaneIcon, // For toast
} from "@heroicons/react/24/outline"; // Make sure you have these icons or similar

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [exams, setExams] = useState([]); // Renamed from questionPapers for clarity ("pool where all exams should be there")
  const [copies, setCopies] = useState([]);

  // Modals
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
  const [isCreateExamModalOpen, setIsCreateExamModalOpen] = useState(false); // For creating new exam
  const [
    isAssignExaminersToExamModalOpen,
    setIsAssignExaminersToExamModalOpen,
  ] = useState(false); // NEW: For assigning examiners to an exam
  const [isCopiesModalOpen, setIsCopiesModalOpen] = useState(false);
  const [isScanUploadModalOpen, setIsScanUploadModalOpen] = useState(false);

  // Form states for adding user/QP/assigning examiner
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("student");
  const [newExamTitle, setNewExamTitle] = useState(""); // For QP title
  // NEW: State variables for new exam details
  const [newExamCourse, setNewExamCourse] = useState("");
  const [newExamExamType, setNewExamExamType] = useState("");
  const [newExamDate, setNewExamDate] = useState("");
  const [newExamTotalMarks, setNewExamTotalMarks] = useState("");

  // MODIFIED: To handle either a single PDF or multiple images
  const [newExamFiles, setNewExamFiles] = useState([]); // Array to hold files
  const [newExamFileType, setNewExamFileType] = useState(null); // 'pdf' or 'images'

  const [
    selectedExamForExaminerAssignment,
    setSelectedExamForExaminerAssignment,
  ] = useState(null); // The exam object selected for examiner assignment
  const [selectedExaminerIds, setSelectedExaminerIds] = useState([]); // Examiner IDs for assignment (multi-select)
  const [availableExaminers, setAvailableExaminers] = useState([]); // List of examiners for dropdown

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState({
    message: "",
    type: "success",
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      // Fetch all necessary data for the admin panel
      const [usersRes, examsRes, copiesRes, examinersRes] = await Promise.all([
        api.get("/admin/users"),
        api.get("/admin/exams"), // Fetch exams (papers) including populated assignedExaminers
        api.get("/admin/copies"), // Fetch all copies including populated student, questionPaper, and examiners
        api.get("/admin/examiners"), // Fetch all examiners for assignment dropdown
      ]);
      setUsers(usersRes.data);
      setExams(examsRes.data);
      setCopies(copiesRes.data);
      setAvailableExaminers(examinersRes.data);
    } catch (error) {
      console.error("Error fetching initial data:", error);
      showTemporaryToast(`Error loading data: ${error.message}`, "error");
    }
  };

  const showTemporaryToast = (msg, type = "success") => {
    setToastMessage({ message: msg, type: type });
    setShowToast(true);
    const timer = setTimeout(() => {
      setShowToast(false);
      setToastMessage({ message: "", type: "success" });
    }, 4000);
    return () => clearTimeout(timer);
  };

  const handleAddUser = async () => {
    try {
      await api.post("/admin/users", {
        name: newUserName,
        email: newUserEmail,
        role: newUserRole,
      });
      showTemporaryToast("User added successfully!", "success");
      setNewUserName("");
      setNewUserEmail("");
      setNewUserRole("student");
      fetchInitialData(); // Refresh user list
    } catch (err) {
      showTemporaryToast(
        `Error adding user: ${err.response?.data?.message || err.message}`,
        "error"
      );
    }
  };

  // MODIFIED: Handles "admin can create an exam and right now at that time he have to upload question paper"
  const handleCreateExam = async (e) => {
    e.preventDefault();
    if (!newExamTitle || newExamFiles.length === 0) {
      showTemporaryToast(
        "Please provide a title and select a file(s) for the exam.",
        "error"
      );
      return;
    }

    const formData = new FormData();
    formData.append("title", newExamTitle);
    formData.append("course", newExamCourse); // NEW
    formData.append("examType", newExamExamType); // NEW
    formData.append("date", newExamDate); // NEW
    formData.append("totalMarks", newExamTotalMarks); // NEW


    if (newExamFileType === "pdf") {
      formData.append("paper", newExamFiles[0]); // Backend expects 'paper' for PDF
    } else if (newExamFileType === "images") {
      newExamFiles.forEach((file, index) => {
        formData.append(`images`, file); // Backend expects 'images' array for images
      });
    }

    try {
      await api.post("/admin/exams", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      showTemporaryToast("Exam created successfully!", "success");
      setNewExamTitle("");
      setNewExamCourse(""); // NEW
      setNewExamExamType(""); // NEW
      setNewExamDate(""); // NEW
      setNewExamTotalMarks(""); // NEW
      setNewExamFiles([]); // Reset files
      setNewExamFileType(null); // Reset file type
      setIsCreateExamModalOpen(false);
      fetchInitialData(); // Refresh exams list
    } catch (err) {
      showTemporaryToast(
        `Error creating exam: ${err.response?.data?.message || err.message}`,
        "error"
      );
    }
  };

  // MODIFIED: Handle file input change for exam creation
  const handleExamFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) {
      setNewExamFiles([]);
      setNewExamFileType(null);
      return;
    }

    // Check if the first file is a PDF
    if (files[0].type === "application/pdf") {
      if (files.length > 1) {
        showTemporaryToast("Please select only one PDF file.", "error");
        setNewExamFiles([]);
        setNewExamFileType(null);
        e.target.value = null; // Clear the input
        return;
      }
      setNewExamFiles(files);
      setNewExamFileType("pdf");
    } else if (files[0].type.startsWith("image/")) {
      // Check if all selected files are images
      const allAreImages = files.every((file) =>
        file.type.startsWith("image/")
      );
      if (allAreImages) {
        setNewExamFiles(files);
        setNewExamFileType("images");
      } else {
        showTemporaryToast(
          "Please select only image files or a single PDF.",
          "error"
        );
        setNewExamFiles([]);
        setNewExamFileType(null);
        e.target.value = null; // Clear the input
      }
    } else {
      showTemporaryToast(
        "Unsupported file type. Please upload PDF or images.",
        "error"
      );
      setNewExamFiles([]);
      setNewExamFileType(null);
      e.target.value = null; // Clear the input
    }
  };

  // NEW: Open assign examiners modal for a specific exam
  const openAssignExaminersModal = (exam) => {
    setSelectedExamForExaminerAssignment(exam);
    // Pre-select already assigned examiners for the chosen exam
    setSelectedExaminerIds(
      exam ? exam.assignedExaminers.map((ex) => ex._id) : []
    );
    setIsAssignExaminersToExamModalOpen(true);
  };

  // NEW: Handle assigning examiners to an exam and distributing copies
  // This addresses "ek exam me 4 examiner assign kar die and then all them will get equal copies"
  const handleAssignExaminersToExam = async () => {
    if (!selectedExamForExaminerAssignment) {
      showTemporaryToast("Please select an exam.", "error");
      return;
    }
    if (selectedExaminerIds.length === 0) {
      showTemporaryToast(
        "Please select at least one examiner to assign.",
        "error"
      );
      return;
    }

    try {
      const res = await api.post(
        `/admin/exams/${selectedExamForExaminerAssignment._id}/assign-examiners`,
        {
          examinerIds: selectedExaminerIds,
        }
      );
      showTemporaryToast(res.data.message, "success");
      setIsAssignExaminersToExamModalOpen(false);
      fetchInitialData(); // Refresh data to show updated assignments
    } catch (err) {
      showTemporaryToast(
        `Error assigning examiners: ${
          err.response?.data?.message || err.message
        }`,
        "error"
      );
    }
  };

  const handleToggleRelease = async (copyId) => {
    try {
      const res = await api.patch(`/admin/copies/${copyId}/toggle-release`);
      showTemporaryToast(res.data.message, "success");
      setCopies((prevCopies) =>
        prevCopies.map((copy) =>
          copy._id === copyId
            ? {
                ...copy,
                isReleasedToStudent: res.data.copy.isReleasedToStudent,
              }
            : copy
        )
      );
    } catch (err) {
      showTemporaryToast(
        `Error toggling release: ${err.response?.data?.message || err.message}`,
        "error"
      );
    }
  };

  const handleScanUploadSuccess = () => {
    showTemporaryToast("Scanned copy uploaded and registered!", "success");
    setIsScanUploadModalOpen(false);
    fetchInitialData(); // Refresh copies list
  };

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen font-sans">
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

      <h1 className="text-5xl font-extrabold text-gray-900 text-center mb-12 tracking-tight">
        Admin Dashboard
      </h1>

      {/* Feature Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Manage Users Card */}
        <div className="bg-white p-8 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col items-center justify-center text-center border border-gray-100">
          <UserGroupIcon className="h-16 w-16 text-indigo-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            Manage Users
          </h2>
          <p className="text-gray-600 mb-6">
            Add new students or examiners to the system.
          </p>
          <button
            onClick={() => setIsUsersModalOpen(true)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition duration-200 text-lg"
          >
            Manage Users ({users.length})
          </button>
        </div>

        {/* Manage Exams (Question Papers) Card - "kind of pool where all exams should be there" */}
        <div className="bg-white p-8 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col items-center justify-center text-center border border-gray-100">
          <BookOpenIcon className="h-16 w-16 text-blue-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            Manage Exams
          </h2>
          <p className="text-gray-600 mb-6">
            Create new exams and manage question papers.
          </p>
          <button
            onClick={() => setIsCreateExamModalOpen(true)} // Opens modal to create exam
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition duration-200 text-lg"
          >
            Create Exam
          </button>
        </div>

        {/* Assign Examiner to Exam Pool Card - "ek exam me 4 examiner assign kar die" */}
        <div className="bg-white p-8 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col items-center justify-center text-center border border-gray-100">
          <UsersIcon className="h-16 w-16 text-purple-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            Assign Examiners to Exams
          </h2>
          <p className="text-gray-600 mb-6">
            Assign examiners to an exam pool for copy distribution.
          </p>
          <button
            onClick={() => openAssignExaminersModal(null)} // Opens modal to select exam and assign examiners
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition duration-200 text-lg"
          >
            Assign Examiners
          </button>
        </div>

        {/* Manage All Copies Card */}
        <div className="bg-white p-8 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col items-center justify-center text-center border border-gray-100">
          <ClipboardDocumentListIcon className="h-16 w-16 text-green-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            Manage All Copies
          </h2>
          <p className="text-gray-600 mb-6">
            View and manage all answer copies in the system.
          </p>
          <button
            onClick={() => setIsCopiesModalOpen(true)}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition duration-200 text-lg"
          >
            View All Copies ({copies.length})
          </button>
        </div>

        {/* Scan & Upload Copy Card - "pahle student ki saari copies upload ho jae" */}
        <div className="bg-white p-8 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col items-center justify-center text-center border border-gray-100">
          <CloudArrowUpIcon className="h-16 w-16 text-orange-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            Scan & Upload Copy
          </h2>
          <p className="text-gray-600 mb-6">
            Upload scanned answer copies (images or PDF).
          </p>
          <button
            onClick={() => setIsScanUploadModalOpen(true)}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition duration-200 text-lg"
          >
            Upload Scanned Copy
          </button>
        </div>
      </div>

      {/* Modals for Admin Actions */}

      {/* Manage Users Modal (unchanged from previous) */}
      <Modal
        isOpen={isUsersModalOpen}
        onClose={() => setIsUsersModalOpen(false)}
        title="Manage Users"
      >
        <h3 className="text-xl font-bold mb-4">Add New User</h3>
        <div className="space-y-4 mb-6">
          <input
            type="text"
            placeholder="Name"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
            className="w-full p-2 border rounded"
          />
          <input
            type="email"
            placeholder="Email"
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
            className="w-full p-2 border rounded"
          />
          <select
            value={newUserRole}
            onChange={(e) => setNewUserRole(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="student">Student</option>
            <option value="examiner">Examiner</option>
            <option value="admin">Admin</option>
          </select>
          <button
            onClick={handleAddUser}
            className="bg-green-500 text-white p-2 rounded w-full"
          >
            Add User
          </button>
        </div>
        <h3 className="text-xl font-bold mb-4">Existing Users</h3>
        <div className="overflow-x-auto max-h-60 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.role}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>

      {/* Create Exam Modal (Upload Question Paper) - MODIFIED */}
      <Modal
        isOpen={isCreateExamModalOpen}
        onClose={() => setIsCreateExamModalOpen(false)}
        title="Create New Exam"
      >
        <form onSubmit={handleCreateExam} className="space-y-4">
          <div>
            <label
              htmlFor="examTitle"
              className="block text-sm font-medium text-gray-700"
            >
              Exam Title:
            </label>
            <input
              type="text"
              id="examTitle"
              placeholder="e.g., Mid-Term Exam 2025"
              value={newExamTitle}
              onChange={(e) => setNewExamTitle(e.target.value)}
              className="w-full p-2 border rounded mt-1"
              required
            />
          </div>
          {/* NEW: Course Input */}
          <div>
            <label
              htmlFor="examCourse"
              className="block text-sm font-medium text-gray-700"
            >
              Course:
            </label>
            <input
              type="text"
              id="examCourse"
              placeholder="e.g., Computer Science I"
              value={newExamCourse}
              onChange={(e) => setNewExamCourse(e.target.value)}
              className="w-full p-2 border rounded mt-1"
              required
            />
          </div>
          {/* NEW: Exam Type Input */}
          <div>
            <label
              htmlFor="examType"
              className="block text-sm font-medium text-gray-700"
            >
              Exam Type:
            </label>
            <input
              type="text"
              id="examType"
              placeholder="e.g., Mid-Term, Final, Quiz"
              value={newExamExamType}
              onChange={(e) => setNewExamExamType(e.target.value)}
              className="w-full p-2 border rounded mt-1"
              required
            />
          </div>
          {/* NEW: Date Input */}
          <div>
            <label
              htmlFor="examDate"
              className="block text-sm font-medium text-gray-700"
            >
              Date:
            </label>
            <input
              type="date"
              id="examDate"
              value={newExamDate}
              onChange={(e) => setNewExamDate(e.target.value)}
              className="w-full p-2 border rounded mt-1"
              required
            />
          </div>
          {/* NEW: Total Marks Input */}
          <div>
            <label
              htmlFor="totalMarks"
              className="block text-sm font-medium text-gray-700"
            >
              Total Marks:
            </label>
            <input
              type="number"
              id="totalMarks"
              placeholder="e.g., 100"
              value={newExamTotalMarks}
              onChange={(e) => setNewExamTotalMarks(e.target.value)}
              className="w-full p-2 border rounded mt-1"
              required
            />
          </div>
          <div>
            <label
              htmlFor="examFile"
              className="block text-sm font-medium text-gray-700"
            >
              Question Paper (PDF or Images):
            </label>
            <input
              type="file"
              id="examFile"
              // MODIFIED: Accept PDF and common image formats
              accept=".pdf, .jpg, .jpeg, .png, .gif"
              // MODIFIED: Allow multiple files for images
              multiple={newExamFileType === "images"}
              onChange={handleExamFileChange}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 mt-1"
              required
            />
            {newExamFiles.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Selected: {newExamFiles.length} {newExamFileType} file(s)
              </p>
            )}
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white p-2 rounded w-full"
          >
            Create Exam
          </button>
        </form>
      </Modal>

      {/* NEW: Assign Examiners to Exam Modal */}
      <Modal
        isOpen={isAssignExaminersToExamModalOpen}
        onClose={() => setIsAssignExaminersToExamModalOpen(false)}
        title="Assign Examiners to Exam Pool"
      >
        <div className="space-y-4">
          <div>
            <label
              htmlFor="selectExam"
              className="block text-sm font-medium text-gray-700"
            >
              Select Exam:
            </label>
            <select
              id="selectExam"
              value={
                selectedExamForExaminerAssignment
                  ? selectedExamForExaminerAssignment._id
                  : ""
              }
              onChange={(e) =>
                setSelectedExamForExaminerAssignment(
                  exams.find((exam) => exam._id === e.target.value)
                )
              }
              className="w-full p-2 border rounded mt-1"
            >
              <option value="">-- Choose an Exam --</option>
              {exams.map((exam) => (
                <option key={exam._id} value={exam._id}>
                  {exam.title} ({exam.totalPages} pages)
                </option>
              ))}
            </select>
          </div>
          {selectedExamForExaminerAssignment && (
            <div>
              <label
                htmlFor="selectExaminers"
                className="block text-sm font-medium text-gray-700"
              >
                Assign Examiners (Select multiple):
              </label>
              <select
                id="selectExaminers"
                multiple
                value={selectedExaminerIds}
                onChange={(e) =>
                  setSelectedExaminerIds(
                    Array.from(e.target.options)
                      .filter((option) => option.selected)
                      .map((option) => option.value)
                  )
                }
                className="w-full p-2 border rounded mt-1 h-32" // Increased height for multi-select
              >
                {availableExaminers.length === 0 ? (
                  <option value="" disabled>
                    No examiners available
                  </option>
                ) : (
                  availableExaminers.map((examiner) => (
                    <option key={examiner._id} value={examiner._id}>
                      {examiner.name} ({examiner.email})
                    </option>
                  ))
                )}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Hold Ctrl/Cmd to select multiple examiners.
              </p>
            </div>
          )}
          <button
            onClick={handleAssignExaminersToExam}
            // Disable if no exam is selected or no examiners are selected
            disabled={
              !selectedExamForExaminerAssignment ||
              selectedExaminerIds.length === 0
            }
            className="bg-purple-600 text-white p-2 rounded w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Assign Examiners & Distribute Copies
          </button>
        </div>
      </Modal>

      {/* Manage All Copies Modal (Updated to show unassigned copies and assigned examiners) */}
      <Modal
        isOpen={isCopiesModalOpen}
        onClose={() => setIsCopiesModalOpen(false)}
        title="Manage All Answer Copies"
      >
        {copies.length === 0 ? (
          <p className="text-gray-600 text-center py-4">
            No answer copies in the system.
          </p>
        ) : (
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Exam Title
                  </th>
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
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {copies.map((c) => (
                  <tr key={c._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {c.questionPaper?.title || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {c.student?.name || "N/A"} ({c.student?.email || "N/A"})
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          c.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {c.examiners && c.examiners.length > 0
                        ? c.examiners.map((e) => e.name || e.email).join(", ")
                        : "Unassigned"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          c.isReleasedToStudent
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {c.isReleasedToStudent ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleToggleRelease(c._id)}
                        className={`px-3 py-1 rounded-md text-white font-medium transition duration-150 ${
                          c.isReleasedToStudent
                            ? "bg-red-500 hover:bg-red-600"
                            : "bg-green-500 hover:bg-green-600"
                        }`}
                      >
                        <ArrowPathIcon className="h-4 w-4 inline-block mr-1" />
                        {c.isReleasedToStudent ? "Unrelease" : "Release"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* Scan & Upload Copy Modal (requires `questionPapers` and `students` props) */}
      <ScanCopyUploadModal
        isOpen={isScanUploadModalOpen}
        onClose={() => setIsScanUploadModalOpen(false)}
        onUploadSuccess={handleScanUploadSuccess}
        questionPapers={exams} // Pass exams (question papers) for dropdown
        students={users.filter((u) => u.role === "student")} // Pass students for dropdown
      />
    </div>
  );
}