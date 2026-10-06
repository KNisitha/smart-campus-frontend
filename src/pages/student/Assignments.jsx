import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { 
  FileText, CheckCircle, Clock, AlertCircle, 
  Search, Filter, Calendar, BookOpen, ChevronRight,
  Upload, X, RefreshCw, ArrowLeft
} from 'lucide-react';
import toast from 'react-hot-toast';

const Assignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('dueDateAsc');

  // Modal State
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionContent, setSubmissionContent] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [assignmentsRes, submissionsRes] = await Promise.all([
        api.get('/api/assignments'),
        api.get('/api/submissions')
      ]);

      const assignmentsData = Array.isArray(assignmentsRes.data?.data || assignmentsRes.data) 
        ? (assignmentsRes.data?.data || assignmentsRes.data) 
        : [];
      
      const submissionsData = Array.isArray(submissionsRes.data?.data || submissionsRes.data) 
        ? (submissionsRes.data?.data || submissionsRes.data) 
        : [];

      setAssignments(assignmentsData);
      setSubmissions(submissionsData);
    } catch (err) {
      console.error("Failed to fetch assignments:", err);
      setError(err.response?.data?.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Normalizing & Merging Data
  const normalizedAssignments = assignments.map(assignment => {
    const id = assignment._id || assignment.id;
    // Check if there's a submission for this assignment
    const submission = submissions.find(sub => 
      (sub.assignment?._id || sub.assignment?.id || sub.assignmentId || sub.assignment) === id
    );

    const dueDate = new Date(assignment.dueDate || Date.now());
    const isOverdue = !submission && dueDate < new Date();
    
    let status = 'Pending';
    if (submission) status = 'Submitted';
    else if (isOverdue) status = 'Overdue';

    return {
      id,
      title: assignment.title || 'Untitled',
      description: assignment.description || 'No description provided.',
      subject: assignment.subject?.name || assignment.subjectName || assignment.subject || 'Unknown Subject',
      faculty: assignment.faculty?.name || assignment.facultyName || assignment.faculty || 'Unknown Faculty',
      assignedDate: new Date(assignment.assignedDate || assignment.createdAt || Date.now()),
      dueDate,
      status,
      submission,
      raw: assignment
    };
  });

  // Filtering and Sorting
  const filteredAssignments = normalizedAssignments.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = subjectFilter === 'All' || a.subject === subjectFilter;
    const matchesStatus = statusFilter === 'All' || a.status === statusFilter;
    return matchesSearch && matchesSubject && matchesStatus;
  }).sort((a, b) => {
    if (sortBy === 'dueDateAsc') return a.dueDate - b.dueDate;
    if (sortBy === 'dueDateDesc') return b.dueDate - a.dueDate;
    if (sortBy === 'assignedDesc') return b.assignedDate - a.assignedDate;
    return 0;
  });

  const uniqueSubjects = [...new Set(normalizedAssignments.map(a => a.subject))];

  // Stats
  const totalCount = normalizedAssignments.length;
  const submittedCount = normalizedAssignments.filter(a => a.status === 'Submitted').length;
  const overdueCount = normalizedAssignments.filter(a => a.status === 'Overdue').length;
  const pendingCount = normalizedAssignments.filter(a => a.status === 'Pending').length;

  // Submit Handler
  const handleSubmission = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Trying standard JSON submission structure
      const payload = {
        assignmentId: selectedAssignment.id,
        assignment: selectedAssignment.id,
        content: submissionContent
      };
      
      await api.post('/api/submissions', payload);
      toast.success('Assignment submitted successfully');
      setSubmissionContent('');
      setSelectedAssignment(null);
      fetchData(); // Refresh data
    } catch (err) {
      console.error("Submission failed:", err);
      toast.error(err.response?.data?.message || 'Failed to submit assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'Submitted':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle size={12} className="mr-1"/> Submitted</span>;
      case 'Overdue':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><AlertCircle size={12} className="mr-1"/> Overdue</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800"><Clock size={12} className="mr-1"/> Pending</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-500">Loading assignments...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-6 rounded-lg border border-red-100 flex flex-col items-center justify-center text-center">
        <AlertCircle size={48} className="text-red-400 mb-4" />
        <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Assignments</h2>
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={fetchData} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
          <RefreshCw size={16} className="mr-2" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Link to="/student" className="text-gray-500 hover:text-blue-600 md:hidden"><ArrowLeft size={20} /></Link>
        <h1 className="text-2xl font-bold text-gray-800">Assignments</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium">Total</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{totalCount}</span>
            <FileText className="text-blue-500" size={24} />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium">Pending</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{pendingCount}</span>
            <Clock className="text-orange-500" size={24} />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium">Submitted</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{submittedCount}</span>
            <CheckCircle className="text-green-500" size={24} />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium">Overdue</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{overdueCount}</span>
            <AlertCircle className="text-red-500" size={24} />
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
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-md leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-500 sm:text-sm"
            placeholder="Search assignments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
          <div className="relative">
            <select
              className="appearance-none w-full sm:w-36 bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded focus:outline-none focus:bg-white focus:border-blue-500 text-sm"
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
            >
              <option value="All">All Subjects</option>
              {uniqueSubjects.map((s, i) => <option key={i} value={s}>{s}</option>)}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              <Filter size={14} />
            </div>
          </div>

          <div className="relative">
            <select
              className="appearance-none w-full sm:w-36 bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded focus:outline-none focus:bg-white focus:border-blue-500 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Submitted">Submitted</option>
              <option value="Overdue">Overdue</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              <Filter size={14} />
            </div>
          </div>

          <div className="relative">
            <select
              className="appearance-none w-full sm:w-44 bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded focus:outline-none focus:bg-white focus:border-blue-500 text-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="dueDateAsc">Due Date (Earliest)</option>
              <option value="dueDateDesc">Due Date (Latest)</option>
              <option value="assignedDesc">Recently Assigned</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              <Filter size={14} />
            </div>
          </div>
        </div>
      </div>

      {/* Assignment List */}
      {filteredAssignments.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow-sm border border-gray-100 text-center">
          <FileText size={48} className="text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Assignments Found</h2>
          <p className="text-gray-500">You don't have any assignments matching the current criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssignments.map((assignment) => (
            <div 
              key={assignment.id} 
              className="bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer flex flex-col"
              onClick={() => setSelectedAssignment(assignment)}
            >
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    {assignment.subject}
                  </span>
                  {getStatusBadge(assignment.status)}
                </div>
                <h3 className="font-semibold text-lg text-gray-800 line-clamp-2 mb-2">
                  {assignment.title}
                </h3>
                <p className="text-sm text-gray-500 line-clamp-3 mb-4">
                  {assignment.description}
                </p>
                <div className="flex items-center text-xs text-gray-500 mt-auto">
                  <Calendar size={14} className="mr-1" />
                  Due: {assignment.dueDate.toLocaleDateString()}
                </div>
              </div>
              <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between text-sm text-blue-600 font-medium hover:bg-gray-50">
                View Details <ChevronRight size={16} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assignment Modal */}
      {selectedAssignment && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setSelectedAssignment(null)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-100">
                <div className="flex justify-between items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {selectedAssignment.subject}
                      </span>
                      {getStatusBadge(selectedAssignment.status)}
                    </div>
                    <h3 className="text-xl leading-6 font-bold text-gray-900" id="modal-title">
                      {selectedAssignment.title}
                    </h3>
                  </div>
                  <button onClick={() => setSelectedAssignment(null)} className="text-gray-400 hover:text-gray-500 transition-colors">
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="px-4 py-5 sm:p-6 bg-gray-50 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="block text-gray-500 font-medium mb-1">Faculty</span>
                    <span className="text-gray-800">{selectedAssignment.faculty}</span>
                  </div>
                  <div>
                    <span className="block text-gray-500 font-medium mb-1">Assigned Date</span>
                    <span className="text-gray-800">{selectedAssignment.assignedDate.toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="block text-gray-500 font-medium mb-1">Due Date</span>
                    <span className={`font-medium ${selectedAssignment.status === 'Overdue' ? 'text-red-600' : 'text-gray-800'}`}>
                      {selectedAssignment.dueDate.toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="block text-gray-500 font-medium mb-2 text-sm">Description</span>
                  <div className="bg-white p-4 rounded-md border border-gray-200 text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedAssignment.description}
                  </div>
                </div>

                {selectedAssignment.status !== 'Submitted' && (
                  <div className="pt-4 border-t border-gray-200">
                    <h4 className="text-lg font-medium text-gray-900 mb-3">Submit Assignment</h4>
                    <form onSubmit={handleSubmission}>
                      <textarea
                        rows="4"
                        required
                        value={submissionContent}
                        onChange={(e) => setSubmissionContent(e.target.value)}
                        className="w-full border border-gray-300 rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Write your submission content or paste a link here..."
                      ></textarea>
                      <div className="mt-4 flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => setSelectedAssignment(null)}
                          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="inline-flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          {isSubmitting ? 'Submitting...' : 'Submit Now'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
                
                {selectedAssignment.status === 'Submitted' && selectedAssignment.submission && (
                  <div className="pt-4 border-t border-gray-200">
                    <div className="bg-green-50 border border-green-200 rounded-md p-4">
                      <div className="flex items-center mb-2">
                        <CheckCircle size={20} className="text-green-600 mr-2" />
                        <h4 className="font-semibold text-green-800">Successfully Submitted</h4>
                      </div>
                      <p className="text-sm text-green-700 mb-2">
                        Submitted on: {new Date(selectedAssignment.submission.createdAt || Date.now()).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assignments;
