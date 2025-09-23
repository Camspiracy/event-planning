import React, { useState, useEffect } from "react";
import {
  Calendar,
  User,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
  DollarSign,
  Users,
  FileText,
  MessageCircle,
  Eye,
  Upload,
  AlertCircle,
  X,
  Star,
  Palette,
  Tag,
} from "lucide-react";
import { auth } from "../../firebase";
import "./vendorBooking.css";
import ChatComponent from '../planner/ChatComponent.jsx';

const VendorBooking = ({ setActivePage }) => {
  const [filter, setFilter] = useState("all");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isUpdating, setIsUpdating] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatEventId, setChatEventId] = useState(null);
  const [chatPlannerId, setChatPlannerId] = useState(null);
  const [chatEventName, setChatEventName] = useState(null);
  const [chatVendorName, setChatVendorName] = useState(null);
  const [serviceType, setServiceType] = useState(null);

  const vendorId = auth.currentUser?.uid;

  useEffect(() => {
    const fetchBookings = async () => {
      if (!auth.currentUser) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }

      try {
        const token = await auth.currentUser.getIdToken();
        const res = await fetch(
          "https://us-central1-planit-sdp.cloudfunctions.net/api/vendor/bookings/services",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!res.ok) {
          const contentType = res.headers.get("content-type");
          const errorText = contentType?.includes("application/json")
            ? (await res.json()).message
            : await res.text();
          throw new Error(`Failed to fetch bookings: ${errorText}`);
        }

        const data = await res.json();
        const formattedBookings = (data.bookings || []).map((booking) => ({
          ...booking,
          // Determine overall booking status based on vendor services
          overallStatus: getOverallBookingStatus(booking.vendorServices),
          contractUploaded: hasContractUploaded(booking.eventId), // You'll need to implement this
        }));
        
        console.log("Fetched bookings:", formattedBookings);
        setBookings(formattedBookings);
      } catch (err) {
        console.error("Error fetching bookings:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  // Helper function to determine overall booking status
  const getOverallBookingStatus = (vendorServices) => {
    if (!vendorServices || vendorServices.length === 0) return "pending";
    
    const statuses = vendorServices.map(service => service.status || "pending");
    
    if (statuses.every(status => status === "accepted")) return "accepted";
    if (statuses.some(status => status === "rejected")) return "rejected";
    return "pending";
  };

  // Helper function to check if contract is uploaded (you'll need to implement this)
  const hasContractUploaded = (eventId) => {
    // This should check your contract system
    // For now, returning false as placeholder
    return false;
  };

  const updateServiceStatus = async (eventId, serviceId, newStatus) => {
    if (!auth.currentUser) {
      alert("User not authenticated");
      return;
    }
    if (isUpdating) {
      alert("Another update is in progress");
      return;
    }

    setIsUpdating(`${eventId}-${serviceId}`);
    try {
      const token = await auth.currentUser.getIdToken();
      const url = `https://us-central1-planit-sdp.cloudfunctions.net/api/event/${eventId}/service/${serviceId}/status`;
      
      const res = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data.message || `Failed to update status (HTTP ${res.status})`
        );

      // Update local state
      setBookings((prev) =>
        prev.map((booking) => {
          if (booking.eventId === eventId) {
            const updatedServices = booking.vendorServices.map(service =>
              service.serviceId === serviceId 
                ? { ...service, status: newStatus }
                : service
            );
            return {
              ...booking,
              vendorServices: updatedServices,
              overallStatus: getOverallBookingStatus(updatedServices)
            };
          }
          return booking;
        })
      );
    } catch (err) {
      console.error("Error updating status:", err);
      alert(`Failed to update status: ${err.message}`);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleViewEvent = (booking) => {
    setSelectedEvent(booking);
    setShowEventModal(true);
  };

  const handleOpenChat = (booking) => {
    setChatEventId(booking.eventId);
    setChatPlannerId(booking.eventPlanner);
    setChatEventName(booking.eventName);
    setChatVendorName(booking.vendorServices[0].vendorName);

    setShowChat(true);
  };

  const onCloseChat = () => {
    setChatEventId(null);
    setChatPlannerId(null);
    setChatEventName(null);
    setChatVendorName(null);
    setShowChat(false);
  }

  const handleUploadContract = (eventId) => {
    // Navigate to contract upload page
    setActivePage('contracts');
    // You might want to pass the eventId as a parameter
  };

  const handleAcceptBooking = async (booking) => {
    if (!booking.contractUploaded) {
      if (window.confirm("You need to upload a contract before accepting this booking. Would you like to go to the contracts page?")) {
        handleUploadContract(booking.eventId);
      }
      return;
    }

    // Accept all pending services for this booking
    const pendingServices = booking.vendorServices.filter(service => 
      service.status === "pending" || !service.status
    );

    for (const service of pendingServices) {
      await updateServiceStatus(booking.eventId, service.serviceId, "accepted");
    }
  };

  const filteredBookings = filter === "all" 
    ? bookings 
    : bookings.filter((b) => b.overallStatus === filter);

  if (loading)
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading your bookings...</p>
      </div>
    );

  if (error) return <p className="error">{error}</p>;
  if (!bookings.length) return <p className="no-bookings">No bookings found.</p>;

  return (
    <section className="booking-page">
      {showChat && (<ChatComponent eventId={chatEventId} plannerId={chatPlannerId} vendorId={vendorId} 
      currentUser={{id:vendorId, name: chatVendorName, type: "vendor"}} otherUser={{id:chatPlannerId, name: chatEventName, type: "planner"}}
      closeChat={onCloseChat}/>)}
      <header>
        <h1>Booking Management</h1>
        <p>View, manage, and update your event bookings in one place.</p>
        
        {/* Stats Summary */}
        <div className="stats-summary">
          <div className="stat-item">
            <Calendar size={20} />
            <span>Total Events: {bookings.length}</span>
          </div>
          <div className="stat-item accepted-stat">
            <CheckCircle size={20} />
            <span>Accepted: {bookings.filter(b => b.overallStatus === 'accepted').length}</span>
          </div>
          <div className="stat-item pending-stat">
            <Clock size={20} />
            <span>Pending: {bookings.filter(b => b.overallStatus === 'pending').length}</span>
          </div>
          <div className="stat-item rejected-stat">
            <XCircle size={20} />
            <span>Rejected: {bookings.filter(b => b.overallStatus === 'rejected').length}</span>
          </div>
        </div>
      </header>

      <div className="filters">
        <Filter size={20} />
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All Bookings</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="booking-list">
        {filteredBookings.map((booking) => (
          <div
            key={booking.eventId}
            className={`booking-card ${booking.overallStatus}`}
          >
            <div className="booking-header">
              <h2>{booking.eventName || "Unnamed Event"}</h2>
              <span className={`status-badge status-${booking.overallStatus}`}>
                {booking.overallStatus.charAt(0).toUpperCase() + booking.overallStatus.slice(1)}
              </span>
            </div>

            <div className="booking-details">
              <div className="detail-row">
                <Calendar size={16} />
                <span>{new Date(booking.date).toLocaleDateString()}</span>
              </div>
              <div className="detail-row">
                <Clock size={16} />
                <span>{new Date(booking.date).toLocaleTimeString()}</span>
              </div>
              <div className="detail-row">
                <MapPin size={16} />
                <span>{booking.location || "TBD"}</span>
              </div>
              <div className="detail-row">
                <Users size={16} />
                <span>{booking.expectedGuestCount || "N/A"} guests</span>
              </div>
              <div className="detail-row">
                <DollarSign size={16} />
                <span>Budget: ${booking.budget || "Not specified"}</span>
              </div>
            </div>

            {/* Services Section */}
            <div className="services-section">
              <h4>Your Services:</h4>
              <div className="services-list">
                {booking.vendorServices.map((service) => (
                  <div key={service.serviceId} className="service-item">
                    <span className="service-name">{service.serviceName || service.name}</span>
                    <span className={`service-status status-${service.status || 'pending'}`}>
                      {(service.status || 'pending').charAt(0).toUpperCase() + (service.status || 'pending').slice(1)}
                    </span>
                    <div className="service-actions">
                      <button
                        className="approve-btn small"
                        onClick={() => updateServiceStatus(booking.eventId, service.serviceId, "accepted")}
                        disabled={service.status === "accepted" || isUpdating === `${booking.eventId}-${service.serviceId}`}
                        title="Accept this service"
                      >
                        {isUpdating === `${booking.eventId}-${service.serviceId}` ? (
                          "..."
                        ) : (
                          <CheckCircle size={14} />
                        )}
                      </button>
                      <button
                        className="reject-btn small"
                        onClick={() => updateServiceStatus(booking.eventId, service.serviceId, "rejected")}
                        disabled={service.status === "rejected" || isUpdating === `${booking.eventId}-${service.serviceId}`}
                        title="Reject this service"
                      >
                        {isUpdating === `${booking.eventId}-${service.serviceId}` ? (
                          "..."
                        ) : (
                          <XCircle size={14} />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="booking-actions">
              <button
                className="view-details-btn"
                onClick={() => handleViewEvent(booking)}
                title="View event details"
              >
                <Eye size={16} />
                View Details
              </button>
              
              <button
                className="chat-btn"
                onClick={() => handleOpenChat(booking)}
                title="Open chat with client"
              >
                <MessageCircle size={16} />
                Chat
              </button>
              
              <button
                className="upload-contract-btn"
                onClick={() => handleUploadContract(booking.eventId)}
                title="Upload contract"
              >
                <Upload size={16} />
                {booking.contractUploaded ? "View Contract" : "Upload Contract"}
              </button>
              
              <button
                className={`accept-booking-btn ${!booking.contractUploaded ? 'disabled' : ''}`}
                onClick={() => handleAcceptBooking(booking)}
                disabled={!booking.contractUploaded || booking.overallStatus === 'accepted'}
                title={!booking.contractUploaded ? "Upload contract first" : "Accept all pending services"}
              >
                {!booking.contractUploaded ? (
                  <>
                    <AlertCircle size={16} />
                    Contract Required
                  </>
                ) : booking.overallStatus === 'accepted' ? (
                  <>
                    <CheckCircle size={16} />
                    Accepted
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Accept Booking
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Event Details Modal */}
      {showEventModal && selectedEvent && (
        <div className="modal-overlay" onClick={() => setShowEventModal(false)}>
          <div className="modal-content event-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedEvent.eventName}</h2>
              <button 
                className="close-btn"
                onClick={() => setShowEventModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="event-details-grid">
                <div className="detail-section">
                  <h3>Event Information</h3>
                  <div className="detail-item">
                    <Calendar size={16} />
                    <div>
                      <strong>Date & Time</strong>
                      <p>{new Date(selectedEvent.date).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="detail-item">
                    <MapPin size={16} />
                    <div>
                      <strong>Location</strong>
                      <p>{selectedEvent.location || "To be determined"}</p>
                    </div>
                  </div>
                  <div className="detail-item">
                    <Users size={16} />
                    <div>
                      <strong>Expected Guests</strong>
                      <p>{selectedEvent.expectedGuestCount || "Not specified"}</p>
                    </div>
                  </div>
                  <div className="detail-item">
                    <DollarSign size={16} />
                    <div>
                      <strong>Budget</strong>
                      <p>R {selectedEvent.budget || "Not specified"}</p>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h3>Event Style & Theme</h3>
                  {selectedEvent.eventCategory && (
                    <div className="detail-item">
                      <Tag size={16} />
                      <div>
                        <strong>Category</strong>
                        <p>{selectedEvent.eventCategory}</p>
                      </div>
                    </div>
                  )}
                  {selectedEvent.style && (
                    <div className="detail-item">
                      <Star size={16} />
                      <div>
                        <strong>Style</strong>
                        <p>{selectedEvent.style}</p>
                      </div>
                    </div>
                  )}
                  {selectedEvent.theme && (
                    <div className="detail-item">
                      <Palette size={16} />
                      <div>
                        <strong>Theme</strong>
                        <p>{selectedEvent.theme}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {selectedEvent.description && (
                <div className="detail-section">
                  <h3>Description</h3>
                  <p className="event-description">{selectedEvent.description}</p>
                </div>
              )}

              {selectedEvent.specialRequirements && selectedEvent.specialRequirements.length > 0 && (
                <div className="detail-section">
                  <h3>Special Requirements</h3>
                  <ul className="requirements-list">
                    {selectedEvent.specialRequirements.map((req, index) => (
                      <li key={index}>{req}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="detail-section">
                <h3>Your Services for This Event</h3>
                <div className="services-grid">
                  {selectedEvent.vendorServices.map((service) => (
                    <div key={service.serviceId} className="service-card">
                      <div className="service-header">
                        <h4>{service.serviceName || service.name}</h4>
                        <span className={`status-badge status-${service.status || 'pending'}`}>
                          {(service.status || 'pending').charAt(0).toUpperCase() + (service.status || 'pending').slice(1)}
                        </span>
                      </div>
                      {service.description && (
                        <p className="service-description">{service.description}</p>
                      )}
                      {service.price && (
                        <p className="service-price">Price: ${service.price}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="chat-btn"
                onClick={() => {
                  setShowEventModal(false);
                  handleOpenChat(selectedEvent.eventId, selectedEvent.eventName);
                }}
              >
                <MessageCircle size={16} />
                Start Chat
              </button>
              <button
                className="upload-contract-btn"
                onClick={() => {
                  setShowEventModal(false);
                  handleUploadContract(selectedEvent.eventId);
                }}
              >
                <Upload size={16} />
                {selectedEvent.contractUploaded ? "View Contract" : "Upload Contract"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default VendorBooking;