import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import LocationPicker from "./LocationPicker";
import BronzeFury from "./BronzeFury";
import "./NewEvent.css";

const API_BASE = "https://us-central1-planit-sdp.cloudfunctions.net/api";

export default function NewEvent({ selectedEvent = null }) {
	const [inputs, setInputs] = useState({
		name: "",
		eventCategory: "",
		startTime: "",
		duration: 1,
		location: "",
		style: "",
		description: "",
	});

	const [locationData, setLocationData] = useState({
		coordinates: null,
		address: ""
	});

	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [loading, setLoading] = useState(false);

	// 🔹 New state to show/hide BronzeFury popup
	const [showBronzeFury, setShowBronzeFury] = useState(false);

	const navigate = useNavigate();
	const auth = getAuth();

	const now = new Date();
	const minDateTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

	// Prefill from selected event
	useEffect(() => {
		if (selectedEvent) prefillForm(selectedEvent);
	}, [selectedEvent]);

	const prefillForm = (event) => {
		setInputs({
			name: event.name || "",
			eventCategory: event.category || "",
			startTime: event.dateTime || "",
			duration: event.duration || 1,
			location: event.location?.address || "",
			style: event.style || "",
			description: event.description || "",
		});

		if (event.location?.coordinates) {
			setLocationData({
				address: event.location.address || "",
				coordinates: event.location.coordinates,
			});
		}
	};

	const eventCategories = [
		"Wedding", "Birthday Party", "Corporate Event", "Conference",
		"Baby Shower", "Graduation", "Anniversary", "Fundraiser",
		"Product Launch", "Holiday Party", "Networking Event", "Workshop",
		"Concert", "Festival", "Sports Event", "Other",
	];

	const eventStyles = [
		"Elegant/Formal", "Casual/Relaxed", "Modern/Contemporary", "Vintage/Classic",
		"Rustic/Country", "Minimalist", "Bohemian/Boho", "Industrial",
		"Garden/Outdoor", "Beach/Tropical", "Urban/City", "Traditional",
		"Glamorous", "Fun/Playful", "Professional", "Themed",
	];

	const handleChange = (e) => {
		const { name, value } = e.target;
		setInputs((values) => ({ ...values, [name]: value }));
	};

	const handleLocationChange = (data) => {
		setLocationData(data);
		setInputs((values) => ({ ...values, location: data.address }));
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (loading) return;
		setLoading(true);
		setError("");
		setSuccess("");

		if (!inputs.name || !inputs.eventCategory || !inputs.startTime || !inputs.style) {
			setError("Please fill in all required fields");
			setLoading(false);
			return;
		}

		if (!locationData.coordinates) {
			setError("Please select a valid location on the map");
			setLoading(false);
			return;
		}

		if (!auth.currentUser) {
			setError("You must be logged in to create an event");
			setLoading(false);
			return;
		}

		try {
			const token = await auth.currentUser.getIdToken();

			const eventData = {
				...inputs,
				plannerId: auth.currentUser.uid,
				date: inputs.startTime,
				description: inputs.description,
				theme: inputs.style,
				location: locationData.address,
				locationCoordinates: locationData.coordinates,
			};

			const res = await fetch(`${API_BASE}/event/apply`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(eventData),
			});

			const data = await res.json();
			if (!res.ok) throw new Error(data.message || "Failed to create event");

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
				<p className="newevent-subtitle">or</p>
				{/* Show BronzeFury popup on button click */}
				<button
					type="button"
					className="import-bronzefury-link"
					onClick={() => setShowBronzeFury(true)}
				>
					Import from BronzeFury
				</button>
			</section>

			<form className="event-form" onSubmit={handleSubmit}>
				<section className="form-group">
					<label htmlFor="name">Event Name *</label>
					<input
						type="text"
						id="name"
						name="name"
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
						{eventCategories.map((c) => <option key={c}>{c}</option>)}
					</select>
				</section>

				<section className="form-row">
					<section className="form-group">
						<label htmlFor="startTime">Date & Time *</label>
						<input
							type="datetime-local"
							id="startTime"
							name="startTime"
							min={minDateTime}
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
					<label>Location *</label>
					<LocationPicker onLocationChange={handleLocationChange} />
					{inputs.location && <p className="location-preview">{inputs.location}</p>}
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
						{eventStyles.map((s) => <option key={s}>{s}</option>)}
					</select>
				</section>

				<section className="form-group">
					<label htmlFor="description">Description</label>
					<textarea
						id="description"
						name="description"
						placeholder="Describe your event"
						value={inputs.description}
						onChange={handleChange}
					/>
				</section>

				<button type="submit" className="create-event-btn" disabled={loading}>
					{loading ? "Creating..." : "Create Event"}
				</button>
			</form>

			{error && <section className="message error-message">⚠ {error}</section>}
			{success && <section className="message success-message">✓ {success}</section>}

			{/* 🔹 Render BronzeFury popup conditionally */}
			{showBronzeFury && (
				<BronzeFury
					onClose={() => setShowBronzeFury(false)}
					onEventSelect={(event) => {
						prefillForm(event);  // Prefill NewEvent form
						setShowBronzeFury(false); // Close popup
					}}
				/>
			)}
		</section>
	);
}
