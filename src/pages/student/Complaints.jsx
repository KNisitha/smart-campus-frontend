import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { 
  Frown, MessageSquare, Clock, CheckCircle, 
  XCircle, AlertTriangle, Plus, X, Search, 
  Filter, RefreshCw, AlertCircle, ArrowLeft,
  Calendar, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

const Complaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

  // Modal States
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    category: 'Hostel', // Default fallback
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/complaints');
      
      const data = Array.isArray(response.data?.data || response.data) 
        ? (response.data?.data || response.data) 
        : [];
      
      setComplaints(data);
    } catch (err) {
      console.error("Failed to fetch complaints:", err);
      setError(err.response?.data?.message || 'Failed to load complaints data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  // Normalization for robust rendering
  const normalizedComplaints = complaints.map(c => ({
    id: c._id || c.id,
    title: c.title || c.subject || 'Untitled Complaint',
    category: c.category || 'General',
    description: c.description || 'No description provided.',
    status: c.status || 'Pending',
    createdAt: new Date(c.createdAt || c.date || Date.now()),
    updatedAt: new Date(c.updatedAt || c.resolvedAt || c.createdAt || Date.now()),
    remarks: c.remarks || c.adminRemarks || c.resolutionDetails || null,
    raw: c
  }));

  // Unique Categories dynamically extracted + defaults
  const dynamicCategories = [...new Set(normalizedComplaints.map(c => c.category))];
  const formCategories = [...new Set([...dynamicCategories, 'Hostel', 'Academic', 'Facilities', 'Administration', 'Other'])];

  // Filters & Search
  const filteredComplaints = normalizedComplaints.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || c.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesCategory = categoryFilter === 'All' || c.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  }).sort((a, b) => {
    if (sortBy === 'newest') return b.createdAt - a.createdAt;
    if (sortBy === 'oldest') return a.createdAt - b.createdAt;
    if (sortBy === 'recentlyUpdated') return b.updatedAt - a.updatedAt;
    return 0;
  });

  // Derived Stats
  const totalCount = normalizedComplaints.length;
  const pendingCount = normalizedComplaints.filter(c => c.status.toLowerCase() === 'pending').length;
  const inProgressCount = normalizedComplaints.filter(c => c.status.toLowerCase().includes('progress')).length;
  const resolvedCount = normalizedComplaints.filter(c => c.status.toLowerCase() === 'resolved').length;
  const rejectedCount = normalizedComplaints.filter(c => c.status.toLowerCase() === 'rejected').length;

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: formData.title,
        subject: formData.title, // Send both to satisfy flat/nested APIs safely
        category: formData.category,
        description: formData.description
      };

      await api.post('/api/complaints', payload);
      toast.success("Complaint submitted successfully.");
      
      setFormData({ title: '', category: 'Hostel', description: '' });
      setIsNewModalOpen(false);
      fetchComplaints(); // Refresh data
    } catch (err) {
      console.error("Submission failed:", err);
      toast.error(err.response?.data?.message || 'Failed to submit complaint');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = status.toLowerCase();
    if (s === 'resolved') {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle size={12} className="mr-1"/> Resolved</span>;
    } else if (s === 'rejected') {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle size={12} className="mr-1"/> Rejected</span>;
    } else if (s.includes('progress')) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><RefreshCw size={12} className="mr-1"/> In Progress</span>;
    } else {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800"><Clock size={12} className="mr-1"/> Pending</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-500">Loading complaints...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-6 rounded-lg border border-red-100 flex flex-col items-center justify-center text-center">
        <AlertCircle size={48} className="text-red-400 mb-4" />
        <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Data</h2>
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={fetchComplaints} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
          <RefreshCw size={16} className="mr-2" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-2">
          <Link to="/student" className="text-gray-500 hover:text-blue-600 md:hidden"><ArrowLeft size={20} /></Link>
          <h1 className="text-2xl font-bold text-gray-800">My Complaints</h1>
        </div>
        <button 
          onClick={() => setIsNewModalOpen(true)}
          className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition shadow-sm font-medium"
        >
          <Plus size={18} className="mr-2" />
          New Complaint
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{totalCount}</span>
            <MessageSquare className="text-gray-400" size={20} />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 border-l-4 border-l-orange-400">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Pending</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{pendingCount}</span>
            <Clock className="text-orange-400" size={20} />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 border-l-4 border-l-blue-400">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">In Progress</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{inProgressCount}</span>
            <RefreshCw className="text-blue-400" size={20} />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 border-l-4 border-l-green-400">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Resolved</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{resolvedCount}</span>
            <CheckCircle className="text-green-400" size={20} />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 border-l-4 border-l-red-400 hidden md:block">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Rejected</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{rejectedCount}</span>
            <XCircle className="text-red-400" size={20} />
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
            placeholder="Search complaints..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
          <div className="relative">
            <select
              className="appearance-none w-full sm:w-36 bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded focus:outline-none focus:bg-white focus:border-blue-500 text-sm"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="All">All Categories</option>
              {dynamicCategories.map((c, i) => <option key={i} value={c}>{c}</option>)}
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
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Rejected">Rejected</option>
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
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="recentlyUpdated">Recently Updated</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              <Filter size={14} />
            </div>
          </div>
        </div>
      </div>

      {/* Complaints List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        {filteredComplaints.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Frown size={48} className="text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No Complaints Found</h2>
            <p className="text-gray-500">You have no complaints matching the selected filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-sm text-gray-500">
                  <th className="p-4 font-medium">Complaint Details</th>
                  <th className="p-4 font-medium text-center">Status</th>
                  <th className="p-4 font-medium text-right hidden sm:table-cell">Dates</th>
                  <th className="p-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredComplaints.map((c) => (
                  <tr 
                    key={c.id} 
                    className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedComplaint(c)}
                  >
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-800 line-clamp-1">{c.title}</span>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                            {c.category}
                          </span>
                          <span className="text-xs text-gray-500 line-clamp-1 hidden md:inline-block max-w-[200px]">
                            {c.description}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      {getStatusBadge(c.status)}
                    </td>
                    <td className="p-4 text-right hidden sm:table-cell">
                      <div className="text-sm text-gray-800">{c.createdAt.toLocaleDateString()}</div>
                      <div className="text-xs text-gray-400">Upd: {c.updatedAt.toLocaleDateString()}</div>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-sm text-blue-600 font-medium">View</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Complaint Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsNewModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center">
                  <AlertTriangle className="text-orange-500 mr-2" size={20} />
                  <h3 className="text-xl leading-6 font-bold text-gray-900" id="modal-title">
                    File a New Complaint
                  </h3>
                </div>
                <button onClick={() => setIsNewModalOpen(false)} className="text-gray-400 hover:text-gray-500 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="px-4 py-5 sm:p-6 space-y-4 bg-gray-50">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title / Subject <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="title"
                    required
                    maxLength={100}
                    placeholder="Briefly state the issue"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
                  <select
                    name="category"
                    required
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    {formCategories.map((c, i) => <option key={i} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-red-500">*</span></label>
                  <textarea
                    name="description"
                    rows="4"
                    required
                    placeholder="Provide detailed information about the issue..."
                    value={formData.description}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  ></textarea>
                </div>

                <div className="pt-4 flex justify-end space-x-3 border-t border-gray-200 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsNewModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Complaint'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setSelectedComplaint(null)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full sm:my-8 sm:align-middle sm:max-w-xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 border-b border-gray-100">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                        {selectedComplaint.category}
                      </span>
                      {getStatusBadge(selectedComplaint.status)}
                    </div>
                    <h3 className="text-xl leading-6 font-bold text-gray-900" id="modal-title">
                      {selectedComplaint.title}
                    </h3>
                  </div>
                  <button onClick={() => setSelectedComplaint(null)} className="text-gray-400 hover:text-gray-500">
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="px-4 py-5 sm:p-6 bg-gray-50 space-y-5">
                
                <div className="flex flex-col sm:flex-row gap-6 border-b border-gray-200 pb-5">
                  <div className="flex-1 flex items-start text-sm">
                    <Calendar className="text-gray-400 mr-2 flex-shrink-0 mt-0.5" size={16} />
                    <div>
                      <p className="text-gray-500 font-medium">Date Filed</p>
                      <p className="text-gray-800">{selectedComplaint.createdAt.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex-1 flex items-start text-sm">
                    <Clock className="text-gray-400 mr-2 flex-shrink-0 mt-0.5" size={16} />
                    <div>
                      <p className="text-gray-500 font-medium">Last Updated</p>
                      <p className="text-gray-800">{selectedComplaint.updatedAt.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                    <FileText size={16} className="text-gray-400 mr-1" /> Description
                  </h4>
                  <div className="bg-white p-4 rounded-md border border-gray-200 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {selectedComplaint.description}
                  </div>
                </div>

                {selectedComplaint.remarks && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                      <MessageSquare size={16} className="text-gray-400 mr-1" /> Admin / Resolution Remarks
                    </h4>
                    <div className={`p-4 rounded-md border text-sm whitespace-pre-wrap leading-relaxed ${
                      selectedComplaint.status.toLowerCase() === 'rejected' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-800'
                    }`}>
                      {selectedComplaint.remarks}
                    </div>
                  </div>
                )}

              </div>
              
              <div className="bg-white px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setSelectedComplaint(null)}
                  className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
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

export default Complaints;
