import React, { useState } from "react"; // Import useState
import { Link } from "react-router-dom";
import {
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  PencilSquareIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline"; // Importing icons
import Modal from "./Modal"; // Import the Modal component
import api from "../services/api";
import { toastError, toastSuccess } from "../utils/hotToast";

export default function Navbar({ user, onLogout }) {
  const [isModalOpen, setIsModalOpen] = useState(false); // State to manage modal visibility
  const [userDetails, setUserDetails] = useState(null); // State to store user details
  const [isEditing, setIsEditing] = useState(false); // State to manage edit mode
  const [editFormData, setEditFormData] = useState({
    aadharCard: '',
    panCard: '',
    accountNumber: '',
    bankName: '',
    ifscCode: ''
  });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Determine the base URL for the API call based on NODE_ENV
  const apiBaseUrl =
    process.env.NODE_ENV === "production"
      ? "" // Or your production backend URL
      : "http://localhost:5000"; // Relative path for development (assuming same origin)

  const googleAuthUrl = `${apiBaseUrl}/api/auth/google`;

  const handleOpenModal = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        console.warn("No authentication token found.");
        return;
      }

      // Fetch appropriate endpoint based on user role
      let endpoint = '/api/auth/me';
      if (user?.role === 'examiner') {
        endpoint = '/api/examiner/profile';
      }

      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.error("Unauthorized: Please log in again.");
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setUserDetails(data);
      
      // Initialize edit form with current data for examiners
      if (user?.role === 'examiner') {
        setEditFormData({
          aadharCard: data.aadharCard || '',
          panCard: data.panCard || '',
          accountNumber: data.accountNumber || '',
          bankName: data.bankName || '',
          ifscCode: data.ifscCode || ''
        });
      }
      
      setIsModalOpen(true);
    } catch (error) {
      console.error("Error fetching user details:", error);
      toastError("Failed to load user details");
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setUserDetails(null);
    setIsEditing(false);
    setErrors({});
  };

  const validateEditForm = () => {
    const newErrors = {};

    // Aadhar Card validation
    if (!editFormData.aadharCard || !editFormData.aadharCard.trim()) {
      newErrors.aadharCard = 'Aadhar Card is required';
    } else if (!/^\d{12}$/.test(editFormData.aadharCard)) {
      newErrors.aadharCard = 'Aadhar Card must be 12 digits';
    }

    // PAN Card validation
    if (!editFormData.panCard || !editFormData.panCard.trim()) {
      newErrors.panCard = 'PAN Card is required';
    } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(editFormData.panCard)) {
      newErrors.panCard = 'Invalid PAN format (e.g., ABCDE1234F)';
    }

    // Account Number validation
    if (!editFormData.accountNumber || !editFormData.accountNumber.trim()) {
      newErrors.accountNumber = 'Account Number is required';
    } else if (!/^\d{9,18}$/.test(editFormData.accountNumber)) {
      newErrors.accountNumber = 'Account Number must be 9-18 digits';
    }

    // Bank Name validation
    if (!editFormData.bankName || !editFormData.bankName.trim()) {
      newErrors.bankName = 'Bank Name is required';
    }

    // IFSC Code validation
    if (!editFormData.ifscCode || !editFormData.ifscCode.trim()) {
      newErrors.ifscCode = 'IFSC Code is required';
    } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(editFormData.ifscCode)) {
      newErrors.ifscCode = 'Invalid IFSC format (e.g., SBIN0001234)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;

    // Apply transformations based on field
    if (name === 'aadharCard' || name === 'accountNumber') {
      processedValue = value.replace(/\D/g, ''); // Only digits
    } else if (name === 'panCard' || name === 'ifscCode') {
      processedValue = value.toUpperCase();
    }

    setEditFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSaveBankingDetails = async () => {
    if (!validateEditForm()) {
      toastError('Please fix all validation errors');
      return;
    }

    setIsSaving(true);
    try {
      const response = await api.put('/examiner/profile/banking', editFormData);
      
      if (response.data.success) {
        toastSuccess('Banking details updated successfully');
        setUserDetails(prev => ({
          ...prev,
          ...editFormData
        }));
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error updating banking details:', error);
      toastError(error.response?.data?.message || 'Failed to update banking details');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <nav className="bg-white border-b border-gray-200 p-4 md:px-8 flex flex-col md:flex-row justify-between items-center" style={{fontFamily: 'Dosis, sans-serif'}}>
      {/* Brand Logo/Link */}
      <Link
        to="/"
        className="text-3xl font-bold text-gray-900 hover:text-[#1e3a8a] transition-colors duration-300 mb-3 md:mb-0"
      >
        PIMS Evalu Pro
      </Link>

      {/* User Info and Actions */}
      <div className="flex items-center space-x-4">
        {user ? (
          <>
            {/* User Role Display - Now a button to open modal */}
            <button
              onClick={handleOpenModal} // Add onClick handler
              className="flex items-center text-base font-medium text-gray-900 bg-gray-100 px-4 py-2 rounded-xl border border-gray-300 cursor-pointer hover:bg-gray-200 transition-colors duration-200"
            >
              <UserCircleIcon className="h-5 w-5 mr-2 text-gray-900" />
              {user.role?.toUpperCase()}
            </button>
            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="inline-flex items-center px-5 py-2 border border-gray-900 text-base font-medium rounded-xl text-white bg-gray-900 hover:bg-gray-800 focus:outline-none transition-colors duration-200"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5 mr-2" />
              Logout
            </button>
          </>
        ) : (
          /* Sign In Button */
          <a
            href={googleAuthUrl}
            className="inline-flex items-center px-6 py-2 border border-transparent text-base font-medium rounded-full shadow-md text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 transform hover:-translate-y-0.5 hover:scale-105 group"
          >
            {/* Updated Google G icon SVG with the new path */}
            <svg
              className="w-5 h-5 mr-2 transition-transform duration-300 group-hover:rotate-[360deg]"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path d="M15.545 6.558a9.4 9.4 0 0 1 .139 1.626c0 2.434-.87 4.492-2.384 5.885h.002C11.978 15.292 10.158 16 8 16A8 8 0 1 1 8 0a7.7 7.7 0 0 1 5.352 2.082l-2.284 2.284A4.35 4.35 0 0 0 8 3.166c-2.087 0-3.86 1.408-4.492 3.304a4.8 4.8 0 0 0 0 3.063h.003c.635 1.893 2.405 3.301 4.492 3.301 1.078 0 2.004-.276 2.722-.764h-.003a3.7 3.7 0 0 0 1.599-2.431H8v-3.08z" />
            </svg>
            Sign in with Google
          </a>
        )}
      </div>

      {/* Modal Component */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="User Details"
      >
        {userDetails ? (
          <div className="text-left">
            {/* Basic Information */}
            <div className="mb-4">
              <p className="text-gray-700 text-lg mb-2">
                <strong>Name:</strong> {userDetails.name}
              </p>
              <p className="text-gray-700 text-lg mb-2">
                <strong>Email:</strong> {userDetails.email}
              </p>
              <p className="text-gray-700 text-lg mb-2">
                <strong>Role:</strong> {userDetails.role}
              </p>
              {userDetails.batch && (
                <p className="text-gray-700 text-lg mb-2">
                  <strong>Batch:</strong> {userDetails.batch}
                </p>
              )}
              {userDetails.department && (
                <p className="text-gray-700 text-lg mb-2">
                  <strong>Department:</strong> {userDetails.department}
                </p>
              )}
            </div>

            {/* Banking Details Section for Examiners */}
            {user?.role === 'examiner' && (
              <div className="mt-6 pt-4 border-t-2 border-gray-300">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Banking Details</h3>
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-blue-900 transition-colors"
                    >
                      <PencilSquareIcon className="h-4 w-4" />
                      <span className="text-sm">Edit</span>
                    </button>
                  )}
                </div>

                {!isEditing ? (
                  /* View Mode */
                  <div className="space-y-2">
                    <p className="text-gray-700">
                      <strong>Aadhar Card:</strong> {userDetails.aadharCard || 'Not provided'}
                    </p>
                    <p className="text-gray-700">
                      <strong>PAN Card:</strong> {userDetails.panCard || 'Not provided'}
                    </p>
                    <p className="text-gray-700">
                      <strong>Account Number:</strong> {userDetails.accountNumber || 'Not provided'}
                    </p>
                    <p className="text-gray-700">
                      <strong>Bank Name:</strong> {userDetails.bankName || 'Not provided'}
                    </p>
                    <p className="text-gray-700">
                      <strong>IFSC Code:</strong> {userDetails.ifscCode || 'Not provided'}
                    </p>
                  </div>
                ) : (
                  /* Edit Mode */
                  <div className="space-y-3">
                    {/* Aadhar Card */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Aadhar Card Number *
                      </label>
                      <input
                        type="text"
                        name="aadharCard"
                        value={editFormData.aadharCard}
                        onChange={handleEditFormChange}
                        maxLength="12"
                        placeholder="12-digit Aadhar number"
                        className={`w-full px-3 py-2 text-sm border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 ${
                          errors.aadharCard ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.aadharCard && (
                        <p className="text-red-500 text-xs mt-1">{errors.aadharCard}</p>
                      )}
                    </div>

                    {/* PAN Card */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        PAN Card Number *
                      </label>
                      <input
                        type="text"
                        name="panCard"
                        value={editFormData.panCard}
                        onChange={handleEditFormChange}
                        maxLength="10"
                        placeholder="ABCDE1234F"
                        className={`w-full px-3 py-2 text-sm border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 ${
                          errors.panCard ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.panCard && (
                        <p className="text-red-500 text-xs mt-1">{errors.panCard}</p>
                      )}
                    </div>

                    {/* Account Number */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Account Number *
                      </label>
                      <input
                        type="text"
                        name="accountNumber"
                        value={editFormData.accountNumber}
                        onChange={handleEditFormChange}
                        maxLength="18"
                        placeholder="Bank account number"
                        className={`w-full px-3 py-2 text-sm border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 ${
                          errors.accountNumber ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.accountNumber && (
                        <p className="text-red-500 text-xs mt-1">{errors.accountNumber}</p>
                      )}
                    </div>

                    {/* Bank Name */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Bank Name *
                      </label>
                      <input
                        type="text"
                        name="bankName"
                        value={editFormData.bankName}
                        onChange={handleEditFormChange}
                        placeholder="Name of your bank"
                        className={`w-full px-3 py-2 text-sm border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 ${
                          errors.bankName ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.bankName && (
                        <p className="text-red-500 text-xs mt-1">{errors.bankName}</p>
                      )}
                    </div>

                    {/* IFSC Code */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        IFSC Code *
                      </label>
                      <input
                        type="text"
                        name="ifscCode"
                        value={editFormData.ifscCode}
                        onChange={handleEditFormChange}
                        maxLength="11"
                        placeholder="SBIN0001234"
                        className={`w-full px-3 py-2 text-sm border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 ${
                          errors.ifscCode ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.ifscCode && (
                        <p className="text-red-500 text-xs mt-1">{errors.ifscCode}</p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-3">
                      <button
                        onClick={handleSaveBankingDetails}
                        disabled={isSaving}
                        className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg font-semibold hover:bg-blue-900 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setErrors({});
                          setEditFormData({
                            aadharCard: userDetails.aadharCard || '',
                            panCard: userDetails.panCard || '',
                            accountNumber: userDetails.accountNumber || '',
                            bankName: userDetails.bankName || '',
                            ifscCode: userDetails.ifscCode || ''
                          });
                        }}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 border-2 border-gray-900 text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <XMarkIcon className="h-4 w-4" />
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-600">Loading user details...</p>
        )}
      </Modal>
    </nav>
  );
}
