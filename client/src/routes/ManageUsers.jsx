import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import Modal from "../components/Modal";
import * as XLSX from "xlsx";
import {
  MagnifyingGlassIcon,
  TrashIcon,
  ArrowPathIcon,
  ArrowLeftIcon,
  ArrowUpTrayIcon,
  DocumentArrowDownIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { toastSuccess, toastError } from "../utils/hotToast";

export default function ManageUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);

  // Form input states
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("student");
  const [newUserGender, setNewUserGender] = useState("");
  const [newUserBatch, setNewUserBatch] = useState("");
  const [newUserDepartment, setNewUserDepartment] = useState("");

  // Search and filter states
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

  // Bulk upload states
  const [bulkUploadFile, setBulkUploadFile] = useState(null);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [bulkUploadResults, setBulkUploadResults] = useState(null);
  const [showBulkResultsModal, setShowBulkResultsModal] = useState(false);

  // Edit user states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const [editUserName, setEditUserName] = useState("");
  const [editUserEmail, setEditUserEmail] = useState("");
  const [editUserRole, setEditUserRole] = useState("");
  const [editUserGender, setEditUserGender] = useState("");
  const [editUserBatch, setEditUserBatch] = useState("");
  const [editUserDepartment, setEditUserDepartment] = useState("");
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get("/admin/users");
      setUsers(res.data);
    } catch (error) {
      console.error("Error fetching users:", error);
      toastError("Failed to fetch users");
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Reset selections when user switches tabs or batches
  useEffect(() => {
    setSelectedUserIds([]);
    setSelectAllInTab(false);
  }, [activeUserTab, activeStudentBatchTab]);

  // Get unique student batches for filter dropdown
  const uniqueBatches = useMemo(() => {
    const batches = users
      .filter((user) => user.role === "student" && user.batch)
      .map((user) => user.batch);
    return ["all", ...new Set(batches)];
  }, [users]);

  // Add new user to the system
  const handleAddUser = async () => {
    if (!newUserName || !newUserEmail || !newUserGender) {
      toastError("Please fill in all required fields");
      return;
    }
    if (newUserRole === "student" && !newUserBatch) {
      toastError("Please provide a batch for student");
      return;
    }

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

      if (newUserRole === "examiner") {
        userData.department = newUserDepartment;
      }

      await api.post("/admin/users", userData);
      toastSuccess("User added successfully");
      setNewUserName("");
      setNewUserEmail("");
      setNewUserRole("student");
      setNewUserGender("");
      setNewUserBatch("");
      setNewUserDepartment("");
      fetchUsers();
    } catch (error) {
      console.error("Error adding user:", error);
      toastError(error.response?.data?.message || "Failed to add user");
    }
  };

  // Open edit modal and populate fields
  const handleOpenEditModal = (user) => {
    setUserToEdit(user);
    setEditUserName(user.name || "");
    setEditUserEmail(user.email || "");
    setEditUserRole(user.role || "");
    setEditUserGender(user.gender || "");
    setEditUserBatch(user.batch || "");
    setEditUserDepartment(user.department || "");
    setIsEditModalOpen(true);
  };

  // Update user details
  const handleUpdateUser = async () => {
    if (!editUserName || !editUserEmail || !editUserGender) {
      toastError("Please fill in all required fields");
      return;
    }
    if (editUserRole === "student" && !editUserBatch) {
      toastError("Please provide a batch for student");
      return;
    }

    setIsUpdatingUser(true);
    try {
      const userData = {
        name: editUserName,
        email: editUserEmail,
        role: editUserRole,
        gender: editUserGender,
      };

      if (editUserRole === "student") {
        userData.batch = editUserBatch;
        // Clear examiner-specific fields
        userData.department = "";
      }

      if (editUserRole === "examiner") {
        userData.department = editUserDepartment;
        // Clear student-specific fields
        userData.batch = "";
      }

      if (editUserRole === "admin") {
        // Clear role-specific fields
        userData.batch = "";
        userData.department = "";
      }

      await api.put(`/admin/users/${userToEdit._id}`, userData);
      toastSuccess("User updated successfully");
      setIsEditModalOpen(false);
      setUserToEdit(null);
      fetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      toastError(error.response?.data?.message || "Failed to update user");
    } finally {
      setIsUpdatingUser(false);
    }
  };

  // Filter users based on role, batch, and search criteria
  const getFilteredUsers = useCallback(
    (role) => {
      let filtered = users;

      if (role !== "all") {
        filtered = filtered.filter((user) => user.role === role);
      }

      if (role === "student" && activeStudentBatchTab !== "all") {
        filtered = filtered.filter(
          (user) => user.batch === activeStudentBatchTab,
        );
      }

      if (userSearchTerm) {
        filtered = filtered.filter(
          (user) =>
            user.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(userSearchTerm.toLowerCase()),
        );
      }

      return filtered;
    },
    [users, activeStudentBatchTab, userSearchTerm],
  );

  // Toggle individual user selection
  const handleUserCheckboxChange = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  // Toggle select all users in current tab
  const handleSelectAllInTab = (e) => {
    if (e.target.checked) {
      setSelectAllInTab(true);
      const usersInTab = getFilteredUsers(activeUserTab);
      setSelectedUserIds(usersInTab.map((u) => u._id));
    } else {
      setSelectAllInTab(false);
      setSelectedUserIds([]);
    }
  };

  // Handle bulk delete all student batches option
  const handleDeleteAllBatchesChange = (e) => {
    if (e.target.checked) {
      setDeleteAllBatches(true);
      setDeleteCurrentBatch(false);
      setSelectAllInTab(false);
      setSelectedUserIds([]);
    } else {
      setDeleteAllBatches(false);
    }
  };

  // Handle delete current batch option
  const handleDeleteCurrentBatchChange = (e) => {
    if (e.target.checked) {
      setDeleteCurrentBatch(true);
      setDeleteAllBatches(false);
      setSelectAllInTab(false);
      setSelectedUserIds([]);
    } else {
      setDeleteCurrentBatch(false);
    }
  };

  // Prepare user deletion based on selected options
  const handleDeleteUsers = async () => {
    setShowDeleteConfirmModal(true);
  };

  // Execute user deletion after confirmation
  const confirmDeleteUsers = async () => {
    setIsDeletingUsers(true);
    try {
      let idsToDelete = [];

      if (deleteAllBatches) {
        idsToDelete = users
          .filter((u) => u.role === "student")
          .map((u) => u._id);
      } else if (deleteCurrentBatch) {
        idsToDelete = users
          .filter(
            (u) => u.role === "student" && u.batch === activeStudentBatchTab,
          )
          .map((u) => u._id);
      } else if (selectAllInTab) {
        idsToDelete = getFilteredUsers(activeUserTab).map((u) => u._id);
      } else {
        idsToDelete = selectedUserIds;
      }

      if (idsToDelete.length === 0) {
        toastError("No users selected for deletion");
        setIsDeletingUsers(false);
        setShowDeleteConfirmModal(false);
        return;
      }

      await api.delete("/admin/users/bulk", { data: { userIds: idsToDelete } });
      toastSuccess(`${idsToDelete.length} user(s) deleted successfully`);
      setSelectedUserIds([]);
      setSelectAllInTab(false);
      setDeleteAllBatches(false);
      setDeleteCurrentBatch(false);
      fetchUsers();
    } catch (error) {
      console.error("Error deleting users:", error);
      toastError(error.response?.data?.message || "Failed to delete users");
    } finally {
      setIsDeletingUsers(false);
      setShowDeleteConfirmModal(false);
    }
  };

  // Handle bulk upload file selection
  const handleBulkFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "text/csv",
      ];
      if (
        !validTypes.includes(file.type) &&
        !file.name.match(/\.(xlsx|xls|csv)$/i)
      ) {
        toastError("Please upload a valid Excel file (.xlsx, .xls, or .csv)");
        e.target.value = null;
        return;
      }
      setBulkUploadFile(file);
    }
  };

  // Download sample Excel template
  const downloadSampleTemplate = () => {
    const sampleData = [
      {
        Name: "John Doe",
        Email: "john.doe@example.com",
        Gender: "Male",
        Batch: "2023",
      },
      {
        Name: "Jane Smith",
        Email: "jane.smith@example.com",
        Gender: "Female",
        Batch: "2023",
      },
      {
        Name: "Bob Johnson",
        Email: "bob.johnson@example.com",
        Gender: "Male",
        Batch: "2024",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "student_upload_template.xlsx");
    toastSuccess("Sample template downloaded");
  };

  // Process and upload bulk students
  const handleBulkUpload = async () => {
    if (!bulkUploadFile) {
      toastError("Please select a file to upload");
      return;
    }

    setIsBulkUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          if (jsonData.length === 0) {
            toastError("The Excel file is empty");
            setIsBulkUploading(false);
            return;
          }

          // Transform data to match backend expected format
          const students = jsonData.map((row) => ({
            name: row.Name || row.name || "",
            email: row.Email || row.email || "",
            gender: row.Gender || row.gender || "",
            batch: row.Batch || row.batch || "",
          }));

          // Send to backend
          const res = await api.post("/admin/users/bulk", { students });
          setBulkUploadResults(res.data.results);
          setShowBulkResultsModal(true);

          if (res.data.results.success.length > 0) {
            fetchUsers(); // Refresh the user list
          }

          // Reset file input
          setBulkUploadFile(null);
          document.getElementById("bulkUploadInput").value = null;
        } catch (error) {
          console.error("Error processing Excel file:", error);
          toastError(
            error.response?.data?.message || "Failed to process Excel file",
          );
        } finally {
          setIsBulkUploading(false);
        }
      };
      reader.readAsArrayBuffer(bulkUploadFile);
    } catch (error) {
      console.error("Error reading file:", error);
      toastError("Failed to read file");
      setIsBulkUploading(false);
    }
  };

  // Render users table with selection controls
  const renderUsersTable = (usersToDisplay) => (
    <div className="overflow-x-auto no-scrollbar max-h-96 overflow-y-auto mt-4 rounded-xl border-2 border-gray-900">
      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
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
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
              Email
            </th>
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
              Role
            </th>
            {activeUserTab === "student" && (
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                Batch
              </th>
            )}
            {activeUserTab === "examiner" && (
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                Department
              </th>
            )}
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {usersToDisplay.length === 0 ? (
            <tr>
              <td
                colSpan={
                  activeUserTab === "student" || activeUserTab === "examiner"
                    ? "6"
                    : "5"
                }
                className="px-6 py-4 text-center text-gray-500"
              >
                No users found.
              </td>
            </tr>
          ) : (
            usersToDisplay.map((user) => (
              <tr key={user._id} className="hover:bg-gray-50">
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
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {user.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-900">
                    {user.role}
                  </span>
                </td>
                {activeUserTab === "student" && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.batch || "N/A"}
                  </td>
                )}
                {activeUserTab === "examiner" && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.department || "N/A"}
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <button
                    onClick={() => handleOpenEditModal(user)}
                    className="inline-flex items-center px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-[#1e3a8a] transition duration-200 text-xs font-bold"
                    title="Edit User"
                  >
                    <PencilSquareIcon className="h-4 w-4 mr-1" />
                    Edit
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div
      className="p-6 lg:p-10 bg-white min-h-screen"
      style={{ fontFamily: "Dosis, sans-serif" }}
    >
      <div className="w-full mb-8">
        <button
          onClick={() => navigate("/admin")}
          className="inline-flex items-center text-gray-900 hover:text-[#1e3a8a] transition-colors duration-200 mb-4 font-medium"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back to Dashboard
        </button>
        <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-2 tracking-tight">
          Manage Users
        </h1>
        <p className="text-gray-600 text-sm lg:text-base">
          Add, view, and manage all users in the system
        </p>
      </div>

      {/* Bulk Upload Students Section */}

      <div className="flex gap-6 mb-8">
        <div className="bg-white w-1/2 p-6 rounded-xl border-2 border-gray-900">
          <h3 className="text-xl font-bold mb-4 text-gray-900">
            Bulk Upload Students
          </h3>
          <p className="text-sm text-gray-600 mb-4 font-medium">
            Upload an Excel file (.xlsx, .xls, or .csv) to add multiple students
            at once. The file should have columns:{" "}
            <strong>Name, Email, Gender, Batch</strong>
          </p>

          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex-1">
              <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-gray-900 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                <ArrowUpTrayIcon className="w-5 h-5 mr-2 text-gray-900" />
                <span className="text-sm font-bold text-gray-900">
                  {bulkUploadFile ? bulkUploadFile.name : "Choose Excel File"}
                </span>
                <input
                  id="bulkUploadInput"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleBulkFileChange}
                  className="hidden"
                />
              </label>
            </div>

            <button
              onClick={downloadSampleTemplate}
              className="inline-flex items-center px-4 py-2.5 bg-white border-2 border-gray-900 text-gray-900 rounded-lg hover:bg-gray-50 transition duration-200 font-bold text-sm"
            >
              <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
              Download Template
            </button>

            <button
              onClick={handleBulkUpload}
              disabled={!bulkUploadFile || isBulkUploading}
              className="inline-flex items-center px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-[#1e3a8a] transition duration-200 font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isBulkUploading ? (
                <>
                  <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <ArrowUpTrayIcon className="w-5 h-5 mr-2" />
                  Upload Students
                </>
              )}
            </button>
          </div>
        </div>
        <div className="bg-white p-6 w-1/2 rounded-xl border-2 border-gray-900">
          <h3 className="text-xl font-bold mb-4 text-gray-900">Add New User</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Name"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent text-sm"
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent text-sm"
              required
            />
            <select
              value={newUserGender}
              onChange={(e) => setNewUserGender(e.target.value)}
              className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent text-sm"
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
                setNewUserDepartment("");
              }}
              className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent text-sm"
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
                className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent text-sm"
              />
            )}
            {newUserRole === "examiner" && (
              <>
                <input
                  type="text"
                  placeholder="Department (e.g., Computer Science)"
                  value={newUserDepartment}
                  onChange={(e) => setNewUserDepartment(e.target.value)}
                  className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent text-sm"
                />
                {/* <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                  <p className="text-blue-800">
                    <span className="font-bold"> Note:</span> Examiners will be prompted to enter their banking details (Aadhar, PAN, Account) on first login for payment processing.
                  </p>
                </div> */}
              </>
            )}
            <button
              onClick={handleAddUser}
              className="bg-gray-900 text-white py-2.5 px-6 rounded-lg hover:bg-[#1e3a8a] transition duration-200 font-bold text-sm"
            >
              Add User
            </button>
          </div>
        </div>
      </div>
      {/* Existing Users Section */}
      <div className="bg-white p-6 rounded-xl border-2 border-gray-900">
        <h3 className="text-xl font-bold mb-4 text-gray-900">Existing Users</h3>

        {/* User Role Tabs */}
        <div className="flex border-b-2 border-gray-300 mb-4 overflow-x-auto no-scrollbar">
          <button
            className={`py-3 px-6 text-sm font-bold transition duration-200 ${
              activeUserTab === "all"
                ? "border-b-4 border-gray-900 text-gray-900"
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
            className={`py-3 px-6 text-sm font-bold transition duration-200 ${
              activeUserTab === "student"
                ? "border-b-4 border-gray-900 text-gray-900"
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
            className={`py-3 px-6 text-sm font-bold transition duration-200 ${
              activeUserTab === "examiner"
                ? "border-b-4 border-gray-900 text-gray-900"
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
            className={`py-3 px-6 text-sm font-bold transition duration-200 ${
              activeUserTab === "admin"
                ? "border-b-4 border-gray-900 text-gray-900"
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

        {/* Student Batch Tabs */}
        {activeUserTab === "student" && (
          <div className="flex border-b border-gray-200 mb-4 overflow-x-auto no-scrollbar ml-4">
            {uniqueBatches.map((batch) => (
              <button
                key={batch}
                className={`py-2 px-4 text-xs font-bold transition duration-200 ${
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
                      (batch === "all" || user.batch === batch),
                  ).length
                }
                )
              </button>
            ))}
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-4 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon
              className="h-5 w-5 text-gray-400"
              aria-hidden="true"
            />
          </div>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={userSearchTerm}
            onChange={(e) => setUserSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2.5 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent text-sm"
          />
        </div>

        {/* Users Table */}
        {renderUsersTable(getFilteredUsers(activeUserTab))}

        {/* Bulk Delete Options */}
        <div className="mt-6 pt-4 border-t-2 border-gray-300 space-y-3">
          <h4 className="text-lg font-bold text-gray-900">
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
                      u.role === "student" && u.batch === activeStudentBatchTab,
                  ).length === 0) ||
                (selectAllInTab && getFilteredUsers(activeUserTab).length === 0)
              }
              className="mt-4 bg-gray-900 text-white py-2.5 px-4 rounded-xl w-full hover:bg-[#1e3a8a] transition duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center font-bold text-sm"
            >
              {isDeletingUsers ? (
                <>
                  <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />{" "}
                  Deleting...
                </>
              ) : (
                <>
                  <TrashIcon className="h-5 w-5 mr-2" /> Delete Selected
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
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
              className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-bold transition text-sm border-2 border-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={confirmDeleteUsers}
              className="px-6 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-[#1e3a8a] font-bold transition text-sm"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Bulk Upload Results Modal */}
      <Modal
        isOpen={showBulkResultsModal}
        onClose={() => {
          setShowBulkResultsModal(false);
          setBulkUploadResults(null);
        }}
        title="Bulk Upload Results"
        large
      >
        {bulkUploadResults && (
          <div className="p-4">
            <div className="mb-6 grid grid-cols-3 gap-4 text-center">
              <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                <div className="text-3xl font-bold text-blue-900">
                  {bulkUploadResults.total}
                </div>
                <div className="text-sm font-semibold text-blue-700">
                  Total Rows
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                <div className="text-3xl font-bold text-green-900">
                  {bulkUploadResults.success.length}
                </div>
                <div className="text-sm font-semibold text-green-700">
                  Successful
                </div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg border-2 border-red-200">
                <div className="text-3xl font-bold text-red-900">
                  {bulkUploadResults.failed.length}
                </div>
                <div className="text-sm font-semibold text-red-700">Failed</div>
              </div>
            </div>

            {bulkUploadResults.success.length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-bold text-green-900 mb-3">
                  Successfully Created Students
                </h4>
                <div className="max-h-60 overflow-y-auto border-2 border-green-200 rounded-lg">
                  <table className="min-w-full divide-y divide-green-200">
                    <thead className="bg-green-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-bold text-green-900 uppercase">
                          Name
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-green-900 uppercase">
                          Email
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-green-900 uppercase">
                          Batch
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-green-100">
                      {bulkUploadResults.success.map((user, idx) => (
                        <tr key={idx} className="hover:bg-green-50">
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {user.name}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-700">
                            {user.email}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-700">
                            {user.batch}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {bulkUploadResults.failed.length > 0 && (
              <div>
                <h4 className="text-lg font-bold text-red-900 mb-3">
                  Failed Entries
                </h4>
                <div className="max-h-60 overflow-y-auto border-2 border-red-200 rounded-lg">
                  <table className="min-w-full divide-y divide-red-200">
                    <thead className="bg-red-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-bold text-red-900 uppercase">
                          Name
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-red-900 uppercase">
                          Email
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-red-900 uppercase">
                          Reason
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-red-100">
                      {bulkUploadResults.failed.map((item, idx) => (
                        <tr key={idx} className="hover:bg-red-50">
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {item.data.name || "N/A"}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-700">
                            {item.data.email || "N/A"}
                          </td>
                          <td className="px-4 py-2 text-sm text-red-700 font-semibold">
                            {item.reason}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowBulkResultsModal(false);
                  setBulkUploadResults(null);
                }}
                className="px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-[#1e3a8a] font-bold transition text-sm"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setUserToEdit(null);
        }}
        title="Edit User"
      >
        <div className="p-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">Name *</label>
              <input
                type="text"
                placeholder="Name"
                value={editUserName}
                onChange={(e) => setEditUserName(e.target.value)}
                className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">Email *</label>
              <input
                type="email"
                placeholder="Email"
                value={editUserEmail}
                onChange={(e) => setEditUserEmail(e.target.value)}
                className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">Gender *</label>
              <select
                value={editUserGender}
                onChange={(e) => setEditUserGender(e.target.value)}
                className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent text-sm"
                required
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">Role *</label>
              <select
                value={editUserRole}
                onChange={(e) => {
                  setEditUserRole(e.target.value);
                  // Clear role-specific fields when role changes
                  if (e.target.value !== "student") {
                    setEditUserBatch("");
                  }
                  if (e.target.value !== "examiner") {
                    setEditUserDepartment("");
                  }
                }}
                className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent text-sm"
              >
                <option value="student">Student</option>
                <option value="examiner">Examiner</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {editUserRole === "student" && (
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Batch *</label>
                <input
                  type="text"
                  placeholder="Batch (e.g., 2023)"
                  value={editUserBatch}
                  onChange={(e) => setEditUserBatch(e.target.value)}
                  className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent text-sm"
                />
              </div>
            )}

            {editUserRole === "examiner" && (
              <>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">Department</label>
                  <input
                    type="text"
                    placeholder="Department (e.g., Computer Science)"
                    value={editUserDepartment}
                    onChange={(e) => setEditUserDepartment(e.target.value)}
                    className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent text-sm"
                  />
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                  <p className="text-blue-800">
                    <span className="font-bold">Note:</span> Banking details (Aadhar, PAN, Account) are entered by examiners on first login.
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                setIsEditModalOpen(false);
                setUserToEdit(null);
              }}
              className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-bold transition text-sm border-2 border-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateUser}
              disabled={isUpdatingUser}
              className="px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-[#1e3a8a] font-bold transition text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isUpdatingUser ? (
                <>
                  <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update User"
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
