import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { PaperAirplaneIcon, ArrowLeftIcon, ArrowPathIcon, CheckCircleIcon, ExclamationCircleIcon, EyeIcon } from '@heroicons/react/24/outline';

export default function ExaminerQueries() {
  const [queries, setQueries] = useState([]);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [isLoading, setIsLoading] = useState(true);

  // NEW: State for query filtering and tabs
  const [selectedExamForQueryView, setSelectedExamForQueryView] = useState(''); // Filter by exam
  const [activeQueryTab, setActiveQueryTab] = useState('approved_by_admin'); // 'approved_by_admin', 'resolved_by_examiner'
  const [querySearchTerm, setQuerySearchTerm] = useState(''); // Search within queries

  useEffect(() => {
    fetchQueries();
  }, []);

  const showMessage = (msg, type = 'success') => {
    setMessage(msg);
    setMessageType(type);
    const timer = setTimeout(() => {
      setMessage('');
      setMessageType('success');
    }, 5000);
    return () => clearTimeout(timer);
  };

  const fetchQueries = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/examiner/queries');
      setQueries(res.data);
    } catch (error) {
      console.error("Error fetching queries:", error);
      showMessage(`Error loading queries: ${error.response?.data?.error || error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getMessageIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 mr-2" />;
      case 'error':
        return <ExclamationCircleIcon className="w-5 h-5 mr-2" />;
      case 'info':
        return <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />;
      default:
        return null;
    }
  };

  // Extract unique exam titles for the filter dropdown
  const uniqueExamTitlesWithIds = Array.from(new Set(queries.map(q => q.copy?.questionPaper?._id)))
    .map(examId => {
      const exam = queries.find(q => q.copy?.questionPaper?._id === examId)?.copy?.questionPaper;
      return exam ? { _id: exam._id, title: exam.title } : null;
    })
    .filter(Boolean); // Remove any null entries

  // Filter queries based on selected exam and active tab
  const getFilteredQueries = () => {
    let filtered = queries;

    if (selectedExamForQueryView) {
      filtered = filtered.filter(query => query.copy?.questionPaper?._id === selectedExamForQueryView);
    }

    if (activeQueryTab === 'approved_by_admin') {
      filtered = filtered.filter(query => query.status === 'approved_by_admin');
    } else if (activeQueryTab === 'resolved_by_examiner') {
      filtered = filtered.filter(query => query.status === 'resolved_by_examiner');
    }

    // Apply search term if any
    const searchTermLower = querySearchTerm.toLowerCase();
    if (searchTermLower) {
      filtered = filtered.filter(query =>
        query.text.toLowerCase().includes(searchTermLower) ||
        query.response?.toLowerCase().includes(searchTermLower) ||
        query.copy?.questionPaper?.title?.toLowerCase().includes(searchTermLower)
      );
    }

    return filtered;
  };


  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen font-sans">
      <Link to="/examiner" className="text-indigo-600 hover:underline flex items-center mb-6">
        <ArrowLeftIcon className="w-4 h-4 mr-1" />
        Back to Dashboard
      </Link>

      <h1 className="text-4xl font-extrabold text-gray-900 text-center mb-8 tracking-tight">
        Manage Student Queries
      </h1>

      {message && (
        <div className={`p-4 rounded-lg text-center font-medium flex items-center justify-center ${
            messageType === 'error' ? 'bg-red-100 text-red-700 border border-red-200' :
            messageType === 'success' ? 'bg-green-100 text-green-700 border border-green-200' :
            'bg-blue-100 text-blue-700 border border-blue-200'
          } shadow-md mb-8`}>
          {getMessageIcon(messageType)}
          {message}
        </div>
      )}

      <section className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">Queries Assigned to You</h2>

        {/* Exam Selection for Queries */}
        <div className="mb-4">
          <label htmlFor="selectExamForQueries" className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Exam:
          </label>
          <select
            id="selectExamForQueries"
            value={selectedExamForQueryView}
            onChange={(e) => setSelectedExamForQueryView(e.target.value)}
            className="w-full p-2 border rounded mt-1"
          >
            <option value="">All Exams</option>
            {uniqueExamTitlesWithIds.map(exam => (
              <option key={exam._id} value={exam._id}>{exam.title}</option>
            ))}
          </select>
        </div>

        {/* Query Status Tabs */}
        <div className="flex border-b border-gray-200 mb-4 overflow-x-auto no-scrollbar">
          <button
            className={`py-2 px-4 text-sm font-medium ${
              activeQueryTab === 'approved_by_admin'
                ? 'border-b-2 border-indigo-500 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveQueryTab('approved_by_admin')}
          >
            Pending (Approved by Admin) ({getFilteredQueries().filter(q => q.status === 'approved_by_admin').length})
          </button>
          <button
            className={`py-2 px-4 text-sm font-medium ${
              activeQueryTab === 'resolved_by_examiner'
                ? 'border-b-2 border-indigo-500 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveQueryTab('resolved_by_examiner')}
          >
            Resolved by You ({getFilteredQueries().filter(q => q.status === 'resolved_by_examiner').length})
          </button>
        </div>

        {/* Search bar for queries within the table */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search queries by student, exam, or query text..."
            className="w-full p-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={querySearchTerm}
            onChange={(e) => setQuerySearchTerm(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <ArrowPathIcon className="mx-auto h-10 w-10 text-indigo-500 animate-spin" />
            <p className="text-gray-600 mt-2">Loading queries...</p>
          </div>
        ) : getFilteredQueries().length === 0 ? (
          <p className="text-gray-600 text-center py-4">No queries found in this category or matching your filters.</p>
        ) : (
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate (Anonymous)</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paper</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Page</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Query Text</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getFilteredQueries().map(q => (
                  <tr key={q._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Anonymous</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{q.copy?.questionPaper?.title || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{q.pageNumber}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 truncate max-w-xs">{q.text}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        q.status === 'approved_by_admin' ? 'bg-yellow-100 text-yellow-800' :
                        q.status === 'resolved_by_examiner' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {q.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        to={`/examiner/queries/view/${q._id}`} // Link to the new viewer component
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <EyeIcon className="h-4 w-4 mr-1" /> View & Reply
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
