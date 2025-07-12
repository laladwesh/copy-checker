// src/components/ScanCopyUploadModal.jsx
import React, { useState, useEffect } from "react";
import Modal from "./Modal"; // Assuming your Modal component path
import api from "../services/api";
import {
  CloudArrowUpIcon,
  // DocumentIcon, // Removed unused icon
  // PhotoIcon, // Removed unused icon
} from "@heroicons/react/24/outline";

export default function ScanCopyUploadModal({
  isOpen,
  onClose,
  onUploadSuccess,
  questionPapers,
  students, // This prop should now contain ALL students
}) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [studentEmail, setStudentEmail] = useState("");
  const [selectedQpId, setSelectedQpId] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // STATES FOR BATCH FILTERING
  const [selectedBatch, setSelectedBatch] = useState("");
  const [availableBatches, setAvailableBatches] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [filteredQuestionPapers, setFilteredQuestionPapers] = useState([]); // NEW STATE

  // Effect to reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedFiles([]);
      setStudentEmail("");
      setSelectedQpId("");
      setUploadMessage("");
      setIsUploading(false);
      setSelectedBatch(""); // Reset batch selection on close
    }
  }, [isOpen]);

  // Effect to populate available batches and filter students and question papers
  useEffect(() => {
    // Filter Students based on selectedBatch
    if (students && students.length > 0) {
      const batches = [...new Set(students.map(s => s.batch).filter(Boolean))]; // Filter out null/undefined batches
      setAvailableBatches(batches.sort()); // Sort batches alphabetically

      if (selectedBatch) {
        setFilteredStudents(students.filter(s => s.batch === selectedBatch));
      } else {
        setFilteredStudents([]); // If no batch selected, show no students
      }
    } else {
      setAvailableBatches([]);
      setFilteredStudents([]);
    }
    // Reset studentEmail if the filtered list changes and the current email is no longer valid
    if (studentEmail && !filteredStudents.some(s => s.email === studentEmail)) {
      setStudentEmail("");
    }

    // NEW LOGIC FOR QUESTION PAPER FILTERING BASED ON SELECTED BATCH (COURSE)
    if (questionPapers && questionPapers.length > 0) {
      if (selectedBatch) {
        // Filter QPs by their 'course' matching the 'selectedBatch'
        // And also keep the existing filter for unassigned examiners
        const qpsByBatch = questionPapers.filter(qp =>
          qp.course === selectedBatch && (!qp.assignedExaminers || qp.assignedExaminers.length === 0)
        );
        setFilteredQuestionPapers(qpsByBatch);
      } else {
        // If no batch selected, show no question papers
        setFilteredQuestionPapers([]);
      }
    } else {
      setFilteredQuestionPapers([]);
    }

    // Reset selected QP if the filtered list changes and the current QP is no longer valid
    if (selectedQpId && !filteredQuestionPapers.some(qp => qp._id === selectedQpId)) {
      setSelectedQpId("");
    }

  }, [students, selectedBatch, studentEmail, filteredStudents, questionPapers, selectedQpId]); // Added questionPapers and selectedQpId to dependencies

  const handleFileChange = (e) => {
    setUploadMessage("");
    const files = Array.from(e.target.files);

    // Basic validation: If a PDF is selected, ensure it's the only file.
    // If multiple files are selected, ensure none are PDFs.
    const hasPdf = files.some((file) => file.type === "application/pdf");
    if (hasPdf && files.length > 1) {
      setUploadMessage(
        "Cannot upload multiple files if one of them is a PDF. Please select either one PDF or multiple images."
      );
      setSelectedFiles([]);
      return;
    }
    if (!hasPdf && files.some((file) => !file.type.startsWith("image/"))) {
      setUploadMessage(
        "Only PDF files or image files (JPEG, PNG, etc.) are allowed."
      );
      setSelectedFiles([]);
      return;
    }

    setSelectedFiles(files);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setUploadMessage("");

    if (!studentEmail || !selectedQpId || selectedFiles.length === 0) {
      setUploadMessage("Please fill all fields and select files.");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("studentEmail", studentEmail);
    formData.append("questionPaperId", selectedQpId);

    // Determine if it's a PDF or images based on the first file's type
    const isPdfUpload = selectedFiles[0].type === "application/pdf";

    if (isPdfUpload) {
      // For a single PDF file
      formData.append("scannedPdf", selectedFiles[0]);
    } else {
      // For multiple image files
      selectedFiles.forEach((file) => {
        formData.append("scannedImages", file);
      });
    }

    try {
      const res = await api.post("/admin/upload/scanned-copy", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setUploadMessage(res.data.message || "Upload successful!");
      onUploadSuccess(); // Notify parent component
      onClose(); // Close modal on success
    } catch (err) {
      console.error("Upload error:", err.response?.data || err);
      setUploadMessage(
        `Upload failed: ${err.response?.data?.message || err.message}`
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Scan & Upload Answer Copy">
      <form onSubmit={handleUpload} className="space-y-6 p-2">
        {/* Batch Selection (Mandatory) */}
        <div>
          <label
            htmlFor="studentBatch"
            className="block text-gray-700 text-base font-medium mb-2"
          >
            Student Batch:
          </label>
          <select
            id="studentBatch"
            value={selectedBatch}
            onChange={(e) => {
              setSelectedBatch(e.target.value);
              setStudentEmail(""); // Reset student email when batch changes
              setSelectedQpId(""); // Reset QP when batch changes
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-base"
            required // Made batch selection mandatory
          >
            <option value="">-- Select Batch --</option>
            {availableBatches.map((batch) => (
              <option key={batch} value={batch}>
                {batch}
              </option>
            ))}
          </select>
        </div>

        {/* Student Email (Disabled until batch is selected) */}
        <div>
          <label
            htmlFor="studentEmail"
            className="block text-gray-700 text-base font-medium mb-2"
          >
            Student Email:
          </label>
          <select
            id="studentEmail"
            value={studentEmail}
            onChange={(e) => setStudentEmail(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-base"
            required
            disabled={!selectedBatch || filteredStudents.length === 0} // Disable if no batch is selected or no students in batch
          >
            <option value="">-- Select Student --</option>
            {!selectedBatch ? (
              <option value="" disabled>Please select a batch first</option>
            ) : filteredStudents.length === 0 ? (
              <option value="" disabled>No students found for this batch</option>
            ) : (
              filteredStudents.map((student) => (
                <option key={student._id} value={student.email}>
                  {student.name} ({student.email})
                </option>
              ))
            )}
          </select>
        </div>

        {/* Question Paper (Disabled until batch is selected) */}
        <div>
          <label
            htmlFor="questionPaper"
            className="block text-gray-700 text-base font-medium mb-2"
          >
            Question Paper:
          </label>
          <select
            id="questionPaper"
            value={selectedQpId}
            onChange={(e) => setSelectedQpId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-base"
            required
            disabled={!selectedBatch || filteredQuestionPapers.length === 0} // Disable if no batch selected or no QPs in batch
          >
            <option value="">-- Select Question Paper --</option>
            {!selectedBatch ? (
              <option value="" disabled>Please select a batch first</option>
            ) : filteredQuestionPapers.length === 0 ? (
              <option value="" disabled>No question papers found for this batch</option>
            ) : (
              filteredQuestionPapers.map((qp) => (
                <option key={qp._id} value={qp._id}>
                  {qp.title} ({qp.totalPages} pages)
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label
            htmlFor="scannedFiles"
            className="block text-gray-700 text-base font-medium mb-2"
          >
            Select Scanned Files (Images or PDF):
          </label>
          <input
            id="scannedFiles"
            type="file"
            multiple // Allow multiple files for images, or single PDF
            accept="image/*,application/pdf" // Accept all image types and PDF
            onChange={handleFileChange}
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            required
          />
          {selectedFiles.length > 0 && (
            <div className="mt-2 text-sm text-gray-600">
              Selected: {selectedFiles.map((file) => file.name).join(", ")}
            </div>
          )}
        </div>

        {uploadMessage && (
          <div
            className={`p-3 rounded-lg text-sm ${
              uploadMessage.includes("successful")
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {uploadMessage}
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold transition duration-150"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isUploading || !selectedBatch || !studentEmail || !selectedQpId || selectedFiles.length === 0} // Disable submit until all required fields are filled
            className="inline-flex items-center px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 font-semibold transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <svg
                className="animate-spin h-5 w-5 mr-3 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
              <CloudArrowUpIcon className="h-5 w-5 mr-2" />
            )}
            {isUploading ? "Uploading..." : "Upload Copy"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
