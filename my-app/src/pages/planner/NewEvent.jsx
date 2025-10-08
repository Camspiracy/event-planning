import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import "./NewEvent.css";

export default function NewEvent({ setActivePage }) {
	const [inputs, setInputs] = useState({
		name: "",
		eventCategory: "",
		startTime: "",
		duration: 1,
		location: "",
		style: "",
	});

	//To prevent previous date selection *******************
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0"); // months are 0-indexed
	const day = String(now.getDate()).padStart(2, "0");
	const hours = String(now.getHours()).padStart(2, "0");
	const minutes = String(now.getMinutes()).padStart(2, "0");

	const minDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
	//End of preventing previous date selection

	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();
	const auth = getAuth();

	// Event categories dropdown options
	const eventCategories = [
		"Wedding",
		"Birthday Party",
		"Corporate Event",
		"Conference",
		"Baby Shower",
		"Graduation",
		"Anniversary",
		"Fundraiser",
		"Product Launch",
		"Holiday Party",
		"Networking Event",
		"Workshop",
		"Concert",
		"Festival",
		"Sports Event",
		"Other",
	];

	// Event styles dropdown options
	const eventStyles = [
		"Elegant/Formal",
		"Casual/Relaxed",
		"Modern/Contemporary",
		"Vintage/Classic",
		"Rustic/Country",
		"Minimalist",
		"Bohemian/Boho",
		"Industrial",
		"Garden/Outdoor",
		"Beach/Tropical",
		"Urban/City",
		"Traditional",
		"Glamorous",
		"Fun/Playful",
		"Professional",
		"Themed",
	];

	const handleChange = (e) => {
		const { name, value } = e.target;
		setInputs((values) => ({ ...values, [name]: value }));
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (loading) return;
		setLoading(true);
		setError("");
		setSuccess("");

		// Basic validation
		if (
			!inputs.name ||
			!inputs.eventCategory ||
			!inputs.startTime ||
			!inputs.location ||
			!inputs.style
		) {
			setError("Please fill in all required fields");
			return;
		}

		if (!auth.currentUser) {
			setError("You must be logged in to create an event");
			return;
		}

		try {
			const token = await auth.currentUser.getIdToken();

			const res = await fetch(
				"https://us-central1-planit-sdp.cloudfunctions.net/api/event/apply",
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						...inputs,
						plannerId: auth.currentUser.uid,
						date: inputs.startTime,
						description: "",
						theme: "",
						budget: null,
						expectedGuestCount: null,
						notes: "",
					}),
				}
			);

			if (!res.ok) throw new Error("Failed to create event");

			setSuccess("Event created successfully!");
			setTimeout(() => navigate("/planner-dashboard"), 1500);
		} catch (err) {
			console.error(err);
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<section className="newevent-container">
			<section className="intro">
				<h1 className="newevent-title">Create New Event</h1>
				<p className="newevent-subtitle">Tell us about your event</p>
			</section>

			<form className="event-form" onSubmit={handleSubmit}>
				<section className="form-group">
					<label htmlFor="name">Event Name *</label>
					<input
						type="text"
						id="name"
						name="name"
						placeholder="Enter event name"
						value={inputs.name}
						onChange={handleChange}
						required
					/>
				</section>

				<section className="form-group">
					<label htmlFor="eventCategory">Event Category *</label>
					<select
						id="eventCategory"
						name="eventCategory"
						value={inputs.eventCategory}
						onChange={handleChange}
						required
					>
						<option value="">Select event category</option>
						{eventCategories.map((category) => (
							<option key={category} value={category}>
								{category}
							</option>
						))}
					</select>
				</section>

				<section className="form-row">
					<section className="form-group">
						<label htmlFor="startTime">Date & Time *</label>
						<input
							type="datetime-local"
							min={minDateTime}
							id="startTime"
							name="startTime"
							value={inputs.startTime}
							onChange={handleChange}
							required
						/>
					</section>

					<section className="form-group">
						<label htmlFor="duration">Duration (hours) *</label>
						<input
							type="number"
							id="duration"
							name="duration"
							min="1"
							max="24"
							value={inputs.duration}
							onChange={handleChange}
							required
						/>
					</section>
				</section>

				<section className="form-group">
					<label htmlFor="location">Location *</label>
					<input
						type="text"
						id="location"
						name="location"
						placeholder="Enter event location or select from map"
						value={inputs.location}
						onChange={handleChange}
						required
					/>
					<small className="form-hint">
						Start typing to search for locations
					</small>
				</section>

				<section className="form-group">
					<label htmlFor="style">Event Style *</label>
					<select
						id="style"
						name="style"
						value={inputs.style}
						onChange={handleChange}
						required
					>
						<option value="">Select event style</option>
						{eventStyles.map((style) => (
							<option key={style} value={style}>
								{style}
							</option>
						))}
					</select>
				</section>

				<button
					type="submit"
					className="create-event-btn"
					onClick={handleSubmit}
					disabled={loading}
				>
					Create Event
				</button>
			</form>

			{error && (
				<section className="message error-message">
					<span className="message-icon">⚠</span>
					{error}
				</section>
			)}

			{success && (
				<section className="message success-message">
					<span className="message-icon">✓</span>
					{success}
				</section>
			)}
		</section>
	);
}
