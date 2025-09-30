// src/vendor/VendorReviews.jsx
import React, { useState, useEffect, useCallback } from "react";
import { auth } from "../../firebase";
import { Star, StarHalf } from "lucide-react";
import "./vendorReviews.css";

const StarRating = ({ rating, size = 16 }) => (
  <div className="star-rating">
    {[1, 2, 3, 4, 5].map((i) => {
      if (i <= Math.floor(rating)) return <Star key={i} size={size} color="#fbbf24" />;
      else if (i - rating <= 0.5) return <StarHalf key={i} size={size} color="#fbbf24" />;
      else return <Star key={i} size={size} color="#d1d5db" />;
    })}
  </div>
);

const VendorReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [vendorId, setVendorId] = useState(null);

  // Method to convert Firebase timestamp to readable date - same as VendorDashboard
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

  // Get vendor ID from auth - same as VendorDashboard
  useEffect(() => {
    if (auth.currentUser) {
      setVendorId(auth.currentUser.uid);
    }
  }, []);

  // Fetch reviews using the same analytics API as VendorDashboard
  useEffect(() => {
    const fetchReviews = async () => {
      if (!vendorId) return;
      
      setLoading(true);
      try {
        const token = await auth.currentUser.getIdToken();

        const res = await fetch(
          `https://us-central1-planit-sdp.cloudfunctions.net/api/analytics/${vendorId}`,
          { 
            headers: { 
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            } 
          }
        );

        if (!res.ok) throw new Error("Failed to fetch reviews");

        const data = await res.json();
        console.log("Analytics API response:", data);
        
        setAnalytics(data);
        // Use the reviews from analytics data, same as VendorDashboard
        setReviews(data.reviews || []);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [vendorId]);

  const handleReply = async (reviewId, replyText) => {
    if (!auth.currentUser || !vendorId) return;
    if (!replyText?.trim()) {
      alert("Reply text is required");
      return;
    }

    try {
      const token = await auth.currentUser.getIdToken();

      const res = await fetch(
        `https://us-central1-planit-sdp.cloudfunctions.net/api/analytics/${vendorId}/reviews/${reviewId}/reply`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reply: replyText }),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to update reply");
      }

      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId
            ? { ...r, reply: replyText, replyInput: "", editingReply: false }
            : r
        )
      );
    } catch (err) {
      console.error("Error updating reply:", err);
      alert(err.message);
    }
  };

  const handleDeleteReply = async (reviewId) => {
    if (!auth.currentUser || !vendorId) return;
    if (!window.confirm("Are you sure you want to delete this reply?")) return;

    try {
      const token = await auth.currentUser.getIdToken();

      const res = await fetch(
        `https://us-central1-planit-sdp.cloudfunctions.net/api/analytics/${vendorId}/reviews/${reviewId}/reply`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reply: "_blank_" }),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to delete reply");
      }

      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId ? { ...r, reply: "_blank_", editingReply: false, replyInput: "" } : r
        )
      );
    } catch (err) {
      console.error("Error deleting reply:", err);
      alert(err.message);
    }
  };

  // Use the same timestamp conversion function
  const formatTime = (timestamp) => {
    return convertFirebaseTimestamp(timestamp);
  };

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner"></div>
      <p>Loading your reviews...</p>
    </div>
  );

  if (error) return <p className="error">{error}</p>;
  if (!reviews.length) return <p>No reviews found.</p>;

  // Calculate analytics same as VendorDashboard
  const overallRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length;
  const totalReviews = reviews.length;
  const ratingCounts = {
    excellent: reviews.filter((r) => (r.rating || 0) >= 4.5).length,
    good: reviews.filter((r) => (r.rating || 0) >= 3.5 && (r.rating || 0) < 4.5).length,
    average: reviews.filter((r) => (r.rating || 0) >= 2.5 && (r.rating || 0) < 3.5).length,
    poor: reviews.filter((r) => (r.rating || 0) < 2.5).length,
  };

  // Calculate rating distribution same as VendorDashboard
  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach(review => {
    const rating = Math.floor(review.rating || 0);
    if (rating >= 1 && rating <= 5) {
      ratingDistribution[rating]++;
    }
  });

  return (
    <section className="vendor-reviews-page">
      <section className="review-page-title">
        <h2>Vendor Reviews</h2>
        <p>Review, analyze, and respond to reviews about your services.</p>
      </section>

      {/* Overall Stats Section - similar to VendorDashboard */}
      <div className="reviews-summary">
        <div className="overall-rating">
          <p>Overall Rating</p>
          <h1>{overallRating.toFixed(1)}</h1>
          <p className="total-reviews">{totalReviews} review(s)</p>
        </div>

       
      </div>

      {/* Rating Bars */}
      <div className="rating-bars">
        {["excellent", "good", "average", "poor"].map((key) => (
          <div key={key} className="rating-bar">
            <span className="rating-label">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
            <div className="rating-progress">
              <div
                className={`rating-progress-fill rating-${key}`}
                style={{ width: `${(ratingCounts[key] / totalReviews) * 100}%` }}
              ></div>
            </div>
            <span className="rating-count">{ratingCounts[key]}</span>
          </div>
        ))}
      </div>

      {/* Reviews List */}
      <div className="review-list">
        {reviews.map((review) => {
          const isBlank = review.reply === "_blank_";
          // Use the same timestamp fields as VendorDashboard
          const reviewDate = review.timeOfReview || review.createdAt || review.date;
          
          return (
            <div key={review.id} className="review-card">
              <div className="review-header">
                <div className="reviewer-info">
                  <p className="review-time">{formatTime(reviewDate)}</p>
                </div>
                <StarRating rating={review.rating} size={16} />
              </div>
              
              <p className="review-comment">{review.review}</p>

              {review.reply && !review.editingReply && !isBlank && (
                <div className="review-reply">
                  <strong>Your Reply:</strong>
                  <p>{review.reply}</p>
                  <div className="review-reply-actions">
                    <button
                      onClick={() =>
                        setReviews((prev) =>
                          prev.map((r) =>
                            r.id === review.id ? { ...r, editingReply: true, replyInput: r.reply } : r
                          )
                        )
                      }
                    >
                      Edit
                    </button>
                    <button onClick={() => handleDeleteReply(review.id)}>Delete</button>
                  </div>
                </div>
              )}

              {(!review.reply || review.editingReply || isBlank) && (
                <div className="reply-form">
                  <input
                    type="text"
                    placeholder="Write a reply..."
                    value={review.replyInput || ""}
                    onChange={(e) =>
                      setReviews((prev) =>
                        prev.map((r) =>
                          r.id === review.id
                            ? {
                                ...r,
                                replyInput: e.target.value,
                                editingReply: true,
                                reply: r.reply === "_blank_" ? null : r.reply,
                              }
                            : r
                        )
                      )
                    }
                  />
                  <div className="review-reply-actions">
                    <button
                      onClick={() => handleReply(review.id, review.replyInput)}
                      disabled={!review.replyInput?.trim()}
                    >
                      Send
                    </button>
                    <button
                      onClick={() =>
                        setReviews((prev) =>
                          prev.map((r) =>
                            r.id === review.id ? { ...r, editingReply: false, replyInput: "" } : r
                          )
                        )
                      }
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default VendorReviews;