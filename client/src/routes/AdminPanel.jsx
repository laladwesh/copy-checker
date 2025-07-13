import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import Modal from "../components/Modal";
import ScanCopyUploadModal from "../components/ScanCopyUploadModal";
import AdminQueryViewerModal from "../components/AdminQueryViewerModal";
import {
  UserGroupIcon,
  BookOpenIcon,
  CloudArrowUpIcon,
  UsersIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  PaperAirplaneIcon,
  EyeIcon,
  QuestionMarkCircleIcon,
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  ArrowPathIcon, // Added TrashIcon for delete functionality
} from "@heroicons/react/24/outline";
import AllExaminerDetailsModal from "../components/AllExaminerDetailsModal";

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [exams, setExams] = useState([]);
  const [copies, setCopies] = useState([]);
  const [queries, setQueries] = useState([]);
  const [availableExaminers, setAvailableExaminers] = useState([]);

  // Modals
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
  const [isCreateExamModalOpen, setIsCreateExamModalOpen] = useState(false);
  const [
    isAssignExaminersToExamModalOpen,
    setIsAssignExaminersToExamModalOpen,
  ] = useState(false);
  const [isScanUploadModalOpen, setIsScanUploadModalOpen] = useState(false);
  const [isQueriesModalOpen, setIsQueriesModalOpen] = useState(false);

  // Form states for adding user/QP/assigning examiner
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

  const [querySearchTerm, setQuerySearchTerm] = useState("");

  const [
    selectedExamForExaminerAssignment,
    setSelectedExamForExaminerAssignment,
  ] = useState(null);
  const [selectedExaminerIds, setSelectedExaminerIds] = useState([]);

  // State for exam search filter
  const [examSearchTerm, setExamSearchTerm] = useState("");

  // States for Manage Users Modal tabs and search
  const [activeUserTab, setActiveUserTab] = useState("all");
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [activeStudentBatchTab, setActiveStudentBatchTab] = useState("all");

  // Bulk Delete States
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [selectAllInTab, setSelectAllInTab] = useState(false);
  const [deleteAllBatches, setDeleteAllBatches] = useState(false); // Checkbox for deleting all students across all batches
  const [deleteCurrentBatch, setDeleteCurrentBatch] = useState(false); // Checkbox for deleting all students in current batch
  const [isDeletingUsers, setIsDeletingUsers] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState({
    message: "",
    type: "success",
  });

  // Query Management Modal State
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [isViewQueryModalOpen, setIsViewQueryModalOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isSubmittingQueryAction, setIsSubmittingQueryAction] = useState(false);

  // States for Query Viewer Modal (for displaying copy)
  const [selectedCopyForQueryView, setSelectedCopyForQueryView] =
    useState(null);
  const [queryViewerCurrentPage, setQueryViewerCurrentPage] = useState(1);
  const [queryViewerZoomLevel, setQueryViewerZoomLevel] = useState(1);
  const [isQueryViewerAcLoading, setIsQueryViewerAcLoading] = useState(true);

  // States for Question Paper within Query Viewer Modal
  const [queryViewerQpCurrentPage, setQueryViewerQpCurrentPage] = useState(1);
  const [queryViewerQpZoomLevel, setQueryViewerQpZoomLevel] = useState(1);
  const [isQueryViewerQpLoading, setIsQueryViewerQpLoading] = useState(true);

  const [isExaminerDetailsModalOpen, setIsExaminerDetailsModalOpen] =
    useState(false);

  const ZOOM_STEP = 0.25;
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 3;

  // States for Query Management Modal (exam selection and tabs)
  const [selectedExamForQueryView, setSelectedExamForQueryView] = useState("");
  const [activeQueryTab, setActiveQueryTab] = useState("pending");

  const showTemporaryToast = useCallback(
    (msg, type = "success") => {
      setToastMessage({ message: msg, type: type });
      setShowToast(true);
      const timer = setTimeout(() => {
        setShowToast(false);
        setToastMessage({ message: "", type: "success" });
      }, 5000);
      return () => clearTimeout(timer);
    },
    [setToastMessage, setShowToast]
  );

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
      showTemporaryToast("Failed to load initial data.", "error");
    }
  }, [showTemporaryToast]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Reset selected users and select all checkbox when tab or batch changes
  useEffect(() => {
    setSelectedUserIds([]);
    setSelectAllInTab(false);
    setDeleteAllBatches(false);
    setDeleteCurrentBatch(false);
  }, [activeUserTab, activeStudentBatchTab]);

  const uniqueBatches = useMemo(() => {
    const batches = new Set(
      users
        .filter((user) => user.role === "student" && user.batch)
        .map((user) => user.batch)
    );
    return ["all", ...Array.from(batches).sort()];
  }, [users]);

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
      showTemporaryToast("User added successfully!", "success");
      setNewUserName("");
      setNewUserEmail("");
      setNewUserRole("student");
      setNewUserGender("");
      setNewUserBatch("");
      fetchInitialData();
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
      fetchInitialData();
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

  const handleExaminerCheckboxChange = (examinerId) => {
    setSelectedExaminerIds((prev) =>
      prev.includes(examinerId)
        ? prev.filter((id) => id !== examinerId)
        : [...prev, examinerId]
    );
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
      fetchInitialData();
    } catch (err) {
      showTemporaryToast(
        `Error assigning examiners: ${
          err.response?.data?.message || err.message
        }`,
        "error"
      );
    }
  };

  const handleScanUploadSuccess = () => {
    showTemporaryToast("Scanned copy uploaded and registered!", "success");
    setIsScanUploadModalOpen(false);
    fetchInitialData();
  };

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

  const unassignedExamsForModal = exams.filter(
    (exam) => !exam.assignedExaminers || exam.assignedExaminers.length === 0
  );

  const filteredExams = exams.filter((exam) =>
    exam.title.toLowerCase().includes(examSearchTerm.toLowerCase())
  );

  // Filter users for Manage Users Modal based on active tab, search term, and batch
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

  // Handle individual user checkbox change
  const handleUserCheckboxChange = (userId) => {
    setSelectedUserIds((prevSelected) =>
      prevSelected.includes(userId)
        ? prevSelected.filter((id) => id !== userId)
        : [...prevSelected, userId]
    );
  };

  // Handle "Select All in Current Tab" checkbox
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

  // Handle "Delete All Batches" checkbox
  const handleDeleteAllBatchesChange = (e) => {
    const isChecked = e.target.checked;
    setDeleteAllBatches(isChecked);
    if (isChecked) {
      setDeleteCurrentBatch(false); // Uncheck "Delete Current Batch" if "Delete All Batches" is checked
      setSelectedUserIds([]); // Clear individual selections
      setSelectAllInTab(false); // Uncheck "Select All in Tab"
    }
  };

  // Handle "Delete Whole Batch" checkbox
  const handleDeleteCurrentBatchChange = (e) => {
    const isChecked = e.target.checked;
    setDeleteCurrentBatch(isChecked);
    if (isChecked) {
      setDeleteAllBatches(false); // Uncheck "Delete All Batches" if "Delete Whole Batch" is checked
      setSelectedUserIds([]); // Clear individual selections
      setSelectAllInTab(false); // Uncheck "Select All in Tab"
    }
  };

  const handleDeleteUsers = async () => {
    let userIdsToDelete = [];
    let confirmationMessage = "";

    if (deleteAllBatches) {
      // Deleting all students across all batches
      userIdsToDelete = users
        .filter((user) => user.role === "student")
        .map((user) => user._id);
      confirmationMessage =
        "Are you sure you want to delete ALL students across ALL batches? This action cannot be undone.";
    } else if (deleteCurrentBatch && activeStudentBatchTab !== "all") {
      // Deleting all students in the currently selected batch
      userIdsToDelete = users
        .filter(
          (user) =>
            user.role === "student" && user.batch === activeStudentBatchTab
        )
        .map((user) => user._id);
      confirmationMessage = `Are you sure you want to delete all students in Batch ${activeStudentBatchTab}? This action cannot be undone.`;
    } else if (selectAllInTab) {
      // Deleting all users in the current tab/filter
      userIdsToDelete = getFilteredUsers(activeUserTab).map((user) => user._id);
      confirmationMessage = `Are you sure you want to delete all ${activeUserTab}s currently displayed? This action cannot be undone.`;
    } else if (selectedUserIds.length > 0) {
      // Deleting individually selected users
      userIdsToDelete = selectedUserIds;
      confirmationMessage = `Are you sure you want to delete the ${selectedUserIds.length} selected user(s)? This action cannot be undone.`;
    } else {
      showTemporaryToast("No users selected for deletion.", "info");
      return;
    }

    if (userIdsToDelete.length === 0) {
      showTemporaryToast(
        "No users found to delete based on your selection.",
        "info"
      );
      return;
    }

    setShowDeleteConfirmModal(true); // Show confirmation modal
  };

  const confirmDeleteUsers = async () => {
    setShowDeleteConfirmModal(false); // Close confirmation modal
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
      showTemporaryToast(res.data.message, "success");
      fetchInitialData(); // Refresh user list
      setSelectedUserIds([]); // Clear selections
      setSelectAllInTab(false);
      setDeleteAllBatches(false);
      setDeleteCurrentBatch(false);
    } catch (err) {
      showTemporaryToast(
        `Error deleting users: ${err.response?.data?.message || err.message}`,
        "error"
      );
    } finally {
      setIsDeletingUsers(false);
    }
  };

  const renderUsersTable = (usersToDisplay) => (
    <div className="overflow-x-auto no-scrollbar max-h-60 overflow-y-auto mt-4 rounded-lg border border-gray-200 shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <input
                type="checkbox"
                className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
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
                    className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
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

  const uniqueExamTitlesWithIds = Array.from(
    new Map(
      queries
        .filter(
          (q) => q.copy?.questionPaper?.title && q.copy?.questionPaper?._id
        )
        .map((q) => [
          q.copy.questionPaper._id,
          { _id: q.copy.questionPaper._id, title: q.copy.questionPaper.title },
        ])
    ).values()
  );

  const handleOpenQueryModal = async (query) => {
    setSelectedQuery(query);
    setReplyText(query.response || "");
    setIsViewQueryModalOpen(true);
    setQueryViewerCurrentPage(query.pageNumber);
    setQueryViewerZoomLevel(1);
    setQueryViewerQpCurrentPage(1);
    setQueryViewerQpZoomLevel(1);

    if (query.copy?._id) {
      try {
        setIsQueryViewerAcLoading(true);
        setIsQueryViewerQpLoading(true);
        const copyDetailsRes = await api.get(
          `/admin/copies/view/${query.copy._id}`
        );
        setSelectedCopyForQueryView(copyDetailsRes.data);
      } catch (err) {
        console.error("Error fetching copy details for query view:", err);
        showTemporaryToast("Failed to load copy details for query.", "error");
        setSelectedCopyForQueryView(null);
      } finally {
        setIsQueryViewerAcLoading(false);
        setIsQueryViewerQpLoading(false);
      }
    } else {
      setSelectedCopyForQueryView(null);
      setIsQueryViewerAcLoading(false);
      setIsQueryViewerQpLoading(false);
    }
  };

  const handleCloseQueryModal = () => {
    setSelectedQuery(null);
    setReplyText("");
    setIsViewQueryModalOpen(false);
    setSelectedCopyForQueryView(null);
    setQueryViewerCurrentPage(1);
    setQueryViewerZoomLevel(1);
    setQueryViewerQpCurrentPage(1);
    setQueryViewerQpZoomLevel(1);
    fetchInitialData();
  };

  const handleApproveQuery = async () => {
    if (!selectedQuery) return;
    setIsSubmittingQueryAction(true);
    try {
      await api.patch(`/admin/queries/${selectedQuery._id}/approve`);
      showTemporaryToast(
        "Query approved and forwarded to examiner!",
        "success"
      );
      handleCloseQueryModal();
    } catch (error) {
      console.error("Error approving query:", error);
      showTemporaryToast(
        `Error approving query: ${
          error.response?.data?.message || error.message
        }`,
        "error"
      );
    } finally {
      setIsSubmittingQueryAction(false);
    }
  };

  const handleRejectQuery = async () => {
    if (!selectedQuery) return;
    setIsSubmittingQueryAction(true);
    try {
      await api.patch(`/admin/queries/${selectedQuery._id}/reject`);
      showTemporaryToast("Query rejected!", "success");
      handleCloseQueryModal();
    } catch (error) {
      console.error("Error rejecting query:", error);
      showTemporaryToast(
        `Error rejecting query: ${
          error.response?.data?.message || error.message
        }`,
        "error"
      );
    } finally {
      setIsSubmittingQueryAction(false);
    }
  };

  const handleResolveQuery = async () => {
    if (!selectedQuery || !replyText.trim()) {
      showTemporaryToast(
        "Please provide a response to resolve the query.",
        "error"
      );
      return;
    }
    setIsSubmittingQueryAction(true);
    try {
      await api.patch(`/admin/queries/${selectedQuery._id}/resolve`, {
        responseText: replyText,
      });
      showTemporaryToast(
        "Query resolved successfully with your reply!",
        "success"
      );
      handleCloseQueryModal();
    } catch (error) {
      console.error("Error resolving query:", error);
      showTemporaryToast(
        `Error resolving query: ${
          error.response?.data?.message || error.message
        }`,
        "error"
      );
    } finally {
      setIsSubmittingQueryAction(false);
    }
  };

  const handleQueryViewerZoom = useCallback((type, action) => {
    if (type === "ac") {
      setQueryViewerZoomLevel((prevZoom) => {
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
    } else if (type === "qp") {
      setQueryViewerQpZoomLevel((prevZoom) => {
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
  }, []);

  const getFilteredQueries = () => {
    let filtered = queries;

    if (selectedExamForQueryView) {
      filtered = filtered.filter(
        (query) => query.copy?.questionPaper?._id === selectedExamForQueryView
      );
    }

    if (activeQueryTab === "pending") {
      filtered = filtered.filter((query) => query.status === "pending");
    } else if (activeQueryTab === "approved_by_admin") {
      filtered = filtered.filter(
        (query) => query.status === "approved_by_admin"
      );
    } else if (activeQueryTab === "rejected_by_admin") {
      filtered = filtered.filter(
        (query) => query.status === "rejected_by_admin"
      );
    } else if (activeQueryTab === "resolved_by_admin") {
      filtered = filtered.filter(
        (query) => query.status === "resolved_by_admin"
      );
    } else if (activeQueryTab === "resolved_by_examiner") {
      filtered = filtered.filter(
        (query) => query.status === "resolved_by_examiner"
      );
    }

    const searchTermLower = querySearchTerm.toLowerCase();
    if (searchTermLower) {
      filtered = filtered.filter(
        (query) =>
          query.raisedBy?.name?.toLowerCase().includes(searchTermLower) ||
          query.raisedBy?.email?.toLowerCase().includes(searchTermLower) ||
          query.text.toLowerCase().includes(searchTermLower)
      );
    }

    return filtered;
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

        {/* Manage Exams (Question Papers) Card */}
        <div className="bg-white p-8 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col items-center justify-center text-center border border-gray-100">
          <BookOpenIcon className="h-16 w-16 text-blue-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            Manage Exams
          </h2>
          <p className="text-gray-600 mb-6">
            Create new exams and manage question papers.
          </p>
          <button
            onClick={() => setIsCreateExamModalOpen(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition duration-200 text-lg"
          >
            Create Exam
          </button>
        </div>

        {/* Assign Examiner to Exam Pool Card */}
        <div className="bg-white p-8 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col items-center justify-center text-center border border-gray-100">
          <UsersIcon className="h-16 w-16 text-purple-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            Assign Examiners to Exams
          </h2>
          <p className="text-gray-600 mb-6">
            Assign examiners to an exam pool for copy distribution.
          </p>
          <button
            onClick={() => openAssignExaminersModal(null)}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition duration-200 text-lg"
          >
            Assign Examiners
          </button>
        </div>

        {/* Scan & Upload Copy Card */}
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

        {/* Manage Queries Card */}
        <div className="bg-white p-8 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col items-center justify-center text-center border border-gray-100">
          <QuestionMarkCircleIcon className="h-16 w-16 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            Manage Student Queries
          </h2>
          <p className="text-gray-600 mb-6">
            Review, approve, reject, or resolve student queries.
          </p>
          <button
            onClick={() => setIsQueriesModalOpen(true)}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition duration-200 text-lg"
          >
            Manage Queries (
            {queries.filter((q) => q.status === "pending").length} Pending)
          </button>
        </div>
        <div className="bg-white p-8 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col items-center justify-center text-center border border-gray-100">
          <ClipboardDocumentListIcon className="h-16 w-16 text-teal-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            Examiner Performance
          </h2>
          <p className="text-gray-600 mb-6">
            View detailed statistics for each examiner's work.
          </p>
          <button
            onClick={() => setIsExaminerDetailsModalOpen(true)}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition duration-200 text-lg"
          >
            View Examiner Stats
          </button>
        </div>
      </div>

      {/* Exam Overview Section */}
      <section className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 mt-10">
        <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-3 flex justify-between items-center">
          <span>Exam Overview & Progress</span>
          <div className="relative w-1/3 min-w-[200px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon
                className="h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
            </div>
            <input
              type="text"
              placeholder="Search exams by title..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={examSearchTerm}
              onChange={(e) => setExamSearchTerm(e.target.value)}
            />
          </div>
        </h2>
        {filteredExams.length === 0 && exams.length > 0 ? (
          <p className="text-gray-600 text-center py-4">
            No exams found matching your search criteria.
          </p>
        ) : filteredExams.length === 0 && exams.length === 0 ? (
          <p className="text-gray-600 text-center py-4">
            No exams created yet. Create an exam to see its progress.
          </p>
        ) : (
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto rounded-lg border border-gray-200 shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
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
                          to={`/admin/exams/${exam._id}`}
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

      {/* Modals for Admin Actions */}

      {/* Manage Users Modal */}
      <Modal
        isOpen={isUsersModalOpen}
        onClose={() => setIsUsersModalOpen(false)}
        title="Manage Users"
      >
        <h3 className="text-xl font-bold mb-4 text-gray-800">Add New User</h3>
        <div className="space-y-4 mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <input
            type="text"
            placeholder="Name"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
            className="w-full p-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
            className="w-full p-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
          <select
            value={newUserGender}
            onChange={(e) => setNewUserGender(e.target.value)}
            className="w-full p-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500"
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
            className="w-full p-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500"
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
              className="w-full p-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          )}
          <button
            onClick={handleAddUser}
            className="bg-green-600 text-white p-2 rounded-md w-full hover:bg-green-700 transition duration-150"
          >
            Add User
          </button>
        </div>

        <h3 className="text-xl font-bold mb-4 text-gray-800">Existing Users</h3>
        <div className="flex border-b border-gray-200 mb-4 overflow-x-auto no-scrollbar">
          <button
            className={`py-2 px-4 text-sm font-medium ${
              activeUserTab === "all"
                ? "border-b-2 border-indigo-500 text-indigo-600"
                : "text-gray-500 hover:text-gray-700"
            } transition duration-150`}
            onClick={() => {
              setActiveUserTab("all");
              setUserSearchTerm("");
              setActiveStudentBatchTab("all");
            }}
          >
            All Users ({getFilteredUsers("all").length})
          </button>
          <button
            className={`py-2 px-4 text-sm font-medium ${
              activeUserTab === "student"
                ? "border-b-2 border-indigo-500 text-indigo-600"
                : "text-gray-500 hover:text-gray-700"
            } transition duration-150`}
            onClick={() => {
              setActiveUserTab("student");
              setUserSearchTerm("");
            }}
          >
            Students ({getFilteredUsers("student").length})
          </button>
          <button
            className={`py-2 px-4 text-sm font-medium ${
              activeUserTab === "examiner"
                ? "border-b-2 border-indigo-500 text-indigo-600"
                : "text-gray-500 hover:text-gray-700"
            } transition duration-150`}
            onClick={() => {
              setActiveUserTab("examiner");
              setUserSearchTerm("");
              setActiveStudentBatchTab("all");
            }}
          >
            Examiners ({getFilteredUsers("examiner").length})
          </button>
          <button
            className={`py-2 px-4 text-sm font-medium ${
              activeUserTab === "admin"
                ? "border-b-2 border-indigo-500 text-indigo-600"
                : "text-gray-500 hover:text-gray-700"
            } transition duration-150`}
            onClick={() => {
              setActiveUserTab("admin");
              setUserSearchTerm("");
              setActiveStudentBatchTab("all");
            }}
          >
            Admins ({getFilteredUsers("admin").length})
          </button>
        </div>

        {/* Student Batch Sub-Tabs */}
        {activeUserTab === "student" && (
          <div className="flex border-b border-gray-200 mb-4 overflow-x-auto no-scrollbar ml-4">
            {uniqueBatches.map((batch) => (
              <button
                key={batch}
                className={`py-2 px-4 text-xs font-medium ${
                  activeStudentBatchTab === batch
                    ? "border-b-2 border-purple-500 text-purple-600"
                    : "text-gray-500 hover:text-gray-700"
                } transition duration-150`}
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

        {/* Search Bar for Users */}
        <div className="mb-4 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon
              className="h-5 w-5 text-gray-400"
              aria-hidden="true"
            />
          </div>
          <input
            type="text"
            placeholder={`Search by name or email in ${activeUserTab}s...`}
            value={userSearchTerm}
            onChange={(e) => setUserSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        {/* Render Table based on active tab and search term */}
        {renderUsersTable(getFilteredUsers(activeUserTab))}

        {/* Bulk Delete Options */}
        <div className="mt-6 pt-4 border-t border-gray-200 space-y-3">
          <h4 className="text-lg font-bold text-gray-800">
            Bulk Delete Options
          </h4>
          <div className="flex flex-col space-y-2">
            {activeUserTab === "student" && (
              <>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
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
                      className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
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
              className="mt-4 bg-red-600 text-white p-2 rounded w-full hover:bg-red-700 transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isDeletingUsers ? (
                <>
                  <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />{" "}
                  Deleting...
                </>
              ) : (
                <>
                  <TrashIcon className="h-5 w-5 mr-2" /> Delete Selected / All
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirmModal}
        onClose={() => setShowDeleteConfirmModal(false)}
        title="Confirm Deletion"
      >
        <div className="p-4 text-center">
          <p className="text-lg text-gray-700 mb-6">
            Are you absolutely sure you want to delete the selected users? This
            action cannot be undone.
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => setShowDeleteConfirmModal(false)}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold transition"
            >
              Cancel
            </button>
            <button
              onClick={confirmDeleteUsers}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Exam Modal (Upload Question Paper) */}
      <Modal
        isOpen={isCreateExamModalOpen}
        onClose={() => setIsCreateExamModalOpen(false)}
        title="Create New Exam"
      >
        <form onSubmit={handleCreateExam} className="space-y-4 p-2">
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
              className="w-full p-2 border rounded-md mt-1 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          {/* Course Input */}
          <div>
            <label
              htmlFor="examCourse"
              className="block text-sm font-medium text-gray-700"
            >
              Batch:
            </label>
            <input
              type="text"
              id="examCourse"
              placeholder="e.g., Batch 2025"
              value={newExamCourse}
              onChange={(e) => setNewExamCourse(e.target.value)}
              className="w-full p-2 border rounded-md mt-1 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          {/* Exam Type Input */}
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
              className="w-full p-2 border rounded-md mt-1 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          {/* Date Input */}
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
              className="w-full p-2 border rounded-md mt-1 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          {/* Total Marks Input */}
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
              className="w-full p-2 border rounded-md mt-1 focus:ring-blue-500 focus:border-blue-500"
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
            className="bg-blue-600 text-white p-2 rounded-md w-full hover:bg-blue-700 transition duration-150"
          >
            Create Exam
          </button>
        </form>
      </Modal>

      {/* Assign Examiners to Exam Modal */}
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
              Select Exam (Only unassigned exams shown):
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
              className="w-full p-2 border rounded-md mt-1 focus:ring-purple-500 focus:border-purple-500"
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
                Assign Examiners (Select multiple):
              </label>
              <div className="border rounded-md p-3 max-h-40 overflow-y-auto bg-gray-50 shadow-inner">
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
                        className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer"
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
              selectedExaminerIds.length === 0
            }
            className="bg-purple-600 text-white p-2 rounded-md w-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-700 transition duration-150"
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
        questionPapers={exams}
        students={users.filter((u) => u.role === "student")}
      />

      {/* Manage Queries Modal */}
      <Modal
        isOpen={isQueriesModalOpen}
        onClose={() => setIsQueriesModalOpen(false)}
        large
      >
        <h2 className="text-2xl font-bold mb-4 text-gray-800">
          Manage Student Queries
        </h2>

        {/* Exam Selection for Queries */}
        <div className="mb-4 p-2 border border-gray-200 rounded-lg bg-gray-50">
          <label
            htmlFor="selectExamForQueries"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Filter by Exam:
          </label>
          <select
            id="selectExamForQueries"
            value={selectedExamForQueryView}
            onChange={(e) => setSelectedExamForQueryView(e.target.value)}
            className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Exams</option>
            {uniqueExamTitlesWithIds.map((exam) => (
              <option key={exam._id} value={exam._id}>
                {exam.title}
              </option>
            ))}
          </select>
        </div>

        {/* Query Status Tabs */}
        <div className="flex border-b border-gray-200 mb-4 overflow-x-auto no-scrollbar">
          <button
            className={`py-2 px-4 text-sm font-medium ${
              activeQueryTab === "pending"
                ? "border-b-2 border-indigo-500 text-indigo-600"
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
            className={`py-2 px-4 text-sm font-medium ${
              activeQueryTab === "approved_by_admin"
                ? "border-b-2 border-indigo-500 text-indigo-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveQueryTab("approved_by_admin")}
          >
            Approved (Sent to Examiner) (
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
            className={`py-2 px-4 text-sm font-medium ${
              activeQueryTab === "rejected_by_admin"
                ? "border-b-2 border-indigo-500 text-indigo-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
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
            className={`py-2 px-4 text-sm font-medium ${
              activeQueryTab === "resolved_by_admin"
                ? "border-b-2 border-indigo-500 text-indigo-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
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
            className={`py-2 px-4 text-sm font-medium ${
              activeQueryTab === "resolved_by_examiner"
                ? "border-b-2 border-indigo-500 text-indigo-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
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

        {/* Search bar for queries within the modal */}
        <div className="mb-4 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon
              className="h-5 w-5 text-gray-400"
              aria-hidden="true"
            />
          </div>
          <input
            type="text"
            placeholder="Search queries by student, or query text..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            value={querySearchTerm}
            onChange={(e) => setQuerySearchTerm(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto max-h-[500px] overflow-y-auto rounded-lg border border-gray-200 shadow-sm">
          {" "}
          {getFilteredQueries().length === 0 ? (
            <p className="text-gray-600 text-center py-4">
              No student queries to manage in this category.
            </p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exam Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Page
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Query Text
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getFilteredQueries().map((query) => (
                  <tr key={query._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {query.raisedBy?.name || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {query.copy?.questionPaper?.title || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {query.pageNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 truncate max-w-xs">
                      {query.text}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          query.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : query.status === "approved_by_admin"
                            ? "bg-blue-100 text-blue-800"
                            : query.status === "rejected_by_admin"
                            ? "bg-red-100 text-red-800"
                            : query.status === "resolved_by_admin"
                            ? "bg-green-100 text-green-800"
                            : query.status === "resolved_by_examiner"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {query.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleOpenQueryModal(query)}
                        className="text-indigo-600 hover:text-indigo-900 ml-4"
                      >
                        View / Action
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => setIsQueriesModalOpen(false)}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
          >
            Close
          </button>
        </div>
      </Modal>

      {/* View/Action Query Modal (Admin) - Now using AdminQueryViewerModal */}
      <AdminQueryViewerModal
        isOpen={isViewQueryModalOpen}
        onClose={handleCloseQueryModal}
        selectedQuery={selectedQuery}
        selectedCopyForQueryView={selectedCopyForQueryView}
        queryViewerCurrentPage={queryViewerCurrentPage}
        setQueryViewerCurrentPage={setQueryViewerCurrentPage}
        queryViewerZoomLevel={queryViewerZoomLevel}
        queryViewerQpCurrentPage={queryViewerQpCurrentPage}
        setQueryViewerQpCurrentPage={setQueryViewerQpCurrentPage}
        queryViewerQpZoomLevel={queryViewerQpZoomLevel}
        isQueryViewerAcLoading={isQueryViewerAcLoading}
        setIsQueryViewerAcLoading={setIsQueryViewerAcLoading}
        isQueryViewerQpLoading={isQueryViewerQpLoading}
        setIsQueryViewerQpLoading={setIsQueryViewerQpLoading}
        handleQueryViewerZoom={handleQueryViewerZoom}
        replyText={replyText}
        setReplyText={setReplyText}
        isSubmittingQueryAction={isSubmittingQueryAction}
        handleApproveQuery={handleApproveQuery}
        handleRejectQuery={handleRejectQuery}
        handleResolveQuery={handleResolveQuery}
      />

      <AllExaminerDetailsModal
        isOpen={isExaminerDetailsModalOpen}
        onClose={() => setIsExaminerDetailsModalOpen(false)}
        examiners={availableExaminers}
        copies={copies}
        exams={exams}
      />
    </div>
  );
}
