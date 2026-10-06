import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { 
  Briefcase, GraduationCap, Award, Link as LinkIcon, 
  FileText, Edit, CheckCircle, 
  AlertCircle, RefreshCw, X, ArrowLeft, Plus,
  MapPin, Globe, BookOpen, Code
} from 'lucide-react';
import toast from 'react-hot-toast';

const CareerProfile = () => {
  const { user } = useContext(AuthContext);
  
  const [profile, setProfile] = useState(null);
  const [studentInfo, setStudentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    objective: '',
    preferredRole: '',
    preferredIndustry: '',
    preferredLocation: '',
    skills: '', // Stored as comma separated string for form
    technicalSkills: '',
    softSkills: '',
    github: '',
    linkedin: '',
    portfolio: '',
    resumeLink: '',
    cgpa: ''
  });

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch both student info and career profile defensively
      const [studentRes, careerRes] = await Promise.allSettled([
        api.get('/api/students/me'),
        api.get('/api/career-profiles').catch(() => api.get('/api/career-profile')) // Catch varying endpoints
      ]);

      if (studentRes.status === 'fulfilled') {
        const sData = studentRes.value.data?.data || studentRes.value.data;
        setStudentInfo(sData);
      }

      if (careerRes.status === 'fulfilled') {
        const cData = careerRes.value.data?.data || careerRes.value.data;
        
        // Handle array vs object responses safely
        const profileObj = Array.isArray(cData) ? cData[0] : cData;
        setProfile(profileObj || {});
      } else {
        // Fallback to empty if not created yet
        setProfile({});
      }

    } catch (err) {
      console.error("Failed to fetch profile data:", err);
      setError("Failed to load your career profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  // Initialize form data when editing
  const openEditModal = () => {
    setFormData({
      objective: profile?.objective || profile?.careerObjective || '',
      preferredRole: profile?.preferredRole || profile?.jobRole || '',
      preferredIndustry: profile?.preferredIndustry || profile?.industry || '',
      preferredLocation: profile?.preferredLocation || '',
      cgpa: profile?.cgpa || studentInfo?.cgpa || '',
      skills: Array.isArray(profile?.skills) ? profile.skills.join(', ') : (profile?.skills || ''),
      technicalSkills: Array.isArray(profile?.technicalSkills) ? profile.technicalSkills.join(', ') : (profile?.technicalSkills || ''),
      softSkills: Array.isArray(profile?.softSkills) ? profile.softSkills.join(', ') : (profile?.softSkills || ''),
      github: profile?.github || profile?.links?.github || '',
      linkedin: profile?.linkedin || profile?.links?.linkedin || '',
      portfolio: profile?.portfolio || profile?.links?.portfolio || '',
      resumeLink: profile?.resumeLink || profile?.resume || ''
    });
    setIsEditModalOpen(true);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Clean string inputs into arrays where appropriate
      const processArrayField = (str) => str.split(',').map(s => s.trim()).filter(s => s);

      const payload = {
        ...formData,
        skills: processArrayField(formData.skills),
        technicalSkills: processArrayField(formData.technicalSkills),
        softSkills: processArrayField(formData.softSkills),
        // Fallback nested structures for older APIs
        links: {
          github: formData.github,
          linkedin: formData.linkedin,
          portfolio: formData.portfolio
        }
      };

      // Depending on API design, it might be a POST or PUT/PATCH
      if (profile && profile._id) {
        await api.put(`/api/career-profiles/${profile._id}`, payload).catch(() => {
          return api.patch(`/api/career-profiles/${profile._id}`, payload);
        });
      } else {
        await api.post('/api/career-profiles', payload).catch(() => {
          return api.post('/api/career-profile', payload); // Fallback
        });
      }

      toast.success("Career profile updated successfully.");
      setIsEditModalOpen(false);
      fetchProfileData();
    } catch (err) {
      console.error("Failed to save profile:", err);
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to safely render arrays from backend
  const renderBadges = (itemStringOrArray, colorClass = "bg-blue-50 text-blue-700 border-blue-200") => {
    if (!itemStringOrArray) return <span className="text-sm text-gray-400">Not specified</span>;
    
    let arr = [];
    if (Array.isArray(itemStringOrArray)) arr = itemStringOrArray;
    else if (typeof itemStringOrArray === 'string') arr = itemStringOrArray.split(',').map(s => s.trim());
    
    if (arr.length === 0) return <span className="text-sm text-gray-400">Not specified</span>;

    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {arr.map((item, i) => (
          item && <span key={i} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
            {item}
          </span>
        ))}
      </div>
    );
  };

  // Profile Completion Calculation
  const calculateCompletion = () => {
    if (!profile) return 0;
    
    const fieldsToCheck = [
      profile.objective || profile.careerObjective,
      profile.preferredRole || profile.jobRole,
      profile.preferredIndustry,
      (profile.skills && profile.skills.length > 0) || (profile.technicalSkills && profile.technicalSkills.length > 0),
      profile.github || profile.links?.github || profile.linkedin || profile.links?.linkedin,
      profile.resumeLink || profile.resume
    ];
    
    const filledFields = fieldsToCheck.filter(field => field !== null && field !== undefined && field !== '').length;
    return Math.round((filledFields / fieldsToCheck.length) * 100) || 0;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-500">Loading your career profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-6 rounded-lg border border-red-100 flex flex-col items-center justify-center text-center">
        <AlertCircle size={48} className="text-red-400 mb-4" />
        <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Profile</h2>
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={fetchProfileData} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
          <RefreshCw size={16} className="mr-2" />
          Retry
        </button>
      </div>
    );
  }

  const completionPercentage = calculateCompletion();
  const sName = studentInfo?.name || studentInfo?.firstName || user?.name || 'Student Name';
  const sDept = studentInfo?.department || studentInfo?.course || 'Department';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-2">
          <Link to="/student" className="text-gray-500 hover:text-blue-600 md:hidden"><ArrowLeft size={20} /></Link>
          <h1 className="text-2xl font-bold text-gray-800">Career Profile</h1>
        </div>
        <button 
          onClick={openEditModal}
          className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition shadow-sm font-medium"
        >
          <Edit size={16} className="mr-2" />
          Edit Profile
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Header & Status */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Main ID Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 text-center relative overflow-hidden">
            <div className="h-20 bg-gradient-to-r from-blue-500 to-indigo-600 absolute top-0 left-0 right-0 z-0"></div>
            <div className="relative z-10 pt-8">
              <div className="w-24 h-24 rounded-full bg-white border-4 border-white shadow-md mx-auto flex items-center justify-center text-blue-600 bg-gray-50">
                <GraduationCap size={40} />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mt-4">{sName}</h2>
              <p className="text-sm font-medium text-blue-600">{sDept}</p>
              
              {(studentInfo?.year || studentInfo?.semester) && (
                <p className="text-xs text-gray-500 mt-1">
                  {studentInfo.year ? `Year ${studentInfo.year}` : ''} {studentInfo.semester ? `(Sem ${studentInfo.semester})` : ''}
                </p>
              )}
              
              <div className="mt-4 pt-4 border-t border-gray-100 text-left space-y-2 text-sm text-gray-600">
                {studentInfo?.email && <p className="flex items-center"><Mail className="mr-2 h-4 w-4 text-gray-400" /> {studentInfo.email}</p>}
                {(profile?.cgpa || studentInfo?.cgpa) && <p className="flex items-center"><Award className="mr-2 h-4 w-4 text-gray-400" /> CGPA: <span className="font-semibold text-gray-800 ml-1">{profile.cgpa || studentInfo.cgpa}</span></p>}
              </div>
            </div>
          </div>

          {/* Profile Completion Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider">Profile Strength</h3>
            
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Completion</span>
              <span className="text-sm font-bold text-blue-600">{completionPercentage}%</span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
              <div 
                className={`h-2.5 rounded-full ${completionPercentage === 100 ? 'bg-green-500' : 'bg-blue-600'}`} 
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>
            
            {completionPercentage < 100 ? (
              <p className="text-xs text-gray-500 bg-blue-50 p-3 rounded border border-blue-100 flex items-start">
                <AlertCircle size={14} className="text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
                Complete your career profile to improve your placement readiness and match with better opportunities.
              </p>
            ) : (
              <p className="text-xs text-green-700 bg-green-50 p-3 rounded border border-green-100 flex items-start font-medium">
                <CheckCircle size={14} className="text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                Profile complete! You are ready for placement drives.
              </p>
            )}
          </div>

          {/* Web Links */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider">Professional Links</h3>
            
            <div className="space-y-4">
              <div className="flex items-center text-sm">
                <Globe size={18} className="text-blue-700 mr-3" />
                {(profile?.linkedin || profile?.links?.linkedin) ? (
                  <a href={profile.linkedin || profile.links.linkedin} target="_blank" rel="noopener noreferrer" className="text-gray-700 hover:text-blue-600 hover:underline truncate">LinkedIn Profile</a>
                ) : <span className="text-gray-400 italic">Not added</span>}
              </div>
              
              <div className="flex items-center text-sm">
                <Globe size={18} className="text-gray-800 mr-3" />
                {(profile?.github || profile?.links?.github) ? (
                  <a href={profile.github || profile.links.github} target="_blank" rel="noopener noreferrer" className="text-gray-700 hover:text-blue-600 hover:underline truncate">GitHub Profile</a>
                ) : <span className="text-gray-400 italic">Not added</span>}
              </div>

              <div className="flex items-center text-sm">
                <Globe size={18} className="text-green-600 mr-3" />
                {(profile?.portfolio || profile?.links?.portfolio) ? (
                  <a href={profile.portfolio || profile.links.portfolio} target="_blank" rel="noopener noreferrer" className="text-gray-700 hover:text-blue-600 hover:underline truncate">Personal Portfolio</a>
                ) : <span className="text-gray-400 italic">Not added</span>}
              </div>

              <div className="flex items-center text-sm">
                <FileText size={18} className="text-red-500 mr-3" />
                {(profile?.resumeLink || profile?.resume) ? (
                  <a href={profile.resumeLink || profile.resume} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-medium hover:underline truncate">View Resume</a>
                ) : <span className="text-gray-400 italic">Not added</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Main Details */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Career Objective */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider flex items-center">
              <BookOpen size={18} className="text-blue-500 mr-2" /> Career Objective
            </h3>
            {profile?.objective || profile?.careerObjective ? (
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                {profile.objective || profile.careerObjective}
              </p>
            ) : (
              <p className="text-gray-400 text-sm italic bg-gray-50 p-4 rounded border border-gray-100 text-center">
                No career objective specified yet. Click 'Edit Profile' to add one.
              </p>
            )}
          </div>

          {/* Preferences */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider flex items-center">
              <Briefcase size={18} className="text-blue-500 mr-2" /> Career Preferences
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Preferred Role</p>
                <p className="text-sm font-semibold text-gray-800 mt-1">{profile?.preferredRole || profile?.jobRole || <span className="text-gray-400 italic font-normal">Not specified</span>}</p>
              </div>
              
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Industry</p>
                <p className="text-sm font-semibold text-gray-800 mt-1">{profile?.preferredIndustry || profile?.industry || <span className="text-gray-400 italic font-normal">Not specified</span>}</p>
              </div>
              
              <div className="md:col-span-2">
                <p className="text-xs font-medium text-gray-500 uppercase">Preferred Location</p>
                <p className="text-sm font-semibold text-gray-800 mt-1 flex items-center">
                  <MapPin size={14} className="text-gray-400 mr-1" /> 
                  {profile?.preferredLocation || <span className="text-gray-400 italic font-normal">Not specified</span>}
                </p>
              </div>
            </div>
          </div>

          {/* Skills */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider flex items-center">
              <Code size={18} className="text-blue-500 mr-2" /> Skills & Competencies
            </h3>
            
            <div className="space-y-5">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Technical Skills</p>
                {renderBadges(profile?.technicalSkills || profile?.skills, "bg-blue-50 text-blue-700 border-blue-200")}
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Soft Skills</p>
                {renderBadges(profile?.softSkills, "bg-green-50 text-green-700 border-green-200")}
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsEditModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 border-b border-gray-100 flex justify-between items-center rounded-t-lg">
                <h3 className="text-xl leading-6 font-bold text-gray-900" id="modal-title">
                  Edit Career Profile
                </h3>
                <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="bg-gray-50 h-[60vh] overflow-y-auto p-4 sm:p-6 space-y-6">
                
                {/* Objective */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Career Objective</label>
                  <textarea
                    name="objective"
                    rows="3"
                    placeholder="Briefly state your career goals and what you aim to achieve..."
                    value={formData.objective}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-sm"
                  ></textarea>
                </div>

                {/* Preferences */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Role</label>
                    <input
                      type="text"
                      name="preferredRole"
                      placeholder="e.g. Software Engineer, Data Analyst"
                      value={formData.preferredRole}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Industry</label>
                    <input
                      type="text"
                      name="preferredIndustry"
                      placeholder="e.g. IT, Finance, Healthcare"
                      value={formData.preferredIndustry}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Location</label>
                    <input
                      type="text"
                      name="preferredLocation"
                      placeholder="e.g. Bangalore, Remote, Any"
                      value={formData.preferredLocation}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CGPA / Percentage</label>
                    <input
                      type="text"
                      name="cgpa"
                      placeholder="e.g. 8.5"
                      value={formData.cgpa}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-sm"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-200 my-2"></div>

                {/* Skills */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-800">Skills (Comma separated)</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Technical Skills</label>
                    <input
                      type="text"
                      name="technicalSkills"
                      placeholder="e.g. React, Node.js, Python, SQL"
                      value={formData.technicalSkills}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Soft Skills</label>
                    <input
                      type="text"
                      name="softSkills"
                      placeholder="e.g. Leadership, Communication, Teamwork"
                      value={formData.softSkills}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-sm"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-200 my-2"></div>

                {/* Links */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-800">Professional Links</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
                      <input
                        type="url"
                        name="linkedin"
                        placeholder="https://linkedin.com/in/..."
                        value={formData.linkedin}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">GitHub URL</label>
                      <input
                        type="url"
                        name="github"
                        placeholder="https://github.com/..."
                        value={formData.github}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Portfolio URL</label>
                      <input
                        type="url"
                        name="portfolio"
                        placeholder="https://..."
                        value={formData.portfolio}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Resume Link (PDF/Drive)</label>
                      <input
                        type="url"
                        name="resumeLink"
                        placeholder="Link to hosted resume"
                        value={formData.resumeLink}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-sm"
                      />
                    </div>
                  </div>
                </div>

              </form>

              {/* Modal Footer */}
              <div className="bg-white px-4 py-4 sm:px-6 flex justify-end space-x-3 border-t border-gray-200 rounded-b-lg">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={isSubmitting}
                  className="inline-flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CareerProfile;
