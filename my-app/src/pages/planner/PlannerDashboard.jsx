import { useState, useEffect } from "react";
import { isAfter, isBefore } from "date-fns";
import { Calendar, User, Users, Briefcase, X, Camera, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./PlannerDashboard.css";
import { getAuth, onAuthStateChanged } from "firebase/auth";

function VendorCard({ vendor }) {
	const getStatusColor = (status) => {
		switch (status) {
			case "approved":
				return "#10b981";
			case "pending":
				return "#f59e0b";
			case "rejected":
				return "#fd4c55ff";
			default:
				return "#6366f1";
		}
	};

	return (
		<article className="vendor-card">
			<img src={vendor.profilePic} alt={vendor.businessName} className="vendor-image" />
			<section className="vendor-content">
				<h3 className="vendor-name">{vendor.businessName}</h3>
				<section className="event-status" style={{ backgroundColor: getStatusColor(vendor.status) }}>
					{vendor.status}
				</section>
				<section className="vendor-details">
					<span className="vendor-category">{vendor.category}</span>
					<section className="vendor-meta">
						<span className="vendor-rating">{vendor.rating}</span>
						<span className="vendor-location">{vendor.location}</span>
					</section>
				</section>
			</section>
		</article>
	);
}

function EventCard({ event, onSelectEvent }) {
	const formatDate = (dateString) => {
		const date = new Date(dateString);
		return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
	};

	const getStatusColor = (status) => {
		switch (status) {
			case "upcoming":
				return "#10b981";
			case "in-progress":
				return "#f59e0b";
			case "completed":
				return "#6b7280";
			default:
				return "#6366f1";
		}
	};

	return (
		<section className="event-card">
			<section className="event-header">
				<h3>{event.name}</h3>
				<section className="event-status" style={{ backgroundColor: getStatusColor(event.status) }}>
					{event.status}
				</section>
			</section>
			<section className="event-details">
				<p className="event-date">{formatDate(event.date)}</p>
				<p className="event-location">{event.location}</p>
				<p className="event-attendees">{(event.guestList?.length ?? 0)} guests</p>
				<p className="event-budget">R{(event.budget ?? 0).toLocaleString()}</p>
			</section>
			<section className="event-description">
				<p>{event.description}</p>
			</section>
			<section className="event-buttons">
				<button className="select-btn" onClick={() => onSelectEvent(event)}>Select Event</button>
			</section>
		</section>
	);
}

export default function PlannerDashboard({ setActivePage, onSelectEvent }) {
	const navigate = useNavigate();
	const auth = getAuth();

	const [authUser, setAuthUser] = useState(undefined); // undefined = loading
	const [plannerProfile, setPlannerProfile] = useState(null);
	const [profileName, setProfileName] = useState("");
	const [profilePicture, setProfilePicture] = useState(null);
	const [profilePicturePreview, setProfilePicturePreview] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const [events, setEvents] = useState([]);
	const [guests, setGuests] = useState({});
	const [vendorsByEvent, setVendorsByEvent] = useState({});
	const [vendorStats, setVendorStats] = useState({ approved: 0, pending: 0, rejected: 0 });
	const [showProfileModal, setShowProfileModal] = useState(false);

	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const future = new Date();
	future.setDate(today.getDate() + 30);
	future.setHours(23, 59, 59, 999);

	// --- UTILITY ---
	const toJSDate = (date) => {
		if (!date) return null;
		if (date instanceof Date) return date;
		if (typeof date === "object" && typeof date._seconds === "number") {
			return new Date(date._seconds * 1000 + date._nanoseconds / 1e6);
		}
		if (typeof date === "string" || typeof date === "number") return new Date(date);
		return null;
	};

	const fetchPlannerProfile = async (user) => {
		if (!user) return;
		try {
			const token = await user.getIdToken(true);
			const res = await fetch(`https://us-central1-planit-sdp.cloudfunctions.net/api/planner/profile`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) return;
			const data = await res.json();
			setPlannerProfile(data);
			setProfileName(data.name || "");
			setProfilePicturePreview(data.profilePicture || "");
		} catch (err) {
			console.error("Error fetching profile:", err);
		}
	};

	const fetchPlannerEvents = async () => {
		if (!auth.currentUser) return [];
		const token = await auth.currentUser.getIdToken(true);
		const res = await fetch(`https://us-central1-planit-sdp.cloudfunctions.net/api/planner/me/events`, {
			headers: { Authorization: `Bearer ${token}` },
		});
		if (!res.ok) return [];
		const data = await res.json();
		return data.events || [];
	};

	const fetchGuests = async (eventId) => {
		try {
			const token = await auth.currentUser.getIdToken(true);
			const res = await fetch(`https://us-central1-planit-sdp.cloudfunctions.net/api/planner/${eventId}/guests`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) return [];
			const data = await res.json();
			return data.guests || [];
		} catch {
			return [];
		}
	};

	const fetchVendors = async (eventId) => {
		try {
			const token = await auth.currentUser.getIdToken(true);
			const res = await fetch(`https://us-central1-planit-sdp.cloudfunctions.net/api/planner/${eventId}/vendors`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) return [];
			const data = await res.json();
			return data.vendors || [];
		} catch {
			return [];
		}
	};

	const calculateVendorStatusCounts = (vendorsMap, upcomingEventIds) => {
		let approved = 0, pending = 0, rejected = 0;
		upcomingEventIds.forEach((id) => {
			(vendorsMap[id] || []).forEach((v) => {
				if (v.status === "approved") approved++;
				else if (v.status === "pending") pending++;
				else if (v.status === "rejected") rejected++;
			});
		});
		return { approved, pending, rejected };
	};

	const handleFileSelect = (event) => {
		const file = event.target.files[0];
		if (!file) return;
		setProfilePicture(file);
		setProfilePicturePreview(URL.createObjectURL(file));
	};

	const updatePlannerProfile = async () => {
		if (!authUser) return;
		setIsLoading(true);
		try {
			const token = await authUser.getIdToken(true);
			const formData = new FormData();
			formData.append("name", profileName);
			if (profilePicture) formData.append("profilePicture", profilePicture);

			const res = await fetch(`https://us-central1-planit-sdp.cloudfunctions.net/api/planner/profile`, {
				method: "POST",
				headers: { Authorization: `Bearer ${token}` },
				body: formData,
			});
			if (!res.ok) return;
			const data = await res.json();
			setPlannerProfile(data.profile);
			setProfilePicturePreview(data.profile.profilePicture || "");
			setProfilePicture(null);
			setShowProfileModal(false);
		} catch (err) {
			console.error("Error updating profile:", err);
		} finally {
			setIsLoading(false);
		}
	};

	// --- EFFECTS ---
	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, (user) => {
			setAuthUser(user);
			if (user) fetchPlannerProfile(user);
		});
		return () => unsubscribe();
	}, []);

	useEffect(() => {
		if (!authUser) return;

		let isMounted = true;
		const loadEventsAndRelatedData = async () => {
			const fetchedEvents = await fetchPlannerEvents();
			if (!isMounted) return;

			setEvents(fetchedEvents);

			const guestsMap = {};
			const vendorsMap = {};
			for (const e of fetchedEvents) {
				guestsMap[e.id] = await fetchGuests(e.id);
				vendorsMap[e.id] = await fetchVendors(e.id);
			}
			if (!isMounted) return;

			setGuests(guestsMap);
			setVendorsByEvent(vendorsMap);
		};
		loadEventsAndRelatedData();
		return () => { isMounted = false; };
	}, [authUser]);

	// Update vendor stats
	useEffect(() => {
		const upcomingEventIds = events
			.filter((e) => {
				const date = toJSDate(e.date);
				return date && isAfter(date, today) && isBefore(date, future);
			})
			.map((e) => e.id);

		if (upcomingEventIds.length === 0 || Object.keys(vendorsByEvent).length === 0) return;
		setVendorStats(calculateVendorStatusCounts(vendorsByEvent, upcomingEventIds));
	}, [vendorsByEvent, events]);

	// --- DERIVED VALUES ---
	const upcomingEvents = events.filter((e) => {
		const date = toJSDate(e.date);
		return date && isAfter(date, today) && isBefore(date, future);
	});
	const afterMonthEvent = events.filter((e) => {
		const date = toJSDate(e.date);
		return date && isAfter(date, future);
	});

	const aveGuestCount = upcomingEvents.length
		? Math.round(upcomingEvents.reduce((sum, e) => sum + (e.guestList?.length || 0), 0) / upcomingEvents.length)
		: 0;

	const prevMonth = new Date();
	prevMonth.setMonth(prevMonth.getMonth() - 1);
	const prevEvents = events.filter((e) => {
		const date = toJSDate(e.date);
		return date && isAfter(date, prevMonth) && isBefore(date, today);
	});
	const prevAveGuestCount = prevEvents.length
		? Math.round(prevEvents.reduce((sum, e) => sum + (e.guestList?.length || 0), 0) / prevEvents.length)
		: 0;

	const percentageChange =
		prevAveGuestCount === 0
			? aveGuestCount === 0 ? 0 : 100
			: Math.round(((aveGuestCount - prevAveGuestCount) / prevAveGuestCount) * 100);

	// --- RENDER ---
	if (authUser === undefined) return <p>Loading...</p>;
	if (!authUser) {
		return (
			<section className="dashboard-login-prompt">
				<p>Please log in to view your events.</p>
				<button onClick={() => navigate("/login")}>Go to Login</button>
			</section>
		);
	}

	return (
		<section className="page-container">
			{/* Profile Modal */}
			{showProfileModal && (
				<section className="profile-modal-overlay" onClick={() => setShowProfileModal(false)}>
					<section className="profile-modal" onClick={(e) => e.stopPropagation()}>
						<section className="profile-modal-header">
							<h3>Update Your Profile</h3>
							<button onClick={() => setShowProfileModal(false)} className="profile-modal-close">
								<X className="ps-icon" />
							</button>
						</section>
						<section className="profile-modal-content">
							<section className="profile-picture-section">
								<section className="profile-picture-preview">
									{profilePicturePreview ? <img src={profilePicturePreview} alt="Profile preview" /> : <User size={80} />}
									<label htmlFor="profile-picture-upload" className="camera-icon">
										<Camera size={20} />
										<input id="profile-picture-upload" type="file" accept="image/*" onChange={handleFileSelect} style={{ display: "none" }} />
									</label>
								</section>
							</section>
							<section className="profile-form-group">
								<label>Your Name</label>
								<input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)} className="profile-input" placeholder="Enter your name" />
							</section>
						</section>
						<section className="profile-modal-footer">
							<button onClick={() => setShowProfileModal(false)} className="ps-btn ps-btn-secondary">Cancel</button>
							<button onClick={updatePlannerProfile} disabled={isLoading} className="ps-btn ps-btn-primary">
								<Save className="ps-icon" /> {isLoading ? "Saving..." : "Save Profile"}
							</button>
						</section>
					</section>
				</section>
			)}

			{/* Header */}
			<section className="dashboard-intro">
				<section>
					<h1 className="dashboard-title">Planner Dashboard</h1>
					<p className="dashboard-subtitle">Welcome back, {plannerProfile?.name || 'Planner'}! Here's what's happening with your events.</p>
				</section>
				<section className="profile-section">
					<button className="profile-button" onClick={() => setShowProfileModal(true)}>
						{plannerProfile?.profilePicture ? <img src={plannerProfile.profilePicture} alt="Profile" className="profile-image" /> : <User size={24} />}
						<span>{plannerProfile?.name || 'Set Profile'}</span>
					</button>
				</section>
			</section>

			{/* Summary Cards */}
			<section className="summary-cards-section">
				<section className="summary-card blue">
					<section className="summary-card-header">
						<Calendar size={40} />
						<section className="summary-change">+{afterMonthEvent.length}</section>
					</section>
					<section className="summary-card-body">
						<h3 className="summary-label">Upcoming Events</h3>
						<p className="summary-value">{upcomingEvents.length}</p>
						<p className="summary-subtext">Next 30 days</p>
					</section>
				</section>
				<section className="summary-card green">
					<section className="summary-card-header">
						<Users size={40} />
						<section className="summary-change">{percentageChange > 0 ? "+" : "-"}{Math.abs(percentageChange)}%</section>
					</section>
					<section className="summary-card-body">
						<h3 className="summary-label">Avg Attendance</h3>
						<p className="summary-value">{aveGuestCount}</p>
						<p className="summary-subtext">Per Event</p>
					</section>
				</section>
				<section className="summary-card purple">
					<section className="summary-card-header"><Briefcase size={40} /></section>
					<section className="summary-card-body">
						<h3 className="summary-label">Vendor Status</h3>
						<p className="summary-subtext">Upcoming Events:</p>
						<p>Approved: {vendorStats.approved}</p>
						<p>Pending: {vendorStats.pending}</p>
						<p>Rejected: {vendorStats.rejected}</p>
					</section>
				</section>
			</section>

			{/* Upcoming Events */}
			<section className="dashboard-card">
				<section className="card-header">
					<h3>Upcoming Events</h3>
				</section>
				<section className="events-grid">
					{upcomingEvents.length ? upcomingEvents.map((event) => (
						<EventCard key={event.id} event={event} onSelectEvent={onSelectEvent} />
					)) : <p>You have no upcoming events</p>}
				</section>
			</section>

			{/* Vendors by Event */}
			<section className="dashboard-card">
				<section className="card-header">
					<h3>Vendors by Event</h3>
				</section>
				{upcomingEvents.map((event) => {
					const vendors = vendorsByEvent[event.id] || [];
					if (!vendors.length) return null;
					return (
						<section key={event.id} className="event-vendors-section">
							<h4 className="event-vendor-title">{event.name}</h4>
							<section className="vendors-grid">
								{vendors.map((vendor) => <VendorCard key={vendor.id} vendor={vendor} />)}
							</section>
						</section>
					);
				})}
			</section>
		</section>
	);
}
