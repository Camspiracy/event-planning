import React, { useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import "./vendorFloorplan.css";

// Helper to format Firestore timestamps, strings, or JS Date objects
function formatDate(date) {
  if (!date) return "";

  // Firestore timestamp
  if (
    typeof date === "object" &&
    typeof date._seconds === "number" &&
    typeof date._nanoseconds === "number"
  ) {
    const jsDate = new Date(date._seconds * 1000 + date._nanoseconds / 1e6);
    return jsDate.toLocaleString();
  }

  // Already a JS Date
  if (date instanceof Date) {
    return date.toLocaleString();
  }

  // String
  if (typeof date === "string") {
    return new Date(date).toLocaleString();
  }

  return String(date); // fallback
}

const useFloorplans = (events, vendorId) => {
  const [floorplans, setFloorplans] = useState({});
  useEffect(() => {
    const fetchFloorplans = async () => {
      if (events.length === 0 || !vendorId) return;

      const floorplansData = {};
      await Promise.all(
        events.map(async (event) => {
          try {
            const floorplanRef = doc(
              db,
              "Event",
              event.eventId,
              "Floorplans",
              vendorId
            );
            const docSnap = await getDoc(floorplanRef);
            if (docSnap.exists()) {
              floorplansData[event.eventId] = docSnap.data().floorplanUrl;
            }
          } catch (error) {
            console.error(
              `Error fetching floorplan for event ${event.eventId}:`,
              error
            );
          }
        })
      );
      console.log("Fetched floorplans:", floorplansData);
      setFloorplans(floorplansData);
    };
    fetchFloorplans();
  }, [events, vendorId]);
  return floorplans;
};

const VendorFloorplan = () => {
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState("");
  const [order, setOrder] = useState("asc");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [vendorId, setVendorId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const floorplans = useFloorplans(events, vendorId);

  // Fetch vendor ID and events
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setVendorId(user.uid);
        try {
          const token = await user.getIdToken();
          const res = await fetch(
            "https://us-central1-planit-sdp.cloudfunctions.net/api/vendor/bookings",
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
          const data = await res.json();
          const bookings = data.bookings.map((booking) => ({
            id: booking.eventId,
            eventId: booking.eventId,
            name: booking.eventName,
            date: booking.date,
          }));
          setEvents(bookings);
          setLoading(false);
        } catch (err) {
          console.error("Error fetching bookings:", err);
          setError("Failed to fetch events");
          setLoading(false);
        }
      } else {
        setError("User not authenticated");
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const filteredEvents = events
    .filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) =>
      order === "asc"
        ? new Date(a.date) - new Date(b.date)
        : new Date(b.date) - new Date(a.date)
    );

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner"></div>
      <h2>Loading Floorplans...</h2>
    </div>
  );
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="floorplan-page">
      <header>
        <h1>Vendor Floorplan</h1>
        <p>Manage floorplans received from your clients</p>
      </header>

      <div className="controls">
        <input
          type="text"
          placeholder="Search event name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
        <select
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          className="sort-dropdown"
        >
          <option value="asc">Date Ascending</option>
          <option value="desc">Date Descending</option>
        </select>
      </div>

      <div className="tiles-grid">
        {filteredEvents.length > 0 ? (
          filteredEvents.map((event) => (
            <div
              key={event.id}
              className="client-tile"
              onClick={() => setSelectedEvent(event)}
            >
              <h3>{event.name}</h3>
              <p>Date: {formatDate(event.date)}</p>
              <div className="floorplan-section">
                {floorplans[event.eventId] ? (
                  <div className="floorplan-preview">
                    <img
                      src={floorplans[event.eventId]}
                      alt="Event Floorplan"
                      className="floorplan-image"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(floorplans[event.eventId], "_blank");
                      }}
                    />
                    <span className="floorplan-label">Floorplan Available</span>
                  </div>
                ) : (
                  <div className="no-floorplan">
                    <span>No Floorplan Available</span>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="no-results">No events found</p>
        )}
      </div>

      {selectedEvent && (
        <div
          className="modal-overlay active"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>{selectedEvent.name} - Floorplan</h2>
              <button
                className="close-btn"
                onClick={() => setSelectedEvent(null)}
              >
                &times;
              </button>
            </div>

            <div className="floorplan-preview modal-floorplan">
              {floorplans[selectedEvent.eventId] ? (
                <img
                  src={floorplans[selectedEvent.eventId]}
                  alt="Event Floorplan"
                  className="modal-floorplan-image"
                  onClick={() =>
                    window.open(floorplans[selectedEvent.eventId], "_blank")
                  }
                />
              ) : (
                <p>No floorplan available for this event</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorFloorplan;