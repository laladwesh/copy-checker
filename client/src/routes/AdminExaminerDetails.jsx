import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  ArrowLeftIcon,
  UserCircleIcon,
  BookOpenIcon,
  EnvelopeIcon,
  ChartPieIcon,
  CheckCircleIcon,
  ClockIcon,
  InboxStackIcon,
  IdentificationIcon,
  CreditCardIcon,
  BanknotesIcon,
  BuildingLibraryIcon
} from '@heroicons/react/24/outline';

export default function AdminExaminerDetails() {
  const { examinerId } = useParams();
  const navigate = useNavigate();

  const [examiner, setExaminer] = useState(null);
  const [copies, setCopies] = useState([]);
  const [exams, setExams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function fetchAll() {
      setIsLoading(true);
      setError(null);
      try {
        const [exRes, copiesRes, examsRes] = await Promise.all([
          api.get('/admin/examiners'),
          api.get('/admin/copies'),
          api.get('/admin/exams'),
        ]);

        if (!mounted) return;
        const examinersList = exRes.data || [];
        const found = examinersList.find((e) => String(e._id) === String(examinerId));
        setExaminer(found || { _id: examinerId, name: 'Unknown', email: '' });
        setCopies(copiesRes.data || []);
        setExams(examsRes.data || []);
      } catch (err) {
        console.error('Failed to load examiner details', err);
        if (mounted) setError('Failed to load data');
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    fetchAll();
    return () => { mounted = false; };
  }, [examinerId]);

  // Compute stats for this examiner
  const stats = useMemo(() => {
    if (!examiner || !copies.length) return { assigned: 0, evaluated: 0, pending: 0, exams: {} };
    
    const s = { assigned: 0, evaluated: 0, exams: {} };
    
    copies.forEach((copy) => {
      if (!Array.isArray(copy.examiners)) return;
      copy.examiners.forEach((ass) => {
        const id = ass._id ? String(ass._id) : String(ass);
        if (id === String(examinerId)) {
          s.assigned++;
          if (copy.status === 'evaluated') s.evaluated++;
          
          const examId = copy.questionPaper?._id;
          if (examId) {
            const title = exams.find((ex) => ex._id === examId)?.title || 'Unknown Exam';
            if (!s.exams[examId]) s.exams[examId] = { title, assigned: 0, evaluated: 0 };
            s.exams[examId].assigned++;
            if (copy.status === 'evaluated') s.exams[examId].evaluated++;
          }
        }
      });
    });

    s.pending = s.assigned - s.evaluated;
    s.completionRate = s.assigned > 0 ? Math.round((s.evaluated / s.assigned) * 100) : 0;
    
    return s;
  }, [examiner, copies, exams, examinerId]);

  if (isLoading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4" style={{fontFamily: 'Dosis, sans-serif'}}>
        <div className="bg-white p-8 rounded-lg text-center max-w-md w-full border-2 border-gray-900">
          <div className="text-red-600 mb-4 mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center font-bold text-2xl border-2 border-red-600">!</div>
          <h3 className="text-lg font-bold text-gray-900">Error Loading Profile</h3>
          <p className="text-gray-700 font-semibold mt-2 mb-6">{error}</p>
          <button onClick={() => navigate(-1)} className="text-gray-900 font-bold hover:underline">Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-8" style={{fontFamily: 'Dosis, sans-serif'}}>
      <div className="max-w-full mx-auto space-y-6">
        
        {/* Navigation & Header */}
        <div>
          <button 
            onClick={() => navigate(-1)} 
            className="group flex items-center text-sm text-gray-700 hover:text-gray-900 transition-colors mb-4 font-bold"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
            Back to Examiners
          </button>
          
          <div className="bg-white rounded-lg p-6 border-2 border-gray-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="h-16 w-16 rounded-full bg-gray-900 border-2 border-gray-900 flex items-center justify-center text-white font-bold text-2xl">
                {String(examiner?.name || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{examiner?.name}</h1>
                <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-gray-700 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <EnvelopeIcon className="w-4 h-4" />
                    {examiner?.email}
                  </span>
                  {examiner?.department && (
                    <>
                      <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                      <span className="flex items-center gap-1.5">
                        <BuildingLibraryIcon className="w-4 h-4" />
                        {examiner.department}
                      </span>
                    </>
                  )}
                  <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                  <span className="text-gray-600">ID: {examinerId.slice(-6).toUpperCase()}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <span className={`px-4 py-1.5 rounded-lg text-sm font-bold border-2 ${
                stats.completionRate === 100 
                  ? 'bg-green-100 text-green-900 border-green-900' 
                  : 'bg-gray-100 text-gray-900 border-gray-900'
              }`}>
                {stats.completionRate === 100 ? 'Completed' : 'Active'}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <StatCard 
             label="Assigned" 
             value={stats.assigned} 
             icon={InboxStackIcon}
           />
           <StatCard 
             label="Evaluated" 
             value={stats.evaluated} 
             icon={CheckCircleIcon}
           />
           <StatCard 
             label="Pending" 
             value={stats.pending} 
             icon={ClockIcon}
           />
           <StatCard 
             label="Completion" 
             value={`${stats.completionRate}%`} 
             icon={ChartPieIcon}
           />
        </div>

        {/* Banking Details Section (View Only for Admin) */}
        {(examiner?.aadharCard || examiner?.panCard || examiner?.accountNumber || examiner?.bankName || examiner?.ifscCode) && (
          <div className="bg-white rounded-lg border-2 border-gray-900 overflow-hidden">
            <div className="p-6 border-b-2 border-gray-900 bg-yellow-50">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <BanknotesIcon className="h-5 w-5 text-yellow-700"/>
                Banking & Document Details (View Only)
              </h2>
              <p className="text-xs text-yellow-700 font-semibold mt-1">This information is for administrative reference only. Examiners manage their own banking details.</p>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {examiner?.aadharCard && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-300">
                  <div className="flex items-center gap-2 mb-2">
                    <IdentificationIcon className="h-5 w-5 text-gray-700" />
                    <span className="text-sm font-bold text-gray-700">Aadhar Card</span>
                  </div>
                  <p className="text-base font-mono text-gray-900">{examiner.aadharCard}</p>
                </div>
              )}

              {examiner?.panCard && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-300">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCardIcon className="h-5 w-5 text-gray-700" />
                    <span className="text-sm font-bold text-gray-700">PAN Card</span>
                  </div>
                  <p className="text-base font-mono text-gray-900">{examiner.panCard}</p>
                </div>
              )}

              {examiner?.accountNumber && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-300">
                  <div className="flex items-center gap-2 mb-2">
                    <BanknotesIcon className="h-5 w-5 text-gray-700" />
                    <span className="text-sm font-bold text-gray-700">Account Number</span>
                  </div>
                  <p className="text-base font-mono text-gray-900">{examiner.accountNumber}</p>
                </div>
              )}

              {examiner?.bankName && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-300">
                  <div className="flex items-center gap-2 mb-2">
                    <BuildingLibraryIcon className="h-5 w-5 text-gray-700" />
                    <span className="text-sm font-bold text-gray-700">Bank Name</span>
                  </div>
                  <p className="text-base text-gray-900">{examiner.bankName}</p>
                </div>
              )}

              {examiner?.ifscCode && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-300">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCardIcon className="h-5 w-5 text-gray-700" />
                    <span className="text-sm font-bold text-gray-700">IFSC Code</span>
                  </div>
                  <p className="text-base font-mono text-gray-900">{examiner.ifscCode}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Exam Breakdown List */}
        <div className="bg-white rounded-lg border-2 border-gray-900 overflow-hidden">
          <div className="p-6 border-b-2 border-gray-900 bg-white flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <BookOpenIcon className="h-5 w-5 text-gray-900"/>
              Evaluation Breakdown
            </h2>
            <span className="text-sm text-gray-700 font-semibold">
              Involved in {Object.keys(stats.exams).length} Exams
            </span>
          </div>
          
          <div className="divide-y-2 divide-gray-900">
            {Object.keys(stats.exams).length === 0 ? (
               <div className="p-12 text-center">
                 <div className="mx-auto h-12 w-12 text-gray-400 mb-3">
                   <InboxStackIcon />
                 </div>
                 <h3 className="text-sm font-bold text-gray-900">No exams assigned</h3>
                 <p className="text-sm text-gray-700 font-semibold mt-1">This examiner has not been assigned any copies yet.</p>
               </div>
            ) : (
              Object.entries(stats.exams).map(([id, e]) => {
                const progress = e.assigned > 0 ? Math.round((e.evaluated / e.assigned) * 100) : 0;
                
                return (
                  <div key={id} className="p-6 hover:bg-gray-100 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                      <div>
                        <h3 className="text-base font-bold text-gray-900">{e.title}</h3>
                        <p className="text-xs text-gray-700 font-semibold mt-0.5">Exam ID: {id.slice(-6)}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-gray-900">{e.evaluated}</span>
                        <span className="text-gray-600 text-sm font-bold"> / {e.assigned}</span>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold text-gray-700">
                        <span>Progress</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden border-2 border-gray-900">
                        <div 
                          className={`h-full transition-all duration-500 ${
                            progress === 100 ? 'bg-green-500' : 'bg-gray-900'
                          }`}
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Reusable Components ---

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="bg-white p-5 rounded-lg border-2 border-gray-900 flex items-center justify-between">
      <div>
        <p className="text-sm font-bold text-gray-700">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
      <div className="p-3 rounded-lg bg-gray-900 text-white">
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-white p-8 animate-pulse" style={{fontFamily: 'Dosis, sans-serif'}}>
      <div className="max-w-full mx-auto space-y-6">
        <div className="h-6 w-32 bg-gray-300 rounded"></div>
        <div className="h-32 bg-gray-300 rounded-lg border-2 border-gray-900"></div>
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-300 rounded-lg border-2 border-gray-900"></div>)}
        </div>
        <div className="h-64 bg-gray-300 rounded-lg border-2 border-gray-900"></div>
      </div>
    </div>
  );
}