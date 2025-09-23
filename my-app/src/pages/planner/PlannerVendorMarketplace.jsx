import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import './PlannerVendorMarketplace.css';
import { X, MapPin, Phone, Mail, AlertCircle, Clock, DollarSign, Users, Square, Calendar, FileText } from 'lucide-react';

function VendorCard({ vendor, onViewMore, onAddVendor }) {
    return (
        <article className="vendor-card">
            <img src={vendor.profilePic} alt={vendor.businessName} className="vendor-image" />
            <section className="vendor-content">
                <h3 className="vendor-name">{vendor.businessName || vendor.name}</h3>
                <section className="vendor-details">
                    <span className="vendor-category">{vendor.category}</span>
                    <section className="vendor-meta">
                        <span className="vendor-rating">{vendor.rating}</span>
                        <span className="vendor-location">{vendor.location}</span>
                    </section>
                </section>
                <section className="vendor-actions">
                    <button className="btn btn-secondary" onClick={() => onViewMore(vendor)}>
                        View Details
                    </button>
                </section>
            </section>
        </article>
    );
}

function EventSelectionModal({ isOpen, events, onSelect, onClose, purpose}) {
    if (!isOpen) return null;


    return (
        <section className="modal-overlay" onClick={onClose}>
            <section className="modal-content" onClick={(e) => e.stopPropagation()}>
                <header className="modal-header">
                    <h2>Select Event</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </header>
               <main className="modal-body">
                {events.length === 0 ? (
                    <p>Loading events...</p>
                ) : (
                    <ul className="event-list">
                    {events.map(event => (
                        <li key={event.id} className="event-item">
                        <button 
                            className="event-button"
                            onClick={() => {
                            onSelect(event);
                            onClose();
                            }}
                        >
                            <strong>{event.name}</strong>
                            <span className="event-date">
                            {new Date(event.date).toLocaleDateString()}
                            </span>
                        </button>
                        </li>
                    ))}
                    </ul>
                )}
                </main>
            </section>
        </section>
    );
}

function VendorModal({vendor, onClose, addService }) {

  const [activeTab, setActiveTab] = useState("overview");

  const formatChargeType = (service) => {
    if (service.chargeByHour > 0) return " Per Hour";
    if (service.chargePerPerson > 0) return " Per Person";
    if (service.chargePerSquareMeter > 0) return " Per Square Meter";
    return " Fixed Rate";
  };

  const getChargeAmount = (service) => {
    if (service.chargeByHour > 0) return `R ${service.cost}`;
    if (service.chargePerPerson > 0) return `R ${service.chargePerPerson}`;
    if (service.chargePerSquareMeter > 0) return `R ${service.chargePerSquareMeter}`;
    return `R ${service.cost}`;
  };

  return (
    <section className="vendor-modal-overlay">
      <section className="vendor-modal-container">
        {/* Header */}
        <section className="vendor-modal-header">
          <button onClick={onClose} className="vendor-modal-close-btn">
            <X size={24} />
          </button>
          <section className="vendor-modal-header-info">
            <img
              src={vendor.profilePic}
              alt={vendor.businessName}
              className="vendor-modal-image"
            />
            <section className="vendor-modal-header-text">
              <h2 className="vendor-modal-business-name">{vendor.businessName}</h2>
              <p className="vendor-modal-category">{vendor.category}</p>
              <section className="vendor-modal-rating-location">
                <section className="vendor-modal-rating">{vendor.rating}</section>
                <section className="vendor-modal-location">
                  <MapPin size={14} />
                  <span>{vendor.location}</span>
                </section>
              </section>
            </section>
          </section>
        </section>

        {/* Tabs */}
        <section className="vendor-modal-tabs">
          <section
            onClick={() => setActiveTab("overview")}
            className={`vendor-modal-tab ${
              activeTab === "overview" ? "active-tab" : ""
            }`}
          >
            Overview
          </section>
          <section
            onClick={() => setActiveTab("services")}
            className={`vendor-modal-tab ${
              activeTab === "services" ? "active-tab" : ""
            }`}
          >
            Services ({vendor.services.length})
          </section>
        </section>

        {/* Content */}
        <section className="vendor-modal-content">
          {activeTab === "overview" && (
            <section className="vendor-modal-overview">
              <h3>About</h3>
              <p>{vendor.description}</p>

              <h3>Contact Information</h3>
              <section className="vendor-modal-contact-grid">
                <section className="vendor-modal-contact-item">
                  <Phone size={18} />
                  <span>{vendor.phone}</span>
                </section>
                <section className="vendor-modal-contact-item">
                  <Mail size={18} />
                  <span>{vendor.email}</span>
                </section>
              </section>
            </section>
          )}

          {activeTab === "services" && (
            <section className="vendor-modal-services">
              {vendor.services.map((service, idx) => (
                <section key={idx} className="vendor-modal-service-card">
                  <section className="vendor-modal-service-header">
                    <h3>{service.serviceName}</h3>
                    <section className="vendor-modal-service-price">
                      <span>{getChargeAmount(service)}</span>
                      <small>{formatChargeType(service)}</small>
                    </section>
                  </section>

                  {service.extraNotes && (
                    <p className="vendor-modal-service-notes">{service.extraNotes}</p>
                  )}

                  <section className="vendor-modal-service-details">
                    <span>Hourly: R {service.chargeByHour}</span>
                    <span>Per Person: R {service.chargePerPerson}</span>
                    <span>Per m²: R {service.chargePerSquareMeter}</span>
                    <span>Base: R {service.cost}</span>
                  </section>
                  <section>
                    <button className='vendor-modal-footer-btn-primary' onClick={() => addService(vendor, service)}>
                        Add Service
                    </button>
                  </section>
                </section>
              ))}
            </section>
          )}
        </section>

        {/* Footer */}
        <section className="vendor-modal-footer">
          <button onClick={onClose} className="vendor-modal-footer-btn">
            Close
          </button>
          <button className="vendor-modal-footer-btn-primary">Contact Vendor</button>
        </section>
      </section>
    </section>
  );
}


