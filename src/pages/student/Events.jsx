import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { 
  Calendar, MapPin, Clock, Search, Filter, 
  User, Tag, CheckCircle, Ticket, X, RefreshCw, 
  AlertCircle, ArrowLeft, ChevronRight 
} from 'lucide-react';
import toast from 'react-hot-toast';

const Events = () => {
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [timeFilter, setTimeFilter] = useState('Upcoming');
  const [sortBy, setSortBy] = useState('dateAsc');

  // Modal & Registration
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [eventsRes, registrationsRes] = await Promise.all([
        api.get('/api/events'),
        api.get('/api/event-registrations')
      ]);

      const eventsData = Array.isArray(eventsRes.data?.data || eventsRes.data) 
        ? (eventsRes.data?.data || eventsRes.data) 
        : [];
      
      const registrationsData = Array.isArray(registrationsRes.data?.data || registrationsRes.data) 
        ? (registrationsRes.data?.data || registrationsRes.data) 
        : [];

      setEvents(eventsData);
      setRegistrations(registrationsData);
    } catch (err) {
      console.error("Failed to fetch events:", err);
      setError(err.response?.data?.message || 'Failed to load events data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Normalization
  const normalizedEvents = events.map(e => {
    return {
      id: e._id || e.id,
      title: e.title || e.name || 'Untitled Event',
      description: e.description || 'No description available.',
      date: new Date(e.date || e.eventDate || e.createdAt || Date.now()),
      time: e.time || e.startTime || 'TBA',
      venue: e.venue || e.location || 'Campus',
      organizer: e.organizer?.name || e.organizer || 'College Admin',
      category: e.category || 'General',
      capacity: e.capacity || null,
      raw: e
    };
  });

  const registeredEventIds = new Set(
    registrations.map(r => r.event?._id || r.event?.id || r.eventId || r.event)
  );

  const uniqueCategories = [...new Set(normalizedEvents.map(e => e.category))];

  // Filtering & Sorting
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filteredEvents = normalizedEvents.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || e.category === categoryFilter;
    
    let matchesTime = true;
    if (timeFilter === 'Upcoming') {
      matchesTime = e.date >= today;
    } else if (timeFilter === 'Past') {
      matchesTime = e.date < today;
    }

    return matchesSearch && matchesCategory && matchesTime;
  }).sort((a, b) => {
    if (sortBy === 'dateAsc') return a.date - b.date;
    if (sortBy === 'dateDesc') return b.date - a.date;
    return 0;
  });

  // Handle Registration
  const handleRegister = async () => {
    if (!selectedEvent) return;
    setIsRegistering(true);
    try {
      // Trying standard JSON submission structure
      const payload = {
        eventId: selectedEvent.id,
        event: selectedEvent.id
      };
      
      const response = await api.post('/api/event-registrations', payload);
      toast.success('Successfully registered for event!');
      
      // Update local state instead of full fetch to feel snappier
      const newRegistration = response.data?.data || response.data || { eventId: selectedEvent.id };
      setRegistrations([...registrations, newRegistration]);
    } catch (err) {
      console.error("Registration failed:", err);
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setIsRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-500">Discovering campus events...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-6 rounded-lg border border-red-100 flex flex-col items-center justify-center text-center">
        <AlertCircle size={48} className="text-red-400 mb-4" />
        <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Events</h2>
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={fetchData} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
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
        <h1 className="text-2xl font-bold text-gray-800">Campus Events</h1>
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
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
          <div className="relative">
            <select
              className="appearance-none w-full sm:w-36 bg-white border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded focus:outline-none focus:border-blue-500 text-sm"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="All">All Categories</option>
              {uniqueCategories.map((c, i) => <option key={i} value={c}>{c}</option>)}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              <Filter size={14} />
            </div>
          </div>

          <div className="relative">
            <select
              className="appearance-none w-full sm:w-36 bg-white border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded focus:outline-none focus:border-blue-500 text-sm"
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
            >
              <option value="All">All Events</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Past">Past</option>
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
              <option value="dateAsc">Date (Earliest First)</option>
              <option value="dateDesc">Date (Latest First)</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              <Filter size={14} />
            </div>
          </div>
        </div>
      </div>

      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow-sm border border-gray-100 text-center">
          <Calendar size={48} className="text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Events Found</h2>
          <p className="text-gray-500">There are no events matching your search criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => {
            const isRegistered = registeredEventIds.has(event.id);
            const isPast = event.date < today;

            return (
              <div 
                key={event.id} 
                className="bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer flex flex-col overflow-hidden"
                onClick={() => setSelectedEvent(event)}
              >
                {/* Event Header Banner (Abstract colors based on category) */}
                <div className={`h-24 ${isPast ? 'bg-gray-200' : 'bg-gradient-to-r from-blue-500 to-cyan-500'} relative p-4 flex flex-col justify-between`}>
                  <div className="flex justify-between items-start">
                    <span className="bg-white/90 text-gray-800 text-xs font-bold px-2 py-1 rounded shadow-sm">
                      {event.category}
                    </span>
                    {isRegistered && (
                      <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm flex items-center">
                        <CheckCircle size={12} className="mr-1" /> Registered
                      </span>
                    )}
                  </div>
                  <div className="absolute -bottom-4 right-4 bg-white rounded-lg shadow border border-gray-100 px-3 py-1 text-center min-w-[50px]">
                    <div className="text-xs text-red-500 font-bold uppercase">{event.date.toLocaleString('default', { month: 'short' })}</div>
                    <div className="text-lg font-bold text-gray-800 leading-tight">{event.date.getDate()}</div>
                  </div>
                </div>

                <div className="p-5 flex-1 mt-2">
                  <h3 className={`font-bold text-lg line-clamp-1 mb-2 ${isPast ? 'text-gray-500' : 'text-gray-800'}`}>
                    {event.title}
                  </h3>
                  
                  <div className="space-y-2 mt-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Clock size={16} className="text-gray-400 mr-2 flex-shrink-0" />
                      <span className="truncate">{event.time}</span>
                    </div>
                    <div className="flex items-center">
                      <MapPin size={16} className="text-gray-400 mr-2 flex-shrink-0" />
                      <span className="truncate">{event.venue}</span>
                    </div>
                  </div>
                </div>
                
                <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between text-sm text-blue-600 font-medium hover:bg-gray-50">
                  View Details <ChevronRight size={16} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setSelectedEvent(null)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full sm:my-8 sm:align-middle sm:max-w-xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-100">
                <div className="flex justify-between items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left">
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded mb-2 inline-block">
                      {selectedEvent.category}
                    </span>
                    <h3 className="text-2xl leading-7 font-bold text-gray-900" id="modal-title">
                      {selectedEvent.title}
                    </h3>
                  </div>
                  <button onClick={() => setSelectedEvent(null)} className="text-gray-400 hover:text-gray-500 transition-colors">
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="px-4 py-5 sm:p-6 space-y-6">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-start text-sm">
                    <Calendar className="text-blue-500 mr-3 flex-shrink-0 mt-0.5" size={18} />
                    <div>
                      <p className="text-gray-500 font-medium">Date</p>
                      <p className="text-gray-800 font-semibold">{selectedEvent.date.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="flex items-start text-sm">
                    <Clock className="text-orange-500 mr-3 flex-shrink-0 mt-0.5" size={18} />
                    <div>
                      <p className="text-gray-500 font-medium">Time</p>
                      <p className="text-gray-800 font-semibold">{selectedEvent.time}</p>
                    </div>
                  </div>
                  <div className="flex items-start text-sm">
                    <MapPin className="text-red-500 mr-3 flex-shrink-0 mt-0.5" size={18} />
                    <div>
                      <p className="text-gray-500 font-medium">Venue</p>
                      <p className="text-gray-800 font-semibold">{selectedEvent.venue}</p>
                    </div>
                  </div>
                  <div className="flex items-start text-sm">
                    <User className="text-purple-500 mr-3 flex-shrink-0 mt-0.5" size={18} />
                    <div>
                      <p className="text-gray-500 font-medium">Organizer</p>
                      <p className="text-gray-800 font-semibold">{selectedEvent.organizer}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">About this event</h4>
                  <div className="bg-gray-50 p-4 rounded-md text-sm text-gray-700 whitespace-pre-wrap leading-relaxed border border-gray-100">
                    {selectedEvent.description}
                  </div>
                </div>
                
                {selectedEvent.capacity && (
                  <div className="flex items-center text-sm text-gray-600 bg-blue-50 p-3 rounded border border-blue-100">
                    <Tag size={16} className="text-blue-500 mr-2" />
                    <span>Total Capacity: <span className="font-semibold text-gray-800">{selectedEvent.capacity}</span></span>
                  </div>
                )}

              </div>
              
              <div className="bg-gray-50 px-4 py-4 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200 items-center justify-between">
                
                <div className="flex-1 text-center sm:text-right mt-3 sm:mt-0">
                  {registeredEventIds.has(selectedEvent.id) ? (
                    <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-700 font-semibold rounded-md border border-green-200 w-full justify-center sm:w-auto">
                      <CheckCircle size={18} className="mr-2" /> You are Registered
                    </div>
                  ) : selectedEvent.date < today ? (
                    <div className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-500 font-medium rounded-md w-full justify-center sm:w-auto">
                      Registration Closed (Past Event)
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRegister}
                      disabled={isRegistering}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-6 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:w-auto sm:text-sm disabled:opacity-50"
                    >
                      {isRegistering ? 'Registering...' : (
                        <>
                           <Ticket size={16} className="mr-2 mt-0.5" /> Register Now
                        </>
                      )}
                    </button>
                  )}
                </div>
                
                <button 
                  type="button" 
                  onClick={() => setSelectedEvent(null)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
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

export default Events;
