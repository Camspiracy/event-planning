import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  Star,
  StarHalf,
  DollarSign,
  Eye,
  Plus,
  MapPin,
  CheckCircle,
  AlertCircle,
  Edit,
  X,
  Trash2,
  Users,
} from "lucide-react";
import { auth } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import "./VendorDashboard.css";

const VendorDashboard = ({ setActivePage }) => {
  const [services, setServices] = useState([]);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [vendorId, setVendorId] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [vendorBookings, setVendorBookings] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [formData, setFormData] = useState({
    serviceName: "",
    cost: "",
    chargeByHour: "",
    chargePerPerson: "",
    chargePerSquareMeter: "",
    extraNotes: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Method to convert Firebase timestamp to readable date
  const convertFirebaseTimestamp = useCallback((timestamp) => {
    if (!timestamp) return "Recently";
    
    try {
      let date;
      
      // Handle different Firebase timestamp formats
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        // Firebase Timestamp object
        date = timestamp.toDate();
      } else if (timestamp._seconds && timestamp._nanoseconds) {
        // Firebase Timestamp with _seconds and _nanoseconds
        date = new Date(timestamp._seconds * 1000 + timestamp._nanoseconds / 1000000);
      } else if (timestamp.seconds && timestamp.nanoseconds) {
        // Firebase Timestamp with seconds and nanoseconds
        date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
      } else if (typeof timestamp === 'string') {
        // ISO string
        date = new Date(timestamp);
      } else if (typeof timestamp === 'number') {
        // Unix timestamp in seconds or milliseconds
        date = timestamp > 1000000000000 ? new Date(timestamp) : new Date(timestamp * 1000);
      } else {
        console.warn('Unknown timestamp format:', timestamp);
        return "Recently";
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date from timestamp:', timestamp);
        return "Recently";
      }
      
      // Calculate time difference for relative time
      const now = new Date();
      const diffInMs = now - date;
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      
      if (diffInMinutes < 1) {
        return "Just now";
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
      } else if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
      } else if (diffInDays < 7) {
        return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
      } else if (diffInDays < 30) {
        const weeks = Math.floor(diffInDays / 7);
        return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
      } else {
        // For older dates, show the actual date
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
    } catch (error) {
      console.error('Error converting Firebase timestamp:', error, timestamp);
      return "Recently";
    }
  }, []);

  // Method to convert event date strings to readable format
  const formatEventDate = useCallback((dateString) => {
    if (!dateString) return "Date not set";
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Date not set";
      }
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting event date:', error, dateString);
      return "Date not set";
    }
  }, []);

  // Get vendor ID from auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setVendorId(user.uid);
        console.log("Vendor ID set:", user.uid);
      } else {
        setError("User not authenticated");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch vendor bookings to calculate total bookings count
  const fetchVendorBookings = useCallback(async () => {
    if (!vendorId) return;

    setBookingsLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(
        `https://us-central1-planit-sdp.cloudfunctions.net/api/vendor/bookings`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("Vendor bookings API response:", data);
        setVendorBookings(data.bookings || []);
        
        // Calculate total bookings count
        const totalBookingsCount = data.bookings?.length || 0;
        
        // Update analytics with real booking count
        setAnalytics(prev => ({
          ...prev,
          totalBookings: totalBookingsCount,
          recentBookings: data.bookings?.slice(0, 5) || []
        }));
      } else {
        console.warn("Failed to fetch vendor bookings, using analytics data");
      }
    } catch (error) {
      console.error("Failed to fetch vendor bookings:", error);
    } finally {
      setBookingsLoading(false);
    }
  }, [vendorId]);

  // Calculate analytics data from fetched analytics
  const calculateAnalyticsData = useCallback((analyticsData, bookingsCount = 0) => {
    if (!analyticsData) return null;

    const reviews = analyticsData.reviews || [];
    const totalRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
    const avgRating = reviews.length > 0 ? totalRating / reviews.length : 0;
    
    // Calculate rating distribution
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(review => {
      const rating = Math.floor(review.rating || 0);
      if (rating >= 1 && rating <= 5) {
        ratingDistribution[rating]++;
      }
    });

    // Use actual bookings count from vendor bookings API, fallback to analytics data
    const actualTotalBookings = bookingsCount > 0 ? bookingsCount : (analyticsData.totalBookings || 0);

    return {
      totalBookings: actualTotalBookings,
      totalRevenue: analyticsData.totalRevenue || 0,
      monthlyRevenue: analyticsData.monthlyRevenue || {},
      avgRating,
      totalReviews: reviews.length,
      ratingDistribution,
      reviews: reviews.slice(0, 5), // Recent reviews for display
      performanceMetrics: {
        responseRate: analyticsData.responseRate || 0,
        completionRate: analyticsData.completionRate || 0,
        repeatCustomers: analyticsData.repeatCustomers || 0,
      },
      // Additional metrics from bookings
      confirmedBookings: vendorBookings.filter(booking => 
        booking.status === 'confirmed' || booking.status === 'accepted'
      ).length,
      pendingBookings: vendorBookings.filter(booking => 
        booking.status === 'pending'
      ).length,
    };
  }, [vendorBookings]);

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    if (!vendorId) return;

    setAnalyticsLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(
        `https://us-central1-planit-sdp.cloudfunctions.net/api/analytics/${vendorId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const analyticsData = await response.json();
        console.log("Analytics API response:", analyticsData);
        
        // Calculate total bookings from vendor bookings
        const totalBookingsCount = vendorBookings.length;
        
        const processedAnalytics = calculateAnalyticsData(analyticsData, totalBookingsCount);
        setAnalytics(processedAnalytics);
      } else {
        console.warn("Failed to fetch analytics, using default data");
        // Set default analytics data if API fails
        const totalBookingsCount = vendorBookings.length;
        setAnalytics(calculateAnalyticsData({ reviews: [] }, totalBookingsCount));
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
      // Set default analytics data on error
      const totalBookingsCount = vendorBookings.length;
      setAnalytics(calculateAnalyticsData({ reviews: [] }, totalBookingsCount));
    } finally {
      setAnalyticsLoading(false);
    }
  }, [vendorId, vendorBookings, calculateAnalyticsData]);

  // Fetch services
  const fetchServices = useCallback(async () => {
    if (!vendorId) {
      console.log("Skipping fetchServices: vendorId not set");
      return;
    }
    setLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(
        `https://us-central1-planit-sdp.cloudfunctions.net/api/vendors/${vendorId}/services`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("Services API response:", data);
        const servicesData = Array.isArray(data) ? data : data.services || [];
        const validServices = servicesData.filter(
          (s) => s.id && typeof s.id === "string"
        );
        if (servicesData.length !== validServices.length) {
          console.warn(
            "Some services missing valid IDs:",
            servicesData.filter((s) => !s.id || typeof s.id !== "string")
          );
          setError("Some services could not be loaded due to missing IDs");
        }
        setServices(validServices);
        console.log("Services state set:", validServices);
      } else {
        const errorData = await response.json();
        setError(`Failed to fetch services: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      setError("Failed to fetch services");
      console.error("Failed to fetch services:", error);
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  // Fetch vendor report for additional metrics
  const fetchVendorReport = useCallback(async () => {
    if (!vendorId) return;

    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(
        `https://us-central1-planit-sdp.cloudfunctions.net/api/vendor/my-report`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const reportData = await response.json();
        console.log("Vendor report data:", reportData);
      }
    } catch (error) {
      console.error("Failed to fetch vendor report:", error);
    }
  }, [vendorId]);

  // Fetch all data when vendorId is available
  useEffect(() => {
    if (vendorId) {
      fetchServices();
      fetchVendorBookings();
      fetchVendorReport();
    }
  }, [vendorId, fetchServices, fetchVendorBookings, fetchVendorReport]);

  // Fetch analytics after bookings are loaded
  useEffect(() => {
    if (vendorId && vendorBookings.length >= 0) {
      fetchAnalytics();
    }
  }, [vendorId, vendorBookings, fetchAnalytics]);

  const handleChange = useCallback((e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  const handleSaveService = useCallback(async () => {
    if (!vendorId) {
      setError("User not authenticated");
      return;
    }
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(
        `https://us-central1-planit-sdp.cloudfunctions.net/api/vendors/${vendorId}/services`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(
            editingService ? { ...formData, serviceId: editingService.id } : formData
          ),
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (editingService) {
          setServices((prev) =>
            prev.map((s) => (s.id === editingService.id ? { ...s, ...formData } : s))
          );
        } else {
          setServices((prev) => [...prev, { id: data.serviceId, ...formData }]);
        }

        setShowServiceForm(false);
        setEditingService(null);
        setFormData({
          serviceName: "",
          cost: "",
          chargeByHour: "",
          chargePerPerson: "",
          chargePerSquareMeter: "",
          extraNotes: "",
        });
        alert(editingService ? "Service updated successfully!" : "Service added successfully!");
        await fetchServices();
      } else {
        const errorData = await response.json();
        setError(`Failed to save service: ${errorData.error}`);
      }
    } catch (error) {
      setError("Error saving service");
      console.error("Error saving service:", error);
    }
  }, [vendorId, editingService, formData, fetchServices]);

  const handleEdit = useCallback((service) => {
    if (!service.id) {
      setError("Cannot edit service: Missing service ID");
      console.error("Edit failed: Missing service ID", service);
      return;
    }
    setEditingService(service);
    setFormData(service);
    setShowServiceForm(true);
  }, []);

  const handleDeleteService = useCallback(async (serviceId) => {
    if (!vendorId || !auth.currentUser) {
      setError("User not authenticated");
      console.error("Delete failed: vendorId not set");
      return;
    }
    if (!serviceId) {
      setError("Cannot delete service: Missing service ID");
      console.error("Delete failed: serviceId not provided");
      return;
    }
    if (!confirm("Are you sure you want to delete this service?")) {
      return;
    }

    console.log("Attempting to delete service:", { vendorId, serviceId });
    setDeleting(serviceId);
    console.log("Deleting state set to:", serviceId);
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(
        `https://us-central1-planit-sdp.cloudfunctions.net/api/vendors/${vendorId}/services/${serviceId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Delete API error:", errorData);
        throw new Error(errorData.error || "Failed to delete service on client side");
      }

      setServices((prev) => prev.filter((s) => s.id !== serviceId));
      alert("Service deleted successfully!");
      await fetchServices();
    } catch (error) {
      setError(`Failed to delete service: ${error.message}`);
      console.error("Error deleting service:", error);
    } finally {
      setDeleting(null);
      console.log("Deleting state cleared");
    }
  }, [vendorId, fetchServices]);

  // Calculate booking statistics from actual vendor bookings
  const bookingStats = {
    total: vendorBookings.length,
    confirmed: vendorBookings.filter(booking => 
      booking.status === 'confirmed' || booking.status === 'accepted'
    ).length,
    pending: vendorBookings.filter(booking => 
      booking.status === 'pending'
    ).length,
    rejected: vendorBookings.filter(booking => 
      booking.status === 'rejected' || booking.status === 'declined'
    ).length,
  };

  // Use actual recent bookings from vendor bookings API or fallback to mock data
  const recentBookings = vendorBookings.length > 0 
    ? vendorBookings.slice(0, 3).map((booking, index) => ({
        id: booking.eventId || `booking-${index}`,
        event: booking.eventName || "Unnamed Event",
        date: formatEventDate(booking.date),
        status: booking.status || "pending",
        amount: booking.budget ? `R${Number(booking.budget).toLocaleString()}` : "R0",
      }))
    : [
        { id: 1, event: "Corporate Lunch", date: "Aug 20", status: "confirmed", amount: "R15,000" },
        { id: 2, event: "Wedding Reception", date: "Aug 25", status: "pending", amount: "R45,000" },
        { id: 3, event: "Birthday Party", date: "Aug 30", status: "confirmed", amount: "R8,500" },
      ];

  // Use actual reviews from analytics or fallback to mock data
  const recentReviews = analytics?.reviews?.length > 0 
    ? analytics.reviews.map((review, index) => ({
        id: review.id || `review-${index}`,
        name: review.reviewerName || "Anonymous",
        rating: review.rating || 0,
        comment: review.review || "No comment provided",
        date: convertFirebaseTimestamp(review.timeOfReview || review.createdAt),
      }))
    : [
        { id: 1, name: "Sarah M.", rating: 5, comment: "Exceptional service and delicious food!", date: "2 days ago" },
        { id: 2, name: "John D.", rating: 4, comment: "Great presentation and timely delivery.", date: "1 week ago" },
      ];

  if (loading) return <div className="loading-screen">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="vendor-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Dashboard Overview</h1>
          <p className="dashboard-subtitle">Welcome back! Here's what's happening with your business.</p>
        </div>
        <div className="dashboard-actions">
          <button className="btn-primary" onClick={() => setActivePage("bookings")}>
            <Plus size={16} />
            New Booking
          </button>
          <button className="btn-secondary" onClick={() => {
            fetchVendorBookings();
            fetchAnalytics();
          }}>
            <Eye size={16} />
            Refresh Data
          </button>
        </div>
      </div>

      {/* Summary Cards with Real Analytics Data */}
      <div className="summary-grid">
        <div className="summary-card blue">
          <div className="summary-card-header">
            <div className="summary-icon blue">
              <Calendar size={24} />
            </div>
            <span className="summary-change">
              {bookingStats.total > 0 ? `${bookingStats.confirmed} confirmed` : "No bookings"}
            </span>
          </div>
          <div>
            <h3 className="summary-label">Total Bookings</h3>
            <p className="summary-value">{bookingStats.total}</p>
            <p className="summary-subtext">
              {bookingStats.confirmed} confirmed, {bookingStats.pending} pending
            </p>
          </div>
        </div>

        <div className="summary-card green">
          <div className="summary-card-header">
            <div className="summary-icon green">
              <DollarSign size={24} />
            </div>
            <span className="summary-change">
              {analytics?.totalRevenue > 0 ? "+15%" : "No data"}
            </span>
          </div>
          <div>
            <h3 className="summary-label">Total Revenue</h3>
            <p className="summary-value">
              R{(analytics?.totalRevenue || 0).toLocaleString()}
            </p>
            <p className="summary-subtext">All time</p>
          </div>
        </div>

        <div className="summary-card yellow">
          <div className="summary-card-header">
            <div className="summary-icon yellow">
              <Star size={24} />
            </div>
            <span className="summary-change">
              {analytics?.avgRating > 0 ? `+${(analytics.avgRating - 4.5).toFixed(1)}` : "No reviews"}
            </span>
          </div>
          <div>
            <h3 className="summary-label">Avg Rating</h3>
            <p className="summary-value">
              {analytics?.avgRating ? analytics.avgRating.toFixed(1) : "0.0"}
            </p>
            <p className="summary-subtext">
              {analytics?.totalReviews || 0} reviews
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="dashboard-grid">
        {/* Recent Bookings */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>Recent Bookings</h3>
            <button onClick={() => setActivePage("bookings")} className="view-all-link">
              View All ({vendorBookings.length})
            </button>
          </div>
          <div className="card-content">
            {recentBookings.length > 0 ? (
              recentBookings.map((booking) => (
                <div key={booking.id} className="booking-item">
                  <div className="booking-header">
                    <h4>{booking.event}</h4>
                    <span className={`status-badge ${booking.status}`}>
                      {booking.status}
                    </span>
                  </div>
                  <div className="booking-footer">
                    <span>{booking.date}</span>
                    <span className="amount">{booking.amount}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="no-bookings">No recent bookings</p>
            )}
          </div>
        </div>

        {/* Recent Reviews */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>Recent Reviews</h3>
            <button onClick={() => setActivePage("reviews")} className="view-all-link">
              View All
            </button>
          </div>
          <div className="card-content">
            {recentReviews.length > 0 ? (
              recentReviews.map((review) => (
                <div key={review.id} className="review-item">
                  <div className="review-header">
                    <div className="review-user">
                      <h4>{review.name}</h4>
                      <div className="rating">
                        {[1, 2, 3, 4, 5].map((i) => {
                          if (i <= Math.floor(review.rating)) {
                            return <Star key={i} size={14} fill="#fbbf24" color="#fbbf24" />;
                          } else if (i - review.rating <= 0.5) {
                            return <StarHalf key={i} size={14} fill="#fbbf24" color="#fbbf24" />;
                          } else {
                            return <Star key={i} size={14} color="#d1d5db" />;
                          }
                        })}
                      </div>
                    </div>
                    <span className="review-date">{review.date}</span>
                  </div>
                  <p className="review-comment">{review.comment}</p>
                </div>
              ))
            ) : (
              <p className="no-reviews">No reviews yet</p>
            )}
          </div>
        </div>

        {/* Analytics Sidebar */}
        <div className="dashboard-sidebar">
          {/* Booking Statistics */}
          <div className="dashboard-card">
            <div className="card-header">
              <h3>Booking Statistics</h3>
            </div>
            <div className="card-content">
              <div className="booking-stats">
                <div className="stat-item">
                  <span className="stat-label">Total Bookings:</span>
                  <span className="stat-value">{bookingStats.total}</span>
                </div>
                <div className="stat-item confirmed">
                  <span className="stat-label">Confirmed:</span>
                  <span className="stat-value">{bookingStats.confirmed}</span>
                </div>
                <div className="stat-item pending">
                  <span className="stat-label">Pending:</span>
                  <span className="stat-value">{bookingStats.pending}</span>
                </div>
                <div className="stat-item rejected">
                  <span className="stat-label">Rejected:</span>
                  <span className="stat-value">{bookingStats.rejected}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="dashboard-card">
            <div className="card-header">
              <h3>Performance Metrics</h3>
            </div>
            <div className="card-content">
              <div className="performance-metrics">
                <div className="metric-item">
                  <span className="metric-label">Completion Rate: </span>
                  <div className="metric-bar">
                    <div 
                      className="metric-fill" 
                      style={{ width: `${analytics?.performanceMetrics?.completionRate || 0}%` }}
                    ></div>
                  </div>
                  <span className="metric-value">{analytics?.performanceMetrics?.completionRate || 0}%</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Repeat Customers: </span>
                  <div className="metric-value-large">{analytics?.performanceMetrics?.repeatCustomers || 0}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Rating Distribution */}
          {analytics?.ratingDistribution && (
            <div className="dashboard-card">
              <div className="card-header">
                <h3>Rating Distribution</h3>
              </div>
              <div className="card-content">
                <div className="rating-distribution">
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <div key={rating} className="rating-bar">
                      <span className="rating-star">{rating}★</span>
                      <div className="rating-progress">
                        <div 
                          className="rating-fill"
                          style={{ 
                            width: `${(analytics.ratingDistribution[rating] / analytics.totalReviews) * 100 || 0}%` 
                          }}
                        ></div>
                      </div>
                      <span className="rating-count">{analytics.ratingDistribution[rating] || 0}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rest of the component remains the same... */}
      {/* Services Section, Quick Actions, and Modal remain unchanged */}
    </div>
  );
};

export default VendorDashboard;