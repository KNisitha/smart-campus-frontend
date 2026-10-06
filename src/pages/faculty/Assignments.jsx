import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { 
  ClipboardList, Search, Filter, Plus, 
  X, CheckCircle, Clock, AlertCircle, 
  RefreshCw, Trash2, Calendar, Edit,
  Eye, FileText, ArrowLeft, MoreVertical
} from 'lucide-react';
import toast from 'react-hot-toast';

const Assignments = () => {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('dueAsc');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [isDetailsMode, setIsDetailsMode] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    description: '',
    dueDate: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [assignRes, subRes] = await Promise.allSettled([
        api.get('/api/assignments'),
        api.get('/api/submissions')
      ]);

      if (assignRes.status === 'fulfilled') {
        const data = Array.isArray(assignRes.value.data?.data || assignRes.value.data) 
          ? (assignRes.value.data?.data || assignRes.value.data) : [];
        setAssignments(data);
      }

      if (subRes.status === 'fulfilled') {
        const data = Array.isArray(subRes.value.data?.data || subRes.value.data) 
          ? (subRes.value.data?.data || subRes.value.data) : [];
        setSubmissions(data);
      }

    } catch (err) {
      console.error("Failed to fetch assignment data:", err);
      setError("Failed to load assignment data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Data Normalization
  const normalizedAssignments = assignments.map(a => {
    const dueDate = new Date(a.dueDate || a.deadline || Date.now());
    const isOverdue = dueDate < new Date(new Date().setHours(0,0,0,0));
    
    // Cross-reference submissions safely
    const relatedSubmissions = submissions.filter(s => {
      const sId = s.assignment?._id || s.assignment?.id || s.assignmentId || s.assignment;
      const aId = a._id || a.id;
      return sId === aId;
    });

    return {
      id: a._id || a.id,
      title: a.title || a.name || 'Untitled Assignment',
      subject: a.subject || a.course || 'General',
      description: a.description || 'No description provided.',
      dueDate,
      createdAt: new Date(a.createdAt || a.date || Date.now()),
      status: isOverdue ? 'Overdue' : 'Active',
      submissionCount: relatedSubmissions.length,
      raw: a
    };
  });

  const uniqueSubjects = [...new Set(normalizedAssignments.map(a => a.subject))];

  // Filters
  const filteredAssignments = normalizedAssignments.filter(a => {
    const matchSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        a.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchSubject = subjectFilter === 'All' || a.subject === subjectFilter;
    const matchStatus = statusFilter === 'All' || a.status === statusFilter;
    
    return matchSearch && matchSubject && matchStatus;
  }).sort((a, b) => {
    if (sortBy === 'dueAsc') return a.dueDate - b.dueDate;
    if (sortBy === 'dueDesc') return b.dueDate - a.dueDate;
    if (sortBy === 'newest') return b.createdAt - a.createdAt;
    return 0;
  });

  // Stats
  const totalCount = normalizedAssignments.length;
  const activeCount = normalizedAssignments.filter(a => a.status === 'Active').length;
  
  // Calculate due soon (next 3 days)
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  const dueSoonCount = normalizedAssignments.filter(a => 
    a.status === 'Active' && a.dueDate <= threeDaysFromNow && a.dueDate >= new Date()
  ).length;
  
  const overdueCount = normalizedAssignments.filter(a => a.status === 'Overdue').length;

  // Form Handlers
  const openCreateModal = () => {
    setFormData({
      title: '',
      subject: '',
      description: '',
      dueDate: ''
    });
    setSelectedAssignment(null);
    setIsDetailsMode(false);
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.subject.trim() || !formData.dueDate) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: formData.title,
        name: formData.title,
        subject: formData.subject,
        course: formData.subject,
        description: formData.description,
        dueDate: formData.dueDate,
        deadline: formData.dueDate
      };

      await api.post('/api/assignments', payload);
      toast.success("Assignment created successfully");
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error("Failed to create assignment:", err);
      toast.error(err.response?.data?.message || 'Failed to create assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this assignment?")) return;
    try {
      await api.delete(`/api/assignments/${id}`);
      toast.success("Assignment deleted");
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error(err.response?.data?.message || "Failed to delete. Action might not be supported.");
    }
  };

  const openDetails = (assignment) => {
    setSelectedAssignment(assignment);
    setIsDetailsMode(true);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="text-gray-500">Loading assignments...</p>
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
          <h1 className="text-2xl font-bold text-gray-800">Assignments</h1>
        </div>
        <button 
          onClick={openCreateModal}
          className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition shadow-sm font-medium"
        >
          <Plus size={18} className="mr-2" />
          Create Assignment
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Assignments</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{totalCount}</span>
            <FileText className="text-indigo-400" size={24} />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 border-l-4 border-l-emerald-500">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Active</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{activeCount}</span>
            <CheckCircle className="text-emerald-500" size={24} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 border-l-4 border-l-amber-500">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Due Soon</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{dueSoonCount}</span>
            <Clock className="text-amber-500" size={24} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 border-l-4 border-l-red-500">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Overdue</p>
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
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-md leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-indigo-500 sm:text-sm"
            placeholder="Search assignments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
          <div className="relative">
            <select
              className="appearance-none w-full sm:w-36 bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded focus:outline-none focus:bg-white focus:border-indigo-500 text-sm"
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
              className="appearance-none w-full sm:w-36 bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded focus:outline-none focus:bg-white focus:border-indigo-500 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Overdue">Overdue</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              <Filter size={14} />
            </div>
          </div>

          <div className="relative">
            <select
              className="appearance-none w-full sm:w-40 bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded focus:outline-none focus:bg-white focus:border-indigo-500 text-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="dueAsc">Due Date (Earliest)</option>
              <option value="dueDesc">Due Date (Latest)</option>
              <option value="newest">Recently Created</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              <Filter size={14} />
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      {filteredAssignments.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow-sm border border-gray-100 text-center">
          <ClipboardList size={48} className="text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Assignments Found</h2>
          <p className="text-gray-500">There are no assignments matching your current criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredAssignments.map((assignment) => (
            <div 
              key={assignment.id} 
              className="bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col overflow-hidden"
            >
              <div className="p-5 flex-1 cursor-pointer" onClick={() => openDetails(assignment)}>
                <div className="flex justify-between items-start mb-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                    {assignment.subject}
                  </span>
                  {assignment.status === 'Overdue' ? (
                     <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                       Overdue
                     </span>
                  ) : (
                     <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                       Active
                     </span>
                  )}
                </div>
                
                <h3 className="font-bold text-lg text-gray-800 line-clamp-1 mb-2">
                  {assignment.title}
                </h3>
                
                <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                  {assignment.description}
                </p>
                
                <div className="space-y-2 mt-auto text-sm text-gray-500">
                  <div className="flex items-center text-rose-600 font-medium">
                    <Calendar size={14} className="mr-2 flex-shrink-0" />
                    <span className="truncate">Due: {assignment.dueDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric'})}</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle size={14} className="mr-2 flex-shrink-0" />
                    <span className="truncate">{assignment.submissionCount} Submissions</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                <button onClick={() => openDetails(assignment)} className="text-sm text-indigo-600 font-medium hover:text-indigo-800 flex items-center">
                  <Eye size={16} className="mr-1" /> View Details
                </button>
                <div className="flex space-x-2">
                  <button onClick={() => navigate('/faculty/submissions')} className="p-1 text-gray-400 hover:text-emerald-600 transition" title="View Submissions">
                    <ClipboardList size={18} />
                  </button>
                  <button onClick={() => handleDelete(assignment.id)} className="p-1 text-gray-400 hover:text-red-600 transition" title="Delete">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal - Create OR View */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full sm:my-8 sm:align-middle sm:max-w-xl sm:w-full">
              
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xl leading-6 font-bold text-gray-900" id="modal-title">
                  {isDetailsMode ? 'Assignment Details' : 'Create New Assignment'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500 transition-colors">
                  <X size={24} />
                </button>
              </div>

              {!isDetailsMode ? (
                // CREATE FORM
                <form onSubmit={handleSubmit} className="px-4 py-5 sm:p-6 space-y-4 bg-gray-50">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assignment Title <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="title"
                      required
                      placeholder="e.g. Chapter 3 Problems"
                      value={formData.title}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Subject <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        name="subject"
                        required
                        placeholder="e.g. Mathematics"
                        value={formData.subject}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Due Date <span className="text-red-500">*</span></label>
                      <input
                        type="date"
                        name="dueDate"
                        required
                        value={formData.dueDate}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-red-500">*</span></label>
                    <textarea
                      name="description"
                      rows="4"
                      required
                      placeholder="Provide detailed instructions..."
                      value={formData.description}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    ></textarea>
                  </div>

                  <div className="pt-4 flex justify-end space-x-3 border-t border-gray-200 mt-6">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:opacity-50"
                    >
                      {isSubmitting ? 'Creating...' : 'Create Assignment'}
                    </button>
                  </div>
                </form>
              ) : (
                // VIEW DETAILS
                <div className="bg-gray-50 p-6 space-y-6">
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-gray-200 pb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Subject</p>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                        {selectedAssignment?.subject}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Status</p>
                      {selectedAssignment?.status === 'Overdue' ? (
                         <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                           Overdue
                         </span>
                      ) : (
                         <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                           Active
                         </span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Due Date</p>
                      <p className="text-base font-semibold text-rose-600 flex items-center">
                        <Calendar size={16} className="mr-1" />
                        {selectedAssignment?.dueDate.toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Created Date</p>
                      <p className="text-sm font-medium text-gray-800">
                        {selectedAssignment?.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                      <FileText size={16} className="text-gray-400 mr-2" /> Description / Instructions
                    </h4>
                    <div className="bg-white p-4 rounded-md border border-gray-200 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {selectedAssignment?.description}
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-blue-900">Submission Metrics</p>
                      <p className="text-xs text-blue-700 mt-1">{selectedAssignment?.submissionCount} students have submitted work.</p>
                    </div>
                    <button 
                      onClick={() => { setIsModalOpen(false); navigate('/faculty/submissions'); }}
                      className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition"
                    >
                      View All
                    </button>
                  </div>
                  
                  <div className="bg-white px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200 mt-6 -mx-6 -mb-6 rounded-b-lg">
                    <button 
                      type="button" 
                      onClick={() => setIsModalOpen(false)}
                      className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:w-auto sm:text-sm"
                    >
                      Close
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleDelete(selectedAssignment.id)}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-red-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-red-700 hover:bg-red-50 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm sm:mr-3"
                    >
                      <Trash2 size={16} className="mr-2" /> Delete
                    </button>
                  </div>

                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assignments;
