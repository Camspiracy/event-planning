
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../firebase"; 
import { Edit } from "lucide-react";
import "./vendorProfile.css";

const VendorProfile = () => {
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);

  const navProfileEdit = () => navigate("/vendor/vendor-edit-profile");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const token = await user.getIdToken();
        const res = await fetch("https://us-central1-planit-sdp.cloudfunctions.net/api/vendor/me", {
          headers: {  



            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error("Failed to fetch vendor profile");
        const data = await res.json();
        setVendor(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <p>Loading vendor profile...</p>;
  if (!vendor) return <p>No vendor profile found.</p>;

  return (
    <div className="vendor-profile">
      {/* Header */}
      <div className="profile-header">
        <div>
          <h1 className="profile-title">{"Vendor Profile"}</h1>
          <p className="profile-subtitle">{"Manage your business profile and services"}</p>
        </div>
        <button className="edit-profile-btn" onClick={navProfileEdit}>
          <Edit size={16} /> Edit Profile
        </button>
      </div>

      {/* Small Summary Cards */}
      <div className="profile-summary-cards">
        <div className="profile-summary-card">
          <p className="summary-label">Bookings</p>
          <p className="summary-value">{vendor.bookings || 0}</p>
        </div>
        <div className="profile-summary-card">
          <p className="summary-label">Active Services</p>
          <p className="summary-value">{vendor.activeServices || 0}</p>
        </div>
        <div className="profile-summary-card">
          <p className="summary-label">Total Reviews</p>
          <p className="summary-value">{vendor.totalReviews || 0}</p>
        </div>
        <div className="profile-summary-card">
          <p className="summary-label">Avg. Rating</p>
          <p className="summary-value">{vendor.avgRating || 0}</p>
        </div>
      </div>

      {/* Profile Cards Grid */}
      <div className="profile-cards-grid">
        {/* Business Information */}
        <div className="profile-card">
          <div className="profile-card-header">
            <h2>Business Information</h2>
          </div>
          <div className="business-topline">
            <h3 className="business-name">{vendor.businessName}</h3>
            <span className="business-badge">{vendor.category}</span>
          </div>
          <div className="business-description">
            <p>{vendor.description}</p>
          </div>
          <div className="business-contact">
            <p className="contact-item">📍 {vendor.address || "None"}</p>
            <p className="contact-item">📞 {vendor.phone}</p>
            <p className="contact-item">✉️ {vendor.email}</p>
          </div>
        </div>

        {/* Services & Pricing */}
        <div className="profile-card">
          <div className="profile-card-header">
            <h2>Services & Pricing</h2>
          </div>
          <div className="services-list">
            {vendor.services?.length ? (
              vendor.services.map((s, i) => (
                <div className="service-item" key={i}>
                  <p className="service-name">{s.name}</p>
                  <p className="service-price">{s.price}</p>
                </div>
              ))
            ) : (
              <p>No services added yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorProfile;
