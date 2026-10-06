import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { 
  User, Mail, Phone, MapPin, Building, GraduationCap, 
  Calendar, BookOpen, ArrowLeft, UserCircle 
} from 'lucide-react';
import toast from 'react-hot-toast';

const MyProfile = () => {
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/students/me');
        setProfile(response.data);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch profile:", err);
        setError(err.response?.data?.message || 'Failed to load profile data');
        toast.error('Could not retrieve profile information');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-500">Loading your profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-6 rounded-lg border border-red-100 flex flex-col items-center justify-center text-center">
        <UserCircle size={48} className="text-red-400 mb-4" />
        <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Profile</h2>
        <p className="text-red-600 mb-4">{error}</p>
        <Link 
          to="/student" 
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  // Fallback to AuthContext user if profile data is incomplete
  const displayData = profile || user || {};
  
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Navigation */}
      <div className="flex items-center justify-between">
        <Link 
          to="/student" 
          className="inline-flex items-center text-gray-500 hover:text-blue-600 transition"
        >
          <ArrowLeft size={20} className="mr-1" />
          Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">My Profile</h1>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Banner */}
        <div className="h-32 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
        
        <div className="px-6 sm:px-10 pb-8">
          {/* Avatar & Basic Info */}
          <div className="relative flex flex-col sm:flex-row items-center sm:items-end -mt-16 sm:-mt-12 mb-6 sm:mb-8 space-y-4 sm:space-y-0 sm:space-x-6">
            <div className="bg-white p-2 rounded-full shadow-md">
              <div className="bg-blue-100 h-24 w-24 sm:h-32 sm:w-32 rounded-full flex items-center justify-center text-blue-600">
                <User size={64} className="opacity-75" />
              </div>
            </div>
            
            <div className="text-center sm:text-left flex-1 pb-2">
              <h2 className="text-3xl font-bold text-gray-800">{displayData.name || 'Student Name'}</h2>
              <p className="text-blue-600 font-medium text-lg">{displayData.studentId || 'ID Not Available'}</p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Personal Information</h3>
              
              <div className="space-y-4 mt-4">
                <div className="flex items-start text-gray-700">
                  <Mail className="mt-1 mr-3 text-gray-400" size={20} />
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Email Address</p>
                    <p className="font-medium">{displayData.email || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-start text-gray-700">
                  <Phone className="mt-1 mr-3 text-gray-400" size={20} />
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Phone Number</p>
                    <p className="font-medium">{displayData.phone || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-start text-gray-700">
                  <User className="mt-1 mr-3 text-gray-400" size={20} />
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Gender</p>
                    <p className="font-medium capitalize">{displayData.gender || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-start text-gray-700">
                  <Calendar className="mt-1 mr-3 text-gray-400" size={20} />
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Date of Birth</p>
                    <p className="font-medium">
                      {displayData.dateOfBirth 
                        ? new Date(displayData.dateOfBirth).toLocaleDateString() 
                        : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start text-gray-700">
                  <MapPin className="mt-1 mr-3 text-gray-400" size={20} />
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Address</p>
                    <p className="font-medium">{displayData.address || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Academic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Academic Information</h3>
              
              <div className="space-y-4 mt-4">
                <div className="flex items-start text-gray-700">
                  <Building className="mt-1 mr-3 text-gray-400" size={20} />
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Department</p>
                    <p className="font-medium">{displayData.department || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-start text-gray-700">
                  <GraduationCap className="mt-1 mr-3 text-gray-400" size={20} />
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Year</p>
                    <p className="font-medium">{displayData.year ? `Year ${displayData.year}` : 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-start text-gray-700">
                  <BookOpen className="mt-1 mr-3 text-gray-400" size={20} />
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Semester</p>
                    <p className="font-medium">{displayData.semester ? `Semester ${displayData.semester}` : 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default MyProfile;
