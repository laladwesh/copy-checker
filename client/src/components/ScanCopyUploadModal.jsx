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
  copies = [],
}) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [studentEmail, setStudentEmail] = useState("");
  const [selectedQpId, setSelectedQpId] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // NEW: Remember Question Paper feature for bulk uploads
  const [rememberQp, setRememberQp] = useState(false);
  const [lockedQpId, setLockedQpId] = useState("");
  const [lockedBatch, setLockedBatch] = useState(""); // Remember batch too
  const [showQpChangeWarning, setShowQpChangeWarning] = useState(false);

  // STATES FOR BATCH FILTERING
  const [selectedBatch, setSelectedBatch] = useState("");
  const [availableBatches, setAvailableBatches] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [filteredQuestionPapers, setFilteredQuestionPapers] = useState([]); // NEW STATE
  const [studentSearch, setStudentSearch] = useState("");
  const [studentDropdownVisible, setStudentDropdownVisible] = useState(false);

  // Effect to reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedFiles([]);
      setStudentEmail("");
      // Don't reset selectedQpId and batch if rememberQp is enabled
      if (!rememberQp) {
        setSelectedQpId("");
        setLockedQpId("");
        setSelectedBatch("");
        setLockedBatch("");
      } else {
        // If rememberQp is enabled, auto-select locked batch when modal opens
        if (lockedBatch) {
          setSelectedBatch(lockedBatch);
        }
      }
      setUploadMessage("");
      setIsUploading(false);
      setShowQpChangeWarning(false);
    } else {
      // Modal just opened - auto-select batch if locked
      if (rememberQp && lockedBatch) {
        setSelectedBatch(lockedBatch);
      }
    }
  }, [isOpen, rememberQp, lockedBatch]);

  // Effect to populate available batches and filter students and question papers
  useEffect(() => {
    // Filter Students based on selectedBatch
    if (students && students.length > 0) {
      const batches = [...new Set(students.map(s => s.batch).filter(Boolean))]; // Filter out null/undefined batches
      setAvailableBatches(batches.sort()); // Sort batches alphabetically

      if (selectedBatch) {
        const filtered = students.filter(s => s.batch === selectedBatch);
        setFilteredStudents(filtered);

        // Reset search and studentEmail if the current email is no longer valid
        setStudentSearch("");
        if (studentEmail && !filtered.some(s => s.email === studentEmail)) {
          setStudentEmail("");
        }
      } else {
        setFilteredStudents([]); // If no batch selected, show no students
        if (studentEmail) {
          setStudentEmail("");
        }
      }
    } else {
      setAvailableBatches([]);
      setFilteredStudents([]);
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
        
        // AUTO-SELECT LOCKED QP IF REMEMBER IS ENABLED
        if (rememberQp && lockedQpId) {
          // Check if locked QP is in the filtered list
          if (qpsByBatch.some(qp => qp._id === lockedQpId)) {
            setSelectedQpId(lockedQpId);
          } else {
            // Locked QP not available in this batch, clear selection
            setSelectedQpId("");
          }
        } else if (selectedQpId && !qpsByBatch.some(qp => qp._id === selectedQpId)) {
          // Reset selected QP if the current QP is no longer valid
          setSelectedQpId("");
        }
      } else {
        // If no batch selected, show no question papers
        setFilteredQuestionPapers([]);
        if (selectedQpId) {
          setSelectedQpId("");
        }
      }
    } else {
      setFilteredQuestionPapers([]);
    }

    // When selectedQpId changes, if copies list provided, we can pre-filter students who already have copies
  }, [students, selectedBatch, questionPapers, rememberQp, lockedQpId]); // Added rememberQp and lockedQpId

  // derive set of student emails which already have an uploaded copy for the selected question paper
  const studentsWithCopyForSelectedQp = (selectedQpId && copies && copies.length)
    ? new Set(copies
        .filter(c => c.questionPaper && (c.questionPaper._id === selectedQpId || c.questionPaper === selectedQpId))
        .map(c => c.student?.email || (c.student && c.student.email)))
    : new Set();
  

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

    // Client-side guard: prevent uploading if this student already has a copy for the selected QP
    if (studentsWithCopyForSelectedQp.has(studentEmail)) {
      setUploadMessage("This student already has a scanned copy for the selected exam.");
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
      
      // If rememberQp is enabled, lock the current QP and batch for next uploads
      if (rememberQp && selectedQpId && selectedBatch) {
        setLockedQpId(selectedQpId);
        setLockedBatch(selectedBatch);
      }
      
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
            {rememberQp && lockedBatch && selectedBatch === lockedBatch && (
              <span className="ml-2 text-xs text-green-700 font-bold bg-green-100 px-2 py-1 rounded">
                Auto-Selected
              </span>
            )}
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
            {/* Searchable student input shown after batch selection */}
            <div className="relative">
              <input
                id="studentEmail"
                value={studentSearch || studentEmail}
                onChange={(e) => {
                  setStudentSearch(e.target.value);
                  setStudentDropdownVisible(true);
                }}
                onFocus={() => setStudentDropdownVisible(true)}
                placeholder={!selectedBatch ? "Select batch first" : "Search student by name or email..."}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-base"
                required
                disabled={!selectedBatch || filteredStudents.length === 0}
              />
              {/* Dropdown of matching students */}
              {studentDropdownVisible && selectedBatch && filteredStudents.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-56 overflow-auto">
                  {filteredStudents
                    .filter(s => {
                      const q = (studentSearch || "").toLowerCase();
                      if (!q) return true;
                      return (
                        (s.name || "").toLowerCase().includes(q) ||
                        (s.email || "").toLowerCase().includes(q)
                      );
                    })
                    .slice(0, 50)
                    .map((s) => {
                      const hasCopy = studentsWithCopyForSelectedQp.has(s.email);
                      return (
                        <button
                          key={s._id}
                          type="button"
                          onClick={() => {
                            if (hasCopy) {
                              setUploadMessage("This student already has a copy uploaded for the selected exam.");
                              setStudentDropdownVisible(false);
                              return;
                            }
                            setStudentEmail(s.email);
                            setStudentSearch(s.email);
                            setStudentDropdownVisible(false);
                            setUploadMessage("");
                          }}
                          className={`w-full text-left px-3 py-2 text-sm ${hasCopy ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                        >
                          {s.name} ({s.email}) {hasCopy && <span className="text-xs text-red-500 ml-2">(already uploaded)</span>}
                        </button>
                      );
                    })}
                  {filteredStudents.filter(s => {
                      const q = (studentSearch || "").toLowerCase();
                      if (!q) return true;
                      return (
                        (s.name || "").toLowerCase().includes(q) ||
                        (s.email || "").toLowerCase().includes(q)
                      );
                    }).length === 0 && (
                    <div className="p-3 text-sm text-gray-500">No students found.</div>
                  )}
                </div>
              )}
            </div>
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
            onChange={(e) => {
              const newQpId = e.target.value;
              
              // If rememberQp is enabled and locked QP exists, show warning
              if (rememberQp && lockedQpId && newQpId !== lockedQpId) {
                setShowQpChangeWarning(true);
                // Don't change yet, wait for confirmation
              } else {
                setSelectedQpId(newQpId);
                setShowQpChangeWarning(false);
              }
            }}
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

          {/* Remember Question Paper Checkbox */}
          {selectedQpId && (
            <div className="mt-3 flex items-start space-x-2 bg-green-50 border-2 border-green-600 rounded-lg p-3">
              <input
                id="rememberQp"
                type="checkbox"
                checked={rememberQp}
                onChange={(e) => {
                  setRememberQp(e.target.checked);
                  if (e.target.checked) {
                    setLockedQpId(selectedQpId);
                    setLockedBatch(selectedBatch); // Lock batch too
                  } else {
                    setLockedQpId("");
                    setLockedBatch(""); // Unlock batch
                  }
                }}
                className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded mt-0.5"
              />
              <label htmlFor="rememberQp" className="text-sm text-gray-900 cursor-pointer">
                <span className="font-bold text-green-800">Remember this setup for bulk uploads</span>
                <br />
                <span className="text-xs text-gray-700 font-semibold">
                  ✓ Batch & Question paper will auto-select when modal reopens<br/>
                  ✓ You only need to select the student - super fast!<br/>
                </span>
              </label>
            </div>
          )}

          {/* Show locked status */}
          {rememberQp && lockedQpId && selectedQpId === lockedQpId && (
            <div className="mt-2 text-xs text-green-700 font-bold bg-green-100 border border-green-300 rounded px-3 py-2">
              Batch "{lockedBatch}" and Question Paper are locked for bulk uploads. They will auto-select on next upload.
            </div>
          )}

          {/* Warning when trying to change locked QP */}
          {showQpChangeWarning && (
            <div className="mt-3 bg-yellow-50 border border-yellow-300 rounded-lg p-3">
              <p className="text-sm text-yellow-800 font-semibold mb-2">
                ⚠️ Change Question Paper?
              </p>
              <p className="text-xs text-yellow-700 mb-3">
                You have "Remember question paper" enabled. Changing the question paper will update it for all subsequent uploads.
              </p>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    // Get the new value from the select element
                    const selectElement = document.getElementById("questionPaper");
                    const newQpId = selectElement.value;
                    setSelectedQpId(newQpId);
                    setLockedQpId(newQpId);
                    setShowQpChangeWarning(false);
                  }}
                  className="px-3 py-1 bg-yellow-600 text-white rounded text-xs font-semibold hover:bg-yellow-700"
                >
                  Yes, Change It
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Revert to locked QP
                    setSelectedQpId(lockedQpId);
                    setShowQpChangeWarning(false);
                  }}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs font-semibold hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
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
