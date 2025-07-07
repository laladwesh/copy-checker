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
  EyeIcon, // For viewing exam details
} from "@heroicons/react/24/outline"; // Make sure you have these icons or similar

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [exams, setExams] = useState([]); // Renamed from questionPapers for clarity ("pool where all exams should be there")
  const [copies, setCopies] = useState([]); // Still fetch all copies to calculate overall progress

  // Modals
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
  const [isCreateExamModalOpen, setIsCreateExamModalOpen] = useState(false); // For creating new exam
  const [
    isAssignExaminersToExamModalOpen,
    setIsAssignExaminersToExamModalOpen,
  ] = useState(false); // NEW: For assigning examiners to an exam
  // const [isCopiesModalOpen, setIsCopiesModalOpen] = useState(false); // REMOVED: No longer using modal for all copies
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
      setCopies(copiesRes.data); // Keep all copies to calculate progress
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
    formData.append("course", newExamCourse);
    formData.append("examType", newExamExamType);
    formData.append("date", newExamDate);
    formData.append("totalMarks", newExamTotalMarks);

    if (newExamFileType === "pdf") {
      formData.append("paper", newExamFiles[0]);
    } else if (newExamFileType === "images") {
      newExamFiles.forEach((file) => {
        formData.append(`images`, file);
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
      setNewExamCourse("");
      setNewExamExamType("");
      setNewExamDate("");
      setNewExamTotalMarks("");
      setNewExamFiles([]);
      setNewExamFileType(null);
      setIsCreateExamModalOpen(false);
      fetchInitialData(); // Refresh exams list
    } catch (err) {
      showTemporaryToast(
        `Error creating exam: ${err.response?.data?.message || err.message}`,
        "error"
      );
    }
  };

  const handleExamFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) {
      setNewExamFiles([]);
      setNewExamFileType(null);
      return;
    }

    if (files[0].type === "application/pdf") {
      if (files.length > 1) {
        showTemporaryToast("Please select only one PDF file.", "error");
        setNewExamFiles([]);
        setNewExamFileType(null);
        e.target.value = null;
        return;
      }
      setNewExamFiles(files);
      setNewExamFileType("pdf");
    } else if (files[0].type.startsWith("image/")) {
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
        e.target.value = null;
      }
    } else {
      showTemporaryToast(
        "Unsupported file type. Please upload PDF or images.",
        "error"
      );
      setNewExamFiles([]);
      setNewExamFileType(null);
      e.target.value = null;
    }
  };

  const openAssignExaminersModal = (exam) => {
    setSelectedExamForExaminerAssignment(exam);
    setSelectedExaminerIds(
      exam ? exam.assignedExaminers.map((ex) => ex._id) : []
    );
    setIsAssignExaminersToExamModalOpen(true);
  };

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

  // Helper function to calculate exam status and examiner progress
  const getExamProgressSummary = (examId) => {
    const examCopies = copies.filter(
      (copy) => copy.questionPaper?._id === examId
    );
    const totalCopies = examCopies.length;

    if (totalCopies === 0) {
      return { status: "No Copies Uploaded", progress: {} };
    }

    const progress = {};
    let totalEvaluated = 0;

    // Initialize progress for all assigned examiners
    const exam = exams.find((e) => e._id === examId);
    if (exam && exam.assignedExaminers) {
      exam.assignedExaminers.forEach((examiner) => {
        progress[examiner._id] = {
          name: examiner.name || examiner.email,
          assigned: 0,
          evaluated: 0,
        };
      });
    }

    examCopies.forEach((copy) => {
      copy.examiners.forEach((examiner) => {
        const examinerId = examiner._id; // Assuming examiner is populated
        if (!progress[examinerId]) {
          progress[examinerId] = {
            name: examiner.name || examiner.email,
            assigned: 0,
            evaluated: 0,
          };
        }
        progress[examinerId].assigned++;
        if (copy.status === "evaluated") {
          progress[examinerId].evaluated++;
          totalEvaluated++;
        }
      });
    });

    let overallStatus = "Pending Assignment";
    if (totalCopies > 0 && Object.keys(progress).length > 0) {
      if (totalEvaluated === totalCopies) {
        overallStatus = "Completed";
      } else if (totalEvaluated > 0) {
        overallStatus = "In Progress";
      } else {
        overallStatus = "Assigned, Not Started";
      }
    } else if (totalCopies > 0) {
      overallStatus = "Copies Uploaded, Unassigned";
    }

    return { status: overallStatus, progress };
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

      {/* NEW: Exam Overview Section (replaces "Manage All Copies" modal content) */}
      <section className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 mt-10">
        <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-3">
          Exam Overview & Progress
        </h2>
        {exams.length === 0 ? (
          <p className="text-gray-600 text-center py-4">
            No exams created yet. Create an exam to see its progress.
          </p>
        ) : (
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
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
                    Course
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Exam Date
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Total Copies
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Overall Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Examiner Progress
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
                {exams.map((exam) => {
                  const { status: overallStatus, progress: examinerProgress } =
                    getExamProgressSummary(exam._id);
                  const totalCopiesForExam = copies.filter(
                    (c) => c.questionPaper?._id === exam._id
                  ).length;

                  return (
                    <tr
                      key={exam._id}
                      className="hover:bg-gray-50 transition-colors duration-150"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {exam.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {exam.course || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {exam.date
                          ? new Date(exam.date).toLocaleDateString()
                          : "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {totalCopiesForExam}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            overallStatus === "Completed"
                              ? "bg-green-100 text-green-800"
                              : overallStatus.includes("Progress") ||
                                overallStatus.includes("Assigned")
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {overallStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {Object.keys(examinerProgress).length > 0 ? (
                          <ul className="list-disc list-inside space-y-0.5">
                            {Object.values(examinerProgress).map((p, idx) => (
                              <li key={idx}>
                                {p.name}: {p.evaluated}/{p.assigned}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          "No examiners assigned or no copies yet."
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          to={`/admin/exams/${exam._id}`} // Link to the new AdminExamDetails page
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150"
                        >
                          <EyeIcon className="h-4 w-4 mr-1" /> View Details
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modals for Admin Actions (unchanged) */}

      {/* Manage Users Modal */}
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

      {/* Create Exam Modal (Upload Question Paper) */}
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
              accept=".pdf, .jpg, .jpeg, .png, .gif"
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
                  {exam.title} ({exam.totalPages || "N/A"} pages)
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
