import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  Search, Plus, Edit2, Trash2, X, Eye, 
  Building2, RefreshCcw, AlertCircle, BookOpen, Users as UsersIcon, GraduationCap
} from 'lucide-react';
import toast from 'react-hot-toast';

const Departments = () => {
  const [departments, setDepartments] = useState([]);
  const [students, setStudents] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [subjects, setSubjects] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');

  // Modals
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState(null);
  
  // Form
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    hodName: ''
  });
  const [formLoading, setFormLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const results = await Promise.allSettled([
        api.get('/api/departments'),
        api.get('/api/students'),
        api.get('/api/faculty'),
        api.get('/api/subjects')
      ]);

      // Handle main request failure
      if (results[0].status === 'rejected') {
        throw new Error('Failed to fetch departments');
      }

      setDepartments(results[0].value?.data?.data || []);
      setStudents(results[1].status === 'fulfilled' ? (results[1].value?.data?.data || []) : []);
      setFaculties(results[2].status === 'fulfilled' ? (results[2].value?.data?.data || []) : []);
      setSubjects(results[3].status === 'fulfilled' ? (results[3].value?.data?.data || []) : []);

    } catch (err) {
      console.error('Fetch error', err);
      setError('Failed to fetch departments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Enrich departments with counts
  const enrichedDepts = departments.map(dept => {
    const studentCount = students.filter(s => s.departmentId === dept._id).length;
    const facultyCount = faculties.filter(f => f.departmentId === dept._id).length;
    const subjectCount = subjects.filter(sub => sub.departmentId === dept._id).length;
    
    return {
      ...dept,
      studentCount,
      facultyCount,
      subjectCount
    };
  });

  // Summaries
  const totalDepts = enrichedDepts.length;
  const deptsWithStudents = enrichedDepts.filter(d => d.studentCount > 0).length;
  const deptsWithFaculty = enrichedDepts.filter(d => d.facultyCount > 0).length;

  // Filtering
  let filteredList = enrichedDepts.filter(d => {
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = d.name?.toLowerCase().includes(searchLower);
    const codeMatch = d.code?.toLowerCase().includes(searchLower);
    const descMatch = d.description?.toLowerCase().includes(searchLower);
    const hodMatch = d.hodName?.toLowerCase().includes(searchLower);
    
    return !searchTerm || nameMatch || codeMatch || descMatch || hodMatch;
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
    if (!window.confirm('WARNING: Deleting this department may orphan or affect associated students, faculty, and subjects based on backend configuration. Are you absolutely sure you want to delete this department?')) return;
    
    try {
      await api.delete(`/api/departments/${id}`);
      toast.success('Department deleted successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete department');
    }
  };

  const openFormModal = (dept = null) => {
    if (dept) {
      setSelectedDept(dept);
      setFormData({
        name: dept.name || '',
        code: dept.code || '',
        description: dept.description || '',
        hodName: dept.hodName || ''
      });
    } else {
      setSelectedDept(null);
      setFormData({
        name: '',
        code: '',
        description: '',
        hodName: ''
      });
    }
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (selectedDept) {
        await api.patch(`/api/departments/${selectedDept._id}`, formData);
        toast.success('Department updated successfully');
      } else {
        await api.post('/api/departments', formData);
        toast.success('Department created successfully');
      }
      setIsFormModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Action failed');
    } finally {
      setFormLoading(false);
    }
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
        <h1 className="text-2xl font-bold text-gray-800">Departments</h1>
        <button 
          onClick={() => openFormModal()}
          className="mt-4 md:mt-0 flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} /> Add Department
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-5 rounded-lg shadow border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Departments</p>
            <p className="text-3xl font-bold text-gray-800">{totalDepts}</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full">
            <Building2 size={24} />
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg shadow border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Depts with Students</p>
            <p className="text-3xl font-bold text-green-600">{deptsWithStudents}</p>
          </div>
          <div className="p-3 bg-green-50 text-green-600 rounded-full">
            <GraduationCap size={24} />
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg shadow border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Depts with Faculty</p>
            <p className="text-3xl font-bold text-blue-600">{deptsWithFaculty}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
            <UsersIcon size={24} />
          </div>
        </div>
      </div>

      {/* Controls Container */}
      <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between gap-4">
          
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            {/* Search */}
            <div className="relative w-full sm:w-80">
              <input 
                type="text" 
                placeholder="Search by name, code, HOD..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            </div>

            {/* Clear Filters */}
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="text-sm text-red-600 hover:text-red-800 font-medium whitespace-nowrap"
              >
                Clear Search
              </button>
            )}
          </div>

          <div className="flex gap-3 items-center ml-auto">
            <label className="text-sm text-gray-500 hidden sm:block font-medium">Sort by:</label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="code-asc">Code (A-Z)</option>
              <option value="code-desc">Code (Z-A)</option>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {filteredList.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Building2 size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-600">No departments found</p>
              <p className="text-sm mt-1">Adjust your search or add a new department.</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">

              <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                  <th className="p-4 font-semibold text-sm">Code</th>
                  <th className="p-4 font-semibold text-sm">Department Name</th>
                  <th className="p-4 font-semibold text-sm hidden sm:table-cell">HOD</th>
                  <th className="p-4 font-semibold text-sm hidden lg:table-cell text-center">Stats</th>
                  <th className="p-4 font-semibold text-sm text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredList.map(dept => (
                  <tr key={dept._id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <span className="font-mono text-sm bg-indigo-50 text-indigo-700 px-2 py-1 rounded border border-indigo-100 font-semibold">
                        {dept.code}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-gray-900">{dept.name}</p>
                      {dept.description && (
                        <p className="text-sm text-gray-500 truncate max-w-xs">{dept.description}</p>
                      )}
                    </td>
                    <td className="p-4 hidden sm:table-cell text-sm text-gray-700">
                      {dept.hodName || <span className="text-gray-400 italic">Not Assigned</span>}
                    </td>
                    <td className="p-4 hidden lg:table-cell">
                      <div className="flex items-center justify-center gap-3">
                        <div className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded" title="Students">
                          <GraduationCap size={14} className="text-gray-500" /> {dept.studentCount}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded" title="Faculty">
                          <UsersIcon size={14} className="text-gray-500" /> {dept.facultyCount}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded" title="Subjects">
                          <BookOpen size={14} className="text-gray-500" /> {dept.subjectCount}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => { setSelectedDept(dept); setIsViewModalOpen(true); }}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => openFormModal(dept)}
                          className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Edit Department"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(dept._id)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete Department"
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
      {isViewModalOpen && selectedDept && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="font-bold text-lg text-gray-800">Department Profile</h3>
              <button onClick={() => setIsViewModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full mb-3">
                  <Building2 size={32} />
                </div>
                <h4 className="text-2xl font-bold text-gray-900">{selectedDept.name}</h4>
                <p className="font-mono text-sm bg-gray-100 px-2 py-1 rounded inline-block mt-2 font-semibold">
                  CODE: {selectedDept.code}
                </p>
              </div>
              
              <div className="space-y-6">
                
                {selectedDept.description && (
                  <div>
                    <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Description</h5>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded-lg text-sm border border-gray-100">
                      {selectedDept.description}
                    </p>
                  </div>
                )}

                <div>
                  <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Head of Department</h5>
                  <p className="text-gray-900 font-medium">
                    {selectedDept.hodName || <span className="text-gray-400 italic font-normal">Not Assigned</span>}
                  </p>
                </div>

                <div>
                  <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Academic Statistics</h5>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-center">
                      <GraduationCap size={20} className="mx-auto text-gray-400 mb-1" />
                      <p className="text-xl font-bold text-gray-800">{selectedDept.studentCount}</p>
                      <p className="text-xs text-gray-500 font-medium">Students</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-center">
                      <UsersIcon size={20} className="mx-auto text-gray-400 mb-1" />
                      <p className="text-xl font-bold text-gray-800">{selectedDept.facultyCount}</p>
                      <p className="text-xs text-gray-500 font-medium">Faculty</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-center">
                      <BookOpen size={20} className="mx-auto text-gray-400 mb-1" />
                      <p className="text-xl font-bold text-gray-800">{selectedDept.subjectCount}</p>
                      <p className="text-xs text-gray-500 font-medium">Subjects</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 text-xs text-gray-400 flex justify-between border-t pt-4">
                <span>Created: {new Date(selectedDept.createdAt).toLocaleDateString()}</span>
                <span className="font-mono">ID: {selectedDept._id}</span>
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
                {selectedDept ? 'Edit Department' : 'Create Department'}
              </h3>
              <button onClick={() => setIsFormModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="departmentForm" onSubmit={handleFormSubmit} className="space-y-4">
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department Name *</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Computer Science"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department Code *</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.code}
                    onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    placeholder="e.g. CS"
                  />
                  <p className="text-xs text-gray-500 mt-1">Must be unique across the institution.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Head of Department (HOD)</label>
                  <input 
                    type="text" 
                    value={formData.hodName}
                    onChange={e => setFormData({...formData, hodName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Dr. Jane Smith"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea 
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-24"
                    placeholder="Brief description of the department..."
                  />
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
                form="departmentForm"
                disabled={formLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium"
              >
                {formLoading ? 'Saving...' : 'Save Department'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Departments;
