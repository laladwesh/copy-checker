import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import Modal from "../components/Modal";
import {
  MagnifyingGlassIcon,
  TrashIcon,
  ArrowPathIcon,
  ArrowLeftIcon,
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
      await api.post("/admin/users", {
        name: newUserName,
        email: newUserEmail,
        role: newUserRole,
        gender: newUserGender,
        batch: newUserRole === "student" ? newUserBatch : undefined,
        department: newUserRole === "examiner" ? newUserDepartment : undefined,
      });
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

  // Filter users based on role, batch, and search criteria
  const getFilteredUsers = useCallback(
    (role) => {
      let filtered = users;

      if (role !== "all") {
        filtered = filtered.filter((user) => user.role === role);
      }

      if (role === "student" && activeStudentBatchTab !== "all") {
        filtered = filtered.filter(
          (user) => user.batch === activeStudentBatchTab
        );
      }

      if (userSearchTerm) {
        filtered = filtered.filter(
          (user) =>
            user.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(userSearchTerm.toLowerCase())
        );
      }

      return filtered;
    },
    [users, activeStudentBatchTab, userSearchTerm]
  );

  // Toggle individual user selection
  const handleUserCheckboxChange = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
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
        idsToDelete = users.filter((u) => u.role === "student").map((u) => u._id);
      } else if (deleteCurrentBatch) {
        idsToDelete = users
          .filter((u) => u.role === "student" && u.batch === activeStudentBatchTab)
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
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {usersToDisplay.length === 0 ? (
            <tr>
              <td
                colSpan={activeUserTab === "student" || activeUserTab === "examiner" ? "5" : "4"}
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
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="p-6 lg:p-10 bg-white min-h-screen" style={{ fontFamily: "Dosis, sans-serif" }}>
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

      {/* Add New User Section */}
      <div className="bg-white p-6 rounded-xl border-2 border-gray-900 mb-8">
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
            <input
              type="text"
              placeholder="Department (e.g., Computer Science)"
              value={newUserDepartment}
              onChange={(e) => setNewUserDepartment(e.target.value)}
              className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent text-sm"
            />
          )}
          <button
            onClick={handleAddUser}
            className="bg-gray-900 text-white py-2.5 px-6 rounded-lg hover:bg-[#1e3a8a] transition duration-200 font-bold text-sm"
          >
            Add User
          </button>
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
                      (batch === "all" || user.batch === batch)
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
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
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
                      Delete ALL Students in Current Batch ({activeStudentBatchTab})
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
              className="mt-4 bg-gray-900 text-white py-2.5 px-4 rounded-xl w-full hover:bg-[#1e3a8a] transition duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center font-bold text-sm"
            >
              {isDeletingUsers ? (
                <>
                  <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" /> Deleting...
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
    </div>
  );
}