export default function PlannerVendorMarketplace({ event = null, plannerId, setActivePage }) {

    const [activeTab, setActiveTab] = useState(event ? 'event-specific' : 'all-events');
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("All");
    const [vendors, setVendors] = useState([]);
    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(event);
    const [loading, setLoading] = useState(false);
    const [showEventModal, setShowEventModal] = useState(false);
    const [showVendorModal, setShowVendorModal] = useState(false);
    const [selectedVendor, setSelectedVendor] = useState(null);
    const [pendingVendorId, setPendingVendorId] = useState(null);
    const [selectedVendorForModal, setSelectedVendorForModal] = useState(null);
    const [modalPurpose, setModalPurpose] = useState(null);
    const [notification, setNotification] = useState({ show: false, type: '', message: '' });
    const [service, setService] = useState(null);
    

    //All calls to api here
    const fetchAllEventsVendors = async () => {
        const auth = getAuth();
        const user = auth.currentUser;
        const token = await user.getIdToken(true);

        const res = await fetch(`https://us-central1-planit-sdp.cloudfunctions.net/api/planner/${plannerId}/bestVendors`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!res.ok) return [];
        const data = await res.json();
        return data.vendors || [];
    };
    const fetchEventSpecificVendors = async (eventId) => {
        const auth = getAuth();
        const user = auth.currentUser;
        const token = await user.getIdToken(true);

        const res = await fetch(`https://us-central1-planit-sdp.cloudfunctions.net/api/planner/events/${eventId}/bestVendors`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!res.ok) return [];
        const data = await res.json();
        return data.vendors || [];
    };

    const fetchEvents = async () => {
        const auth = getAuth();
        const user = auth.currentUser;
        const token = await user.getIdToken(true);

        const res = await fetch(`https://us-central1-planit-sdp.cloudfunctions.net/api/planner/me/events`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!res.ok) return [];
        const data = await res.json();
        return data.events || [];
    };

    const addVendorToEvent = async (vendorId, eventId) => {
        const auth = getAuth();
        const user = auth.currentUser;
        const token = await user.getIdToken(true);

        try{
            const res = await fetch(`https://us-central1-planit-sdp.cloudfunctions.net/api/planner/${eventId}/vendors/${vendorId}`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
            }
            });
            return res;

        }
        catch(err) {
            console.error("Error adding vendor to event:", err);
        }

    };

    const fetchVendorServices = async (vendorId) => {
        const auth = getAuth();
        const user = auth.currentUser;
        const token = await user.getIdToken(true);

        const res = await fetch(`https://us-central1-planit-sdp.cloudfunctions.net/api/vendors/${vendorId}/services`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if(!res){
            showNotification("error", "Failed to fetch vendor services");
        }
        const data = await res.json();

        return data;
    };

    const addService = async (eventId, service) => {
        const auth = getAuth();
        const user = auth.currentUser;
        const token = await user.getIdToken(true);

        try{
            const res = fetch(`https://us-central1-planit-sdp.cloudfunctions.net/api/planner/${eventId}/services`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(service)
            });
            return res;
        }
        catch(err){
            console.error("Error Adding Service to Event: ", err);
        }
    };
    //End of calls to api

    const showNotification = (type, message) => {
        setNotification({ show: true, type, message });
        setTimeout(() => {
        setNotification({ show: false, type: '', message: '' });
        }, 4000);
    };

    useEffect(() => {
        async function loadInitialData() {
            setLoading(true);
            
            if (activeTab === 'all-events') {
                const allVendors = await fetchAllEventsVendors();
                setVendors(allVendors);
                console.log(vendors);
            } else if (activeTab === 'event-specific') {
                const eventsData = await fetchEvents();
                setEvents(eventsData);
        
                if (selectedEvent?.id) {
                    const eventVendors = await fetchEventSpecificVendors(selectedEvent.id);
                    setVendors(eventVendors);
                    console.log(vendors);
                }
            }
            
            setLoading(false);
        }

        loadInitialData();
    }, [activeTab, selectedEvent]);

    useEffect(() => {
        setModalPurpose(activeTab === 'event-specific' ? "recommend" : "addVendor");
    }, [activeTab]);

    useEffect(() => {
        if(event){
            setSelectedEvent(event);
        }
    }, [event]);

    //Functionality Functions
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setVendors([]);
        if (tab === 'event-specific' && !selectedEvent) {
            setShowEventModal(true);
        }
    };

    const handleEventSelect = async (selectedEventData) => {
        setSelectedEvent(selectedEventData);
        setLoading(true);
        const eventVendors = await fetchEventSpecificVendors(selectedEventData.id);
        setVendors(eventVendors);
        setLoading(false);
    };

    const handleViewVendor = async (vendor) => {

        const services = await fetchVendorServices(vendor.id);
        console.log(services);
        if(services === null){
            console.log("failed")
           alert("Failed to get services as json");
            return;
        }
        const vendorInfo = {
            ...vendor,
            services: services
        }
        setSelectedVendor(vendor);
        setSelectedVendorForModal(vendorInfo);
        setShowVendorModal(true);
    };

    const handleAddVendor = async (event, vendor) => {
        // otherwise add directly
        const res = await addVendorToEvent(vendor.id, event.id);
        if (!res.ok) {
            alert("Failed to add vendor to event.");
        } else {
            alert("Vendor added to event successfully!");
        }
    };

    const handleEventPicked = async (vendor, service) => {
        setService(service);
        if (activeTab === "event-specific") {
            if (selectedEvent) {
                await handleAddVendor(selectedEvent, vendor);
                await handleAddService(selectedEvent.id, vendor, service);
            } else {
                alert("Please select an event first.");
            }
        } else {
            setPendingVendorId(vendor.id);
            const eventsList = await fetchEvents();
            setEvents(eventsList);
            setShowEventModal(true);
        }
    };

    const handleAddService = async (eventId, vendor, service) => {
        const data = {
            vendorId: vendor.id,
            vendorName: vendor.businessName,
            ...service
        }
        console.log(data);
        const res = await addService(eventId, data);
        if(!res){
            alert("Failed to add service");
        }
        else{
            alert("Services Addedd successfully");
        }
    }

    const filteredVendors = vendors.filter(v =>
        ((v.businessName?.toLowerCase().includes(search.toLowerCase()) || 
          v.name?.toLowerCase().includes(search.toLowerCase()) ||
          v.category?.toLowerCase().includes(search.toLowerCase()))) &&
        (categoryFilter === "All" || v.category === categoryFilter)
    );

    //End of functionality functions
    const categories = ["All", "Catering", "Entertainment", "Decor", "Photography", "Venue", "Florist", "Music"];

    return (
        <main className="vendor-marketplace">
        {/* Custom Notification */}
      {notification.show && (
        <section className={`ps-notification ps-notification-${notification.type}`}>
          <section className="ps-notification-content">
            {notification.type === 'success' && <CheckCircle className="ps-notification-icon" />}
            {notification.type === 'error' && <AlertCircle className="ps-notification-icon" />}
            {notification.type === 'info' && <AlertCircle className="ps-notification-icon" />}
            <span>{notification.message}</span>
          </section>
        </section>
      )}
            <header className="marketplace-header">
                <h1 className="marketplace-title">Vendor Marketplace</h1>
                <p className="marketplace-subtitle">Discover and connect with top-rated event vendors</p>
            </header>

            <nav className="marketplace-tabs">
                <button
                    className={`tab-btn ${activeTab === 'all-events' ? 'active' : ''}`}
                    onClick={() => handleTabChange('all-events')}
                >
                    All Events
                </button>
                <button
                    className={`tab-btn ${activeTab === 'event-specific' ? 'active' : ''}`}
                    onClick={() => handleTabChange('event-specific')}
                >
                    Event Specific
                </button>
            </nav>

            {activeTab === 'event-specific' && (
                <section className="event-selector">
                    <label className="event-selector-label">Selected Event:</label>
                    <button 
                        className="event-select-button"
                        onClick={() => setShowEventModal(true)}
                    >
                        {selectedEvent ? (
                            <>
                                <strong>{selectedEvent.name}</strong>
                                <span>{new Date(selectedEvent.date).toLocaleDateString()}</span>
                            </>
                        ) : (
                            "Choose an event..."
                        )}
                    </button>
                </section>
            )}

            <section className="marketplace-controls">
                <section className="search-container">
                    <input
                        type="text"
                        placeholder="Search vendors..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="search-input"
                    />
                </section>
                <section className="filter-container">
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="category-select"
                    >
                        {categories.map(category => (
                            <option key={category} value={category}>
                                {category === 'All' ? 'All Categories' : category}
                            </option>
                        ))}
                    </select>
                </section>
            </section>

            {loading ? (
                <section className="loading-state">
                    <article className="loading-spinner"></article>
                    <p>Loading vendors...</p>
                </section>
            ) : (
                <section className="vendors-grid">
                    {filteredVendors.length > 0 ? (
                        filteredVendors.map((vendor) => (
                            <VendorCard 
                            key={vendor.id} 
                            vendor={vendor} 
                            event={selectedEvent}
                            onViewMore={(vendor) => handleViewVendor(vendor)}
                            onAddVendor={(vendor) => handleEventPicked(vendor)}
                            />
                        ))
                    ) : (
                        <section className="empty-state">
                            <p>No vendors found matching your criteria.</p>
                            {activeTab === 'event-specific' && !selectedEvent && (
                                <p>Please select an event to view vendors.</p>
                            )}
                        </section>
                    )}
                </section>
            )}

            <EventSelectionModal
                isOpen={showEventModal}
                events={events}
                onSelect={async (event) => {
                    if (pendingVendorId) {
                        await handleAddVendor(event, { id: pendingVendorId });
                        await handleAddService(event.id, selectedVendorForModal, service);
                        setPendingVendorId(null);
                    } else {
                        handleEventSelect(event);
                    }
                    setShowEventModal(false);
                }}
                onClose={() => setShowEventModal(false)}
            />

             {showVendorModal && (<VendorModal
                vendor={selectedVendorForModal}
                addService={handleEventPicked}
                onClose={() => {
                    setShowVendorModal(false);
                    setSelectedVendor(null);
                    setSelectedVendorForModal(null);
                }}
                />
            )}
        </main>
    );
}