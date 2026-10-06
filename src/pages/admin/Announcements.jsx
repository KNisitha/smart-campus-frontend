import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { 
  Search, Plus, Edit2, Trash2, X, Eye, 
  Megaphone, RefreshCcw, AlertCircle, Clock, Bell, Users
} from 'lucide-react';
import toast from 'react-hot-toast';

const Announcements = () => {
  const { user: authUser } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

  // Modals
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  
  // Form
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    createdBy: '',
    targetRole: 'all',
    targetDepartment: '',
    targetYear: '',
    priority: 'normal',
    expiresAt: ''
  });
  const [formLoading, setFormLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const results = await Promise.allSettled([
        api.get('/api/announcements'),
        api.get('/api/users'),
        api.get('/api/departments')
      ]);

      if (results[0].status === 'rejected') {
        throw new Error('Failed to fetch announcements');
      }

      setAnnouncements(results[0].value?.data?.data || []);
      setUsers(results[1].status === 'fulfilled' ? (results[1].value?.data?.data || []) : []);
      setDepartments(results[2].status === 'fulfilled' ? (results[2].value?.data?.data || []) : []);

    } catch (err) {
      console.error('Fetch error', err);
      setError('Failed to fetch announcements. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Enrich announcements with relations and calculated status
  const enrichedAnnouncements = announcements.map(ann => {
    const author = users.find(u => u._id === ann.createdBy) || {};
    const dept = departments.find(d => d._id === ann.targetDepartment) || {};
    
    // Status calculation
    let status = 'Active';
    if (ann.expiresAt && new Date(ann.expiresAt) < new Date()) {
      status = 'Expired';
    }
    
    return {
      ...ann,
      author,
      department: dept,
      displayStatus: status
    };
  });

  // Summaries
  const totalAnnouncements = enrichedAnnouncements.length;
  const activeAnnouncements = enrichedAnnouncements.filter(a => a.displayStatus === 'Active').length;
  const expiredAnnouncements = enrichedAnnouncements.filter(a => a.displayStatus === 'Expired').length;
  const urgentAnnouncements = enrichedAnnouncements.filter(a => a.priority === 'urgent' && a.displayStatus === 'Active').length;

  // Filtering
  let filteredList = enrichedAnnouncements.filter(a => {
    const searchLower = searchTerm.toLowerCase();
    const titleMatch = a.title?.toLowerCase().includes(searchLower);
    const contentMatch = a.content?.toLowerCase().includes(searchLower);
    const authorMatch = a.author?.name?.toLowerCase().includes(searchLower);
    
    const matchesSearch = !searchTerm || titleMatch || contentMatch || authorMatch;
    const matchesRole = roleFilter === 'All' || a.targetRole === roleFilter;
    const matchesPriority = priorityFilter === 'All' || a.priority === priorityFilter;
    const matchesStatus = statusFilter === 'All' || a.displayStatus === statusFilter;

    return matchesSearch && matchesRole && matchesPriority && matchesStatus;
  });

  // Sorting
  filteredList.sort((a, b) => {
    if (sortBy === 'title-asc') return (a.title || '').localeCompare(b.title || '');
    if (sortBy === 'title-desc') return (b.title || '').localeCompare(a.title || '');
    if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
    return 0;
  });

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    
    try {
      await api.delete(`/api/announcements/${id}`);
      toast.success('Announcement deleted successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete announcement');
    }
  };

  const openFormModal = (announcement = null) => {
    if (announcement) {
      setSelectedAnnouncement(announcement);
      setFormData({
        title: announcement.title || '',
        content: announcement.content || '',
        createdBy: announcement.createdBy || '',
        targetRole: announcement.targetRole || 'all',
        targetDepartment: announcement.targetDepartment || '',
        targetYear: announcement.targetYear || '',
        priority: announcement.priority || 'normal',
        expiresAt: announcement.expiresAt ? new Date(announcement.expiresAt).toISOString().slice(0,16) : ''
      });
    } else {
      setSelectedAnnouncement(null);
      setFormData({
        title: '',
        content: '',
        createdBy: authUser?.id || authUser?.userId || authUser?._id || (users.length > 0 ? users[0]._id : ''),
        targetRole: 'all',
        targetDepartment: '',
        targetYear: '',
        priority: 'normal',
        expiresAt: ''
      });
    }
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const payload = { ...formData };
      
      // Clean up empty optional fields
      if (!payload.targetDepartment) delete payload.targetDepartment;
      if (!payload.targetYear) delete payload.targetYear;
      if (!payload.expiresAt) delete payload.expiresAt;

      if (selectedAnnouncement) {
        await api.patch(`/api/announcements/${selectedAnnouncement._id}`, payload);
        toast.success('Announcement updated successfully');
      } else {
        await api.post('/api/announcements', payload);
        toast.success('Announcement created successfully');
      }
      setIsFormModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Action failed');
    } finally {
      setFormLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setRoleFilter('All');
    setPriorityFilter('All');
    setStatusFilter('All');
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'important': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-8 w-64 bg-gray-200 animate-pulse rounded mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="bg-white p-4 rounded-lg shadow animate-pulse h-24"></div>)}
        </div>
        <div className="bg-white rounded-lg shadow p-4 animate-pulse h-96"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px]">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-800 mb-2">{error}</h2>
        <button onClick={fetchData} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
          <RefreshCcw size={18} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Announcements</h1>
        <button 
          onClick={() => openFormModal()}
          className="mt-4 md:mt-0 flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} /> Add Announcement
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-lg shadow border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Total</p>
            <p className="text-3xl font-bold text-gray-800">{totalAnnouncements}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
            <Megaphone size={24} />
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg shadow border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Active</p>
            <p className="text-3xl font-bold text-green-600">{activeAnnouncements}</p>
          </div>
          <div className="p-3 bg-green-50 text-green-600 rounded-full">
            <Bell size={24} />
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg shadow border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Expired</p>
            <p className="text-3xl font-bold text-gray-400">{expiredAnnouncements}</p>
          </div>
          <div className="p-3 bg-gray-50 text-gray-600 rounded-full">
            <Clock size={24} />
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg shadow border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Active Urgent</p>
            <p className="text-3xl font-bold text-red-600">{urgentAnnouncements}</p>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-full">
            <AlertCircle size={24} />
          </div>
        </div>
      </div>

      {/* Controls Container */}
      <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-100 flex flex-col gap-4">
          
          <div className="flex flex-col lg:flex-row justify-between gap-4">
            {/* Search */}
            <div className="relative w-full lg:w-96">
              <input 
                type="text" 
                placeholder="Search titles, content, authors..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            </div>

            {/* Clear Filters */}
            {(searchTerm || roleFilter !== 'All' || priorityFilter !== 'All' || statusFilter !== 'All') && (
              <button 
                onClick={clearFilters}
                className="text-sm text-red-600 hover:text-red-800 font-medium whitespace-nowrap self-start lg:self-center"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap gap-3">
            <select 
              value={roleFilter} 
              onChange={(e) => setRoleFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm capitalize"
            >
              <option value="All">All Audiences</option>
              <option value="all">Everyone</option>
              <option value="student">Students</option>
              <option value="faculty">Faculty</option>
            </select>

            <select 
              value={priorityFilter} 
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm capitalize"
            >
              <option value="All">All Priorities</option>
              <option value="normal">Normal</option>
              <option value="important">Important</option>
              <option value="urgent">Urgent</option>
            </select>

            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Expired">Expired</option>
            </select>

            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ml-auto"
            >
              <option value="newest">Created (Newest First)</option>
              <option value="oldest">Created (Oldest First)</option>
              <option value="title-asc">Title (A-Z)</option>
              <option value="title-desc">Title (Z-A)</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {filteredList.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Megaphone size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-600">No announcements found</p>
              <p className="text-sm mt-1">Adjust your search or add a new announcement.</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">

              <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                  <th className="p-4 font-semibold text-sm">Announcement</th>
                  <th className="p-4 font-semibold text-sm">Target Audience</th>
                  <th className="p-4 font-semibold text-sm">Priority</th>
                  <th className="p-4 font-semibold text-sm">Status & Timing</th>
                  <th className="p-4 font-semibold text-sm text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredList.map(ann => (
                  <tr key={ann._id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-gray-900 mb-1">{ann.title}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Users size={12} /> By {ann.author?.name || 'Admin'}
                      </p>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="capitalize text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded inline-block">
                          Role: {ann.targetRole}
                        </span>
                        {ann.department?.name && (
                          <span className="text-xs text-gray-600 truncate max-w-[150px]" title={ann.department.name}>
                            Dept: {ann.department.name}
                          </span>
                        )}
                        {ann.targetYear && (
                          <span className="text-xs text-gray-600">Year: {ann.targetYear}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`capitalize text-xs font-semibold px-2 py-1 rounded border ${getPriorityColor(ann.priority)}`}>
                        {ann.priority}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ann.displayStatus === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                          {ann.displayStatus}
                        </span>
                        <span className="text-[10px] text-gray-400 mt-1">
                          Created: {new Date(ann.createdAt).toLocaleDateString()}
                        </span>
                        {ann.expiresAt && (
                          <span className="text-[10px] text-gray-400">
                            Expires: {new Date(ann.expiresAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => { setSelectedAnnouncement(ann); setIsViewModalOpen(true); }}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => openFormModal(ann)}
                          className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Edit Announcement"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(ann._id)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete Announcement"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            </div>
          )}
        </div>
      </div>

      {/* View Modal */}
      {isViewModalOpen && selectedAnnouncement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="font-bold text-lg text-gray-800">Announcement Details</h3>
              <button onClick={() => setIsViewModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              
              <div>
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${selectedAnnouncement.displayStatus === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {selectedAnnouncement.displayStatus}
                  </span>
                  <span className={`capitalize text-xs font-semibold px-2 py-1 rounded border ${getPriorityColor(selectedAnnouncement.priority)}`}>
                    Priority: {selectedAnnouncement.priority}
                  </span>
                </div>
                <h4 className="text-2xl font-bold text-gray-900">{selectedAnnouncement.title}</h4>
                <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                  <Users size={14} /> Published by {selectedAnnouncement.author?.name || 'System Admin'}
                </p>
              </div>

              <div>
                <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Content</h5>
                <p className="text-gray-800 bg-gray-50 p-4 rounded-lg text-sm border border-gray-100 whitespace-pre-wrap leading-relaxed">
                  {selectedAnnouncement.content}
                </p>
              </div>

              <div>
                <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Target Audience</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-center">
                    <p className="text-xs text-blue-600 font-semibold uppercase mb-1">Role</p>
                    <p className="font-bold text-blue-900 capitalize">{selectedAnnouncement.targetRole}</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 text-center">
                    <p className="text-xs text-purple-600 font-semibold uppercase mb-1">Department</p>
                    <p className="font-bold text-purple-900 truncate" title={selectedAnnouncement.department?.name}>
                      {selectedAnnouncement.department?.name || 'All'}
                    </p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 text-center">
                    <p className="text-xs text-orange-600 font-semibold uppercase mb-1">Year</p>
                    <p className="font-bold text-orange-900">
                      {selectedAnnouncement.targetYear ? `Year ${selectedAnnouncement.targetYear}` : 'All Years'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 text-xs text-gray-400 flex justify-between border-t pt-4">
                <span>Created: {new Date(selectedAnnouncement.createdAt).toLocaleString()}</span>
                {selectedAnnouncement.expiresAt && (
                  <span>Expires: {new Date(selectedAnnouncement.expiresAt).toLocaleString()}</span>
                )}
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button onClick={() => setIsViewModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors font-medium">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal (Create/Edit) */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="font-bold text-lg text-gray-800">
                {selectedAnnouncement ? 'Edit Announcement' : 'Create Announcement'}
              </h3>
              <button onClick={() => setIsFormModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="announcementForm" onSubmit={handleFormSubmit} className="space-y-4">
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Brief and clear title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
                  <textarea 
                    required 
                    value={formData.content}
                    onChange={e => setFormData({...formData, content: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-32"
                    placeholder="Full announcement details..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-100 pt-4 mt-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority *</label>
                    <select 
                      required
                      value={formData.priority}
                      onChange={e => setFormData({...formData, priority: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 capitalize"
                    >
                      <option value="normal">Normal</option>
                      <option value="important">Important</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Role *</label>
                    <select 
                      required
                      value={formData.targetRole}
                      onChange={e => setFormData({...formData, targetRole: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 capitalize"
                    >
                      <option value="all">Everyone</option>
                      <option value="student">Students Only</option>
                      <option value="faculty">Faculty Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Department (Optional)</label>
                    <select 
                      value={formData.targetDepartment}
                      onChange={e => setFormData({...formData, targetDepartment: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Departments</option>
                      {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Year (Optional)</label>
                    <input 
                      type="number" 
                      min="1" max="6"
                      value={formData.targetYear}
                      onChange={e => setFormData({...formData, targetYear: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. 1"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date & Time (Optional)</label>
                    <input 
                      type="datetime-local" 
                      value={formData.expiresAt}
                      onChange={e => setFormData({...formData, expiresAt: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">If left blank, the announcement will remain active indefinitely.</p>
                  </div>

                  {/* Hidden author field handling */}
                  <input type="hidden" value={formData.createdBy} />
                </div>

              </form>
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2 mt-auto">
              <button 
                type="button" 
                onClick={() => setIsFormModalOpen(false)} 
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="announcementForm"
                disabled={formLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium"
              >
                {formLoading ? 'Saving...' : 'Save Announcement'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Announcements;
