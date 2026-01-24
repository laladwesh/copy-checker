import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import Modal from "../components/Modal";
import ScanCopyUploadModal from "../components/ScanCopyUploadModal";
import ExamReportGenerator from "../components/ExamReportGenerator";
import {
  UserGroupIcon,
  BookOpenIcon,
  CloudArrowUpIcon,
  UsersIcon,
  EyeIcon,
  QuestionMarkCircleIcon,
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
} from "@heroicons/react/24/outline";
import { toastSuccess, toastError, toastInfo } from "../utils/hotToast";
// AllExaminerDetailsModal moved to a full page: /admin/examiners

export default function AdminPanel() {
  // Core data states
  const [users, setUsers] = useState([]);
  const [exams, setExams] = useState([]);
  const [copies, setCopies] = useState([]);
  const [queries, setQueries] = useState([]);
  const [availableExaminers, setAvailableExaminers] = useState([]);

  // Exam selection / bulk delete states
  const [selectedExamIds, setSelectedExamIds] = useState([]);
  const [selectAllExams, setSelectAllExams] = useState(false);
  const [isDeletingExams, setIsDeletingExams] = useState(false);

  // Modal visibility states
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
  const [isCreateExamModalOpen, setIsCreateExamModalOpen] = useState(false);
  const [
    isAssignExaminersToExamModalOpen,
    setIsAssignExaminersToExamModalOpen,
  ] = useState(false);
  const [isScanUploadModalOpen, setIsScanUploadModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedExamForReport, setSelectedExamForReport] = useState(null);

  // Loading state for assigning examiners
  const [isAssigning, setIsAssigning] = useState(false);

  // Form input states
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("student");
  const [newUserGender, setNewUserGender] = useState("");
  const [newUserBatch, setNewUserBatch] = useState("");
  const [newExamTitle, setNewExamTitle] = useState("");
  const [newExamCourse, setNewExamCourse] = useState("");
  const [newExamExamType, setNewExamExamType] = useState("");
  const [newExamDate, setNewExamDate] = useState("");
  const [newExamTotalMarks, setNewExamTotalMarks] = useState("");

  const [newExamFiles, setNewExamFiles] = useState([]);
  const [newExamFileType, setNewExamFileType] = useState(null);

  const [
    selectedExamForExaminerAssignment,
    setSelectedExamForExaminerAssignment,
  ] = useState(null);
  const [selectedExaminerIds, setSelectedExaminerIds] = useState([]);

  // Search and filter states
  const [examSearchTerm, setExamSearchTerm] = useState("");
  const [activeUserTab, setActiveUserTab] = useState("all");
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [activeStudentBatchTab, setActiveStudentBatchTab] = useState("all");

  // User deletion management states
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [selectAllInTab, setSelectAllInTab] = useState(false);
  const [deleteAllBatches, setDeleteAllBatches] = useState(false);
  const [deleteCurrentBatch, setDeleteCurrentBatch] = useState(false);
  const [isDeletingUsers, setIsDeletingUsers] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [isCreatingExam, setIsCreatingExam] = useState(false);

  // Toasts provided globally via react-hot-toast (use toastSuccess/toastError/toastInfo)

  const navigate = useNavigate();

  // Use toastSuccess/toastError/toastInfo from utils/hotToast for notifications

  // Fetch all initial data for the admin panel
  const fetchInitialData = useCallback(async () => {
    try {
      const [usersRes, examsRes, copiesRes, examinersRes, queriesRes] =
        await Promise.all([
          api.get("/admin/users"),
          api.get("/admin/exams"),
          api.get("/admin/copies"),
          api.get("/admin/examiners"),
          api.get("/admin/queries"),
        ]);
      setUsers(usersRes.data);
      setExams(examsRes.data);
      setCopies(copiesRes.data);
      setAvailableExaminers(examinersRes.data);
      setQueries(queriesRes.data);
    } catch (error) {
      console.error("Error fetching initial data:", error);
      toastError("Failed to load initial data.");
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Reset selections when user switches tabs or batches
  useEffect(() => {
    setSelectedUserIds([]);
    setSelectAllInTab(false);
    setDeleteAllBatches(false);
    setDeleteCurrentBatch(false);
  }, [activeUserTab, activeStudentBatchTab]);

  // Get unique student batches for filter dropdown
  const uniqueBatches = useMemo(() => {
    const batches = new Set(
      users
        .filter((user) => user.role === "student" && user.batch)
        .map((user) => user.batch)
    );
    return ["all", ...Array.from(batches).sort()];
  }, [users]);

  // Get student batches only (without 'all') for exam creation dropdown
  const studentBatchesForExam = useMemo(() => {
    const batches = new Set(
      users
        .filter((user) => user.role === "student" && user.batch)
        .map((user) => user.batch)
    );
    return Array.from(batches).sort();
  }, [users]);

  // Add new user to the system
  const handleAddUser = async () => {
    try {
      const userData = {
        name: newUserName,
        email: newUserEmail,
        role: newUserRole,
        gender: newUserGender,
      };
      if (newUserRole === "student") {
        userData.batch = newUserBatch;
      }
      await api.post("/admin/users", userData);
      toastSuccess("User added successfully!");
      setNewUserName("");
      setNewUserEmail("");
      setNewUserRole("student");
      setNewUserGender("");
      setNewUserBatch("");
      fetchInitialData();
    } catch (err) {
      toastError(`Error adding user: ${err.response?.data?.message || err.message}`);
    }
  };

  // Create new exam with question paper upload
  const handleCreateExam = async (e) => {
    e.preventDefault();
    if (!newExamTitle || newExamFiles.length === 0) {
      toastError("Please provide a title and select a file(s) for the exam.");
      return;
    }

    if (!newExamCourse) {
      toastError("Please select a batch for the exam.");
      return;
    }

    setIsCreatingExam(true);

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
      toastSuccess("Exam created successfully!");
      setNewExamTitle("");
      setNewExamCourse("");
      setNewExamExamType("");
      setNewExamDate("");
      setNewExamTotalMarks("");
      setNewExamFiles([]);
      setNewExamFileType(null);
      setIsCreateExamModalOpen(false);
      fetchInitialData();
    } catch (err) {
      toastError(`Error creating exam: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsCreatingExam(false);
    }
  };

  // Handle file upload for exam question papers
  // Validates file types: single PDF or multiple images
  const handleExamFileChange = (e) => {
    const files = Array.from(e.target.files);
      if (files.length === 0) {
      setNewExamFiles([]);
      setNewExamFileType(null);
      return;
    }

    if (files[0].type === "application/pdf") {
      if (files.length > 1) {
        toastError("Please select only one PDF file.");
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
        toastError("Please select only image files or a single PDF.");
        setNewExamFiles([]);
        setNewExamFileType(null);
        e.target.value = null;
      }
    } else {
      toastError("Unsupported file type. Please upload PDF or images.");
      setNewExamFiles([]);
      setNewExamFileType(null);
      e.target.value = null;
    }
  };

  // Open modal to assign examiners to exam
  const openAssignExaminersModal = (exam) => {
    setSelectedExamForExaminerAssignment(exam);
    setSelectedExaminerIds(
      exam ? exam.assignedExaminers.map((ex) => ex._id) : []
    );
    setIsAssignExaminersToExamModalOpen(true);
  };

  // Handle examiner selection for assignment
  const handleExaminerCheckboxChange = (examinerId) => {
    setSelectedExaminerIds((prev) =>
      prev.includes(examinerId)
        ? prev.filter((id) => id !== examinerId)
        : [...prev, examinerId]
    );
  };

  // Assign selected examiners to exam and distribute copies
  const handleAssignExaminersToExam = async () => {
    if (!selectedExamForExaminerAssignment) {
      toastError("Please select an exam.");
      return;
    }
    if (selectedExaminerIds.length === 0) {
      toastError("Please select at least one examiner to assign.");
      return;
    }

    try {
      setIsAssigning(true);
      const res = await api.post(
        `/admin/exams/${selectedExamForExaminerAssignment._id}/assign-examiners`,
        {
          examinerIds: selectedExaminerIds,
        }
      );
      toastSuccess(res.data.message);
      setIsAssignExaminersToExamModalOpen(false);
      fetchInitialData();
    } catch (err) {
      toastError(`Error assigning examiners: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsAssigning(false);
    }
  };

  // Undo assignment of examiners for an exam (clear paper assignments and unassign non-evaluated copies)
  const handleUndoExamAssignment = async (exam) => {
    if (!exam || !exam._id) return;
    const confirm = window.confirm(
      "Are you sure you want to undo examiner assignments for this exam? This will remove assigned examiners and unassign copies that are not yet evaluated."
    );
    if (!confirm) return;

    try {
      const res = await api.post(`/admin/exams/${exam._id}/unassign-examiners`);
      toastSuccess(res.data?.message || "Assignments undone.");
      fetchInitialData();
    } catch (err) {
      toastError(`Error undoing assignments: ${err.response?.data?.message || err.message}`);
    }
  };

  // Handle successful scan upload callback
  const handleScanUploadSuccess = () => {
    toastSuccess("Scanned copy uploaded and registered!");
    setIsScanUploadModalOpen(false);
    fetchInitialData();
  };

  // Open report generator modal
  const handleOpenReportModal = (exam) => {
    setSelectedExamForReport(exam);
    setIsReportModalOpen(true);
  };

  // Calculate exam progress and status summary
  // Tracks assigned vs evaluated copies per examiner
  const getExamProgressSummary = useCallback(
    (examId) => {
      const examCopies = copies.filter(
        (copy) => copy.questionPaper?._id === examId
      );
      const totalCopies = examCopies.length;

      if (totalCopies === 0) {
        return { status: "No Copies Uploaded", progress: {} };
      }

      const progress = {};
      let totalEvaluated = 0;

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
        if (Array.isArray(copy.examiners)) {
          copy.examiners.forEach((examiner) => {
            const examinerId = examiner._id;
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
        }
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
    },
    [copies, exams]
  );

  // Filter exams that don't have assigned examiners
  const unassignedExamsForModal = exams.filter(
    (exam) => !exam.assignedExaminers || exam.assignedExaminers.length === 0
  );

  // Filter exams based on search term
  const filteredExams = exams.filter((exam) =>
    exam.title.toLowerCase().includes(examSearchTerm.toLowerCase())
  );

  // Handlers for selecting and deleting exams (single + bulk)
  const handleExamCheckboxChange = (examId) => {
    setSelectedExamIds((prev) =>
      prev.includes(examId) ? prev.filter((id) => id !== examId) : [...prev, examId]
    );
  };

  const handleSelectAllExams = (e) => {
    const checked = e.target.checked;
    setSelectAllExams(checked);
    if (checked) {
      setSelectedExamIds(filteredExams.map((ex) => ex._id));
    } else {
      setSelectedExamIds([]);
    }
  };

  const handleDeleteExam = async (examId) => {
    const confirm = window.confirm("Delete this exam and all its copies and queries? This cannot be undone.");
    if (!confirm) return;
    try {
      await api.delete(`/admin/exams/${examId}`);
      toastSuccess("Exam deleted.");
      fetchInitialData();
    } catch (err) {
      toastError(`Error deleting exam: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleDeleteSelectedExams = async () => {
    if (selectedExamIds.length === 0) {
      toastInfo("No exams selected for deletion.");
      return;
    }
    const confirm = window.confirm(`Delete ${selectedExamIds.length} selected exam(s) and their copies/queries? This cannot be undone.`);
    if (!confirm) return;
    setIsDeletingExams(true);
    try {
      await api.delete(`/admin/exams`, { data: { examIds: selectedExamIds } });
      toastSuccess("Selected exams deleted.");
      setSelectedExamIds([]);
      setSelectAllExams(false);
      fetchInitialData();
    } catch (err) {
      toastError(`Error deleting exams: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsDeletingExams(false);
    }
  };

  // Filter users based on role, batch, and search criteria
  const getFilteredUsers = useCallback(
    (role) => {
      let filtered = users;
      if (role !== "all") {
        filtered = users.filter((user) => user.role === role);
      }
      if (activeUserTab === "student" && activeStudentBatchTab !== "all") {
        filtered = filtered.filter(
          (user) => user.batch === activeStudentBatchTab
        );
      }

      if (userSearchTerm) {
        filtered = filtered.filter(
          (user) =>
            user.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
            user.name.toLowerCase().includes(userSearchTerm.toLowerCase())
        );
      }
      return filtered;
    },
    [users, activeUserTab, activeStudentBatchTab, userSearchTerm]
  );

  // Toggle individual user selection
  const handleUserCheckboxChange = (userId) => {
    setSelectedUserIds((prevSelected) =>
      prevSelected.includes(userId)
        ? prevSelected.filter((id) => id !== userId)
        : [...prevSelected, userId]
    );
  };

  // Toggle select all users in current tab
  const handleSelectAllInTab = (e) => {
    const isChecked = e.target.checked;
    setSelectAllInTab(isChecked);
    if (isChecked) {
      const currentTabUserIds = getFilteredUsers(activeUserTab).map(
        (user) => user._id
      );
      setSelectedUserIds(currentTabUserIds);
    } else {
      setSelectedUserIds([]);
    }
  };

  // Handle bulk delete all student batches option
  const handleDeleteAllBatchesChange = (e) => {
    const isChecked = e.target.checked;
    setDeleteAllBatches(isChecked);
    if (isChecked) {
      setDeleteCurrentBatch(false);
      setSelectedUserIds([]);
      setSelectAllInTab(false);
    }
  };

  // Handle delete current batch option
  const handleDeleteCurrentBatchChange = (e) => {
    const isChecked = e.target.checked;
    setDeleteCurrentBatch(isChecked);
    if (isChecked) {
      setDeleteAllBatches(false);
      setSelectedUserIds([]);
      setSelectAllInTab(false);
    }
  };

  // Prepare user deletion based on selected options
  // Handles individual, batch, or bulk deletions with appropriate confirmation
  const handleDeleteUsers = async () => {
    let userIdsToDelete = [];

    if (deleteAllBatches) {
      // Deleting all students across all batches
      userIdsToDelete = users
        .filter((user) => user.role === "student")
        .map((user) => user._id);
    } else if (deleteCurrentBatch && activeStudentBatchTab !== "all") {
      // Deleting all students in the currently selected batch
      userIdsToDelete = users
        .filter(
          (user) =>
            user.role === "student" && user.batch === activeStudentBatchTab
        )
        .map((user) => user._id);
    } else if (selectAllInTab) {
      // Deleting all users in the current tab/filter
      userIdsToDelete = getFilteredUsers(activeUserTab).map((user) => user._id);
    } else if (selectedUserIds.length > 0) {
      // Deleting individually selected users
      userIdsToDelete = selectedUserIds;
    } else {
      toastInfo("No users selected for deletion.");
      return;
    }

    if (userIdsToDelete.length === 0) {
      toastInfo("No users found to delete based on your selection.");
      return;
    }

    setShowDeleteConfirmModal(true);
  };

  // Execute user deletion after confirmation
  const confirmDeleteUsers = async () => {
    setShowDeleteConfirmModal(false);
    setIsDeletingUsers(true);
    let userIdsToDelete = [];

    if (deleteAllBatches) {
      userIdsToDelete = users
        .filter((user) => user.role === "student")
        .map((user) => user._id);
    } else if (deleteCurrentBatch && activeStudentBatchTab !== "all") {
      userIdsToDelete = users
        .filter(
          (user) =>
            user.role === "student" && user.batch === activeStudentBatchTab
        )
        .map((user) => user._id);
    } else if (selectAllInTab) {
      userIdsToDelete = getFilteredUsers(activeUserTab).map((user) => user._id);
    } else {
      userIdsToDelete = selectedUserIds;
    }

    try {
      const res = await api.delete("/admin/users", {
        data: { userIds: userIdsToDelete },
      });
      toastSuccess(res.data.message);
      fetchInitialData();
      setSelectedUserIds([]);
      setSelectAllInTab(false);
      setDeleteAllBatches(false);
      setDeleteCurrentBatch(false);
    } catch (err) {
      toastError(`Error deleting users: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsDeletingUsers(false);
    }
  };

  // Render users table with selection controls
  const renderUsersTable = (usersToDisplay) => (
    <div className="overflow-x-auto no-scrollbar max-h-60 overflow-y-auto mt-4 rounded-xl border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <input
                type="checkbox"
                className="h-4 w-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                checked={
                  selectAllInTab &&
                  selectedUserIds.length === usersToDisplay.length &&
                  usersToDisplay.length > 0
                }
                onChange={handleSelectAllInTab}
                disabled={
                  usersToDisplay.length === 0 ||
                  deleteAllBatches ||
                  deleteCurrentBatch
                }
              />
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Email
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Role
            </th>
            {activeUserTab === "student" && (
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Batch
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {usersToDisplay.length === 0 ? (
            <tr>
              <td
                colSpan={activeUserTab === "student" ? "5" : "4"}
                className="px-6 py-4 text-center text-gray-500"
              >
                No users found.
              </td>
            </tr>
          ) : (
            usersToDisplay.map((user) => (
              <tr key={user._id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                    checked={selectedUserIds.includes(user._id)}
                    onChange={() => handleUserCheckboxChange(user._id)}
                    disabled={
                      selectAllInTab || deleteAllBatches || deleteCurrentBatch
                    }
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.role}
                </td>
                {activeUserTab === "student" && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.batch || "N/A"}
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="p-6 lg:p-10 space-y-10 bg-white min-h-screen" style={{fontFamily: 'Dosis, sans-serif'}}>
      {/* Toasts are provided globally via react-hot-toast */}

      <div className="w-full">
        <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-2 tracking-tight" style={{fontFamily: 'Dosis, sans-serif'}}>
          Admin Dashboard
        </h1>
        <p className="text-gray-600 text-sm lg:text-base">Manage exams, users, and system operations</p>
      </div>

      <div className="grid grid-cols-6 gap-4 w-full overflow-x-auto">
        <div className="group bg-white p-5 rounded-xl border-2 border-gray-900 hover:border-[#1e3a8a] transition-all duration-300 flex flex-col min-w-[180px]">
          <div className="flex flex-col items-center text-center mb-3">
            <div className="p-3 bg-gray-900 rounded-xl mb-3">
              <UserGroupIcon className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-base font-bold text-gray-900" style={{fontFamily: 'Dosis, sans-serif'}}>
              Manage Users
            </h2>
          </div>
          <button
            onClick={() => navigate('/admin/users')}
            className="w-full bg-gray-900 hover:bg-[#1e3a8a] text-white font-medium py-2.5 px-4 rounded-xl transition duration-200 text-sm mt-auto"
          >
            Open ({users.length})
          </button>
        </div>

        <div className="group bg-white p-5 rounded-xl border-2 border-gray-900 hover:border-[#1e3a8a] transition-all duration-300 flex flex-col min-w-[180px]">
          <div className="flex flex-col items-center text-center mb-3">
            <div className="p-3 bg-gray-900 rounded-xl mb-3">
              <BookOpenIcon className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-base font-bold text-gray-900" style={{fontFamily: 'Dosis, sans-serif'}}>
              Manage Exams
            </h2>
          </div>
          <button
            onClick={() => setIsCreateExamModalOpen(true)}
            className="w-full bg-gray-900 hover:bg-[#1e3a8a] text-white font-medium py-2.5 px-4 rounded-xl transition duration-200 text-sm mt-auto"
          >
            Create Exam
          </button>
        </div>


        <div className="group bg-white p-5 rounded-xl border-2 border-gray-900 hover:border-[#1e3a8a] transition-all duration-300 flex flex-col min-w-[180px]">
          <div className="flex flex-col items-center text-center mb-3">
            <div className="p-3 bg-gray-900 rounded-xl mb-3">
              <CloudArrowUpIcon className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-base font-bold text-gray-900" style={{fontFamily: 'Dosis, sans-serif'}}>
              Upload Copy
            </h2>
          </div>
          <button
            onClick={() => setIsScanUploadModalOpen(true)}
            className="w-full bg-gray-900 hover:bg-[#1e3a8a] text-white font-medium py-2.5 px-4 rounded-xl transition duration-200 text-sm mt-auto"
          >
            Upload
          </button>
        </div>


        
        <div className="group bg-white p-5 rounded-xl border-2 border-gray-900 hover:border-[#1e3a8a] transition-all duration-300 flex flex-col min-w-[180px]">
          <div className="flex flex-col items-center text-center mb-3">
            <div className="p-3 bg-gray-900 rounded-xl mb-3">
              <UsersIcon className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-base font-bold text-gray-900" style={{fontFamily: 'Dosis, sans-serif'}}>
              Assign Examiners
            </h2>
          </div>
          <button
            onClick={() => openAssignExaminersModal(null)}
            className="w-full bg-gray-900 hover:bg-[#1e3a8a] text-white font-medium py-2.5 px-4 rounded-xl transition duration-200 text-sm mt-auto"
          >
            Assign
          </button>
        </div>

        <div className="group bg-white p-5 rounded-xl border-2 border-gray-900 hover:border-[#1e3a8a] transition-all duration-300 flex flex-col min-w-[180px]">
          <div className="flex flex-col items-center text-center mb-3">
            <div className="p-3 bg-gray-900 rounded-xl mb-3">
              <QuestionMarkCircleIcon className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-base font-bold text-gray-900" style={{fontFamily: 'Dosis, sans-serif'}}>
              Student Queries
            </h2>
          </div>
          <button
            onClick={() => navigate('/admin/queries')}
            className="w-full bg-gray-900 hover:bg-[#1e3a8a] text-white font-medium py-2.5 px-4 rounded-xl transition duration-200 text-sm flex items-center justify-center gap-2 mt-auto"
          >
            <span>Manage</span>
            {queries.filter((q) => q.status === "pending").length > 0 && (
              <span className="px-2 py-0.5 bg-white text-gray-900 rounded-full text-xs font-semibold">
                {queries.filter((q) => q.status === "pending").length}
              </span>
            )}
          </button>
        </div>
        
        <div className="group bg-white p-5 rounded-xl border-2 border-gray-900 hover:border-[#1e3a8a] transition-all duration-300 flex flex-col min-w-[180px]">
          <div className="flex flex-col items-center text-center mb-3">
            <div className="p-3 bg-gray-900 rounded-xl mb-3">
              <ClipboardDocumentListIcon className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-base font-bold text-gray-900" style={{fontFamily: 'Dosis, sans-serif'}}>
              Examiner Stats
            </h2>
          </div>
          <button
            onClick={() => navigate('/admin/examiners', { state: { examiners: availableExaminers, copies, exams } })}
            className="w-full bg-gray-900 hover:bg-[#1e3a8a] text-white font-medium py-2.5 px-4 rounded-xl transition duration-200 text-sm mt-auto"
          >
            View Stats
          </button>
        </div>
      </div>

      <section className="bg-white p-6 lg:p-8 rounded-2xl border-2 border-gray-900 w-full">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 pb-6 border-b border-gray-300">
          <h2 className="text-2xl font-bold text-gray-900" style={{fontFamily: 'Dosis, sans-serif'}}>
            Exam Overview & Progress
          </h2>
          <div className="relative w-full lg:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon
                className="h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
            </div>
            <input
              type="text"
              placeholder="Search exams..."
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
              value={examSearchTerm}
              onChange={(e) => setExamSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center justify-end mb-4">
          <button
            onClick={handleDeleteSelectedExams}
            disabled={selectedExamIds.length === 0 || isDeletingExams}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-white bg-gray-900 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition duration-200"
          >
            {isDeletingExams ? (
              <>
                <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" /> Deleting...
              </>
            ) : (
              <>
                <TrashIcon className="h-4 w-4 mr-2" /> Delete ({selectedExamIds.length})
              </>
            )}
          </button>
        </div>

        {filteredExams.length === 0 && exams.length > 0 ? (
          <p className="text-gray-600 text-center py-4">
            No exams found matching your search criteria.
          </p>
        ) : filteredExams.length === 0 && exams.length === 0 ? (
          <p className="text-gray-600 text-center py-4">
            No exams created yet. Create an exam to see its progress.
          </p>
        ) : (
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                      checked={selectAllExams}
                      onChange={handleSelectAllExams}
                    />
                  </th>
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
                {filteredExams.map((exam) => {
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
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                          checked={selectedExamIds.includes(exam._id)}
                          onChange={() => handleExamCheckboxChange(exam._id)}
                        />
                      </td>
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
                          className={`px-3 py-1 text-xs font-medium rounded-full ${
                            overallStatus === "Completed"
                              ? "bg-gray-900 text-white"
                              : overallStatus.includes("Progress") ||
                                overallStatus.includes("Assigned")
                              ? "bg-gray-200 text-gray-700"
                              : "bg-gray-100 text-gray-600"
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
                        <div className="flex items-center justify-end space-x-2">
                          <a
                            href={`/admin/exams/${exam._id}`}
                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg text-white bg-gray-900 hover:bg-gray-800 transition duration-200"
                          >
                            <EyeIcon className="h-4 w-4 mr-1" /> View
                          </a>

                          {totalCopiesForExam > 0 && (
                            <button
                              onClick={() => handleOpenReportModal(exam)}
                              className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg text-white bg-gray-900 hover:bg-gray-800 transition duration-200"
                              title="Download Report"
                            >
                              <DocumentArrowDownIcon className="h-4 w-4 mr-1" /> Report
                            </button>
                          )}

                          {exam.assignedExaminers && exam.assignedExaminers.length > 0 && totalCopiesForExam > 0 && (
                            <button
                              onClick={() => handleUndoExamAssignment(exam)}
                              className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 transition duration-200"
                            >
                              Undo
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteExam(exam._id)}
                            className="inline-flex items-center p-1.5 text-sm font-medium rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition duration-200"
                            title="Delete Exam"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        isOpen={isUsersModalOpen}
        onClose={() => setIsUsersModalOpen(false)}
        title="Manage Users"
      >
        <h3 className="text-lg font-semibold mb-4 text-gray-900" style={{fontFamily: 'Montserrat, sans-serif'}}>Add New User</h3>
        <div className="space-y-3 mb-6 p-5 border border-gray-200 rounded-xl bg-gray-50">
          <input
            type="text"
            placeholder="Name"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
            required
          />
          <select
            value={newUserGender}
            onChange={(e) => setNewUserGender(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
            required
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          <select
            value={newUserRole}
            onChange={(e) => {
              setNewUserRole(e.target.value);
              setNewUserBatch("");
              setNewUserGender("");
            }}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
          >
            <option value="student">Student</option>
            <option value="examiner">Examiner</option>
            <option value="admin">Admin</option>
          </select>
          {newUserRole === "student" && (
            <input
              type="text"
              placeholder="Batch (e.g., 2023)"
              value={newUserBatch}
              onChange={(e) => setNewUserBatch(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
            />
          )}
          <button
            onClick={handleAddUser}
            className="bg-gray-900 text-white py-2.5 px-4 rounded-lg w-full hover:bg-gray-800 transition duration-200 font-medium text-sm"
          >
            Add User
          </button>
        </div>

        <h3 className="text-lg font-semibold mb-4 text-gray-900" style={{fontFamily: 'Montserrat, sans-serif'}}>Existing Users</h3>
        <div className="flex border-b border-gray-200 mb-4 overflow-x-auto no-scrollbar">
          <button
            className={`py-2 px-4 text-sm font-medium transition duration-200 ${
              activeUserTab === "all"
                ? "border-b-2 border-gray-900 text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => {
              setActiveUserTab("all");
              setUserSearchTerm("");
              setActiveStudentBatchTab("all");
            }}
          >
            All ({getFilteredUsers("all").length})
          </button>
          <button
            className={`py-2 px-4 text-sm font-medium transition duration-200 ${
              activeUserTab === "student"
                ? "border-b-2 border-gray-900 text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => {
              setActiveUserTab("student");
              setUserSearchTerm("");
            }}
          >
            Students ({getFilteredUsers("student").length})
          </button>
          <button
            className={`py-2 px-4 text-sm font-medium transition duration-200 ${
              activeUserTab === "examiner"
                ? "border-b-2 border-gray-900 text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => {
              setActiveUserTab("examiner");
              setUserSearchTerm("");
              setActiveStudentBatchTab("all");
            }}
          >
            Examiners ({getFilteredUsers("examiner").length})
          </button>
          <button
            className={`py-2 px-4 text-sm font-medium transition duration-200 ${
              activeUserTab === "admin"
                ? "border-b-2 border-gray-900 text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => {
              setActiveUserTab("admin");
              setUserSearchTerm("");
              setActiveStudentBatchTab("all");
            }}
          >
            Admins ({getFilteredUsers("admin").length})
          </button>
        </div>

        {activeUserTab === "student" && (
          <div className="flex border-b border-gray-200 mb-4 overflow-x-auto no-scrollbar ml-4">
            {uniqueBatches.map((batch) => (
              <button
                key={batch}
                className={`py-2 px-4 text-xs font-medium transition duration-200 ${
                  activeStudentBatchTab === batch
                    ? "border-b-2 border-gray-900 text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => {
                  setActiveStudentBatchTab(batch);
                  setUserSearchTerm("");
                }}
              >
                {batch === "all" ? "All Batches" : `Batch ${batch}`} (
                {
                  users.filter(
                    (user) =>
                      user.role === "student" &&
                      (batch === "all" || user.batch === batch)
                  ).length
                }
                )
              </button>
            ))}
          </div>
        )}

        <div className="mb-4 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon
              className="h-5 w-5 text-gray-400"
              aria-hidden="true"
            />
          </div>
          <input
            type="text"
            placeholder={`Search by name or email...`}
            value={userSearchTerm}
            onChange={(e) => setUserSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
          />
        </div>

        {renderUsersTable(getFilteredUsers(activeUserTab))}

        <div className="mt-6 pt-4 border-t border-gray-200 space-y-3">
          <h4 className="text-base font-semibold text-gray-900" style={{fontFamily: 'Montserrat, sans-serif'}}>
            Bulk Delete Options
          </h4>
          <div className="flex flex-col space-y-2">
            {activeUserTab === "student" && (
              <>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                    checked={deleteAllBatches}
                    onChange={handleDeleteAllBatchesChange}
                    disabled={
                      selectedUserIds.length > 0 ||
                      selectAllInTab ||
                      (activeStudentBatchTab !== "all" && deleteCurrentBatch)
                    }
                  />
                  <span className="ml-2 text-sm text-gray-700 font-medium">
                    Delete ALL Students (All Batches)
                  </span>
                </label>
                {activeStudentBatchTab !== "all" && (
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                      checked={deleteCurrentBatch}
                      onChange={handleDeleteCurrentBatchChange}
                      disabled={
                        selectedUserIds.length > 0 ||
                        selectAllInTab ||
                        deleteAllBatches
                      }
                    />
                    <span className="ml-2 text-sm text-gray-700 font-medium">
                      Delete ALL Students in Current Batch (
                      {activeStudentBatchTab})
                    </span>
                  </label>
                )}
              </>
            )}

            <button
              onClick={handleDeleteUsers}
              disabled={
                isDeletingUsers ||
                (selectedUserIds.length === 0 &&
                  !selectAllInTab &&
                  !deleteAllBatches &&
                  !deleteCurrentBatch) ||
                (activeUserTab === "student" &&
                  deleteAllBatches &&
                  users.filter((u) => u.role === "student").length === 0) ||
                (activeUserTab === "student" &&
                  deleteCurrentBatch &&
                  activeStudentBatchTab !== "all" &&
                  users.filter(
                    (u) =>
                      u.role === "student" && u.batch === activeStudentBatchTab
                  ).length === 0) ||
                (selectAllInTab && getFilteredUsers(activeUserTab).length === 0)
              }
              className="mt-4 bg-gray-900 text-white py-2.5 px-4 rounded-xl w-full hover:bg-gray-800 transition duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center font-medium text-sm"
            >
              {isDeletingUsers ? (
                <>
                  <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />{" "}
                  Deleting...
                </>
              ) : (
                <>
                  <TrashIcon className="h-5 w-5 mr-2" /> Delete
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showDeleteConfirmModal}
        onClose={() => setShowDeleteConfirmModal(false)}
        title="Confirm Deletion"
      >
        <div className="p-4 text-center">
          <p className="text-base text-gray-700 mb-6">
            Are you absolutely sure you want to delete the selected users? This
            action cannot be undone.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setShowDeleteConfirmModal(false)}
              className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium transition text-sm"
            >
              Cancel
            </button>
            <button
              onClick={confirmDeleteUsers}
              className="px-6 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 font-medium transition text-sm"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isCreateExamModalOpen}
        onClose={() => setIsCreateExamModalOpen(false)}
        title="Create New Exam"
      >
        <form onSubmit={handleCreateExam} className="space-y-4 p-2">
          <div>
            <label
              htmlFor="examTitle"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Exam Subject
            </label>
            <input
              type="text"
              id="examTitle"
              placeholder="e.g., Mid-Term Exam 2025"
              value={newExamTitle}
              onChange={(e) => setNewExamTitle(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
              required
            />
          </div>
          <div>
            <label
              htmlFor="examCourse"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Batch
            </label>
            <select
              id="examCourse"
              value={newExamCourse}
              onChange={(e) => setNewExamCourse(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
              required
            >
              <option value="">-- Select Batch --</option>
              {studentBatchesForExam.length === 0 ? (
                <option value="" disabled>
                  No students with batches found
                </option>
              ) : (
                studentBatchesForExam.map((batch) => (
                  <option key={batch} value={batch}>
                    {batch}
                  </option>
                ))
              )}
            </select>
            {studentBatchesForExam.length === 0 && (
              <p className="text-xs text-gray-600 mt-1">
                Please add students with batch numbers first
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="examType"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Exam Type
            </label>
            <input
              type="text"
              id="examType"
              placeholder="e.g., Mid-Term, Final, Quiz"
              value={newExamExamType}
              onChange={(e) => setNewExamExamType(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
              required
            />
          </div>
          <div>
            <label
              htmlFor="examDate"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Date
            </label>
            <input
              type="date"
              id="examDate"
              value={newExamDate}
              onChange={(e) => setNewExamDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
              required
            />
          </div>
          <div>
            <label
              htmlFor="totalMarks"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Total Marks
            </label>
            <input
              type="number"
              id="totalMarks"
              placeholder="e.g., 100"
              value={newExamTotalMarks}
              onChange={(e) => setNewExamTotalMarks(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
              required
            />
          </div>
          <div>
            <label
              htmlFor="examFile"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Question Paper (PDF or Images)
            </label>
            <input
              type="file"
              id="examFile"
              accept=".pdf, .jpg, .jpeg, .png, .gif"
              multiple={newExamFileType === "images"}
              onChange={handleExamFileChange}
              className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-900 hover:file:bg-gray-200 mt-1 cursor-pointer"
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
            disabled={isCreatingExam || studentBatchesForExam.length === 0}
            className="bg-gray-900 text-white py-2.5 px-4 rounded-xl w-full hover:bg-gray-800 transition duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center font-medium text-sm"
          >
            {isCreatingExam ? (
              <>
                <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Exam"
            )}
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={isAssignExaminersToExamModalOpen}
        onClose={() => setIsAssignExaminersToExamModalOpen(false)}
        title="Assign Examiners to Exam Pool"
      >
        <div className="space-y-6 p-2">
          <div>
            <label
              htmlFor="selectExam"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Select Exam (Only unassigned exams shown)
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
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
              disabled={unassignedExamsForModal.length === 0}
            >
              <option value="">-- Choose an Exam --</option>
              {unassignedExamsForModal.map((exam) => (
                <option key={exam._id} value={exam._id}>
                  {exam.title} ({exam.totalPages || "N/A"} pages)
                </option>
              ))}
            </select>
            {unassignedExamsForModal.length === 0 && (
              <p className="text-sm text-gray-500 mt-1">
                All exams are currently assigned to examiners or no exams exist.
              </p>
            )}
          </div>
          {selectedExamForExaminerAssignment && (
            <div>
              <label
                htmlFor="selectExaminers"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Assign Examiners (Select multiple)
              </label>
              <div className="border border-gray-200 rounded-xl p-3 max-h-40 overflow-y-auto bg-gray-50">
                {availableExaminers.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-2">
                    No examiners available.
                  </p>
                ) : (
                  availableExaminers.map((examiner) => (
                    <div
                      key={examiner._id}
                      className="flex items-center mb-1 last:mb-0"
                    >
                      <input
                        type="checkbox"
                        id={`examiner-${examiner._id}`}
                        value={examiner._id}
                        checked={selectedExaminerIds.includes(examiner._id)}
                        onChange={() =>
                          handleExaminerCheckboxChange(examiner._id)
                        }
                        className="h-4 w-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900 cursor-pointer"
                      />
                      <label
                        htmlFor={`examiner-${examiner._id}`}
                        className="ml-2 text-sm text-gray-700 cursor-pointer"
                      >
                        {examiner.name} ({examiner.email})
                      </label>
                    </div>
                  ))
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Hold Ctrl/Cmd to select multiple examiners.
              </p>
            </div>
          )}
          <button
            onClick={handleAssignExaminersToExam}
            disabled={
              !selectedExamForExaminerAssignment ||
              selectedExaminerIds.length === 0 ||
              isAssigning
            }
            className="bg-gray-900 text-white py-2.5 px-4 rounded-xl w-full disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-800 transition duration-200 flex items-center justify-center font-medium text-sm"
          >
            {isAssigning ? (
              <>
                <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                Assigning...
              </>
            ) : (
              "Assign Examiners & Distribute Copies"
            )}
          </button>
        </div>
      </Modal>

      <ScanCopyUploadModal
        isOpen={isScanUploadModalOpen}
        onClose={() => setIsScanUploadModalOpen(false)}
        onUploadSuccess={handleScanUploadSuccess}
        questionPapers={exams}
        students={users.filter((u) => u.role === "student")}
        copies={copies}
      />

      <ExamReportGenerator
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        exam={selectedExamForReport}
        copies={copies}
        users={users}
      />

      {/* Examiner details moved to /admin/examiners page */}
    </div>
  );
}
