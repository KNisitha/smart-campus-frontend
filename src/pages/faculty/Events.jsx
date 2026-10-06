import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { 
  Calendar, Search, Filter, Plus, X, 
  AlertCircle, RefreshCw, Trash2, Edit3, 
  MapPin, Clock, Users, ArrowLeft, Eye,
  CheckCircle, CalendarCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

const Events = () => {
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('dateAsc');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsMode, setIsDetailsMode] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    date: '',
    time: '',
    location: '',
    organizer: '',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [eventsRes, regRes] = await Promise.allSettled([
        api.get('/api/events'),
        api.get('/api/event-registrations')
      ]);

      if (eventsRes.status === 'fulfilled') {
        const data = Array.isArray(eventsRes.value.data?.data || eventsRes.value.data) 
          ? (eventsRes.value.data?.data || eventsRes.value.data) : [];
        setEvents(data);
      }

      if (regRes.status === 'fulfilled') {
        const data = Array.isArray(regRes.value.data?.data || regRes.value.data) 
          ? (regRes.value.data?.data || regRes.value.data) : [];
        setRegistrations(data);
      }

    } catch (err) {
      console.error("Failed to fetch events:", err);
      setError("Failed to load events data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Normalization
  const normalizedEvents = events.map(e => {
    const eventDate = new Date(e.date || e.eventDate || e.startDate || Date.now());
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // Status Logic
    let status = 'Upcoming';
    if (eventDate < today) status = 'Completed';
    else if (eventDate.toDateString() === today.toDateString()) status = 'Ongoing';

    // Find registrations for this event
    const eventId = e._id || e.id;
    const eventRegs = registrations.filter(r => {
      const rEventId = r.event?._id || r.event?.id || r.eventId || r.event;
      return rEventId === eventId;
    });

    return {
      id: eventId,
      title: e.title || e.name || 'Untitled Event',
      category: e.category || e.type || 'General',
      date: eventDate,
      time: e.time || e.startTime || '10:00 AM',
      location: e.location || e.venue || 'TBD',
      organizer: e.organizer || e.host || 'Institution',
      description: e.description || e.details || 'No details provided.',
      status: e.status || status, // use backend status if explicitly provided
      registrations: eventRegs,
      registrationCount: eventRegs.length,
      raw: e
    };
  });

  const uniqueCategories = [...new Set(normalizedEvents.map(e => e.category))];

  // Filters & Sorting
  const filteredEvents = normalizedEvents.filter(e => {
    const matchSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        e.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = categoryFilter === 'All' || e.category === categoryFilter;
    const matchStatus = statusFilter === 'All' || e.status === statusFilter;
    
    return matchSearch && matchCategory && matchStatus;
  }).sort((a, b) => {
    if (sortBy === 'dateAsc') return a.date - b.date;
    if (sortBy === 'dateDesc') return b.date - a.date;
    return 0;
  });

  // Stats
  const totalEvents = normalizedEvents.length;
  const upcomingCount = normalizedEvents.filter(e => e.status === 'Upcoming').length;
  const ongoingCount = normalizedEvents.filter(e => e.status === 'Ongoing').length;
  const completedCount = normalizedEvents.filter(e => e.status === 'Completed').length;
  const totalRegistrations = registrations.length;

  // Handlers
  const openCreateModal = () => {
    setFormData({
      title: '',
      category: '',
      date: '',
      time: '',
      location: '',
      organizer: '',
      description: ''
    });
    setSelectedEvent(null);
    setIsDetailsMode(false);
    setIsModalOpen(true);
  };

  const openEditModal = (event) => {
    setFormData({
      title: event.title,
      category: event.category,
      date: event.date.toISOString().split('T')[0],
      time: event.time,
      location: event.location,
      organizer: event.organizer,
      description: event.description
    });
    setSelectedEvent(event);
    setIsDetailsMode(false);
    setIsModalOpen(true);
  };

  const openDetailsModal = (event) => {
    setSelectedEvent(event);
    setIsDetailsMode(true);
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.date) {
      toast.error("Please fill in the Event Title and Date.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: formData.title,
        name: formData.title,
        category: formData.category,
        type: formData.category,
        date: formData.date,
        time: formData.time,
        location: formData.location,
        venue: formData.location,
        organizer: formData.organizer,
        description: formData.description
      };

      if (selectedEvent && selectedEvent.id) {
        await api.put(`/api/events/${selectedEvent.id}`, payload).catch(() => {
          return api.patch(`/api/events/${selectedEvent.id}`, payload);
        });
        toast.success("Event updated successfully");
      } else {
        await api.post('/api/events', payload);
        toast.success("Event created successfully");
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error("Operation failed:", err);
      toast.error(err.response?.data?.message || "Operation failed. Backend might not support this action.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this event?")) return;
    try {
      await api.delete(`/api/events/${id}`);
      toast.success("Event deleted");
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error(err.response?.data?.message || "Delete operation not supported by backend.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="text-gray-500">Loading events...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-6 rounded-lg border border-red-100 flex flex-col items-center justify-center text-center">
        <AlertCircle size={48} className="text-red-400 mb-4" />
        <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Data</h2>
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={fetchData} className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition">
          <RefreshCw size={16} className="mr-2" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-2">
          <Link to="/faculty" className="text-gray-500 hover:text-indigo-600 md:hidden"><ArrowLeft size={20} /></Link>
          <h1 className="text-2xl font-bold text-gray-800">Event Management</h1>
        </div>
        <button 
          onClick={openCreateModal}
          className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition shadow-sm font-medium"
        >
          <Plus size={18} className="mr-2" /> Create Event
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Events</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{totalEvents}</span>
            <Calendar className="text-gray-400" size={24} />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 border-l-4 border-l-indigo-500">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Upcoming</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{upcomingCount}</span>
            <Clock className="text-indigo-500" size={24} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 border-l-4 border-l-emerald-500">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Ongoing</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{ongoingCount}</span>
            <RefreshCw className="text-emerald-500" size={24} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 border-l-4 border-l-gray-400">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Completed</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{completedCount}</span>
            <CheckCircle className="text-gray-500" size={24} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 col-span-2 md:col-span-1">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Registrations</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{totalRegistrations}</span>
            <Users className="text-blue-500" size={24} />
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
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-md leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-indigo-500 sm:text-sm"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full md:w-auto">
          <div className="relative">
            <select
              className="appearance-none w-full sm:w-36 bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded focus:outline-none focus:bg-white focus:border-indigo-500 text-sm"
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
              className="appearance-none w-full sm:w-36 bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded focus:outline-none focus:bg-white focus:border-indigo-500 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Completed">Completed</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              <Filter size={14} />
            </div>
          </div>

          <div className="relative">
            <select
              className="appearance-none w-full sm:w-36 bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded focus:outline-none focus:bg-white focus:border-indigo-500 text-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="dateAsc">Date (Earliest)</option>
              <option value="dateDesc">Date (Latest)</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              <Filter size={14} />
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      {filteredEvents.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow-sm border border-gray-100 text-center">
          <CalendarCheck size={48} className="text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Events Found</h2>
          <p className="text-gray-500">There are no events matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <div 
              key={event.id} 
              className="bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col overflow-hidden"
            >
              <div className="p-5 flex-1 cursor-pointer" onClick={() => openDetailsModal(event)}>
                <div className="flex justify-between items-start mb-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                    {event.category}
                  </span>
                  {event.status === 'Completed' ? (
                     <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                       Completed
                     </span>
                  ) : event.status === 'Ongoing' ? (
                     <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                       Ongoing
                     </span>
                  ) : (
                     <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200">
                       Upcoming
                     </span>
                  )}
                </div>
                
                <h3 className="font-bold text-lg text-gray-800 line-clamp-2 mb-2">
                  {event.title}
                </h3>
                
                <div className="space-y-2 mt-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Calendar size={14} className="mr-2 flex-shrink-0 text-gray-400" />
                    <span className="truncate">{event.date.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'})} • {event.time}</span>
                  </div>
                  <div className="flex items-center">
                    <MapPin size={14} className="mr-2 flex-shrink-0 text-gray-400" />
                    <span className="truncate">{event.location}</span>
                  </div>
                  <div className="flex items-center font-medium text-indigo-600 pt-1">
                    <Users size={14} className="mr-2 flex-shrink-0" />
                    <span>{event.registrationCount} Registered</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex items-center justify-end space-x-2">
                <button onClick={() => openDetailsModal(event)} className="p-1.5 text-gray-500 hover:text-indigo-600 bg-white border border-gray-200 hover:border-indigo-200 rounded transition shadow-sm" title="View Details / Registrations">
                  <Eye size={16} />
                </button>
                <button onClick={() => openEditModal(event)} className="p-1.5 text-gray-500 hover:text-blue-600 bg-white border border-gray-200 hover:border-blue-200 rounded transition shadow-sm" title="Edit">
                  <Edit3 size={16} />
                </button>
                <button onClick={() => handleDelete(event.id)} className="p-1.5 text-gray-500 hover:text-red-600 bg-white border border-gray-200 hover:border-red-200 rounded transition shadow-sm" title="Delete">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal - Create/Edit/Details */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className={`inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle w-full ${isDetailsMode ? 'sm:max-w-4xl' : 'sm:max-w-xl'}`}>
              
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xl leading-6 font-bold text-gray-900" id="modal-title">
                  {isDetailsMode ? 'Event Details' : selectedEvent ? 'Edit Event' : 'Create New Event'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500 transition-colors">
                  <X size={24} />
                </button>
              </div>

              {!isDetailsMode ? (
                // FORM (Create / Edit)
                <form onSubmit={handleSubmit} className="px-4 py-5 sm:p-6 space-y-4 bg-gray-50 max-h-[70vh] overflow-y-auto">
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Event Title <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="title"
                      required
                      placeholder="e.g. Annual Tech Symposium"
                      value={formData.title}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <input
                        type="text"
                        name="category"
                        placeholder="e.g. Workshop"
                        value={formData.category}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Organizer</label>
                      <input
                        type="text"
                        name="organizer"
                        placeholder="e.g. Computer Science Dept"
                        value={formData.organizer}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-200 pt-4 mt-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date <span className="text-red-500">*</span></label>
                      <input
                        type="date"
                        name="date"
                        required
                        value={formData.date}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                      <input
                        type="text"
                        name="time"
                        placeholder="e.g. 10:00 AM"
                        value={formData.time}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                      <input
                        type="text"
                        name="location"
                        placeholder="e.g. Main Auditorium"
                        value={formData.location}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      name="description"
                      rows="4"
                      placeholder="Provide event details..."
                      value={formData.description}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                    ></textarea>
                  </div>

                  <div className="pt-4 flex justify-end space-x-3 border-t border-gray-200 mt-4">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:opacity-50"
                    >
                      {isSubmitting ? 'Saving...' : 'Save Event'}
                    </button>
                  </div>
                </form>
              ) : (
                // DETAILS VIEW
                <div className="bg-gray-50 p-6 flex flex-col md:flex-row gap-6 max-h-[80vh] overflow-y-auto">
                  
                  {/* Event Info Column */}
                  <div className="flex-1 space-y-6">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-800">
                          {selectedEvent.category}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          selectedEvent.status === 'Completed' ? 'bg-gray-100 text-gray-600' :
                          selectedEvent.status === 'Ongoing' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-indigo-100 text-indigo-800'
                        }`}>
                          {selectedEvent.status}
                        </span>
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900">{selectedEvent.title}</h2>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-start">
                        <Calendar size={16} className="mr-2 text-indigo-500 mt-0.5" />
                        <div>
                          <p className="font-semibold text-gray-800">Date & Time</p>
                          <p className="text-gray-600">{selectedEvent.date.toLocaleDateString()}</p>
                          <p className="text-gray-500">{selectedEvent.time}</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <MapPin size={16} className="mr-2 text-indigo-500 mt-0.5" />
                        <div>
                          <p className="font-semibold text-gray-800">Location</p>
                          <p className="text-gray-600">{selectedEvent.location}</p>
                        </div>
                      </div>
                      <div className="col-span-2 pt-2 border-t border-gray-100 mt-2">
                        <p className="text-gray-500 font-medium">Organizer / Host: <span className="text-gray-800">{selectedEvent.organizer}</span></p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-gray-900 mb-2">About Event</h3>
                      <div className="bg-white p-4 rounded-lg border border-gray-200 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {selectedEvent.description}
                      </div>
                    </div>
                  </div>

                  {/* Registrations Column */}
                  <div className="w-full md:w-80 flex-shrink-0">
                    <div className="bg-white p-5 rounded-lg border border-indigo-100 h-full">
                      <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                        <h3 className="font-bold text-gray-900 flex items-center">
                          <Users size={18} className="mr-2 text-indigo-500" />
                          Registrations
                        </h3>
                        <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full text-xs font-bold">
                          {selectedEvent.registrationCount}
                        </span>
                      </div>
                      
                      {selectedEvent.registrations.length === 0 ? (
                        <div className="text-center text-gray-500 py-8 text-sm border border-dashed border-gray-200 rounded">
                          No students have registered yet.
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                          {selectedEvent.registrations.map(reg => {
                            const std = reg.student || {};
                            return (
                              <div key={reg._id || reg.id} className="bg-gray-50 p-3 rounded-md border border-gray-200 text-sm flex justify-between items-center">
                                <div>
                                  <p className="font-semibold text-gray-800">{std.name || std.firstName || reg.studentName || 'Student'}</p>
                                  <p className="text-xs text-gray-500">{std.rollNo || std.registerNumber || reg.rollNo || '-'}</p>
                                </div>
                                {reg.status && (
                                  <span className="text-[10px] font-medium px-1.5 py-0.5 bg-white border border-gray-200 rounded">
                                    {reg.status}
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Events;
