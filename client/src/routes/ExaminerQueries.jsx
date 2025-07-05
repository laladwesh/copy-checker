import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Modal from '../components/Modal'; // Assuming Modal.jsx is in src/components
import { PaperAirplaneIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'; // For icons

export default function ExaminerQueries() {
  const [queries, setQueries] = useState([]);
  const [message, setMessage] = useState('');
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [currentQuery, setCurrentQuery] = useState(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    fetchQueries();
  }, []);

  const fetchQueries = async () => {
    try {
      // Assuming a new backend endpoint for examiner's queries, or reusing an existing one
      // If you don't have a specific endpoint for examiner's queries, you might need to add one
      // For now, let's assume /examiner/queries or similar, which returns queries assigned to the logged-in examiner.
      // If your 'listQueries' in admin.controller.js is general, you might need a new one in examiner.controller.js
      // For this example, I'll assume you add a new endpoint like '/examiner/queries/my-queries'
      const res = await api.get('/examiner/queries'); // Reusing admin's listQueries for now, adjust this if you create a specific examiner endpoint
      setQueries(res.data.filter(q => q.copy?.examiners?.includes(api.getUserId()) && q.status === 'pending')); // Filter for relevant queries if using admin endpoint
    } catch (error) {
      console.error("Error fetching queries:", error);
      showMessage(`Error loading queries: ${error.message}`, 'error');
    }
  };

  const showMessage = (msg, type = 'success') => {
    setMessage(msg);
    // setTimeout(() => setMessage(''), 5000); // Clear message after 5 seconds
  };

  const openReplyModal = (query) => {
    setCurrentQuery(query);
    setReplyText(query.response || ''); // Pre-fill if there's a previous response
    setIsReplyModalOpen(true);
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!currentQuery || !replyText.trim()) {
      showMessage('Reply cannot be empty.', 'error');
      return;
    }
    showMessage('Submitting reply...', 'info');
    try {
      await api.post(`/examiner/queries/${currentQuery._id}/reply`, { response: replyText });
      showMessage('Reply submitted successfully!', 'success');
      setIsReplyModalOpen(false);
      fetchQueries(); // Refresh queries to show updated status
    } catch (err) {
      showMessage(`Error submitting reply: ${err.response?.data?.error || err.message}`, 'error');
    }
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
        <div className={`p-4 rounded-lg text-center font-medium ${
            message.includes('Error') ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-green-100 text-green-700 border border-green-200'
        } shadow-md mb-8`}>
          {message}
        </div>
      )}

      <section className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">Your Pending Queries</h2>
        {queries.length === 0 ? (
          <p className="text-gray-600 text-center py-4">No pending queries assigned to you.</p>
        ) : (
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paper</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Page</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Query Text</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {queries.map(q => (
                  <tr key={q._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{q.raisedBy?.email || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{q.copy?.questionPaper?.title || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{q.pageNumber}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{q.text}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openReplyModal(q)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <PaperAirplaneIcon className="h-4 w-4 mr-1" /> Reply
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Reply Query Modal */}
      <Modal
        isOpen={isReplyModalOpen}
        onClose={() => setIsReplyModalOpen(false)}
        title="Reply to Student Query"
      >
        {currentQuery && (
          <form onSubmit={handleReplySubmit} className="space-y-4">
            <div>
              <p className="text-gray-700 font-semibold">Student: <span className="font-normal">{currentQuery.raisedBy?.email}</span></p>
              <p className="text-gray-700 font-semibold">Paper: <span className="font-normal">{currentQuery.copy?.questionPaper?.title}</span></p>
              <p className="text-gray-700 font-semibold">Page: <span className="font-normal">{currentQuery.pageNumber}</span></p>
              <p className="text-gray-700 font-semibold mt-2">Query:</p>
              <p className="p-3 bg-gray-100 rounded-md border border-gray-200 text-gray-800 italic">{currentQuery.text}</p>
            </div>
            <div>
              <label htmlFor="replyText" className="block text-gray-700 text-sm font-bold mb-2">Your Reply:</label>
              <textarea
                id="replyText"
                rows={5}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:ring-2 focus:ring-indigo-500 resize-y"
                placeholder="Type your response here..."
                required
              ></textarea>
            </div>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-200 flex items-center justify-center"
            >
              <PaperAirplaneIcon className="h-5 w-5 mr-2" /> Send Reply
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}