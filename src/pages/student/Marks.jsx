import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { 
  Award, BookOpen, TrendingUp, TrendingDown,
  Filter, Calendar, RefreshCw, AlertCircle, ArrowLeft,
  X, BarChart2, CheckCircle
} from 'lucide-react';

const Marks = () => {
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Sorting
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [examTypeFilter, setExamTypeFilter] = useState('All');
  const [sortBy, setSortBy] = useState('dateDesc');

  // Modal
  const [selectedMark, setSelectedMark] = useState(null);

  const fetchMarks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/marks');
      
      const marksData = Array.isArray(response.data?.data || response.data) 
        ? (response.data?.data || response.data) 
        : [];
        
      setMarks(marksData);
    } catch (err) {
      console.error("Failed to fetch marks:", err);
      setError(err.response?.data?.message || 'Failed to load marks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarks();
  }, []);

  // Normalize data safely
  const normalizedMarks = marks.map(m => {
    const obtained = Number(m.marksObtained ?? m.obtainedMarks ?? m.marks ?? 0);
    const max = Number(m.maxMarks ?? m.totalMarks ?? 100);
    const percentage = max > 0 ? Math.round((obtained / max) * 100) : 0;
    
    let performanceStatus = 'Needs Improvement';
    let statusColor = 'text-red-600 bg-red-100';
    let progressColor = 'bg-red-500';

    if (percentage >= 75) {
      performanceStatus = 'Excellent';
      statusColor = 'text-green-600 bg-green-100';
      progressColor = 'bg-green-500';
    } else if (percentage >= 60) {
      performanceStatus = 'Good';
      statusColor = 'text-blue-600 bg-blue-100';
      progressColor = 'bg-blue-500';
    } else if (percentage >= 50) {
      performanceStatus = 'Average';
      statusColor = 'text-orange-600 bg-orange-100';
      progressColor = 'bg-orange-500';
    }

    return {
      id: m._id || m.id || Math.random().toString(),
      subject: m.subject?.name || m.subjectName || m.subject || 'Unknown Subject',
      subjectCode: m.subject?.code || m.subjectCode || 'N/A',
      examType: m.examType || m.type || 'General',
      obtained,
      max,
      percentage,
      performanceStatus,
      statusColor,
      progressColor,
      date: new Date(m.examDate || m.date || m.createdAt || Date.now()),
      faculty: m.faculty?.name || m.facultyName || m.faculty || m.enteredBy || 'N/A',
      raw: m
    };
  });

  // Unique lists for dropdowns
  const uniqueSubjects = [...new Set(normalizedMarks.map(m => m.subject))];
  const uniqueExamTypes = [...new Set(normalizedMarks.map(m => m.examType))];

  // Derived Statistics
  const totalObtained = normalizedMarks.reduce((acc, curr) => acc + curr.obtained, 0);
  const totalMax = normalizedMarks.reduce((acc, curr) => acc + curr.max, 0);
  const overallAverage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;
  
  const totalSubjectsCount = uniqueSubjects.length;

  let highestMark = null;
  let lowestMark = null;

  if (normalizedMarks.length > 0) {
    highestMark = [...normalizedMarks].sort((a, b) => b.percentage - a.percentage)[0];
    lowestMark = [...normalizedMarks].sort((a, b) => a.percentage - b.percentage)[0];
  }

  // Filter & Sort
  const filteredMarks = normalizedMarks.filter(m => {
    const matchSubject = subjectFilter === 'All' || m.subject === subjectFilter;
    const matchExamType = examTypeFilter === 'All' || m.examType === examTypeFilter;
    return matchSubject && matchExamType;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'dateDesc': return b.date - a.date;
      case 'dateAsc': return a.date - b.date;
      case 'marksDesc': return b.percentage - a.percentage;
      case 'marksAsc': return a.percentage - b.percentage;
      default: return 0;
    }
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-500">Loading your marks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-6 rounded-lg border border-red-100 flex flex-col items-center justify-center text-center">
        <AlertCircle size={48} className="text-red-400 mb-4" />
        <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Marks</h2>
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={fetchMarks} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
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
        <h1 className="text-2xl font-bold text-gray-800">Academic Marks</h1>
      </div>

      {/* Summary Cards */}
      {normalizedMarks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500 font-medium">Overall Average</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{overallAverage}%</p>
            </div>
            <div className={`p-3 rounded-full ${overallAverage >= 75 ? 'bg-green-100 text-green-600' : overallAverage >= 50 ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
              <BarChart2 size={24} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Subjects</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{totalSubjectsCount}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full text-purple-600">
              <BookOpen size={24} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500 font-medium">Highest Mark</p>
              <div className="mt-1">
                <span className="text-2xl font-bold text-gray-800">{highestMark?.percentage}%</span>
                <span className="text-xs text-gray-500 block truncate max-w-[120px]">{highestMark?.subject}</span>
              </div>
            </div>
            <div className="bg-green-100 p-3 rounded-full text-green-600">
              <TrendingUp size={24} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500 font-medium">Lowest Mark</p>
              <div className="mt-1">
                <span className="text-2xl font-bold text-gray-800">{lowestMark?.percentage}%</span>
                <span className="text-xs text-gray-500 block truncate max-w-[120px]">{lowestMark?.subject}</span>
              </div>
            </div>
            <div className="bg-red-100 p-3 rounded-full text-red-600">
              <TrendingDown size={24} />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-12 rounded-lg shadow-sm border border-gray-100 text-center">
          <Award size={48} className="text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Marks Available</h2>
          <p className="text-gray-500">You don't have any marks recorded yet.</p>
        </div>
      )}

      {/* Main Content Area */}
      {normalizedMarks.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          
          {/* Toolbar */}
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
            <h2 className="text-lg font-semibold text-gray-800">Performance Records</h2>
            
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              <div className="relative">
                <select
                  className="appearance-none w-full sm:w-40 bg-white border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded focus:outline-none focus:border-blue-500 text-sm"
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
                  className="appearance-none w-full sm:w-40 bg-white border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded focus:outline-none focus:border-blue-500 text-sm"
                  value={examTypeFilter}
                  onChange={(e) => setExamTypeFilter(e.target.value)}
                >
                  <option value="All">All Exam Types</option>
                  {uniqueExamTypes.map((t, i) => <option key={i} value={t}>{t}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                  <Filter size={14} />
                </div>
              </div>

              <div className="relative">
                <select
                  className="appearance-none w-full sm:w-44 bg-white border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded focus:outline-none focus:border-blue-500 text-sm"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="dateDesc">Latest Exams</option>
                  <option value="dateAsc">Oldest Exams</option>
                  <option value="marksDesc">Highest Marks First</option>
                  <option value="marksAsc">Lowest Marks First</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                  <Filter size={14} />
                </div>
              </div>
            </div>
          </div>

          {/* Marks Table */}
          <div className="overflow-x-auto">
            {filteredMarks.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-gray-100 text-sm text-gray-500">
                    <th className="p-4 font-medium">Subject</th>
                    <th className="p-4 font-medium">Exam Type</th>
                    <th className="p-4 font-medium text-center">Score</th>
                    <th className="p-4 font-medium hidden md:table-cell">Performance</th>
                    <th className="p-4 font-medium text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredMarks.map((m) => (
                    <tr 
                      key={m.id} 
                      className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedMark(m)}
                    >
                      <td className="p-4">
                        <div className="font-medium text-gray-800">{m.subject}</div>
                        <div className="text-xs text-gray-500">{m.subjectCode}</div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs font-medium">
                          {m.examType}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-gray-800">{m.obtained} <span className="text-gray-400 text-sm font-normal">/ {m.max}</span></span>
                        </div>
                      </td>
                      <td className="p-4 hidden md:table-cell w-1/4">
                        <div className="flex items-center space-x-3">
                          <span className={`text-sm font-medium w-10 text-right ${m.percentage >= 50 ? 'text-gray-700' : 'text-red-600'}`}>{m.percentage}%</span>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className={`h-2 rounded-full ${m.progressColor}`} style={{ width: `${m.percentage}%` }}></div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-sm text-gray-600">{m.date.toLocaleDateString()}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-gray-500">
                <p>No marks match your current filters.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detailed Modal */}
      {selectedMark && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setSelectedMark(null)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 border-b border-gray-100">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl leading-6 font-bold text-gray-900" id="modal-title">
                      {selectedMark.subject}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Code: {selectedMark.subjectCode}</p>
                  </div>
                  <button onClick={() => setSelectedMark(null)} className="text-gray-400 hover:text-gray-500">
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="px-4 py-5 sm:p-6 bg-gray-50 space-y-6">
                
                <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Obtained</p>
                    <p className="text-3xl font-bold text-blue-600">{selectedMark.obtained}</p>
                  </div>
                  <div className="text-center text-gray-300">
                    <span className="text-4xl">/</span>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Maximum</p>
                    <p className="text-3xl font-bold text-gray-700">{selectedMark.max}</p>
                  </div>
                  <div className="border-l border-gray-200 h-12 mx-2"></div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Percentage</p>
                    <p className={`text-3xl font-bold ${selectedMark.percentage >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedMark.percentage}%
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                    <span className="text-sm font-medium text-gray-500">Performance Status</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${selectedMark.statusColor}`}>
                      {selectedMark.performanceStatus}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                    <span className="text-sm font-medium text-gray-500">Exam Type</span>
                    <span className="text-sm text-gray-800">{selectedMark.examType}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                    <span className="text-sm font-medium text-gray-500">Exam Date</span>
                    <span className="text-sm text-gray-800 flex items-center">
                      <Calendar size={14} className="mr-1 text-gray-400" />
                      {selectedMark.date.toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-500">Evaluated By</span>
                    <span className="text-sm text-gray-800">{selectedMark.faculty}</span>
                  </div>
                </div>

              </div>
              <div className="bg-gray-100 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button 
                  type="button" 
                  onClick={() => setSelectedMark(null)}
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

export default Marks;
