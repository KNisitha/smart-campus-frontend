import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  Search, Plus, Edit2, Trash2, X, Eye, 
  Calendar, RefreshCcw, AlertCircle, MapPin, Users
} from 'lucide-react';
import toast from 'react-hot-toast';

const Events = () => {
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('date-asc');

  // Modals
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  const EVENT_CATEGORIES = [
    'symposium', 'hackathon', 'workshop', 'seminar', 
    'sports', 'cultural', 'placement', 'other'
  ];

  // Form
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'other',
    venue: '',
    eventDate: '',
    startTime: '',
    endTime: '',
    organizer: '',
    capacity: '',
    registrationRequired: false,
    imageUrl: ''
  });
  const [formLoading, setFormLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const results = await Promise.allSettled([
        api.get('/api/events'),
        api.get('/api/event-registrations')
      ]);

      if (results[0].status === 'rejected') {
        throw new Error('Failed to fetch events');
      }

      setEvents(results[0].value?.data?.data || []);
      setRegistrations(results[1].status === 'fulfilled' ? (results[1].value?.data?.data || []) : []);

    } catch (err) {
      console.error('Fetch error', err);
      setError('Failed to fetch events. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Enrich events with status and registration counts
  const enrichedEvents = events.map(event => {
    const eventDateObj = new Date(event.eventDate);
    eventDateObj.setHours(0, 0, 0, 0);
    const isPast = eventDateObj < today;
    
    const regCount = registrations.filter(r => r.eventId === event._id).length;
    
    return {
      ...event,
      displayStatus: isPast ? 'Past' : 'Upcoming',
      registrationCount: regCount
    };
  });

  // Summaries
  const totalEvents = enrichedEvents.length;
  const upcomingEvents = enrichedEvents.filter(e => e.displayStatus === 'Upcoming').length;
  const pastEvents = enrichedEvents.filter(e => e.displayStatus === 'Past').length;

  // Filtering
  let filteredList = enrichedEvents.filter(e => {
    const searchLower = searchTerm.toLowerCase();
    const titleMatch = e.title?.toLowerCase().includes(searchLower);
    const descMatch = e.description?.toLowerCase().includes(searchLower);
    const venueMatch = e.venue?.toLowerCase().includes(searchLower);
    const orgMatch = e.organizer?.toLowerCase().includes(searchLower);
    
    const matchesSearch = !searchTerm || titleMatch || descMatch || venueMatch || orgMatch;
    const matchesCat = categoryFilter === 'All' || e.category === categoryFilter;
    const matchesStatus = statusFilter === 'All' || e.displayStatus === statusFilter;

    return matchesSearch && matchesCat && matchesStatus;
  });

  // Sorting
  filteredList.sort((a, b) => {
    if (sortBy === 'name-asc') return (a.title || '').localeCompare(b.title || '');
    if (sortBy === 'name-desc') return (b.title || '').localeCompare(a.title || '');
    if (sortBy === 'date-asc') return new Date(a.eventDate) - new Date(b.eventDate);
    if (sortBy === 'date-desc') return new Date(b.eventDate) - new Date(a.eventDate);
    if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
    return 0;
  });

  const handleDelete = async (id) => {
    if (!window.confirm('WARNING: Are you sure you want to delete this event? Deleting an event may orphan existing registrations depending on backend settings.')) return;
    
    try {
      await api.delete(`/api/events/${id}`);
      toast.success('Event deleted successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete event');
    }
  };

  const openFormModal = (event = null) => {
    if (event) {
      setSelectedEvent(event);
      setFormData({
        title: event.title || '',
        description: event.description || '',
        category: event.category || 'other',
        venue: event.venue || '',
        eventDate: event.eventDate ? new Date(event.eventDate).toISOString().split('T')[0] : '',
        startTime: event.startTime || '',
        endTime: event.endTime || '',
        organizer: event.organizer || '',
        capacity: event.capacity || '',
        registrationRequired: event.registrationRequired || false,
        imageUrl: event.imageUrl || ''
      });
    } else {
      setSelectedEvent(null);
      setFormData({
        title: '',
        description: '',
        category: 'other',
        venue: '',
        eventDate: '',
        startTime: '',
        endTime: '',
        organizer: '',
        capacity: '',
        registrationRequired: false,
        imageUrl: ''
      });
    }
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const payload = { ...formData };
      if (!payload.capacity) delete payload.capacity;

      if (selectedEvent) {
        await api.patch(`/api/events/${selectedEvent._id}`, payload);
        toast.success('Event updated successfully');
      } else {
        await api.post('/api/events', payload);
        toast.success('Event created successfully');
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
    setCategoryFilter('All');
    setStatusFilter('All');
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
        <h1 className="text-2xl font-bold text-gray-800">Events Management</h1>
        <button 
          onClick={() => openFormModal()}
          className="mt-4 md:mt-0 flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} /> Add Event
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-5 rounded-lg shadow border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Events</p>
            <p className="text-3xl font-bold text-gray-800">{totalEvents}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
            <Calendar size={24} />
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg shadow border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Upcoming Events</p>
            <p className="text-3xl font-bold text-green-600">{upcomingEvents}</p>
          </div>
          <div className="p-3 bg-green-50 text-green-600 rounded-full">
            <Calendar size={24} />
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg shadow border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Past Events</p>
            <p className="text-3xl font-bold text-gray-600">{pastEvents}</p>
          </div>
          <div className="p-3 bg-gray-50 text-gray-600 rounded-full">
            <Calendar size={24} />
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
                placeholder="Search by title, venue, organizer..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            </div>

            {/* Clear Filters */}
            {(searchTerm || categoryFilter !== 'All' || statusFilter !== 'All') && (
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
              value={categoryFilter} 
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm capitalize"
            >
              <option value="All">All Categories</option>
              {EVENT_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="All">All Status</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Past">Past</option>
            </select>

            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ml-auto"
            >
              <option value="date-asc">Date (Earliest First)</option>
              <option value="date-desc">Date (Latest First)</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="newest">Created (Newest First)</option>
              <option value="oldest">Created (Oldest First)</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {filteredList.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-600">No events found</p>
              <p className="text-sm mt-1">Adjust your search or add a new event.</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">

              <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                  <th className="p-4 font-semibold text-sm">Event Details</th>
                  <th className="p-4 font-semibold text-sm">Date & Time</th>
                  <th className="p-4 font-semibold text-sm">Category / Venue</th>
                  <th className="p-4 font-semibold text-sm">Status</th>
                  <th className="p-4 font-semibold text-sm text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredList.map(event => (
                  <tr key={event._id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-gray-900 mb-1">{event.title}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Users size={12} /> {event.organizer}
                      </p>
                      {event.registrationRequired && (
                        <span className="inline-block mt-1 bg-purple-100 text-purple-800 text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide">
                          {event.registrationCount} Registered
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-gray-800 font-medium">
                        {new Date(event.eventDate).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {event.startTime} - {event.endTime}
                      </p>
                    </td>
                    <td className="p-4">
                      <span className="capitalize text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded inline-block mb-1">
                        {event.category}
                      </span>
                      <p className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                        <MapPin size={12} /> {event.venue}
                      </p>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${event.displayStatus === 'Upcoming' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {event.displayStatus}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => { setSelectedEvent(event); setIsViewModalOpen(true); }}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => openFormModal(event)}
                          className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Edit Event"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(event._id)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete Event"
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
      {isViewModalOpen && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="font-bold text-lg text-gray-800">Event Details</h3>
              <button onClick={() => setIsViewModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${selectedEvent.displayStatus === 'Upcoming' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {selectedEvent.displayStatus}
                  </span>
                  <span className="capitalize text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded">
                    {selectedEvent.category}
                  </span>
                </div>
                <h4 className="text-2xl font-bold text-gray-900">{selectedEvent.title}</h4>
              </div>

              {selectedEvent.imageUrl && (
                <div className="w-full h-48 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                  <img src={selectedEvent.imageUrl} alt={selectedEvent.title} className="w-full h-full object-cover" />
                </div>
              )}
              
              <div>
                <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Description</h5>
                <p className="text-gray-700 bg-gray-50 p-4 rounded-lg text-sm border border-gray-100 whitespace-pre-wrap">
                  {selectedEvent.description}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Time & Location</h5>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500">Date</p>
                      <p className="text-gray-900 font-medium">{new Date(selectedEvent.eventDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Time</p>
                      <p className="text-gray-900 font-medium">{selectedEvent.startTime} - {selectedEvent.endTime}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Venue</p>
                      <p className="text-gray-900 font-medium flex items-center gap-1">
                        <MapPin size={14} className="text-gray-400" /> {selectedEvent.venue}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Organization</h5>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500">Organizer</p>
                      <p className="text-gray-900 font-medium">{selectedEvent.organizer}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Capacity</p>
                      <p className="text-gray-900 font-medium">{selectedEvent.capacity || 'Unlimited'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Registration Requirement</p>
                      <p className="text-gray-900 font-medium">
                        {selectedEvent.registrationRequired ? 'Required' : 'Open to All'}
                      </p>
                    </div>
                    {selectedEvent.registrationRequired && (
                      <div className="bg-purple-50 p-2 rounded border border-purple-100 inline-block mt-2">
                        <p className="text-xs text-purple-800 font-bold uppercase">Registrations</p>
                        <p className="text-lg text-purple-900 font-black">{selectedEvent.registrationCount}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mt-8 text-xs text-gray-400 flex justify-between border-t pt-4">
                <span>Created: {new Date(selectedEvent.createdAt).toLocaleString()}</span>
                <span className="font-mono">ID: {selectedEvent._id}</span>
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
                {selectedEvent ? 'Edit Event' : 'Create Event'}
              </h3>
              <button onClick={() => setIsFormModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="eventForm" onSubmit={handleFormSubmit} className="space-y-4">
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Title *</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Annual Tech Symposium"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                  <textarea 
                    required 
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-24"
                    placeholder="Event details..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                    <select 
                      required
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 capitalize"
                    >
                      {EVENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Venue *</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.venue}
                      onChange={e => setFormData({...formData, venue: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Main Auditorium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                    <input 
                      type="date" 
                      required 
                      value={formData.eventDate}
                      onChange={e => setFormData({...formData, eventDate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
                    <input 
                      type="time" 
                      required 
                      value={formData.startTime}
                      onChange={e => setFormData({...formData, startTime: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
                    <input 
                      type="time" 
                      required 
                      value={formData.endTime}
                      onChange={e => setFormData({...formData, endTime: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Organizer *</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.organizer}
                      onChange={e => setFormData({...formData, organizer: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Computer Science Club"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                    <input 
                      type="number" 
                      min="1"
                      value={formData.capacity}
                      onChange={e => setFormData({...formData, capacity: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Leave blank for unlimited"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image URL</label>
                  <input 
                    type="url" 
                    value={formData.imageUrl}
                    onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div className="flex items-center gap-2 mt-4 bg-gray-50 p-3 rounded border border-gray-200">
                  <input 
                    type="checkbox" 
                    id="registrationRequired"
                    checked={formData.registrationRequired}
                    onChange={e => setFormData({...formData, registrationRequired: e.target.checked})}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor="registrationRequired" className="text-sm font-medium text-gray-700 cursor-pointer">
                    Registration Required
                  </label>
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
                form="eventForm"
                disabled={formLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium"
              >
                {formLoading ? 'Saving...' : 'Save Event'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Events;
