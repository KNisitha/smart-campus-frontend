import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { 
  ClipboardList, Search, Filter, CheckCircle, 
  X, AlertCircle, RefreshCw, Eye, Edit3, 
  Clock, ArrowLeft, CheckCircle2, User, FileText, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

const Submissions = () => {
  const [submissions, setSubmissions] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

  // Details & Grading Modal
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  
  // Grade Form State
  const [gradeForm, setGradeForm] = useState({
    marks: '',
    maxMarks: '100', // default fallback
    feedback: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [subRes, assignRes] = await Promise.allSettled([
        api.get('/api/submissions'),
        api.get('/api/assignments')
      ]);

      if (subRes.status === 'fulfilled') {
        const data = Array.isArray(subRes.value.data?.data || subRes.value.data) 
          ? (subRes.value.data?.data || subRes.value.data) : [];
        setSubmissions(data);
      }

      if (assignRes.status === 'fulfilled') {
        const data = Array.isArray(assignRes.value.data?.data || assignRes.value.data) 
          ? (assignRes.value.data?.data || assignRes.value.data) : [];
        setAssignments(data);
      }

    } catch (err) {
      console.error("Failed to fetch submissions:", err);
      setError("Failed to load submissions data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Data Normalization
  const normalizedSubmissions = submissions.map(s => {
    // Defensively extract assignment mapping
    const assignmentRef = s.assignment || {};
    const assignId = assignmentRef._id || assignmentRef.id || s.assignmentId || assignmentRef;
    
    // Attempt to enrich with full assignment data if we fetched it
    const enrichedAssignment = assignments.find(a => (a._id || a.id) === assignId) || {};
    
    // Derived Fields
    const assignmentTitle = enrichedAssignment.title || enrichedAssignment.name || assignmentRef.title || assignmentRef.name || 'Unknown Assignment';
    const subject = enrichedAssignment.subject || assignmentRef.subject || 'General';
    const dueDate = enrichedAssignment.dueDate || enrichedAssignment.deadline || assignmentRef.dueDate;
    const maxMarks = enrichedAssignment.maxMarks || assignmentRef.maxMarks || 100;
    
    const submittedAt = new Date(s.submittedAt || s.createdAt || s.date || Date.now());
    
    // Status Logic
    const isGraded = s.graded || (s.marks !== undefined && s.marks !== null) || s.status === 'Graded';
    let lateStatus = 'On Time';
    if (dueDate && submittedAt > new Date(dueDate)) {
      lateStatus = 'Late';
    }

    return {
      id: s._id || s.id,
      studentName: s.student?.name || s.studentName || 'Unknown Student',
      studentRoll: s.student?.rollNo || s.student?.registerNumber || s.rollNo || '-',
      assignmentTitle,
      subject,
      content: s.content || s.answer || s.fileUrl || 'No content provided.',
      submittedAt,
      dueDate: dueDate ? new Date(dueDate) : null,
      assignmentDesc: enrichedAssignment.description || assignmentRef.description,
      isGraded,
      lateStatus,
      marks: s.marks || s.grade || '',
      maxMarks: s.maxMarks || maxMarks,
      feedback: s.feedback || s.comments || '',
      raw: s
    };
  });

  const uniqueAssignments = [...new Set(normalizedSubmissions.map(s => s.assignmentTitle))];

  // Filters
  const filteredSubmissions = normalizedSubmissions.filter(s => {
    const matchSearch = s.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        s.studentRoll.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        s.assignmentTitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchAssignment = assignmentFilter === 'All' || s.assignmentTitle === assignmentFilter;
    
    let matchStatus = true;
    if (statusFilter === 'Pending') matchStatus = !s.isGraded;
    if (statusFilter === 'Graded') matchStatus = s.isGraded;
    if (statusFilter === 'Late') matchStatus = s.lateStatus === 'Late';
    
    return matchSearch && matchAssignment && matchStatus;
  }).sort((a, b) => {
    if (sortBy === 'newest') return b.submittedAt - a.submittedAt;
    if (sortBy === 'oldest') return a.submittedAt - b.submittedAt;
    return 0;
  });

  // Stats
  const totalCount = normalizedSubmissions.length;
  const pendingCount = normalizedSubmissions.filter(s => !s.isGraded).length;
  const gradedCount = totalCount - pendingCount;
  const lateCount = normalizedSubmissions.filter(s => s.lateStatus === 'Late').length;

  // Handlers
  const openModal = (submission) => {
    setSelectedSubmission(submission);
    setGradeForm({
      marks: submission.marks || '',
      maxMarks: submission.maxMarks || '100',
      feedback: submission.feedback || ''
    });
    setIsGrading(false);
    setIsModalOpen(true);
  };

  const handleGradeSubmit = async (e) => {
    e.preventDefault();
    const marksNum = Number(gradeForm.marks);
    const maxNum = Number(gradeForm.maxMarks);

    if (marksNum < 0) {
      toast.error("Marks cannot be negative.");
      return;
    }
    if (marksNum > maxNum) {
      toast.error(`Marks cannot exceed maximum marks (${maxNum}).`);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        marks: marksNum,
        grade: marksNum,
        maxMarks: maxNum,
        feedback: gradeForm.feedback,
        comments: gradeForm.feedback,
        graded: true,
        status: 'Graded'
      };

      // Defensively attempt grading update
      await api.put(`/api/submissions/${selectedSubmission.id}`, payload).catch(() => {
        return api.patch(`/api/submissions/${selectedSubmission.id}`, payload).catch(() => {
           return api.put(`/api/submissions/${selectedSubmission.id}/grade`, payload);
        });
      });

      toast.success("Submission graded successfully!");
      setIsModalOpen(false);
      fetchData(); // Refresh list to reflect changes
    } catch (err) {
      console.error("Grading failed:", err);
      toast.error(err.response?.data?.message || "Grading operation might not be supported by the backend.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="text-gray-500">Loading submissions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-6 rounded-lg border border-red-100 flex flex-col items-center justify-center text-center">
        <AlertCircle size={48} className="text-red-400 mb-4" />
        <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Data</h2>
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={fetchData} className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition">
          <RefreshCw size={16} className="mr-2" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-2">
          <Link to="/faculty" className="text-gray-500 hover:text-indigo-600 md:hidden"><ArrowLeft size={20} /></Link>
          <h1 className="text-2xl font-bold text-gray-800">Submissions</h1>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Submissions</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{totalCount}</span>
            <ClipboardList className="text-indigo-400" size={24} />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 border-l-4 border-l-amber-500">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Pending Review</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{pendingCount}</span>
            <Clock className="text-amber-500" size={24} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 border-l-4 border-l-emerald-500">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Graded</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{gradedCount}</span>
            <CheckCircle2 className="text-emerald-500" size={24} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 border-l-4 border-l-red-500">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Late Submissions</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{lateCount}</span>
            <AlertTriangle className="text-red-500" size={24} />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0 md:space-x-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-md leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-indigo-500 sm:text-sm"
            placeholder="Search student or assignment..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
          <div className="relative">
            <select
              className="appearance-none w-full sm:w-48 bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded focus:outline-none focus:bg-white focus:border-indigo-500 text-sm truncate"
              value={assignmentFilter}
              onChange={(e) => setAssignmentFilter(e.target.value)}
            >
              <option value="All">All Assignments</option>
              {uniqueAssignments.map((a, i) => <option key={i} value={a}>{a}</option>)}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              <Filter size={14} />
            </div>
          </div>

          <div className="relative">
            <select
              className="appearance-none w-full sm:w-36 bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded focus:outline-none focus:bg-white focus:border-indigo-500 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending Review</option>
              <option value="Graded">Graded</option>
              <option value="Late">Late Submissions</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              <Filter size={14} />
            </div>
          </div>

          <div className="relative">
            <select
              className="appearance-none w-full sm:w-36 bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded focus:outline-none focus:bg-white focus:border-indigo-500 text-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              <Filter size={14} />
            </div>
          </div>
        </div>
      </div>

      {/* Submissions List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        {filteredSubmissions.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <ClipboardList size={48} className="text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No Submissions Found</h2>
            <p className="text-gray-500">There are no submissions matching your current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-sm text-gray-500">
                  <th className="p-4 font-medium">Student</th>
                  <th className="p-4 font-medium">Assignment & Subject</th>
                  <th className="p-4 font-medium">Submitted</th>
                  <th className="p-4 font-medium">Status & Marks</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredSubmissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-gray-800">{sub.studentName}</div>
                      <div className="text-xs text-gray-500">{sub.studentRoll}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-gray-700">{sub.assignmentTitle}</div>
                      <div className="text-xs text-gray-500">{sub.subject}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-gray-800">{sub.submittedAt.toLocaleDateString()}</div>
                      <div className="text-xs mt-1">
                        {sub.lateStatus === 'Late' ? (
                           <span className="text-red-600 font-medium bg-red-50 px-1.5 py-0.5 rounded border border-red-100">Late</span>
                        ) : (
                           <span className="text-emerald-600 font-medium">On Time</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      {sub.isGraded ? (
                        <div>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200 mb-1">
                            Graded
                          </span>
                          <div className="text-sm font-bold text-gray-800">
                            {sub.marks} <span className="text-xs font-normal text-gray-500">/ {sub.maxMarks}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                          Pending Review
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => openModal(sub)}
                        className="inline-flex items-center px-3 py-1.5 bg-white border border-gray-200 rounded text-sm font-medium text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-colors shadow-sm"
                      >
                        {sub.isGraded ? (
                          <><Eye size={14} className="mr-1.5" /> View</>
                        ) : (
                          <><Edit3 size={14} className="mr-1.5" /> Review</>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details & Grading Modal */}
      {isModalOpen && selectedSubmission && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full flex flex-col max-h-[90vh]">
              
              {/* Modal Header */}
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-100 flex justify-between items-start flex-shrink-0">
                <div>
                  <h3 className="text-xl leading-6 font-bold text-gray-900" id="modal-title">
                    Submission Review
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{selectedSubmission.assignmentTitle} • {selectedSubmission.subject}</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500 transition-colors">
                  <X size={24} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6 flex flex-col lg:flex-row gap-6">
                
                {/* Left Column: Submission Content */}
                <div className="flex-1 space-y-6">
                  
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <div className="flex items-center mb-4 pb-3 border-b border-gray-100">
                      <div className="bg-indigo-100 p-2 rounded-full text-indigo-600 mr-3">
                        <User size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800">{selectedSubmission.studentName}</h4>
                        <p className="text-xs text-gray-500">Roll No: {selectedSubmission.studentRoll}</p>
                      </div>
                      <div className="ml-auto text-right">
                        <p className="text-xs text-gray-500 mb-1">Submitted</p>
                        <p className={`text-sm font-semibold ${selectedSubmission.lateStatus === 'Late' ? 'text-red-600' : 'text-emerald-600'}`}>
                          {selectedSubmission.submittedAt.toLocaleDateString()} {selectedSubmission.lateStatus === 'Late' && '(Late)'}
                        </p>
                      </div>
                    </div>

                    {selectedSubmission.assignmentDesc && (
                      <div className="mb-4 bg-gray-50 p-3 rounded text-sm text-gray-600 border border-gray-200">
                        <p className="font-semibold text-gray-800 mb-1 flex items-center">
                          <FileText size={14} className="mr-1 text-gray-500"/> Assignment Prompt
                        </p>
                        <p className="line-clamp-2 hover:line-clamp-none transition-all">{selectedSubmission.assignmentDesc}</p>
                      </div>
                    )}

                    <div>
                      <h4 className="text-sm font-bold text-gray-800 mb-2">Student's Work:</h4>
                      <div className="bg-gray-50 p-4 rounded-md border border-gray-200 text-sm text-gray-800 whitespace-pre-wrap min-h-[200px] break-words">
                        {/* If it's a URL (like a drive link or github repo), make it clickable, else show text */}
                        {selectedSubmission.content.match(/^https?:\/\//) ? (
                          <a href={selectedSubmission.content} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline break-all flex items-center">
                            <FileText size={16} className="mr-2" /> View Attached File / Link
                          </a>
                        ) : (
                          selectedSubmission.content
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Grading Panel */}
                <div className="w-full lg:w-80 flex-shrink-0">
                  <div className="bg-white p-5 rounded-lg shadow-sm border border-indigo-100">
                    
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-bold text-gray-800 text-lg">Evaluation</h4>
                      {selectedSubmission.isGraded ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 size={12} className="mr-1" /> Graded
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                          Pending
                        </span>
                      )}
                    </div>

                    {!isGrading && selectedSubmission.isGraded ? (
                      <div className="space-y-4">
                        <div className="bg-gray-50 p-4 rounded text-center border border-gray-200">
                          <p className="text-sm text-gray-500 font-medium mb-1">Score Awarded</p>
                          <div className="text-3xl font-bold text-indigo-700">
                            {selectedSubmission.marks} <span className="text-lg text-gray-400 font-normal">/ {selectedSubmission.maxMarks}</span>
                          </div>
                        </div>
                        
                        {selectedSubmission.feedback && (
                          <div>
                            <p className="text-sm text-gray-500 font-medium mb-1">Feedback Provided</p>
                            <div className="bg-yellow-50 p-3 rounded text-sm text-yellow-800 border border-yellow-100">
                              {selectedSubmission.feedback}
                            </div>
                          </div>
                        )}

                        <button 
                          onClick={() => setIsGrading(true)}
                          className="w-full mt-4 flex items-center justify-center px-4 py-2 bg-white border border-gray-300 rounded shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                        >
                          <Edit3 size={16} className="mr-2" /> Modify Grade
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleGradeSubmit} className="space-y-4">
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Marks <span className="text-red-500">*</span></label>
                            <input
                              type="number"
                              required
                              min="0"
                              max={gradeForm.maxMarks}
                              value={gradeForm.marks}
                              onChange={(e) => setGradeForm({...gradeForm, marks: e.target.value})}
                              className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                            />
                          </div>
                          <div className="w-20">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Out Of</label>
                            <input
                              type="number"
                              disabled
                              value={gradeForm.maxMarks}
                              className="w-full border border-gray-200 rounded-md p-2 bg-gray-50 text-gray-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Feedback / Comments</label>
                          <textarea
                            rows="4"
                            placeholder="Great job on..."
                            value={gradeForm.feedback}
                            onChange={(e) => setGradeForm({...gradeForm, feedback: e.target.value})}
                            className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                          ></textarea>
                        </div>

                        <div className="pt-2 flex flex-col gap-2">
                          <button
                            type="submit"
                            disabled={isSubmitting || !gradeForm.marks}
                            className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:opacity-50"
                          >
                            {isSubmitting ? 'Saving...' : 'Save Grade'}
                          </button>
                          
                          {isGrading && selectedSubmission.isGraded && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsGrading(false);
                                setGradeForm({
                                  marks: selectedSubmission.marks,
                                  maxMarks: selectedSubmission.maxMarks,
                                  feedback: selectedSubmission.feedback
                                });
                              }}
                              className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                            >
                              Cancel Edit
                            </button>
                          )}
                        </div>
                      </form>
                    )}
                  </div>
                </div>

              </div>
              
              {/* Modal Footer */}
              <div className="bg-white px-4 py-3 sm:px-6 flex justify-end border-t border-gray-200 flex-shrink-0 rounded-b-lg">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-6 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Submissions;
