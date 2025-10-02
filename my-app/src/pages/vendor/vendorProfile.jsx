import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth } from 'firebase/auth';
import { Edit, Plus, X, Trash2, Phone, Mail, MapPin, Calendar, Award, Users, Star, CheckCircle } from "lucide-react";
import "./vendorProfile.css";

const VendorProfile = () => {
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [imageVersion, setImageVersion] = useState(Date.now());
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [formData, setFormData] = useState({
    serviceName: "",
    cost: "",
    chargeByHour: "",
    chargePerPerson: "",
    chargePerSquareMeter: "",
    extraNotes: "",
  });
  const [formErrors, setFormErrors] = useState({});

  const navProfileEdit = useCallback(() => navigate("/vendor/vendor-edit-profile"), [navigate]);

  // Validation function
  const validateForm = () => {
    const errors = {};

    // Service Name Validation - Must contain at least one letter
    if (!formData.serviceName.trim()) {
      errors.serviceName = "Service name is required";
    } else if (formData.serviceName.length > 100) {
      errors.serviceName = "Service name must be less than 100 characters";
    } else if (!/[a-zA-Z]/.test(formData.serviceName)) {
      errors.serviceName = "Service name must contain at least one letter";
    } else if (/^\d+$/.test(formData.serviceName.trim())) {
      errors.serviceName = "Service name cannot be only numbers";
    }

    if (!formData.cost) {
      errors.cost = "Base cost is required";
    } else if (isNaN(formData.cost) || parseFloat(formData.cost) < 0) {
      errors.cost = "Base cost must be a valid positive number";
    } else if (parseFloat(formData.cost) > 1000000) {
      errors.cost = "Base cost is too high";
    }

    // Validate optional numeric fields
    const numericFields = [
      { field: "chargeByHour", name: "Charge by hour" },
      { field: "chargePerPerson", name: "Charge per person" },
      { field: "chargePerSquareMeter", name: "Charge per square meter" }
    ];

    numericFields.forEach(({ field, name }) => {
      if (formData[field] && (isNaN(formData[field]) || parseFloat(formData[field]) < 0)) {
        errors[field] = `${name} must be a valid positive number`;
      } else if (formData[field] && parseFloat(formData[field]) > 1000000) {
        errors[field] = `${name} is too high`;
      }
    });

    if (formData.extraNotes.length > 500) {
      errors.extraNotes = "Extra notes must be less than 500 characters";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const fetchVendor = useCallback(async () => {
    const auth = getAuth();
    if (!auth.currentUser) {
      setError("User not authenticated");
      setLoading(false);
      return;
    }
    try {
      const auth = getAuth();
      let user = auth.currentUser;
      while (!user) {
      		await new Promise((res) => setTimeout(res, 50)); // wait 50ms
      	user = auth.currentUser;
    	}
      const token = await user.getIdToken();
      const res = await fetch("https://us-central1-planit-sdp.cloudfunctions.net/api/vendor/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to fetch vendor profile: ${res.statusText}`);
      const data = await res.json();
      setVendor(data);
      setImageVersion(Date.now());
    } catch (err) {
      setError(err.message);
      console.error("Failed to fetch vendor profile:", err);
    }
  }, []);

  const fetchServices = useCallback(async () => {
    const auth = getAuth();
    if (!auth.currentUser) {
      setError("User not authenticated");
      return;
    }
    try {
      const token = await auth.currentUser.getIdToken();
      const vendorId = auth.currentUser.uid;
      const res = await fetch(
        `https://us-central1-planit-sdp.cloudfunctions.net/api/vendors/${vendorId}/services`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error(`Failed to fetch services: ${res.statusText}`);
      const data = await res.json();
      setServices(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      console.error("Failed to fetch services:", err);
    }
  }, []);

  const handleSaveService = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    const auth = getAuth();
    if (!auth.currentUser) {
      setError("User not authenticated");
      return;
    }

    try {
      const token = await auth.currentUser.getIdToken();
      const vendorId = auth.currentUser.uid;
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
        setFormErrors({});
        setError("");
      } else {
        const errorData = await response.json();
        setError(`Failed to save service: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      setError("Error saving service");
      console.error("Error saving service:", error);
    }
  }, [editingService, formData]);

  const handleEditService = useCallback((service) => {
    setEditingService(service);
    setFormData({
      serviceName: service.serviceName || "",
      cost: service.cost || "",
      chargeByHour: service.chargeByHour || "",
      chargePerPerson: service.chargePerPerson || "",
      chargePerSquareMeter: service.chargePerSquareMeter || "",
      extraNotes: service.extraNotes || "",
    });
    setFormErrors({});
    setShowServiceForm(true);
    setError("");
  }, []);

  const handleDeleteService = useCallback(async (serviceId) => {
    const auth = getAuth();
    if (!auth.currentUser) {
      setError("User not authenticated");
      console.error("Delete failed: User not authenticated");
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

    setDeleting(serviceId);
    try {
      const token = await auth.currentUser.getIdToken();
      const vendorId = auth.currentUser.uid;
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
        let errorMessage = errorData.error || `Failed to delete service (Status: ${response.status})`;
        if (errorData.details && errorData.details.includes("not defined")) {
          errorMessage = "Server error: Firestore configuration issue. Contact support.";
        } else if (errorData.error.includes("Permission denied")) {
          errorMessage = "Permission denied: You are not authorized to delete this service.";
        }
        throw new Error(errorMessage);
      }

      setServices((prev) => prev.filter((s) => s.id !== serviceId));
      setError("");
      await fetchServices();
    } catch (error) {
      setError(`Failed to delete service: ${error.message}`);
      console.error("Error deleting service:", error);
    } finally {
      setDeleting(null);
    }
  }, [fetchServices]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    
    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, [formErrors]);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }
      await Promise.all([fetchVendor(), fetchServices()]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchVendor, fetchServices]);

  useEffect(() => {
    const auth = getAuth();
    const handleFocus = () => {
      if (auth.currentUser) {
        Promise.all([fetchVendor(), fetchServices()]);
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchVendor, fetchServices]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading your profile and services...</p>
      </div>
    );
  }

  if (error && !showServiceForm) {
    return <div className="error">{error}</div>;
  }

  if (!vendor) {
    return <p id="no-profile-found">No vendor profile found.</p>;
  }

  return (
    <div className="vendor-profile">
      {/* Header */}
      <div className="profile-header">
        <div>
          <h1 className="profile-title">Vendor Profile</h1>
          <p className="profile-subtitle">Manage your business profile and services</p>
        </div>
        <div className="profile-actions">
          <button className="btn-primary" onClick={navProfileEdit}>
            <Edit size={16} />
            Edit Profile
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-grid">
        <div className="summary-card blue">
          <div className="summary-card-header">
            <div className="summary-icon blue">
              <Calendar size={24} />
            </div>
            <span className="summary-change">Active</span>
          </div>
          <div>
            <h3 className="summary-label">Bookings</h3>
            <p className="summary-value">{vendor.bookings || 0}</p>
            <p className="summary-subtext">Total bookings</p>
          </div>
        </div>

        <div className="summary-card green">
          <div className="summary-card-header">
            <div className="summary-icon green">
              <Award size={24} />
            </div>
            <span className="summary-change">{services.length} active</span>
          </div>
          <div>
            <h3 className="summary-label">Services</h3>
            <p className="summary-value">{services.length || 0}</p>
            <p className="summary-subtext">Total services offered</p>
          </div>
        </div>

        <div className="summary-card yellow">
          <div className="summary-card-header">
            <div className="summary-icon yellow">
              <Users size={24} />
            </div>
            <span className="summary-change">Reviews</span>
          </div>
          <div>
            <h3 className="summary-label">Reviews</h3>
            <p className="summary-value">{vendor.totalReviews || 0}</p>
            <p className="summary-subtext">Customer reviews</p>
          </div>
        </div>

        <div className="summary-card purple">
          <div className="summary-card-header">
            <div className="summary-icon purple">
              <Star size={24} />
            </div>
            <span className="summary-change">Rating</span>
          </div>
          <div>
            <h3 className="summary-label">Avg Rating</h3>
            <p className="summary-value">{vendor.avgRating || 0}★</p>
            <p className="summary-subtext">Overall rating</p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="profile-grid">
        {/* Business Information */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>Business Information</h3>
          </div>
          <div className="card-content">
            <div className="business-info">
              <div className="business-name-section">
                <h2>{vendor.businessName || "Unnamed Business"}</h2>
                <span className="category-badge">{vendor.category || "Uncategorized"}</span>
              </div>
              
              <div className="profile-image-container">
                <div className="profile-image-wrapper">
                  <img
                    src={
                      vendor.profilePic
                        ? `${vendor.profilePic}?v=${imageVersion}`
                        : "/default-avatar.png"
                    }
                    alt="Vendor Profile"
                    className="profile-image-large"
                  />
                  <div className="profile-image-hover"></div>
                </div>
                <div className="verified-badge">
                  <CheckCircle size={16} />
                  <span>Verified Vendor</span>
                </div>
              </div>
            </div>

            <div className="description-section">
              <h4>Description</h4>
              <p>{vendor.description || "No description provided."}</p>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>Contact Information</h3>
          </div>
          <div className="card-content">
            <div className="contact-item">
              <MapPin className="contact-icon" size={20} />
              <div className="contact-details">
                <span className="contact-label">Address</span>
                <span className="contact-value">{vendor.address || "No address provided"}</span>
              </div>
            </div>
            
            <div className="contact-item">
              <Phone className="contact-icon" size={20} />
              <div className="contact-details">
                <span className="contact-label">Phone</span>
                <span className="contact-value">{vendor.phone || "No phone provided"}</span>
              </div>
            </div>
            
            <div className="contact-item">
              <Mail className="contact-icon" size={20} />
              <div className="contact-details">
                <span className="contact-label">Email</span>
                <span className="contact-value">{vendor.email || "No email provided"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Services Section */}
      <div className="dashboard-card">
        <div className="card-header">
          <h3>Services</h3>
          <button onClick={() => setShowServiceForm(true)} className="btn-primary">
            <Plus size={16} /> Add Service
          </button>
        </div>
        <div className="card-content">
          {services.length === 0 && <p>No services added yet.</p>}
          {services.map((service, index) => (
            <div key={service.id || `temp-${index}`} className="service-item">
              <div>
                <h4>{service.serviceName || "Unnamed Service"}</h4>
                <p>Cost: R{service.cost || "N/A"}</p>
                {service.chargeByHour && <p>Per Hour: R{service.chargeByHour}</p>}
                {service.chargePerPerson && <p>Per Person: R{service.chargePerPerson}</p>}
                {service.chargePerSquareMeter && <p>Per m²: R{service.chargePerSquareMeter}</p>}
                {service.extraNotes && <p className="service-notes">Notes: {service.extraNotes}</p>}
                {!service.id && (
                  <p className="error-text">Warning: This service is missing an ID and cannot be edited or deleted.</p>
                )}
              </div>
              <div className="service-actions">
                <button
                  className="btn-secondary"
                  onClick={() => handleEditService(service)}
                  disabled={!service.id}
                  title={service.id ? "Edit service" : "Cannot edit: Missing service ID"}
                >
                  <Edit size={16} /> Edit
                </button>
                <button
                  className="btn-delete"
                  onClick={() => handleDeleteService(service.id)}
                  disabled={deleting === service.id || !service.id}
                  title={service.id ? "Delete service" : "Cannot delete: Missing service ID"}
                >
                  <Trash2 size={16} /> {deleting === service.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit Service Modal */}
      {showServiceForm && (
        <div className="modal" onClick={() => setShowServiceForm(false)}>
          <div className="modal-content service-form" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingService ? "Edit Service" : "Add New Service"}</h3>
              <button onClick={() => setShowServiceForm(false)} className="close-btn">
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              {error && <div className="error-message">{error}</div>}
              
              <div className="form-columns">
                {/* Left Column */}
                <div className="form-column">
                  <div className="form-field">
                    <label className="form-label">Service Name *</label>
                    <input
                      type="text"
                      name="serviceName"
                      placeholder="e.g., Catering, Photography"
                      value={formData.serviceName}
                      onChange={handleChange}
                      className={formErrors.serviceName ? 'error' : ''}
                      maxLength={100}
                    />
                    {formErrors.serviceName && <span className="field-error">{formErrors.serviceName}</span>}
                  </div>
                  
                  <div className="form-field">
                    <label className="form-label">Base Cost (R) *</label>
                    <input
                      type="number"
                      name="cost"
                      placeholder="e.g., 10000"
                      value={formData.cost}
                      onChange={handleChange}
                      className={formErrors.cost ? 'error' : ''}
                      min="0"
                      max="1000000"
                      step="0.01"
                    />
                    {formErrors.cost && <span className="field-error">{formErrors.cost}</span>}
                  </div>
                  
                  <div className="form-field">
                    <label className="form-label">Per Hour (R)</label>
                    <input
                      type="number"
                      name="chargeByHour"
                      placeholder="e.g., 1000"
                      value={formData.chargeByHour}
                      onChange={handleChange}
                      className={formErrors.chargeByHour ? 'error' : ''}
                      min="0"
                      max="1000000"
                      step="0.01"
                    />
                    {formErrors.chargeByHour && <span className="field-error">{formErrors.chargeByHour}</span>}
                  </div>
                </div>
                
                {/* Right Column */}
                <div className="form-column">
                  <div className="form-field">
                    <label className="form-label">Per Person (R)</label>
                    <input
                      type="number"
                      name="chargePerPerson"
                      placeholder="e.g., 100"
                      value={formData.chargePerPerson}
                      onChange={handleChange}
                      className={formErrors.chargePerPerson ? 'error' : ''}
                      min="0"
                      max="1000000"
                      step="0.01"
                    />
                    {formErrors.chargePerPerson && <span className="field-error">{formErrors.chargePerPerson}</span>}
                  </div>
                  
                  <div className="form-field">
                    <label className="form-label">Per Square Meter (R)</label>
                    <input
                      type="number"
                      name="chargePerSquareMeter"
                      placeholder="e.g., 250"
                      value={formData.chargePerSquareMeter}
                      onChange={handleChange}
                      className={formErrors.chargePerSquareMeter ? 'error' : ''}
                      min="0"
                      max="1000000"
                      step="0.01"
                    />
                    {formErrors.chargePerSquareMeter && <span className="field-error">{formErrors.chargePerSquareMeter}</span>}
                  </div>
                  
                  <div className="form-field">
                    <label className="form-label">Notes</label>
                    <textarea
                      name="extraNotes"
                      placeholder="e.g., We provide decor services"
                      value={formData.extraNotes}
                      onChange={handleChange}
                      className={formErrors.extraNotes ? 'error' : ''}
                      rows="3"
                      maxLength={500}
                    />
                    {formErrors.extraNotes && <span className="field-error">{formErrors.extraNotes}</span>}
                    <div className="character-count">
                      {formData.extraNotes.length}/500
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-primary" onClick={handleSaveService}>
                {editingService ? "Update Service" : "Add Service"}
              </button>
              <button className="btn-secondary" onClick={() => setShowServiceForm(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorProfile;
