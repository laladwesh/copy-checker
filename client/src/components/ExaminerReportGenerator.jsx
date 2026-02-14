import React, { useState } from 'react';
import { XMarkIcon, DocumentArrowDownIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { toastSuccess, toastError } from '../utils/hotToast';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function ExaminerReportGenerator({ 
  isOpen, 
  onClose, 
  examiners = [],
  examinerStats = []
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportFormat, setReportFormat] = useState('pdf'); // 'pdf' or 'excel'

  if (!isOpen) return null;

  // Data Processing - combine examiners with their stats
  const examinerData = examinerStats.map(stat => {
    const examiner = examiners.find(e => e._id === stat._id);
    const progress = stat.totalCopiesAssigned > 0 
      ? Math.round((stat.totalCopiesEvaluated / stat.totalCopiesAssigned) * 100) 
      : 0;
    
    const status = progress === 100 ? 'Completed' 
      : progress === 0 && stat.totalCopiesAssigned > 0 ? 'Not Started'
      : stat.totalCopiesAssigned === 0 ? 'Idle'
      : 'In Progress';

    return {
      name: stat.name || 'N/A',
      email: stat.email || 'N/A',
      department: stat.department || 'N/A',
      gender: examiner?.gender || 'N/A',
      aadharCard: examiner?.aadharCard || 'N/A',
      panCard: examiner?.panCard || 'N/A',
      accountNumber: examiner?.accountNumber || 'N/A',
      bankName: examiner?.bankName || 'N/A',
      ifscCode: examiner?.ifscCode || 'N/A',
      totalAssigned: stat.totalCopiesAssigned,
      totalEvaluated: stat.totalCopiesEvaluated,
      progress: progress,
      status: status,
      examDetails: stat.examDetails || {}
    };
  }).sort((a, b) => a.name.localeCompare(b.name));

  // Calculate global statistics
  const totalExaminers = examinerData.length;
  const totalAssigned = examinerData.reduce((sum, e) => sum + e.totalAssigned, 0);
  const totalEvaluated = examinerData.reduce((sum, e) => sum + e.totalEvaluated, 0);
  const avgProgress = totalExaminers > 0 
    ? Math.round(examinerData.reduce((sum, e) => sum + e.progress, 0) / totalExaminers) 
    : 0;

  // PDF Generator
  const generatePDFReport = () => {
    setIsGenerating(true);
    
    try {
      const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for more columns
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      const margin = 14;
      let yPos = 20;
      const primaryColor = [44, 62, 80];
      const accentColor = [220, 38, 38];

      // Header Section
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(...primaryColor);
      doc.text('PRASAD INSTITUTE OF MEDICAL SCIENCES', pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 7;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text('Examiner Performance Report', pageWidth / 2, yPos, { align: 'center' });
      
      // Confidential Watermark
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...accentColor);
      doc.text('CONFIDENTIAL / INTERNAL USE ONLY', pageWidth - margin, 15, { align: 'right' });

      yPos += 8;
      doc.setDrawColor(200);
      doc.setLineWidth(0.5);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;

      // Summary Statistics Box
      const summaryHeight = 25;
      doc.setDrawColor(200);
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, yPos, pageWidth - (margin * 2), summaryHeight, 'FD');

      doc.setFontSize(10);
      doc.setTextColor(...primaryColor);
      doc.setFont('helvetica', 'bold');
      doc.text('Overall Statistics', margin + 5, yPos + 7);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0);
      const statY = yPos + 15;
      const statSpacingX = (pageWidth - (margin * 2)) / 4;

      const drawStat = (label, value, index) => {
        const x = margin + 5 + (index * statSpacingX);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(label, x, statY);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(String(value), x, statY + 6);
      };

      drawStat('Total Examiners', totalExaminers, 0);
      drawStat('Total Assigned', totalAssigned, 1);
      drawStat('Total Evaluated', totalEvaluated, 2);
      drawStat('Report Generated', new Date().toLocaleDateString('en-IN'), 3);

      yPos += summaryHeight + 10;

      // Examiner Details Table
      const tableColumns = [
        { header: 'S.No', dataKey: 'sno' },
        { header: 'Name', dataKey: 'name' },
        { header: 'Email', dataKey: 'email' },
        { header: 'Department', dataKey: 'department' },
        { header: 'Assigned', dataKey: 'assigned' },
        { header: 'Evaluated', dataKey: 'evaluated' }
      ];

      const tableData = examinerData.map((examiner, index) => ({
        sno: index + 1,
        name: examiner.name,
        email: examiner.email,
        department: examiner.department,
        assigned: examiner.totalAssigned,
        evaluated: examiner.totalEvaluated
      }));

      autoTable(doc, {
        startY: yPos,
        head: [tableColumns.map(col => col.header)],
        body: tableData.map(row => tableColumns.map(col => row[col.dataKey])),
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 3,
          font: 'helvetica',
          lineColor: [200, 200, 200],
          lineWidth: 0.1
        },
        headStyles: {
          fillColor: [44, 62, 80],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: {
          sno: { halign: 'center', cellWidth: 20 },
          name: { cellWidth: 50 },
          email: { cellWidth: 60 },
          department: { cellWidth: 45 },
          assigned: { halign: 'center', cellWidth: 25 },
          evaluated: { halign: 'center', cellWidth: 25 }
        },
        margin: { left: margin, right: margin }
      });

      // Add new page for Banking & Document Details
      doc.addPage();
      yPos = 20;

      // Header for Banking Details Page
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(...primaryColor);
      doc.text('Banking & Document Details', pageWidth / 2, yPos, { align: 'center' });
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...accentColor);
      doc.text('CONFIDENTIAL / INTERNAL USE ONLY', pageWidth - margin, 15, { align: 'right' });

      yPos += 8;
      doc.setDrawColor(200);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;

      // Banking Details Table
      const bankingColumns = [
        { header: 'S.No', dataKey: 'sno' },
        { header: 'Name', dataKey: 'name' },
        { header: 'Aadhar Card', dataKey: 'aadhar' },
        { header: 'PAN Card', dataKey: 'pan' },
        { header: 'Account Number', dataKey: 'account' },
        { header: 'Bank Name', dataKey: 'bank' },
        { header: 'IFSC Code', dataKey: 'ifsc' }
      ];

      const bankingTableData = examinerData.map((examiner, index) => ({
        sno: index + 1,
        name: examiner.name,
        aadhar: examiner.aadharCard,
        pan: examiner.panCard,
        account: examiner.accountNumber,
        bank: examiner.bankName,
        ifsc: examiner.ifscCode
      }));

      autoTable(doc, {
        startY: yPos,
        head: [bankingColumns.map(col => col.header)],
        body: bankingTableData.map(row => bankingColumns.map(col => row[col.dataKey])),
        theme: 'grid',
        styles: {
          fontSize: 7,
          cellPadding: 2.5,
          font: 'helvetica',
          lineColor: [200, 200, 200],
          lineWidth: 0.1
        },
        headStyles: {
          fillColor: [44, 62, 80],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 8
        },
        columnStyles: {
          sno: { halign: 'center', cellWidth: 12 },
          name: { cellWidth: 40 },
          aadhar: { cellWidth: 30 },
          pan: { cellWidth: 25 },
          account: { cellWidth: 35 },
          bank: { cellWidth: 40 },
          ifsc: { cellWidth: 25 }
        },
        margin: { left: margin, right: margin }
      });

      // Footer with Page Numbers
      const pageCount = doc.internal.getNumberOfPages();
      for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(150);
        
        doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, margin, pageHeight - 10);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
      }

      // Save PDF
      const fileName = `Examiner_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toastSuccess('Examiner report downloaded successfully!');
      setIsGenerating(false);
      onClose();

    } catch (error) {
      console.error('PDF Error:', error);
      toastError('Failed to generate PDF report.');
      setIsGenerating(false);
    }
  };

  // Excel Generator
  const generateExcelReport = () => {
    setIsGenerating(true);
    
    try {
      const wb = XLSX.utils.book_new();
      
      // Sheet 1: Examiner Summary
      const summaryData = examinerData.map((examiner, index) => ({
        'S.No': index + 1,
        'Name': examiner.name,
        'Email': examiner.email,
        'Department': examiner.department,
        'Gender': examiner.gender,
        'Copies Assigned': examiner.totalAssigned,
        'Copies Evaluated': examiner.totalEvaluated
      }));

      const ws1 = XLSX.utils.json_to_sheet(summaryData);
      
      // Set column widths
      ws1['!cols'] = [
        { wch: 6 },  // S.No
        { wch: 25 }, // Name
        { wch: 30 }, // Email
        { wch: 20 }, // Department
        { wch: 12 }, // Gender
        { wch: 15 }, // Assigned
        { wch: 15 }  // Evaluated
      ];

      XLSX.utils.book_append_sheet(wb, ws1, 'Examiner Summary');

      // Sheet 2: Banking & Document Details
      const bankingData = examinerData.map((examiner, index) => ({
        'S.No': index + 1,
        'Name': examiner.name,
        'Email': examiner.email,
        'Department': examiner.department,
        'Aadhar Card': examiner.aadharCard,
        'PAN Card': examiner.panCard,
        'Account Number': examiner.accountNumber,
        'Bank Name': examiner.bankName,
        'IFSC Code': examiner.ifscCode,
        'Copies Evaluated': examiner.totalEvaluated
      }));

      const ws2 = XLSX.utils.json_to_sheet(bankingData);
      ws2['!cols'] = [
        { wch: 6 },  // S.No
        { wch: 25 }, // Name
        { wch: 30 }, // Email
        { wch: 20 }, // Department
        { wch: 18 }, // Aadhar Card
        { wch: 15 }, // PAN Card
        { wch: 20 }, // Account Number
        { wch: 25 }, // Bank Name
        { wch: 15 }, // IFSC Code
        { wch: 15 }  // Evaluated
      ];
      XLSX.utils.book_append_sheet(wb, ws2, 'Banking Details');

      // Sheet 3: Statistics
      const statsData = [
        { 'Metric': 'Total Examiners', 'Value': totalExaminers },
        { 'Metric': 'Total Copies Assigned', 'Value': totalAssigned },
        { 'Metric': 'Total Copies Evaluated', 'Value': totalEvaluated },
        { 'Metric': 'Report Generated', 'Value': new Date().toLocaleString('en-IN') }
      ];

      const ws3 = XLSX.utils.json_to_sheet(statsData);
      ws3['!cols'] = [{ wch: 30 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, ws3, 'Statistics');

      // Save Excel
      const fileName = `Examiner_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toastSuccess('Examiner report downloaded successfully!');
      setIsGenerating(false);
      onClose();

    } catch (error) {
      console.error('Excel Error:', error);
      toastError('Failed to generate Excel report.');
      setIsGenerating(false);
    }
  };

  const handleGenerate = () => {
    if (reportFormat === 'pdf') {
      generatePDFReport();
    } else {
      generateExcelReport();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={() => !isGenerating && onClose()}
    >
      <div 
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full" 
        style={{fontFamily: 'Dosis, sans-serif'}}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Download Examiner Report</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isGenerating}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Summary */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Report Summary</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-gray-500">Total Examiners</p>
                <p className="text-lg font-bold text-gray-900">{totalExaminers}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Assigned</p>
                <p className="text-lg font-bold text-gray-900">{totalAssigned}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Evaluated</p>
                <p className="text-lg font-bold text-gray-900">{totalEvaluated}</p>
              </div>
            </div>
          </div>

          {/* Format Selection */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">
              Select Report Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setReportFormat('pdf')}
                disabled={isGenerating}
                className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                  reportFormat === 'pdf'
                    ? 'border-gray-900 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center">
                  <DocumentArrowDownIcon className="h-8 w-8 mb-2 text-gray-900" />
                  <span className="text-sm font-bold text-gray-900">PDF Report</span>
                  <span className="text-xs text-gray-500 mt-1">Formatted document</span>
                </div>
              </button>

              <button
                onClick={() => setReportFormat('excel')}
                disabled={isGenerating}
                className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                  reportFormat === 'excel'
                    ? 'border-gray-900 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center">
                  <DocumentArrowDownIcon className="h-8 w-8 mb-2 text-gray-900" />
                  <span className="text-sm font-bold text-gray-900">Excel Report</span>
                  <span className="text-xs text-gray-500 mt-1">Spreadsheet data</span>
                </div>
              </button>
            </div>
          </div>

          {/* Report Info */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>• PDF includes formatted tables with examiner details and complete banking information</p>
            <p>• Excel includes multiple sheets (Summary, Banking Details with Aadhar/PAN/IFSC, Statistics)</p>
            <p>• Banking details include: Aadhar Card, PAN Card, Account Number, Bank Name, IFSC Code</p>
            <p>• Shows Total Assigned and Total Evaluated copies per examiner</p>
            <p>• All data is current as of {new Date().toLocaleDateString('en-IN')}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="flex-1 px-4 py-2.5 border-2 border-gray-900 text-gray-900 rounded-xl hover:bg-gray-50 transition-colors font-bold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <DocumentArrowDownIcon className="h-5 w-5" />
                Download {reportFormat.toUpperCase()}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
