import React, { useState } from 'react';
import api from '../services/api';
import { toastError, toastSuccess } from '../utils/hotToast';

const ExaminerBankingDetailsForm = ({ onComplete }) => {
  const [formData, setFormData] = useState({
    aadharCard: '',
    panCard: '',
    accountNumber: '',
    bankName: '',
    ifscCode: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    // Validate Aadhar (12 digits)
    if (!formData.aadharCard) {
      newErrors.aadharCard = 'Aadhar Card is required';
    } else if (!/^\d{12}$/.test(formData.aadharCard)) {
      newErrors.aadharCard = 'Aadhar Card must be exactly 12 digits';
    }

    // Validate PAN (5 letters, 4 digits, 1 letter)
    if (!formData.panCard) {
      newErrors.panCard = 'PAN Card is required';
    } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(formData.panCard)) {
      newErrors.panCard = 'Invalid PAN format (e.g., ABCDE1234F)';
    }

    // Validate Account Number
    if (!formData.accountNumber) {
      newErrors.accountNumber = 'Account Number is required';
    } else if (formData.accountNumber.length < 9 || formData.accountNumber.length > 18) {
      newErrors.accountNumber = 'Account Number should be 9-18 digits';
    }

    // Validate Bank Name
    if (!formData.bankName) {
      newErrors.bankName = 'Bank Name is required';
    } else if (formData.bankName.trim().length < 3) {
      newErrors.bankName = 'Bank Name should be at least 3 characters';
    }

    // Validate IFSC (11 characters)
    if (!formData.ifscCode) {
      newErrors.ifscCode = 'IFSC Code is required';
    } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(formData.ifscCode)) {
      newErrors.ifscCode = 'Invalid IFSC format (e.g., SBIN0001234)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toastError('Please fix the errors in the form');
      return;
    }

    setLoading(true);
    try {
      await api.put('/examiner/profile/banking', formData);
      toastSuccess('Banking details saved successfully!');
      onComplete(); // Callback to refresh profile or redirect
    } catch (error) {
      toastError(error.response?.data?.message || 'Failed to save banking details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 bg-white min-h-screen" style={{fontFamily: 'Dosis, sans-serif'}}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gray-900 rounded-xl mb-2">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1 tracking-tight" style={{fontFamily: 'Dosis, sans-serif'}}>Complete Your Profile</h1>
          <p className="text-gray-600 text-sm">Provide banking details for payment processing</p>
        </div>

        <div className="bg-white rounded-xl border-2 border-gray-900 p-4 lg:p-6">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Aadhar Card */}
              <div>
                <label className="block text-xs font-bold text-gray-900 mb-1">
                  Aadhar Card Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="aadharCard"
                  value={formData.aadharCard}
                  onChange={handleChange}
                  maxLength="12"
                  placeholder="12-digit Aadhar"
                  className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all text-sm ${
                    errors.aadharCard 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-[#1e3a8a]'
                  }`}
                />
                {errors.aadharCard && (
                  <p className="text-red-500 text-xs mt-0.5">{errors.aadharCard}</p>
                )}
              </div>

              {/* PAN Card */}
              <div>
                <label className="block text-xs font-bold text-gray-900 mb-1">
                  PAN Card Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="panCard"
                  value={formData.panCard}
                  onChange={handleChange}
                  maxLength="10"
                  placeholder="ABCDE1234F"
                  className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all uppercase text-sm ${
                    errors.panCard 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-[#1e3a8a]'
                  }`}
                />
                {errors.panCard && (
                  <p className="text-red-500 text-xs mt-0.5">{errors.panCard}</p>
                )}
              </div>

              {/* Bank Name */}
              <div>
                <label className="block text-xs font-bold text-gray-900 mb-1">
                  Bank Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleChange}
                  placeholder="e.g., State Bank of India"
                  className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all text-sm ${
                    errors.bankName 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-[#1e3a8a]'
                  }`}
                />
                {errors.bankName && (
                  <p className="text-red-500 text-xs mt-0.5">{errors.bankName}</p>
                )}
              </div>

              {/* Account Number */}
              <div>
                <label className="block text-xs font-bold text-gray-900 mb-1">
                  Account Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleChange}
                  placeholder="Bank account number"
                  className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all text-sm ${
                    errors.accountNumber 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-[#1e3a8a]'
                  }`}
                />
                {errors.accountNumber && (
                  <p className="text-red-500 text-xs mt-0.5">{errors.accountNumber}</p>
                )}
              </div>

              {/* IFSC Code */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-900 mb-1">
                  IFSC Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="ifscCode"
                  value={formData.ifscCode}
                  onChange={handleChange}
                  maxLength="11"
                  placeholder="e.g., SBIN0001234"
                  className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all uppercase text-sm ${
                    errors.ifscCode 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-[#1e3a8a]'
                  }`}
                />
                {errors.ifscCode && (
                  <p className="text-red-500 text-xs mt-0.5">{errors.ifscCode}</p>
                )}
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-3">
              <div className="flex items-start">
                <svg className="w-4 h-4 text-gray-700 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <p className="text-xs text-gray-700">
                  Your banking details are securely stored and will be used only for payment processing. Please ensure all information is accurate.
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2.5 rounded-lg font-bold text-white transition-all duration-200 text-sm ${
                loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gray-900 hover:bg-[#1e3a8a]'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : (
                'Save Banking Details'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ExaminerBankingDetailsForm;
