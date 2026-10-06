import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  Search, Plus, Edit2, Trash2, X, Eye, 
  GraduationCap, RefreshCcw, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const Students = () => {
  const [students, setStudents] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [yearFilter, setYearFilter] = useState('All');
  const [genderFilter, setGenderFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

  // Modals
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  // Form
  const [formData, setFormData] = useState({
    userId: '',
    registerNumber: '',
    rollNumber: '',
    departmentId: '',
    year: 1,
    semester: 1,
    section: 'A',
    gender: 'male',
    dateOfBirth: '',
    admissionYear: new Date().getFullYear()
  });
  const [formLoading, setFormLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [studentsRes, usersRes, deptsRes] = await Promise.all([
        api.get('/api/students').catch(() => ({ data: { data: [] } })),
        api.get('/api/users').catch(() => ({ data: { data: [] } })),
        api.get('/api/departments').catch(() => ({ data: { data: [] } }))
      ]);

      const fetchedStudents = studentsRes.data?.data || [];
      const fetchedUsers = usersRes.data?.data || [];
      const fetchedDepts = deptsRes.data?.data || [];

      // Filter users to only 'student' role
      const studentUsers = fetchedUsers.filter(u => u.role === 'student');

      setStudents(fetchedStudents);
      setUsers(studentUsers);
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

  // Enrich student data with User and Department info
  const enrichedStudents = students.map(student => {
    const user = users.find(u => u._id === student.userId) || {};
    const dept = departments.find(d => d._id === student.departmentId) || {};
    return {
      ...student,
      user,
      department: dept
    };
  });

  // Calculate summaries
  const totalStudents = enrichedStudents.length;
  const activeCount = enrichedStudents.filter(s => s.user?.isActive === true).length;
  const inactiveCount = enrichedStudents.filter(s => s.user?.isActive === false).length;
  
  const uniqueDepts = new Set(enrichedStudents.filter(s => s.department?._id).map(s => s.department._id));
  const deptsRepresented = uniqueDepts.size;

  // Available Filter Options (derived from actual data)
  const availableYears = [...new Set(enrichedStudents.map(s => s.year).filter(Boolean))].sort((a,b)=>a-b);
  const availableGenders = [...new Set(enrichedStudents.map(s => s.gender).filter(Boolean))];

  // Users available for new Student record (student role, but no existing Student record)
  const availableUsersForCreation = users.filter(u => !students.some(s => s.userId === u._id));

  // Filtering
  let filteredList = enrichedStudents.filter(s => {
    // Search
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = s.user?.name?.toLowerCase().includes(searchLower);
    const emailMatch = s.user?.email?.toLowerCase().includes(searchLower);
    const regMatch = s.registerNumber?.toLowerCase().includes(searchLower);
    const rollMatch = s.rollNumber?.toLowerCase().includes(searchLower);
    const phoneMatch = s.user?.phone?.toLowerCase().includes(searchLower);
    const matchesSearch = !searchTerm || nameMatch || emailMatch || regMatch || rollMatch || phoneMatch;

    // Filters
    const matchesDept = deptFilter === 'All' || s.department?._id === deptFilter;
    const matchesYear = yearFilter === 'All' || s.year?.toString() === yearFilter;
    const matchesGender = genderFilter === 'All' || s.gender === genderFilter;
    
    let matchesStatus = true;
    if (statusFilter === 'Active') matchesStatus = s.user?.isActive === true;
    if (statusFilter === 'Inactive') matchesStatus = s.user?.isActive === false;

    return matchesSearch && matchesDept && matchesYear && matchesGender && matchesStatus;
  });

  // Sorting
  filteredList.sort((a, b) => {
    const nameA = a.user?.name || '';
    const nameB = b.user?.name || '';
    
    if (sortBy === 'name-asc') return nameA.localeCompare(nameB);
    if (sortBy === 'name-desc') return nameB.localeCompare(nameA);
    if (sortBy === 'roll') return (a.rollNumber || '').localeCompare(b.rollNumber || '');
    if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
    return 0;
  });

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this student record? The user account will remain intact.')) return;
    
    try {
      await api.delete(`/api/students/${id}`);
      toast.success('Student record deleted successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete student');
    }
  };

  const openFormModal = (student = null) => {
    if (student) {
      setSelectedStudent(student);
      setFormData({
        userId: student.userId || '',
        registerNumber: student.registerNumber || '',
        rollNumber: student.rollNumber || '',
        departmentId: student.departmentId || '',
        year: student.year || 1,
        semester: student.semester || 1,
        section: student.section || 'A',
        gender: student.gender || 'male',
        dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().split('T')[0] : '',
        admissionYear: student.admissionYear || new Date().getFullYear()
      });
    } else {
      setSelectedStudent(null);
      setFormData({
        userId: availableUsersForCreation.length > 0 ? availableUsersForCreation[0]._id : '',
        registerNumber: '',
        rollNumber: '',
        departmentId: departments.length > 0 ? departments[0]._id : '',
        year: 1,
        semester: 1,
        section: 'A',
        gender: 'male',
        dateOfBirth: '',
        admissionYear: new Date().getFullYear()
      });
    }
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const payload = { ...formData };
      if (!payload.dateOfBirth) delete payload.dateOfBirth;

      if (selectedStudent) {
        // Edit (exclude userId from patch)
        delete payload.userId;
        await api.patch(`/api/students/${selectedStudent._id}`, payload);
        toast.success('Student updated successfully');
      } else {
        // Create
        if (!payload.userId) {
          toast.error('Please select a user account');
          setFormLoading(false);
          return;
        }
        await api.post('/api/students', payload);
        toast.success('Student created successfully');
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
    setYearFilter('All');
    setGenderFilter('All');
    setStatusFilter('All');
  };

  const hasActiveFilters = searchTerm || deptFilter !== 'All' || yearFilter !== 'All' || genderFilter !== 'All' || statusFilter !== 'All';

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
        <h1 className="text-2xl font-bold text-gray-800">Student Management</h1>
        <button 
          onClick={() => openFormModal()}
          className="mt-4 md:mt-0 flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} /> Add Student
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Students</p>
            <p className="text-2xl font-bold text-gray-800">{totalStudents}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
            <GraduationCap size={24} />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
          <p className="text-sm text-gray-500 font-medium">Active Users</p>
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
          <p className="text-sm text-gray-500 font-medium">Inactive Users</p>
          <p className="text-2xl font-bold text-gray-500">{inactiveCount}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
          <p className="text-sm text-gray-500 font-medium">Departments</p>
          <p className="text-2xl font-bold text-purple-600">{deptsRepresented}</p>
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
                placeholder="Search by name, reg number, email..." 
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

            {availableYears.length > 0 && (
              <select 
                value={yearFilter} 
                onChange={(e) => setYearFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="All">All Years</option>
                {availableYears.map(y => (
                  <option key={y} value={y.toString()}>Year {y}</option>
                ))}
              </select>
            )}

            {availableGenders.length > 0 && (
              <select 
                value={genderFilter} 
                onChange={(e) => setGenderFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm capitalize"
              >
                <option value="All">All Genders</option>
                {availableGenders.map(g => (
                  <option key={g} value={g}>{g}</option>
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
              <option value="roll">Roll Number</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {filteredList.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <GraduationCap size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-600">No students found</p>
              <p className="text-sm mt-1">Adjust your search or filters to find what you're looking for.</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">

              <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                  <th className="p-4 font-semibold text-sm">Student</th>
                  <th className="p-4 font-semibold text-sm">Register / Roll</th>
                  <th className="p-4 font-semibold text-sm">Department</th>
                  <th className="p-4 font-semibold text-sm">Year</th>
                  <th className="p-4 font-semibold text-sm">Status</th>
                  <th className="p-4 font-semibold text-sm text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredList.map(s => (
                  <tr key={s._id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex shrink-0 items-center justify-center font-bold overflow-hidden">
                          {s.user?.profileImage ? (
                            <img src={s.user.profileImage} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            s.user?.name ? s.user.name.charAt(0).toUpperCase() : '?'
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{s.user?.name || 'Unknown User'}</p>
                          <p className="text-sm text-gray-500">{s.user?.email || 'No email'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-gray-800 font-medium">{s.registerNumber}</div>
                      {s.rollNumber && <div className="text-xs text-gray-500">Roll: {s.rollNumber}</div>}
                    </td>
                    <td className="p-4 text-sm text-gray-700">
                      {s.department?.code || s.department?.name || 'N/A'}
                    </td>
                    <td className="p-4 text-sm text-gray-700">
                      Yr {s.year} - S{s.semester} <span className="text-gray-400">({s.section})</span>
                    </td>
                    <td className="p-4">
                      {s.user?.isActive !== undefined ? (
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${s.user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {s.user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Unknown</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => { setSelectedStudent(s); setIsViewModalOpen(true); }}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => openFormModal(s)}
                          className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Edit Record"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(s._id)}
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
      {isViewModalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="font-bold text-lg text-gray-800">Student Profile</h3>
              <button onClick={() => setIsViewModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {/* Header */}
              <div className="flex items-center gap-4 mb-6 bg-gray-50 p-4 rounded-lg">
                <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 flex shrink-0 items-center justify-center text-2xl font-bold overflow-hidden">
                  {selectedStudent.user?.profileImage ? (
                    <img src={selectedStudent.user.profileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    selectedStudent.user?.name ? selectedStudent.user.name.charAt(0).toUpperCase() : '?'
                  )}
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900">{selectedStudent.user?.name || 'Unknown User'}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-500 bg-white px-2 py-0.5 rounded border">{selectedStudent.registerNumber}</span>
                    {selectedStudent.user?.isActive !== undefined && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${selectedStudent.user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                        {selectedStudent.user.isActive ? 'Active User' : 'Inactive User'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Academic Info */}
                <div>
                  <h5 className="font-semibold text-gray-900 border-b pb-2 mb-3">Academic Information</h5>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Department</p>
                      <p className="text-gray-800">{selectedStudent.department?.name || selectedStudent.departmentId}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Roll Number</p>
                      <p className="text-gray-800">{selectedStudent.rollNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Year / Sem / Section</p>
                      <p className="text-gray-800">
                        Year {selectedStudent.year}, Semester {selectedStudent.semester}, Section {selectedStudent.section}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Admission Year</p>
                      <p className="text-gray-800">{selectedStudent.admissionYear || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Personal & Contact Info */}
                <div>
                  <h5 className="font-semibold text-gray-900 border-b pb-2 mb-3">Personal & Contact</h5>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Email Address</p>
                      <p className="text-gray-800">{selectedStudent.user?.email || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Phone</p>
                      <p className="text-gray-800">{selectedStudent.user?.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Gender</p>
                      <p className="text-gray-800 capitalize">{selectedStudent.gender || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Date of Birth</p>
                      <p className="text-gray-800">
                        {selectedStudent.dateOfBirth ? new Date(selectedStudent.dateOfBirth).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {selectedStudent.skills && selectedStudent.skills.length > 0 && (
                <div className="mt-6">
                  <h5 className="font-semibold text-gray-900 border-b pb-2 mb-3">Skills</h5>
                  <div className="flex flex-wrap gap-2">
                    {selectedStudent.skills.map((skill, i) => (
                      <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full border border-gray-200">
                        {skill.name} <span className="text-gray-400">({skill.level})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="mt-6 text-xs text-gray-400 flex justify-between border-t pt-4">
                <span>Record Created: {new Date(selectedStudent.createdAt).toLocaleString()}</span>
                <span className="font-mono bg-gray-50 px-1 rounded">Student ID: {selectedStudent._id}</span>
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
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="font-bold text-lg text-gray-800">
                {selectedStudent ? 'Edit Student Record' : 'Create Student Record'}
              </h3>
              <button onClick={() => setIsFormModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {!selectedStudent && availableUsersForCreation.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg flex items-start gap-3">
                  <AlertCircle size={20} className="shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">No eligible users available</h4>
                    <p className="text-sm mt-1">To create a student record, you first need a User account with the 'student' role that doesn't already have a student record.</p>
                    <p className="text-sm mt-2 font-medium">Please go to User Management to create a new student account first.</p>
                  </div>
                </div>
              ) : (
                <form id="studentForm" onSubmit={handleFormSubmit} className="space-y-6">
                  
                  {/* Link User Account */}
                  {!selectedStudent && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
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
                      <p className="text-xs text-blue-700 mt-1">Select an existing user to attach these academic details to.</p>
                    </div>
                  )}

                  {selectedStudent && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-500 font-medium">Linked User Account</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.user?.name} ({selectedStudent.user?.email})</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Register Number *</label>
                      <input 
                        type="text" 
                        required 
                        value={formData.registerNumber}
                        onChange={e => setFormData({...formData, registerNumber: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. REG2023001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number</label>
                      <input 
                        type="text" 
                        value={formData.rollNumber}
                        onChange={e => setFormData({...formData, rollNumber: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. CS-01"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
                      <input 
                        type="number" 
                        required 
                        min="1" max="5"
                        value={formData.year}
                        onChange={e => setFormData({...formData, year: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Section *</label>
                      <input 
                        type="text" 
                        required 
                        value={formData.section}
                        onChange={e => setFormData({...formData, section: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Admission Year</label>
                      <input 
                        type="number" 
                        value={formData.admissionYear}
                        onChange={e => setFormData({...formData, admissionYear: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                      <select 
                        value={formData.gender}
                        onChange={e => setFormData({...formData, gender: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                      <input 
                        type="date" 
                        value={formData.dateOfBirth}
                        onChange={e => setFormData({...formData, dateOfBirth: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
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
              {(!selectedStudent && availableUsersForCreation.length === 0) ? null : (
                <button 
                  type="submit" 
                  form="studentForm"
                  disabled={formLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {formLoading ? 'Saving...' : 'Save Student'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Students;
