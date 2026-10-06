import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  Search, Plus, Edit2, Trash2, X, Eye, 
  BookOpen, RefreshCcw, AlertCircle, Building2
} from 'lucide-react';
import toast from 'react-hot-toast';

const Subjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [users, setUsers] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

  // Modals
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  
  // Form
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    departmentId: '',
    semester: 1,
    credits: 3,
    facultyId: ''
  });
  const [formLoading, setFormLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const results = await Promise.allSettled([
        api.get('/api/subjects'),
        api.get('/api/departments'),
        api.get('/api/faculty'),
        api.get('/api/users')
      ]);

      if (results[0].status === 'rejected') {
        throw new Error('Failed to fetch subjects');
      }

      setSubjects(results[0].value?.data?.data || []);
      setDepartments(results[1].status === 'fulfilled' ? (results[1].value?.data?.data || []) : []);
      setFaculties(results[2].status === 'fulfilled' ? (results[2].value?.data?.data || []) : []);
      setUsers(results[3].status === 'fulfilled' ? (results[3].value?.data?.data || []) : []);

    } catch (err) {
      console.error('Fetch error', err);
      setError('Failed to fetch subjects. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Enrich faculty with user data for the dropdowns
  const enrichedFaculties = faculties.map(f => {
    const user = users.find(u => u._id === f.userId);
    return { ...f, user };
  });

  // Enrich subjects
  const enrichedSubjects = subjects.map(sub => {
    const dept = departments.find(d => d._id === sub.departmentId) || {};
    const fac = enrichedFaculties.find(f => f._id === sub.facultyId) || {};
    return {
      ...sub,
      department: dept,
      faculty: fac
    };
  });

  // Summaries
  const totalSubjects = enrichedSubjects.length;
  const uniqueDeptsWithSubjects = new Set(enrichedSubjects.map(s => s.departmentId).filter(Boolean)).size;
  const unassignedSubjects = enrichedSubjects.filter(s => !s.facultyId).length;

  // Filtering
  let filteredList = enrichedSubjects.filter(s => {
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = s.name?.toLowerCase().includes(searchLower);
    const codeMatch = s.code?.toLowerCase().includes(searchLower);
    const deptMatch = s.department?.name?.toLowerCase().includes(searchLower);
    
    const matchesSearch = !searchTerm || nameMatch || codeMatch || deptMatch;
    const matchesDept = deptFilter === 'All' || s.departmentId === deptFilter;

    return matchesSearch && matchesDept;
  });

  // Sorting
  filteredList.sort((a, b) => {
    if (sortBy === 'name-asc') return (a.name || '').localeCompare(b.name || '');
    if (sortBy === 'name-desc') return (b.name || '').localeCompare(a.name || '');
    if (sortBy === 'code-asc') return (a.code || '').localeCompare(b.code || '');
    if (sortBy === 'code-desc') return (b.code || '').localeCompare(a.code || '');
    if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
    return 0;
  });

  const handleDelete = async (id) => {
    if (!window.confirm('WARNING: Deleting this subject may affect enrolled students or faculty assignments. Are you sure?')) return;
    
    try {
      await api.delete(`/api/subjects/${id}`);
      toast.success('Subject deleted successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete subject');
    }
  };

  const openFormModal = (subject = null) => {
    if (subject) {
      setSelectedSubject(subject);
      setFormData({
        name: subject.name || '',
        code: subject.code || '',
        departmentId: subject.departmentId || '',
        semester: subject.semester || 1,
        credits: subject.credits || 3,
        facultyId: subject.facultyId || ''
      });
    } else {
      setSelectedSubject(null);
      setFormData({
        name: '',
        code: '',
        departmentId: departments.length > 0 ? departments[0]._id : '',
        semester: 1,
        credits: 3,
        facultyId: ''
      });
    }
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      // Clean up payload (remove empty facultyId)
      const payload = { ...formData };
      if (!payload.facultyId) delete payload.facultyId;

      if (selectedSubject) {
        await api.patch(`/api/subjects/${selectedSubject._id}`, payload);
        toast.success('Subject updated successfully');
      } else {
        await api.post('/api/subjects', payload);
        toast.success('Subject created successfully');
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
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-8 w-64 bg-gray-200 animate-pulse rounded mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map(i => <div key={i} className="bg-white p-4 rounded-lg shadow animate-pulse h-24"></div>)}
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
        <h1 className="text-2xl font-bold text-gray-800">Subjects</h1>
        <button 
          onClick={() => openFormModal()}
          className="mt-4 md:mt-0 flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} /> Add Subject
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-5 rounded-lg shadow border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Subjects</p>
            <p className="text-3xl font-bold text-gray-800">{totalSubjects}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
            <BookOpen size={24} />
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg shadow border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Departments with Subjects</p>
            <p className="text-3xl font-bold text-indigo-600">{uniqueDeptsWithSubjects}</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full">
            <Building2 size={24} />
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg shadow border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Unassigned Subjects</p>
            <p className="text-3xl font-bold text-orange-600">{unassignedSubjects}</p>
          </div>
          <div className="p-3 bg-orange-50 text-orange-600 rounded-full">
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
                placeholder="Search by name, code, dept..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            </div>

            {/* Clear Filters */}
            {(searchTerm || deptFilter !== 'All') && (
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

            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ml-auto"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="code-asc">Code (A-Z)</option>
              <option value="code-desc">Code (Z-A)</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {filteredList.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <BookOpen size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-600">No subjects found</p>
              <p className="text-sm mt-1">Adjust your search or add a new subject.</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">

              <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                  <th className="p-4 font-semibold text-sm">Code</th>
                  <th className="p-4 font-semibold text-sm">Subject Name</th>
                  <th className="p-4 font-semibold text-sm">Department</th>
                  <th className="p-4 font-semibold text-sm">Sem / Credits</th>
                  <th className="p-4 font-semibold text-sm">Faculty</th>
                  <th className="p-4 font-semibold text-sm text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredList.map(sub => (
                  <tr key={sub._id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <span className="font-mono text-sm bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100 font-semibold">
                        {sub.code}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-gray-900">{sub.name}</td>
                    <td className="p-4 text-sm text-gray-700">
                      {sub.department?.name || <span className="text-gray-400 italic">Unknown</span>}
                    </td>
                    <td className="p-4 text-sm text-gray-700">
                      Sem {sub.semester} <span className="text-gray-300 mx-1">|</span> {sub.credits} Cr
                    </td>
                    <td className="p-4 text-sm">
                      {sub.faculty?.user?.name ? (
                        <span className="text-gray-800">{sub.faculty.user.name}</span>
                      ) : (
                        <span className="text-gray-400 italic">Not Assigned</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => { setSelectedSubject(sub); setIsViewModalOpen(true); }}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => openFormModal(sub)}
                          className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Edit Subject"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(sub._id)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete Subject"
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
      {isViewModalOpen && selectedSubject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="font-bold text-lg text-gray-800">Subject Details</h3>
              <button onClick={() => setIsViewModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              
              <div className="text-center mb-2">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-600 rounded-full mb-3">
                  <BookOpen size={32} />
                </div>
                <h4 className="text-2xl font-bold text-gray-900">{selectedSubject.name}</h4>
                <p className="font-mono text-sm bg-gray-100 px-2 py-1 rounded inline-block mt-2 font-semibold">
                  CODE: {selectedSubject.code}
                </p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 space-y-4">
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Department</p>
                  <p className="text-gray-900 font-medium">{selectedSubject.department?.name || 'Unknown'}</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Semester</p>
                    <p className="text-gray-900 font-medium">{selectedSubject.semester}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Credits</p>
                    <p className="text-gray-900 font-medium">{selectedSubject.credits}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Assigned Faculty</p>
                  <p className="text-gray-900 font-medium">
                    {selectedSubject.faculty?.user?.name ? (
                      `${selectedSubject.faculty.user.name} (${selectedSubject.faculty.employeeId})`
                    ) : (
                      <span className="text-gray-400 italic font-normal">Not Assigned</span>
                    )}
                  </p>
                </div>
              </div>
              
              <div className="mt-8 text-xs text-gray-400 flex justify-between border-t pt-4">
                <span>Created: {new Date(selectedSubject.createdAt).toLocaleDateString()}</span>
                <span className="font-mono">ID: {selectedSubject._id}</span>
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
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="font-bold text-lg text-gray-800">
                {selectedSubject ? 'Edit Subject' : 'Create Subject'}
              </h3>
              <button onClick={() => setIsFormModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="subjectForm" onSubmit={handleFormSubmit} className="space-y-4">
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name *</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Data Structures"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject Code *</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.code}
                    onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    placeholder="e.g. CS201"
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Semester *</label>
                    <input 
                      type="number" 
                      required 
                      min="1" max="10"
                      value={formData.semester}
                      onChange={e => setFormData({...formData, semester: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Credits *</label>
                    <input 
                      type="number" 
                      required 
                      min="1" max="10"
                      value={formData.credits}
                      onChange={e => setFormData({...formData, credits: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Faculty</label>
                  <select 
                    value={formData.facultyId}
                    onChange={e => setFormData({...formData, facultyId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- No Faculty Assigned --</option>
                    {enrichedFaculties.map(f => (
                      <option key={f._id} value={f._id}>
                        {f.user?.name ? `${f.user.name} (${f.employeeId})` : f.employeeId}
                      </option>
                    ))}
                  </select>
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
                form="subjectForm"
                disabled={formLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium"
              >
                {formLoading ? 'Saving...' : 'Save Subject'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Subjects;
