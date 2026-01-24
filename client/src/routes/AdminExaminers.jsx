import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  MagnifyingGlassIcon, 
  ArrowLeftIcon, 
  UserGroupIcon, 
  DocumentCheckIcon, 
  ChartBarIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

export default function AdminExaminers({ examiners = [], copies = [], exams = [] }) {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Fallback data handling
  const navState = location?.state || {};
  const dataExaminers = examiners.length ? examiners : navState.examiners || [];
  const dataCopies = copies.length ? copies : navState.copies || [];
  const dataExams = exams.length ? exams : navState.exams || [];

  const [examinerStats, setExaminerStats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [examinerSearchTerm, setExaminerSearchTerm] = useState('');

  // 1. Calculation Logic
  useEffect(() => {
    setIsLoading(true);
    try {
      const stats = {};
      
      // Initialize stats for all examiners
      dataExaminers.forEach(examiner => {
        stats[examiner._id] = {
          _id: examiner._id,
          name: examiner.name,
          email: examiner.email,
          avatar: examiner.avatar, // Assuming avatar might exist, else fallback
          department: examiner.department || 'General', // Placeholder for extra data
          totalCopiesAssigned: 0,
          totalCopiesEvaluated: 0,
          examDetails: {},
        };
      });

      // Aggregate Copy Data
      dataCopies.forEach(copy => {
        if (Array.isArray(copy.examiners) && copy.examiners.length > 0) {
          copy.examiners.forEach(assignedExaminer => {
            const examinerId = assignedExaminer._id ? assignedExaminer._id.toString() : assignedExaminer.toString();
            
            if (stats[examinerId]) {
              stats[examinerId].totalCopiesAssigned++;
              if (copy.status === 'evaluated') stats[examinerId].totalCopiesEvaluated++;

              // Exam Breakdown
              const examId = copy.questionPaper?._id;
              if (examId) {
                const examTitle = dataExams.find(e => e._id === examId)?.title || 'Unknown Exam';
                if (!stats[examinerId].examDetails[examId]) {
                  stats[examinerId].examDetails[examId] = { title: examTitle, assigned: 0, evaluated: 0 };
                }
                stats[examinerId].examDetails[examId].assigned++;
                if (copy.status === 'evaluated') stats[examinerId].examDetails[examId].evaluated++;
              }
            }
          });
        }
      });

      setExaminerStats(Object.values(stats));
    } catch (err) {
      console.error('Error calculating stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, [dataExaminers, dataCopies, dataExams]);

  // 2. Filter Logic
  const filteredExaminerStats = useMemo(() => {
    const term = (examinerSearchTerm || '').toLowerCase().trim();
    if (!term) return examinerStats;
    return examinerStats.filter((ex) => 
      (ex.name || '').toLowerCase().includes(term) || 
      (ex.email || '').toLowerCase().includes(term)
    );
  }, [examinerStats, examinerSearchTerm]);

  // 3. Global Dashboard Summaries
  const globalStats = useMemo(() => {
    const totalExaminers = examinerStats.length;
    const totalAssigned = examinerStats.reduce((acc, curr) => acc + curr.totalCopiesAssigned, 0);
    const totalEvaluated = examinerStats.reduce((acc, curr) => acc + curr.totalCopiesEvaluated, 0);
    const completionRate = totalAssigned > 0 ? Math.round((totalEvaluated / totalAssigned) * 100) : 0;
    
    return { totalExaminers, totalAssigned, totalEvaluated, completionRate };
  }, [examinerStats]);

  return (
    <div className="min-h-screen bg-white p-8 text-gray-900" style={{fontFamily: 'Dosis, sans-serif'}}>
      
      {/* Header Section */}
      <div className="max-w-full mx-auto mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Examiner Performance</h1>
            <p className="text-gray-600 mt-1 font-bold">Monitor evaluation progress and examiner workloads.</p>
          </div>
          <button 
            onClick={() => navigate(-1)} 
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 border-2 border-gray-900 text-white rounded-lg hover:bg-[#1e3a8a] transition-colors text-sm font-bold"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back
          </button>
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard 
            title="Total Examiners" 
            value={globalStats.totalExaminers} 
            icon={UserGroupIcon} 
          />
          <StatCard 
            title="Total Assigned" 
            value={globalStats.totalAssigned} 
            icon={DocumentCheckIcon} 
          />
          <StatCard 
            title="Total Evaluated" 
            value={globalStats.totalEvaluated} 
            icon={ChartBarIcon} 
          />
          <StatCard 
            title="Completion Rate" 
            value={`${globalStats.completionRate}%`} 
            isProgress 
            progress={globalStats.completionRate}
          />
        </div>

        {/* Main Content Area */}
        <div className="bg-white rounded-xl border-2 border-gray-900 overflow-hidden">
          
          {/* Toolbar */}
          <div className="p-5 border-b-2 border-gray-900 flex flex-col sm:flex-row justify-between gap-4 bg-white">
            <h2 className="text-lg font-bold text-gray-800 self-center">Detailed List</h2>
            <div className="relative w-full sm:w-72">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search examiners..."
                value={examinerSearchTerm}
                onChange={(e) => setExaminerSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border-2 border-gray-900 rounded-lg leading-5 bg-white placeholder-gray-400 focus:outline-none focus:border-[#1e3a8a] sm:text-sm font-bold"
              />
            </div>
          </div>

          {/* Table View */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white border-b-2 border-gray-900">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Examiner</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Workload</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider w-1/3">Progress</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Status</th>
                  <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-10 text-center text-gray-500 font-bold">Loading data...</td>
                  </tr>
                ) : filteredExaminerStats.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-10 text-center text-gray-500 font-bold">
                      {examinerSearchTerm ? 'No matching examiners found.' : 'No examiner data available.'}
                    </td>
                  </tr>
                ) : (
                  filteredExaminerStats.map((examiner) => {
                    const progress = examiner.totalCopiesAssigned > 0 
                      ? Math.round((examiner.totalCopiesEvaluated / examiner.totalCopiesAssigned) * 100) 
                      : 0;

                    return (
                      <tr 
                        key={examiner._id} 
                        className="hover:bg-gray-50 transition-colors cursor-pointer group"
                        onClick={() => navigate(`/admin/examiners/${examiner._id}`)}
                      >
                        {/* Name Column */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-gray-900 font-bold text-sm border-2 border-gray-900">
                                {String(examiner.name || 'U').charAt(0).toUpperCase()}
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-bold text-gray-900">{examiner.name}</div>
                              <div className="text-sm text-gray-500 font-bold">{examiner.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Workload Column */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 font-bold">{examiner.totalCopiesAssigned} <span className="text-gray-600 font-bold">Assigned</span></div>
                          <div className="text-xs text-gray-500 font-bold">{examiner.totalCopiesEvaluated} Evaluated</div>
                        </td>

                        {/* Progress Bar Column */}
                        <td className="px-6 py-4 whitespace-nowrap align-middle">
                          <div className="w-full">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-gray-700">{progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div 
                                className="h-2 rounded-full transition-all duration-500 bg-gray-900"
                                style={{ width: `${progress}%` }} 
                              ></div>
                            </div>
                          </div>
                        </td>

                        {/* Status Badge Column */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {progress === 100 ? (
                             <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-white text-gray-900 border-2 border-gray-900">
                               Completed
                             </span>
                          ) : progress === 0 && examiner.totalCopiesAssigned > 0 ? (
                             <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-white text-gray-900 border-2 border-gray-900">
                               Not Started
                             </span>
                          ) : examiner.totalCopiesAssigned === 0 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-white text-gray-900 border-2 border-gray-900">
                              Idle
                            </span>
                          ) : (
                             <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-white text-gray-900 border-2 border-gray-900">
                               In Progress
                             </span>
                          )}
                        </td>

                        {/* Action Column */}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold">
                          <button className="text-gray-400 hover:text-gray-900 transition-colors">
                            <ChevronRightIcon className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {/* Footer / Pagination area (Static for now) */}
          <div className="bg-white px-6 py-3 border-t-2 border-gray-900 flex items-center justify-between">
             <span className="text-xs text-gray-500 font-bold">
               Showing {filteredExaminerStats.length} examiners
             </span>
          </div>

        </div>
      </div>
    </div>
  );
}

// Sub-component for Top Stats
function StatCard({ title, value, icon: Icon, isProgress, progress }) {
  return (
    <div className="bg-white overflow-hidden rounded-xl border-2 border-gray-900 p-5 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-600 truncate">{title}</h3>
        {Icon && <Icon className="w-5 h-5 text-gray-900" />}
      </div>
      
      <div className="flex items-baseline">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
      
      {isProgress && (
        <div className="mt-3 w-full bg-gray-200 rounded-full h-1.5">
          <div 
            className="bg-gray-900 h-1.5 rounded-full" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}
    </div>
  );
}