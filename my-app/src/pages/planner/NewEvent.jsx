import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { auth } from "../../firebase";
import './NewEvent.css';

export default function NewEvent({ setActivePage }) {
  const [inputs, setInputs] = useState({});
  const navigate = useNavigate();
  const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInputs(values => ({ ...values, [name]: value }));
  };

  const handleSubmit = async(e) => {
    console.log("Check");
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!auth.currentUser) {
      setError("You must be logged in to apply");
      return;
    }

    try{
      const token = await auth.currentUser.getIdToken();
      
      const res = await fetch("http://localhost:5000/api/event/apply", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}` // DO NOT set Content-Type manually for FormData
      },
      body: inputs
    });

      setSuccess("Application submitted successfully!");
      navigate("/planner-dashboard");
      console.log("Navigating now...");
    }catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  return (
    <section className="page-container">

      {/* Header Section */}
      <section className="intro">
        <section>
          <h1 className="title">New Event</h1>
          <p className="dashboard-subtitle">Input your event's details</p>
        </section>
      </section>


      <form className="main-content" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="eventName">Event Name</label>
          <input id="eventName" type="text" name="eventName" value={inputs.eventName || ""} onChange={handleChange} />
        </div>

        <div className="form-field">
          <label htmlFor="description">Event Description</label>
          <textarea id="description" name="description" value={inputs.description || ""} onChange={handleChange} />
        </div>

        <div className="form-field">
          <label htmlFor="theme">Event Theme</label>
          <input id="theme" type="text" name="theme" value={inputs.theme || ""} onChange={handleChange} />
        </div>

        <div className="form-field">
          <label htmlFor="location">Event Location</label>
          <input id="location" type="text" name="location" value={inputs.location || ""} onChange={handleChange} />
        </div>

        <div className="date-time">
          <label htmlFor="budget">Event Budget</label>
          <input id="budget" type="number" name="budget" value={inputs.budget || ""} onChange={handleChange} />
        </div>

        <div className="form-field">
          <label htmlFor="notes">Event Notes</label>
          <textarea id="notes" name="notes" value={inputs.notes || ""} onChange={handleChange} />
        </div>

        <div className="date-time">
          <label htmlFor="startTime">Start Date & Time</label>
          <input id="startTime" type="datetime-local" name="startTime" value={inputs.startTime || ""} onChange={handleChange} />
        </div>

        <div className="date-time">
          <label htmlFor="endTime">End Date & Time</label>
          <input id="endTime" type="datetime-local" name="endTime" value={inputs.endTime || ""} onChange={handleChange} />
        </div>

        <button type="submit" className="page-button">Save Event</button>
      </form>
    </section>
  );
}