import React, { Fragment, useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, MagnifyingGlassPlusIcon, MagnifyingGlassMinusIcon, ArrowsPointingInIcon } from '@heroicons/react/24/outline';

// Import react-pdf components
import { Document, Page, pdfjs } from "react-pdf";
import 'react-pdf/dist/Page/AnnotationLayer.css'; // Essential for annotations like links
import 'react-pdf/dist/Page/TextLayer.css'; // Essential for selectable text

// Set worker source for react-pdf
// This is crucial for react-pdf to work correctly.
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// This is a dedicated modal component for viewing queries in the Admin Panel.
// It is designed to be full-width and display the Answer Copy, Question Paper,
// and Query Details/Actions in a structured layout.

export default function AdminQueryViewerModal({
  isOpen,
  onClose,
  selectedQuery,
  selectedCopyForQueryView,
  queryViewerCurrentPage,
  setQueryViewerCurrentPage,
  queryViewerZoomLevel,
  queryViewerQpCurrentPage,
  setQueryViewerQpCurrentPage,
  queryViewerQpZoomLevel,
  isQueryViewerAcLoading,
  setIsQueryViewerAcLoading,
  isQueryViewerQpLoading,
  setIsQueryViewerQpLoading,
  handleQueryViewerZoom,
  replyText,
  setReplyText,
  isSubmittingQueryAction,
  handleApproveQuery,
  handleRejectQuery,
  handleResolveQuery,
}) {
  // const ZOOM_STEP = 0.25; // Define zoom steps locally or pass as props
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 3;

  const [numAcPages, setNumAcPages] = useState(null);
  const [numQpPages, setNumQpPages] = useState(null);

  const acPageWrapperRef = useRef(null);
  const qpPageWrapperRef = useRef(null);

  // Handlers for when PDF documents load successfully
  const onAcDocumentLoadSuccess = useCallback(({ numPages }) => {
    setNumAcPages(numPages);
    setIsQueryViewerAcLoading(false);
  }, [setIsQueryViewerAcLoading]);

  const onQpDocumentLoadSuccess = useCallback(({ numPages }) => {
    setNumQpPages(numPages);
    setIsQueryViewerQpLoading(false);
  }, [setIsQueryViewerQpLoading]);

  // Handlers for when PDF documents fail to load
  const onAcDocumentLoadError = useCallback((error) => {
    console.error("Error loading Answer Copy PDF:", error);
    setNumAcPages(0);
    setIsQueryViewerAcLoading(false);
  }, [setIsQueryViewerAcLoading]);

  const onQpDocumentLoadError = useCallback((error) => {
    console.error("Error loading Question Paper PDF:", error);
    setNumQpPages(0);
    setIsQueryViewerQpLoading(false);
  }, [setIsQueryViewerQpLoading]);


  useEffect(() => {
    if (isOpen) {
      // Reset loading states when modal opens or selectedCopyForQueryView changes
      setIsQueryViewerAcLoading(true);
      setIsQueryViewerQpLoading(true);
      setNumAcPages(null);
      setNumQpPages(null);
    }
  }, [isOpen, selectedCopyForQueryView, setIsQueryViewerAcLoading, setIsQueryViewerQpLoading]);


  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50 no-scrollbar" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-60" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              {/* Adjusted Dialog.Panel to take full width with padding */}
              <Dialog.Panel className="w-[95%] max-w-none h-[95vh] no-scrollbar transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all flex flex-col">
                <Dialog.Title
                  as="h3"
                  className="text-2xl font-bold leading-6 text-gray-900 border-b pb-3 mb-4 flex justify-between items-center"
                >
                  Query Details for {selectedQuery?.copy?.questionPaper?.title || 'N/A'}
                  <button
                    type="button"
                    className="inline-flex justify-center p-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </Dialog.Title>

                <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6 no-scrollbar overflow-y-auto pb-4">
                  {/* Left Column: Answer Copy Viewer */}
                  <div className="lg:col-span-1 bg-white p-4 rounded-xl shadow-lg border border-gray-200 flex flex-col">
                    <h3 className="text-xl font-semibold text-gray-800 mb-3 text-center">
                      Answer Copy (Page {queryViewerCurrentPage} of {numAcPages || 'N/A'})
                    </h3>
                    <div className="flex justify-between items-center w-full mb-3 space-x-2">
                      <button
                        onClick={() => {
                          setQueryViewerCurrentPage((p) => Math.max(1, p - 1));
                          setIsQueryViewerAcLoading(true);
                        }}
                        disabled={queryViewerCurrentPage === 1}
                        className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-md"
                      >
                        Prev
                      </button>
                      <span className="text-md font-bold text-gray-800">
                        Page {queryViewerCurrentPage} / {numAcPages || 'N/A'}
                      </span>
                      <button
                        onClick={() => {
                          setQueryViewerCurrentPage((p) => Math.min(numAcPages || 1, p + 1));
                          setIsQueryViewerAcLoading(true);
                        }}
                        disabled={queryViewerCurrentPage === (numAcPages || 1)}
                        className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-md"
                      >
                        Next
                      </button>
                    </div>
                    <div className="relative w-full flex-grow h-[450px] rounded-lg overflow-auto border border-gray-300 bg-gray-50 flex items-center justify-center">
                      {isQueryViewerAcLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 z-10">
                          <svg
                            className="animate-spin h-8 w-8 text-indigo-500"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span className="ml-2 text-gray-700">Loading Copy Page...</span>
                        </div>
                      )}
                      {selectedCopyForQueryView?.driveFile?.directDownloadLink ? (
                        <div className="relative inline-block" ref={acPageWrapperRef}>
                          <Document
                            file={selectedCopyForQueryView.driveFile.directDownloadLink}
                            onLoadSuccess={onAcDocumentLoadSuccess}
                            onLoadError={onAcDocumentLoadError}
                            className="w-full h-full flex justify-center items-center"
                          >
                            <Page
                              pageNumber={queryViewerCurrentPage}
                              scale={queryViewerZoomLevel}
                              renderAnnotationLayer={true}
                              renderTextLayer={true}
                            />
                          </Document>

                          {/* Render examiner's marks on the current page (read-only) */}
                          {selectedCopyForQueryView && selectedCopyForQueryView.pages && Array.isArray(selectedCopyForQueryView.pages) && (() => {
                            const pageData = selectedCopyForQueryView.pages.find(p => p && p.pageNumber === queryViewerCurrentPage);
                            if (pageData && pageData.pageMarks && Array.isArray(pageData.pageMarks) && pageData.pageMarks.length > 0) {
                              return pageData.pageMarks
                                .filter(mark => mark && typeof mark.value === 'number' && typeof mark.x === 'number' && typeof mark.y === 'number')
                                .map((mark, idx) => (
                                <div
                                  key={idx}
                                  className="absolute pointer-events-none"
                                  style={{
                                    left: `${mark.x}%`,
                                    top: `${mark.y}%`,
                                    transform: 'translate(-50%, -50%)',
                                    zIndex: 20,
                                    position: 'absolute'
                                  }}
                                >
                                  <div className={`w-12 h-12 flex items-center justify-center rounded-full text-white text-sm font-bold shadow-lg ${mark.value > 0 ? 'bg-green-500' : 'bg-red-500'}`}>
                                    {Number(mark.value % 1 === 0 ? mark.value : mark.value.toFixed(1))}
                                  </div>
                                </div>
                              ));
                            }
                            return null;
                          })()}
                        </div>
                      ) : (
                        <div className="text-gray-500 text-center p-4">
                          Answer Copy Not Available.
                        </div>
                  
                      )}
                    </div>
                    <div className="flex items-center justify-center mt-4 space-x-2">
                      <button
                        onClick={() => handleQueryViewerZoom("ac", "out")}
                        disabled={queryViewerZoomLevel <= MIN_ZOOM}
                        className="p-2 bg-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        title="Zoom Out"
                      >
                        <MagnifyingGlassMinusIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleQueryViewerZoom("ac", "in")}
                        disabled={queryViewerZoomLevel >= MAX_ZOOM}
                        className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        title="Zoom In"
                      >
                        <MagnifyingGlassPlusIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleQueryViewerZoom("ac", "reset")}
                        disabled={queryViewerZoomLevel === MIN_ZOOM}
                        className="p-2 bg-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        title="Reset Zoom"
                      >
                        <ArrowsPointingInIcon className="h-5 w-5" />
                      </button>
                      <span className="text-sm text-gray-600">
                        {queryViewerZoomLevel.toFixed(2)}x
                      </span>
                    </div>
                  </div>

                  {/* Middle Column: Question Paper Viewer */}
                  <div className="lg:col-span-1 bg-white p-4 rounded-xl shadow-lg border border-gray-200 flex flex-col">
                    <h3 className="text-xl font-semibold text-gray-800 mb-3 text-center">
                      Question Paper (Page {queryViewerQpCurrentPage} of {numQpPages || 'N/A'})
                    </h3>
                    <div className="flex justify-between items-center w-full mb-3 space-x-2">
                      <button
                        onClick={() => {
                          setQueryViewerQpCurrentPage((p) => Math.max(1, p - 1));
                          setIsQueryViewerQpLoading(true);
                        }}
                        disabled={queryViewerQpCurrentPage === 1}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-md"
                      >
                        Prev
                      </button>
                      <span className="text-md font-bold text-gray-800">
                        Page {queryViewerQpCurrentPage} / {numQpPages || 'N/A'}
                      </span>
                      <button
                        onClick={() => {
                          setQueryViewerQpCurrentPage((p) => Math.min(numQpPages || 1, p + 1));
                          setIsQueryViewerQpLoading(true);
                        }}
                        disabled={queryViewerQpCurrentPage === (numQpPages || 1)}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-md"
                      >
                        Next
                      </button>
                    </div>
                    <div className="relative w-full flex-grow h-[450px] rounded-lg overflow-auto border border-gray-300 bg-gray-50 flex items-center justify-center">
                      {isQueryViewerQpLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 z-10">
                          <svg
                            className="animate-spin h-8 w-8 text-indigo-500"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span className="ml-2 text-gray-700">Loading Question Paper Page...</span>
                        </div>
                      )}
                      {selectedCopyForQueryView?.questionPaper?.driveFile?.directDownloadLink ? (
                        <Document
                          file={selectedCopyForQueryView.questionPaper.driveFile.directDownloadLink}
                          onLoadSuccess={onQpDocumentLoadSuccess}
                          onLoadError={onQpDocumentLoadError}
                          className="w-full h-full flex justify-center items-center"
                        >
                          <Page
                            pageNumber={queryViewerQpCurrentPage}
                            scale={queryViewerQpZoomLevel}
                            renderAnnotationLayer={true}
                            renderTextLayer={true}
                          />
                        </Document>
                      ) : (
                        <div className="text-gray-500 text-center p-4">
                          Question Paper Not Available.
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-center mt-4 space-x-2">
                      <button
                        onClick={() => handleQueryViewerZoom("qp", "out")}
                        disabled={queryViewerQpZoomLevel <= MIN_ZOOM}
                        className="p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        title="Zoom Out"
                      >
                        <MagnifyingGlassMinusIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleQueryViewerZoom("qp", "in")}
                        disabled={queryViewerQpZoomLevel >= MAX_ZOOM}
                        className="p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        title="Zoom In"
                      >
                        <MagnifyingGlassPlusIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleQueryViewerZoom("qp", "reset")}
                        disabled={queryViewerQpZoomLevel === MIN_ZOOM}
                        className="p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        title="Reset Zoom"
                      >
                        <ArrowsPointingInIcon className="h-5 w-5" />
                      </button>
                      <span className="text-sm text-gray-600">
                        {queryViewerQpZoomLevel.toFixed(2)}x
                      </span>
                    </div>
                  </div>

                  {/* Rightmost Column: Query Details and Actions */}
                  <div className="lg:col-span-1 bg-white p-4 rounded-xl shadow-lg border border-gray-200 flex flex-col">
                    <h3 className="text-xl font-semibold text-gray-800 mb-3 text-center">Query Details & Actions</h3>
                    <div className="mb-4 p-4 border rounded-md bg-gray-50 flex-grow">
                      <p className="text-sm text-gray-600 mb-2"><strong>Student:</strong> {selectedQuery?.raisedBy?.name} ({selectedQuery?.raisedBy?.email})</p>
                      <p className="text-sm text-gray-600 mb-2"><strong>Exam:</strong> {selectedQuery?.copy?.questionPaper?.title}</p>
                      <p className="text-sm text-gray-600 mb-2"><strong>Page Number:</strong> {selectedQuery?.pageNumber}</p>
                      <p className="text-sm text-gray-600 mb-2"><strong>Status:</strong>{" "}
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          selectedQuery?.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          selectedQuery?.status === 'approved_by_admin' ? 'bg-blue-100 text-blue-800' :
                          selectedQuery?.status === 'rejected_by_admin' ? 'bg-red-100 text-red-800' :
                          selectedQuery?.status === 'resolved_by_admin' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedQuery?.status?.replace(/_/g, ' ')}
                        </span>
                      </p>
                      <div className="mt-3 p-3 border-t border-gray-200 bg-white rounded-md">
                        <p className="text-gray-800 font-bold mb-2">Student's Query:</p>
                        <p className="text-gray-700 whitespace-pre-wrap">{selectedQuery?.text}</p>
                      </div>
                      {selectedQuery?.response && (
                        <div className="mt-4 p-3 border-t border-gray-200 bg-white rounded-md">
                          <p className="text-gray-800 font-bold mb-2">Admin's Response:</p>
                          <p className="text-gray-700 whitespace-pre-wrap">{selectedQuery?.response}</p>
                        </div>
                      )}
                        {selectedQuery?.action && (
                      <div className="mt-4 p-3 border-t border-gray-200 bg-white rounded-md">
                        <p className="text-gray-800 font-bold mb-2">Action Taken:</p>
                        <p className="text-gray-700 whitespace-pre-wrap">{selectedQuery?.action}</p>
                      </div>
                    )}
                    </div>

                    {selectedQuery?.status === 'resolved_by_admin' || selectedQuery?.status === 'rejected_by_admin' ? (
                      <p className="text-center text-sm text-gray-600 mt-4">
                        This query has been {selectedQuery?.status?.replace(/_/g, ' ')}. No further actions available.
                      </p>
                    ) : (
                      <div className="mt-auto pt-4">
                        <h3 className="text-xl font-semibold mb-3">Admin Actions</h3>
                        {selectedQuery?.status === 'pending' && (
                          <div className="mb-4">
                            <label htmlFor="adminReply" className="block text-gray-700 text-sm font-bold mb-2">
                              Reply and Resolve Query:
                            </label>
                            <textarea
                              id="adminReply"
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              rows="4"
                              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:ring-2 focus:ring-indigo-500 resize-y"
                              placeholder="Type your response here to resolve this query..."
                            ></textarea>
                            <button
                              onClick={handleResolveQuery}
                              disabled={isSubmittingQueryAction || !replyText.trim()}
                              className="mt-3 bg-green-600 text-white p-2 rounded w-full hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isSubmittingQueryAction ? "Resolving..." : "Reply & Resolve"}
                            </button>
                          </div>
                        )}

                        <div className="flex justify-end gap-3 mt-4 border-t pt-4">
                          {selectedQuery?.status === 'pending' && (
                            <>
                              <button
                                onClick={handleApproveQuery}
                                disabled={isSubmittingQueryAction}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isSubmittingQueryAction ? "Approving..." : "Approve (Forward to Examiner)"}
                              </button>
                              <button
                                onClick={handleRejectQuery}
                                disabled={isSubmittingQueryAction}
                                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isSubmittingQueryAction ? "Rejecting..." : "Reject Query"}
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}