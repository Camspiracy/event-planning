import React, { useEffect, useState } from "react";
import "./BronzeFury.css";

export default function BronzeFury({ onClose, onEventSelect }) {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [fetchingGuests, setFetchingGuests] = useState(false);
  const [error, setError] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);

  // ✅ Fetch events once
  useEffect(() => {
    fetchEventsFromBronzeFury();
  }, []);

  const fetchEventsFromBronzeFury = async () => {
    try {
      setLoading(true);
      const apiKey = import.meta.env.VITE_BRONZEFURY_API_KEY;
      if (!apiKey) throw new Error("Missing BronzeFury API key.");

      const response = await fetch("https://event-flow-6514.onrender.com/api/events", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
      });

      if (!response.ok) throw new Error(`Failed to fetch events: ${response.statusText}`);

      const data = await response.json();
      const fetchedEvents =
        Array.isArray(data) ? data : Array.isArray(data.events) ? data.events : [];

      setEvents(fetchedEvents);
      setFilteredEvents(fetchedEvents);
    } catch (err) {
      console.error("Error fetching events:", err);
      setError(err.message || "Unable to fetch events.");
    } finally {
      setLoading(false);
    }
  };

  const fetchGuestsFromBronzeFury = async (eventId) => {
    try {
      const apiKey = import.meta.env.VITE_BRONZEFURY_API_KEY;
      if (!apiKey) throw new Error("Missing BronzeFury API key.");

      const response = await fetch(
        `https://event-flow-6514.onrender.com/api/events/${eventId}/guests`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
          },
        }
      );

      if (!response.ok)
        throw new Error(`Failed to fetch guests: ${response.statusText}`);

      const data = await response.json();
      return Array.isArray(data.guests) ? data.guests : [];
    } catch (err) {
      console.error(`Error fetching guests for event ${eventId}:`, err);
      return [];
    }
  };

  // 🔍 Filter events by search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredEvents(events);
    } else {
      const lower = searchQuery.toLowerCase();
      setFilteredEvents(
        events.filter(
          (ev) =>
            ev.name?.toLowerCase().includes(lower) ||
            ev.description?.toLowerCase().includes(lower)
        )
      );
    }
  }, [searchQuery, events]);

  const handleSelectEvent = async (event) => {
    if (fetchingGuests) return;
    setFetchingGuests(true);
    setSelectedEventId(event.id);

    const guests = await fetchGuestsFromBronzeFury(event.id);
    const fullEvent = { ...event, guests };

    if (onEventSelect) onEventSelect(fullEvent);

    setFetchingGuests(false);
    onClose();
  };

  return (
    <section className="popup-overlay">
      <div className="bronze-fury-popup">
        {/* ✅ Header always visible */}
        <header className="bronze-fury-header">
          <h2>Import from BronzeFury</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </header>

        <p className="bronze-fury-subtext">
          Connect to BronzeFury and import your events or guests.
        </p>

        <input
          type="text"
          placeholder="Search events..."
          className="bronze-fury-search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        {/* ✅ The rest of the content below */}
        <div className="bronze-fury-content">
          {loading ? (
            <p className="bronze-fury-loading">Loading events...</p>
          ) : error ? (
            <p className="bronze-fury-error">⚠️ {error}</p>
          ) : filteredEvents.length > 0 ? (
            <section className="bronze-fury-events">
              {filteredEvents.map((event) => (
                <div
                  key={event.id || event._id}
                  className={`bronze-fury-card ${
                    selectedEventId === event.id ? "selected" : ""
                  }`}
                  onClick={() => handleSelectEvent(event)}
                >
                  <h3>{event.name || "Untitled Event"}</h3>
                  <p>{event.description || "No description provided."}</p>
                  {fetchingGuests && selectedEventId === event.id && (
                    <p className="bronze-fury-loading-small">Fetching guests…</p>
                  )}
                </div>
              ))}
            </section>
          ) : (
            <p className="bronze-fury-empty">No events found.</p>
          )}
        </div>
      </div>
    </section>
  );
}
