import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  Search, Plus, Edit2, Trash2, X, Eye, 
  Users as UsersIcon, RefreshCcw, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const Faculty = () => {
  const [faculties, setFaculties] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [designationFilter, setDesignationFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

  // Modals
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  
  // Form
  const [formData, setFormData] = useState({
    userId: '',
    employeeId: '',
    departmentId: '',
    designation: ''
  });
  const [formLoading, setFormLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [facultiesRes, usersRes, deptsRes] = await Promise.all([
        api.get('/api/faculty').catch(() => ({ data: { data: [] } })),
        api.get('/api/users').catch(() => ({ data: { data: [] } })),
        api.get('/api/departments').catch(() => ({ data: { data: [] } }))
      ]);

      const fetchedFaculties = facultiesRes.data?.data || [];
      const fetchedUsers = usersRes.data?.data || [];
      const fetchedDepts = deptsRes.data?.data || [];

      // Filter users to only 'faculty' role
      const facultyUsers = fetchedUsers.filter(u => u.role === 'faculty');

      setFaculties(fetchedFaculties);
      setUsers(facultyUsers);
      setDepartments(fetchedDepts);

    } catch (err) {
      console.error('Fetch error', err);
      setError('Failed to fetch data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Enrich faculty data with User and Department info
  const enrichedFaculties = faculties.map(faculty => {
    const user = users.find(u => u._id === faculty.userId) || {};
    const dept = departments.find(d => d._id === faculty.departmentId) || {};
    return {
      ...faculty,
      user,
      department: dept
    };
  });

  // Calculate summaries
  const totalFaculty = enrichedFaculties.length;
  const activeCount = enrichedFaculties.filter(f => f.user?.isActive === true).length;
  const inactiveCount = enrichedFaculties.filter(f => f.user?.isActive === false).length;
  
  const uniqueDepts = new Set(enrichedFaculties.filter(f => f.department?._id).map(f => f.department._id));
  const deptsRepresented = uniqueDepts.size;

  const uniqueDesignations = new Set(enrichedFaculties.map(f => f.designation).filter(Boolean));
  const designationsCount = uniqueDesignations.size;

  // Available Filter Options (derived from actual data)
  const availableDesignations = [...uniqueDesignations].sort();

  // Users available for new Faculty record (faculty role, but no existing Faculty record)
  const availableUsersForCreation = users.filter(u => !faculties.some(f => f.userId === u._id));

  // Filtering
  let filteredList = enrichedFaculties.filter(f => {
    // Search
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = f.user?.name?.toLowerCase().includes(searchLower);
    const emailMatch = f.user?.email?.toLowerCase().includes(searchLower);
    const empMatch = f.employeeId?.toLowerCase().includes(searchLower);
    const phoneMatch = f.user?.phone?.toLowerCase().includes(searchLower);
    const matchesSearch = !searchTerm || nameMatch || emailMatch || empMatch || phoneMatch;

    // Filters
    const matchesDept = deptFilter === 'All' || f.department?._id === deptFilter;
    const matchesDesignation = designationFilter === 'All' || f.designation === designationFilter;
    
    let matchesStatus = true;
    if (statusFilter === 'Active') matchesStatus = f.user?.isActive === true;
    if (statusFilter === 'Inactive') matchesStatus = f.user?.isActive === false;

    return matchesSearch && matchesDept && matchesDesignation && matchesStatus;
  });

  // Sorting
  filteredList.sort((a, b) => {
    const nameA = a.user?.name || '';
    const nameB = b.user?.name || '';
    
    if (sortBy === 'name-asc') return nameA.localeCompare(nameB);
    if (sortBy === 'name-desc') return nameB.localeCompare(nameA);
    if (sortBy === 'employeeId') return (a.employeeId || '').localeCompare(b.employeeId || '');
    if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
    return 0;
  });

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this faculty record? The user account will remain intact.')) return;
    
    try {
      await api.delete(`/api/faculty/${id}`);
      toast.success('Faculty record deleted successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete faculty record');
    }
  };

  const openFormModal = (faculty = null) => {
    if (faculty) {
      setSelectedFaculty(faculty);
      setFormData({
        userId: faculty.userId || '',
        employeeId: faculty.employeeId || '',
        departmentId: faculty.departmentId || '',
        designation: faculty.designation || ''
      });
    } else {
      setSelectedFaculty(null);
      setFormData({
        userId: availableUsersForCreation.length > 0 ? availableUsersForCreation[0]._id : '',
        employeeId: '',
        departmentId: departments.length > 0 ? departments[0]._id : '',
        designation: ''
      });
    }
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const payload = { ...formData };

      if (selectedFaculty) {
        // Edit (exclude userId from patch)
        delete payload.userId;
        await api.patch(`/api/faculty/${selectedFaculty._id}`, payload);
        toast.success('Faculty updated successfully');
      } else {
        // Create
        if (!payload.userId) {
          toast.error('Please select a user account');
          setFormLoading(false);
          return;
        }
        await api.post('/api/faculty', payload);
        toast.success('Faculty created successfully');
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
    setDeptFilter('All');
    setDesignationFilter('All');
    setStatusFilter('All');
  };

  const hasActiveFilters = searchTerm || deptFilter !== 'All' || designationFilter !== 'All' || statusFilter !== 'All';

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
        <h1 className="text-2xl font-bold text-gray-800">Faculty Management</h1>
        <button 
          onClick={() => openFormModal()}
          className="mt-4 md:mt-0 flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} /> Add Faculty
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-100 flex flex-col justify-between">
          <p className="text-sm text-gray-500 font-medium">Total Faculty</p>
          <p className="text-2xl font-bold text-gray-800">{totalFaculty}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-100 flex flex-col justify-between">
          <p className="text-sm text-gray-500 font-medium">Active</p>
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-100 flex flex-col justify-between">
          <p className="text-sm text-gray-500 font-medium">Inactive</p>
          <p className="text-2xl font-bold text-gray-500">{inactiveCount}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-100 flex flex-col justify-between">
          <p className="text-sm text-gray-500 font-medium">Departments</p>
          <p className="text-2xl font-bold text-purple-600">{deptsRepresented}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-100 flex flex-col justify-between">
          <p className="text-sm text-gray-500 font-medium">Designations</p>
          <p className="text-2xl font-bold text-orange-600">{designationsCount}</p>
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
                placeholder="Search by name, employee ID, email..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
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
              value={deptFilter} 
              onChange={(e) => setDeptFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="All">All Departments</option>
              {departments.map(d => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>

            {availableDesignations.length > 0 && (
              <select 
                value={designationFilter} 
                onChange={(e) => setDesignationFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="All">All Designations</option>
                {availableDesignations.map(des => (
                  <option key={des} value={des}>{des}</option>
                ))}
              </select>
            )}

            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>

            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ml-auto"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="employeeId">Employee ID</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {filteredList.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <UsersIcon size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-600">No faculty found</p>
              <p className="text-sm mt-1">Adjust your search or filters to find what you're looking for.</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">

              <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                  <th className="p-4 font-semibold text-sm">Faculty</th>
                  <th className="p-4 font-semibold text-sm">Employee ID</th>
                  <th className="p-4 font-semibold text-sm">Department</th>
                  <th className="p-4 font-semibold text-sm">Designation</th>
                  <th className="p-4 font-semibold text-sm">Status</th>
                  <th className="p-4 font-semibold text-sm text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredList.map(f => (
                  <tr key={f._id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex shrink-0 items-center justify-center font-bold overflow-hidden">
                          {f.user?.profileImage ? (
                            <img src={f.user.profileImage} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            f.user?.name ? f.user.name.charAt(0).toUpperCase() : '?'
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{f.user?.name || 'Unknown User'}</p>
                          <p className="text-sm text-gray-500">{f.user?.email || 'No email'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-gray-800 font-medium bg-gray-50 px-2 py-1 rounded inline-block">
                        {f.employeeId}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-700">
                      {f.department?.name || f.department?.code || 'N/A'}
                    </td>
                    <td className="p-4 text-sm text-gray-700">
                      {f.designation || 'N/A'}
                    </td>
                    <td className="p-4">
                      {f.user?.isActive !== undefined ? (
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${f.user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {f.user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Unknown</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => { setSelectedFaculty(f); setIsViewModalOpen(true); }}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => openFormModal(f)}
                          className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Edit Record"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(f._id)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete Record"
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
      {isViewModalOpen && selectedFaculty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="font-bold text-lg text-gray-800">Faculty Profile</h3>
              <button onClick={() => setIsViewModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {/* Header */}
              <div className="flex items-center gap-4 mb-6 bg-gray-50 p-4 rounded-lg">
                <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 flex shrink-0 items-center justify-center text-2xl font-bold overflow-hidden">
                  {selectedFaculty.user?.profileImage ? (
                    <img src={selectedFaculty.user.profileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    selectedFaculty.user?.name ? selectedFaculty.user.name.charAt(0).toUpperCase() : '?'
                  )}
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900">{selectedFaculty.user?.name || 'Unknown User'}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-500 bg-white px-2 py-0.5 rounded border">{selectedFaculty.employeeId}</span>
                    {selectedFaculty.user?.isActive !== undefined && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${selectedFaculty.user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                        {selectedFaculty.user.isActive ? 'Active User' : 'Inactive User'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Professional Info */}
                <div>
                  <h5 className="font-semibold text-gray-900 border-b pb-2 mb-3">Professional Information</h5>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Department</p>
                      <p className="text-gray-800">{selectedFaculty.department?.name || selectedFaculty.departmentId}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Designation</p>
                      <p className="text-gray-800">{selectedFaculty.designation || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Personal & Contact Info */}
                <div>
                  <h5 className="font-semibold text-gray-900 border-b pb-2 mb-3">Personal & Contact</h5>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Email Address</p>
                      <p className="text-gray-800">{selectedFaculty.user?.email || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Phone</p>
                      <p className="text-gray-800">{selectedFaculty.user?.phone || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 text-xs text-gray-400 flex justify-between border-t pt-4">
                <span>Record Created: {new Date(selectedFaculty.createdAt).toLocaleString()}</span>
                <span className="font-mono bg-gray-50 px-1 rounded">Faculty ID: {selectedFaculty._id}</span>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button onClick={() => setIsViewModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal (Create/Edit) */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="font-bold text-lg text-gray-800">
                {selectedFaculty ? 'Edit Faculty Record' : 'Create Faculty Record'}
              </h3>
              <button onClick={() => setIsFormModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {!selectedFaculty && availableUsersForCreation.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg flex items-start gap-3">
                  <AlertCircle size={20} className="shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">No eligible users available</h4>
                    <p className="text-sm mt-1">To create a faculty record, you first need a User account with the 'faculty' role that doesn't already have a faculty record.</p>
                    <p className="text-sm mt-2 font-medium">Please go to User Management to create a new faculty account first.</p>
                  </div>
                </div>
              ) : (
                <form id="facultyForm" onSubmit={handleFormSubmit} className="space-y-5">
                  
                  {/* Link User Account */}
                  {!selectedFaculty && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                      <label className="block text-sm font-semibold text-blue-900 mb-2">Link User Account *</label>
                      <select 
                        required
                        value={formData.userId}
                        onChange={e => setFormData({...formData, userId: e.target.value})}
                        className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="" disabled>Select a user...</option>
                        {availableUsersForCreation.map(u => (
                          <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
                        ))}
                      </select>
                      <p className="text-xs text-blue-700 mt-1">Select an existing user to attach professional details to.</p>
                    </div>
                  )}

                  {selectedFaculty && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
                      <p className="text-sm text-gray-500 font-medium">Linked User Account</p>
                      <p className="font-semibold text-gray-800">{selectedFaculty.user?.name} ({selectedFaculty.user?.email})</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employee / Staff ID *</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.employeeId}
                      onChange={e => setFormData({...formData, employeeId: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. EMP2023001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                    <select 
                      required
                      value={formData.departmentId}
                      onChange={e => setFormData({...formData, departmentId: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="" disabled>Select Department</option>
                      {departments.map(d => (
                        <option key={d._id} value={d._id}>{d.name} ({d.code})</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                    <input 
                      type="text" 
                      value={formData.designation}
                      onChange={e => setFormData({...formData, designation: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Assistant Professor"
                    />
                  </div>
                </form>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2 mt-auto">
              <button 
                type="button" 
                onClick={() => setIsFormModalOpen(false)} 
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              {(!selectedFaculty && availableUsersForCreation.length === 0) ? null : (
                <button 
                  type="submit" 
                  form="facultyForm"
                  disabled={formLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {formLoading ? 'Saving...' : 'Save Faculty'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Faculty;
