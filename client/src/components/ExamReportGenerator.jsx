import React, { useState } from 'react';
import { XMarkIcon, DocumentArrowDownIcon, CheckCircleIcon, XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { toastSuccess, toastError } from '../utils/hotToast';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ExamReportGenerator({ 
  isOpen, 
  onClose, 
  exam, 
  copies, 
  users 
}) {
  const [includeExaminerDetails, setIncludeExaminerDetails] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen || !exam) return null;

  // 1. Data Processing
  const examCopies = copies
    .filter(copy => {
      const qpId = typeof copy.questionPaper === 'object' ? copy.questionPaper?._id : copy.questionPaper;
      return qpId === exam._id;
    })
    .map(copy => {
      const studentId = typeof copy.student === 'object' ? copy.student?._id : copy.student;
      const student = users.find(u => u._id === studentId);
      
      const examinerNames = copy.examiners
        ?.map(examId => {
          const examinerId = typeof examId === 'object' ? examId?._id : examId;
          return users.find(u => u._id === examinerId)?.name || 'Unknown';
        })
        .join(', ') || 'Not Assigned';
      
      const totalMarks = copy.pages?.reduce((sum, page) => sum + (page.marksAwarded || 0), 0) || 0;
      const isEvaluated = copy.status === 'evaluated';
      
      return {
        studentName: student?.name || 'Unknown',
        studentEmail: student?.email || 'N/A',
        studentBatch: student?.batch || 'N/A',
        marksAwarded: totalMarks,
        maxMarks: exam.totalMarks || 'N/A',
        status: isEvaluated ? 'Evaluated' : 'Pending',
        examiners: examinerNames,
      };
    })
    .sort((a, b) => a.studentName.localeCompare(b.studentName));

  // 2. PDF Generator
  const generatePDFReport = () => {
    setIsGenerating(true);
    
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Configuration
      const margin = 14;
      let yPos = 20;
      const lineSpacing = 6;
      const primaryColor = [44, 62, 80]; // Dark Slate Blue (Formal)
      const accentColor = [220, 38, 38]; // Red (Confidential)

      // --- Header Section ---
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(...primaryColor);
      doc.text('PRASAD INSTITUTE OF MEDICAL SCIENCES', pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 7;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text('Official Examination Report', pageWidth / 2, yPos, { align: 'center' });
      
      // Confidential Watermark (Top Right)
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...accentColor);
      doc.text('CONFIDENTIAL / INTERNAL USE ONLY', pageWidth - margin, 15, { align: 'right' });

      yPos += 8;
      // Divider Line
      doc.setDrawColor(200);
      doc.setLineWidth(0.5);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;

      // --- Exam Details (Grid Layout for Compactness) ---
      // We print details in 2 columns to save vertical space
      const col1X = margin;
      const col2X = pageWidth / 2 + 10;
      
      doc.setFontSize(10);
      doc.setTextColor(0);

      const details = [
        [
          { label: 'Exam Title', value: exam.title || 'N/A' },
          { label: 'Exam Type', value: exam.examType || 'N/A' }
        ],
        [
          { label: 'Course', value: exam.course || 'N/A' },
          { label: 'Total Marks', value: String(exam.totalMarks || 'N/A') }
        ],
        [
          { label: 'Date', value: exam.date ? new Date(exam.date).toLocaleDateString('en-IN') : 'N/A' },
          { label: 'Total Students', value: String(examCopies.length) }
        ]
      ];

      details.forEach(row => {
        // Column 1
        doc.setFont('helvetica', 'bold');
        doc.text(`${row[0].label}:`, col1X, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(row[0].value, col1X + 25, yPos);

        // Column 2
        doc.setFont('helvetica', 'bold');
        doc.text(`${row[1].label}:`, col2X, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(row[1].value, col2X + 30, yPos);

        yPos += lineSpacing;
      });

      // Optional: Question Paper Link (Inline to save space)
      if (exam.driveFile?.link) {
        doc.setFont('helvetica', 'bold');
        doc.text('Question Paper:', col1X, yPos);
        doc.setTextColor(0, 0, 255);
        doc.setFont('helvetica', 'normal');
        doc.textWithLink('(Click to Open Question Paper)', col1X + 30, yPos, { url: exam.driveFile.link });
        doc.setTextColor(0);
        yPos += lineSpacing + 2;
      } else {
        yPos += 2;
      }

      // --- Student Table ---
      const tableColumns = [
        { header: '#', dataKey: 'sno' },
        { header: 'Student Name', dataKey: 'name' },
        { header: 'Email ID', dataKey: 'email' },
        { header: 'Batch', dataKey: 'batch' },
        { header: 'Score', dataKey: 'marks' },
        { header: 'Status', dataKey: 'status' }
      ];

      if (includeExaminerDetails) {
        tableColumns.push({ header: 'Examiner', dataKey: 'examiners' });
      }

      const tableData = examCopies.map((copy, index) => ({
        sno: index + 1,
        name: copy.studentName,
        email: copy.studentEmail,
        batch: copy.studentBatch,
        marks: `${copy.marksAwarded} / ${copy.maxMarks}`,
        status: copy.status,
        examiners: copy.examiners
      }));

      autoTable(doc, {
        startY: yPos,
        columns: tableColumns,
        body: tableData,
        theme: 'grid', // 'grid' looks more formal for printing than 'striped'
        headStyles: {
          fillColor: primaryColor,
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 8,
          textColor: 50,
          valign: 'middle',
          cellPadding: 3
        },
        columnStyles: {
          sno: { cellWidth: 10, halign: 'center' },
          name: { cellWidth: 'auto', fontStyle: 'bold' },
          email: { cellWidth: 'auto' },
          batch: { cellWidth: 20, halign: 'center' },
          marks: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
          status: { cellWidth: 22, halign: 'center' }
        },
        didParseCell: function(data) {
          if (data.column.dataKey === 'status') {
            if (data.cell.raw === 'Evaluated') {
              data.cell.styles.textColor = [22, 163, 74]; // Green
            } else {
              data.cell.styles.textColor = [220, 38, 38]; // Red
            }
          }
        },
        margin: { left: margin, right: margin }
      });

      // --- Summary Section (Compact Box) ---
      let finalY = doc.lastAutoTable.finalY + 10;
      
      // Calculate stats
      const evaluatedCount = examCopies.filter(c => c.status === 'Evaluated').length;
      const averageMarks = evaluatedCount > 0 
        ? (examCopies.filter(c => c.status === 'Evaluated').reduce((sum, c) => sum + c.marksAwarded, 0) / evaluatedCount).toFixed(2)
        : '-';
      const highestMarks = evaluatedCount > 0 
        ? Math.max(...examCopies.filter(c => c.status === 'Evaluated').map(c => c.marksAwarded))
        : '-';

      // Ensure summary box doesn't break page awkwardly
      if (finalY > pageHeight - 40) {
        doc.addPage();
        finalY = 20;
      }

      // Draw Summary Box (Light Grey Background)
      doc.setDrawColor(200);
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, finalY, pageWidth - (margin * 2), 22, 'FD');

      // Summary Header
      doc.setFontSize(9);
      doc.setTextColor(...primaryColor);
      doc.setFont('helvetica', 'bold');
      doc.text('Performance Abstract', margin + 4, finalY + 6);

      // Summary Data - Displayed Horizontally to save height
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0);
      const startStatsY = finalY + 14;
      const statSpacing = (pageWidth - (margin * 2)) / 4;

      // Helper for stats
      const drawStat = (label, value, index) => {
        const x = margin + 4 + (index * statSpacing);
        doc.setFont('helvetica', 'normal');
        doc.text(label, x, startStatsY);
        doc.setFont('helvetica', 'bold');
        doc.text(String(value), x + doc.getTextWidth(label) + 2, startStatsY);
      };

      drawStat('Total Students:', examCopies.length, 0);
      drawStat('Evaluated:', evaluatedCount, 1);
      drawStat('Avg Marks:', averageMarks, 2);
      drawStat('Highest:', highestMarks, 3);

      // --- Footer (Page Numbers) ---
      const pageCount = doc.internal.getNumberOfPages();
      for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(150);
        
        // Left: Timestamp
        doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, margin, pageHeight - 10);
        
        // Right: Page Number
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
      }

      // Save
      const fileName = `Report_${exam.title.substring(0, 15).replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toastSuccess('Report downloaded successfully!');
      setIsGenerating(false);
      onClose();

    } catch (error) {
      console.error('PDF Error:', error);
      toastError('Failed to generate PDF.');
      setIsGenerating(false);
    }
  };

  // ... (Keep existing Render/UI code) ...
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{fontFamily: 'Dosis, sans-serif'}}>
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75" onClick={onClose} />

        <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full border-2 border-gray-900">
          {/* Header */}
          <div className="bg-gray-900 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center">
                <DocumentArrowDownIcon className="h-6 w-6 mr-2" />
                Download Exam Report
              </h3>
              <button onClick={onClose} className="text-white hover:text-gray-300 transition">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white px-6 py-5 space-y-4">
            
            {/* Stats Overview */}
            <div className="grid grid-cols-3 gap-4">
               <div className="bg-gray-50 border-2 border-gray-900 rounded-xl p-3 text-center">
                 <div className="text-2xl font-bold text-gray-900">{examCopies.length}</div>
                 <div className="text-xs text-gray-700 font-bold">Total Students</div>
               </div>
               <div className="bg-gray-50 border-2 border-gray-900 rounded-xl p-3 text-center">
                 <div className="text-2xl font-bold text-gray-900">{examCopies.filter(c => c.status === 'Evaluated').length}</div>
                 <div className="text-xs text-gray-700 font-bold">Evaluated</div>
               </div>
               <div className="bg-gray-50 border-2 border-gray-900 rounded-xl p-3 text-center">
                 <div className="text-2xl font-bold text-gray-900">{exam.totalMarks || '-'}</div>
                 <div className="text-xs text-gray-700 font-bold">Max Marks</div>
               </div>
            </div>

            {/* Config Option */}
            <div className="flex items-center p-3 border-2 border-gray-900 rounded-xl hover:bg-gray-50 transition">
              <input
                id="examiner-check"
                type="checkbox"
                checked={includeExaminerDetails}
                onChange={(e) => setIncludeExaminerDetails(e.target.checked)}
                className="h-4 w-4 text-gray-900 focus:ring-gray-900 border-gray-300 rounded cursor-pointer"
              />
              <label htmlFor="examiner-check" className="ml-3 text-sm text-gray-900 cursor-pointer font-bold">
                Include Examiner Details in PDF
              </label>
            </div>

            <div className="text-xs text-gray-600 italic bg-gray-50 border border-gray-300 p-3 rounded-xl font-bold">
               * The PDF report will include institute header, exam details, student marks table, and a summary dashboard.
            </div>
          </div>

          {/* Footer Actions */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t-2 border-gray-900">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border-2 border-gray-900 rounded-xl text-gray-900 hover:bg-gray-100 font-bold text-sm transition"
              disabled={isGenerating}
            >
              Cancel
            </button>
            <button
              onClick={generatePDFReport}
              disabled={isGenerating || examCopies.length === 0}
              className="px-6 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 font-bold text-sm flex items-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isGenerating ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                  Generate PDF
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}