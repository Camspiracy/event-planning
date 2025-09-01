import { useState } from 'react';
import "./PlannerViewEvent.css";

function GuestRSVPSummary({guests}) {
    const totalGuests = guests.length;
    const confirmedGuests = guests.filter(g => g.rsvpStatus === 'confirmed').length;
    const pendingGuests = guests.filter(g => g.rsvpStatus === 'pending').length;
    const declinedGuests = guests.filter(g => g.rsvpStatus === 'declined').length;

    return(
        <section className="rsvp-summary">
            <h4>RSVP Status</h4>
            <section className="rsvp-stats">
                <section className="rsvp-stat confirmed">
                    <span className="rsvp-number">{confirmedGuests}</span>
                    <span className="rsvp-label">Confirmed</span>
                </section>
                <section className="rsvp-stat pending">
                    <span className="rsvp-number">{pendingGuests}</span>
                    <span className="rsvp-label">Pending</span>
                </section>
                <section className="rsvp-stat declined">
                    <span className="rsvp-number">{declinedGuests}</span>
                    <span className="rsvp-label">Declined</span>
                </section>
            </section>
            <section className="rsvp-progress">
                <section 
                    className="rsvp-progress-bar"
                    style={{width: `${(confirmedGuests / totalGuests) * 100}%`}}
                ></section>
            </section>
            <p className="rsvp-percentage">{Math.round((confirmedGuests / totalGuests) * 100)}% confirmed</p>
        </section>
    );
}

function VendorItem({vendor}) {
    return(
        <section className="vendor-item">
            <section className="vendor-info">
                <h4>{vendor.name}</h4>
                <p>{vendor.category}</p>
            </section>
            <section className="vendor-cost">
                <p>R{vendor.cost.toLocaleString()}</p>
            </section>
            <section className="vendor-actions">
                <button className="contact-btn">Contact</button>
                <button className="remove-btn">Remove</button>
            </section>
        </section>
    );
}

function TaskItem({task, onToggle}) {
    return(
        <section className="task-item">
            <section className="task-checkbox">
                <input 
                    type="checkbox" 
                    checked={task.completed}
                    onChange={onToggle}
                />
            </section>
            <section className="task-content">
                <h4 className={task.completed ? "completed" : ""}>{task.task}</h4>
                <p>Due: {new Date(task.dueDate).toLocaleDateString()}</p>
            </section>
            <section className="task-priority">
                <span className={`priority-badge ${task.priority}`}>{task.priority}</span>
            </section>
        </section>
    );
}

export default function PlannerViewEvent({eventId, setActivePage}) {
    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState("overview");

    const [eventData, setEventData] = useState({
        id: 1,
        name: "Sarah's Wedding",
        date: "2025-09-15",
        time: "14:00",
        location: "Sandton Convention Centre",
        address: "123 Rivonia Road, Sandton, Johannesburg",
        attendees: 150,
        budget: 85000,
        spent: 42000,
        status: "upcoming",
        description: "Elegant garden wedding with reception for 150 guests. The ceremony will be held in the beautiful garden area followed by dinner and dancing.",
        category: "Wedding",
        vendors: [
            { id: 1, name: "Sweet Treats Catering", category: "Catering", cost: 25000, status: "confirmed" },
            { id: 2, name: "Glam Decor", category: "Decor", cost: 15000, status: "confirmed" },
            { id: 3, name: "Bright Lights Photography", category: "Photography", cost: 8000, status: "pending" }
        ],
        tasks: [
            { id: 1, task: "Book venue", completed: true, dueDate: "2025-08-01", priority: "high" },
            { id: 2, task: "Send invitations", completed: true, dueDate: "2025-08-15", priority: "high" },
            { id: 3, task: "Final headcount", completed: false, dueDate: "2025-09-01", priority: "medium" },
            { id: 4, task: "Confirm catering", completed: false, dueDate: "2025-09-10", priority: "high" },
            { id: 5, task: "Setup decorations", completed: false, dueDate: "2025-09-14", priority: "low" }
        ],
        guests: [
            { id: 1, name: "John Smith", email: "john@email.com", rsvpStatus: "confirmed", plusOne: true },
            { id: 2, name: "Jane Doe", email: "jane@email.com", rsvpStatus: "confirmed", plusOne: false },
            { id: 3, name: "Mike Johnson", email: "mike@email.com", rsvpStatus: "pending", plusOne: true },
            { id: 4, name: "Sarah Wilson", email: "sarah@email.com", rsvpStatus: "declined", plusOne: false },
            { id: 5, name: "David Brown", email: "david@email.com", rsvpStatus: "confirmed", plusOne: true },
            { id: 6, name: "Lisa Davis", email: "lisa@email.com", rsvpStatus: "pending", plusOne: false }
        ]
    });

    const [editForm, setEditForm] = useState({...eventData});

    const handleSave = () => {
        setEventData({...editForm});
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditForm({...eventData});
        setIsEditing(false);
    };

    const handleTaskToggle = (taskId) => {
        const updatedTasks = eventData.tasks.map(task => 
            task.id === taskId ? {...task, completed: !task.completed} : task
        );
        setEventData({...eventData, tasks: updatedTasks});
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric',
            year: 'numeric'
        });
    };

    const budgetPercentage = (eventData.spent / eventData.budget) * 100;

    return(
        <section className="event-view-edit">
            <section className="event-header">
                <section className="header-top">
                    <button 
                        className="back-btn"
                        onClick={() => setActivePage && setActivePage('events-list')}
                    >
                        ← Back to Events
                    </button>
                    <section className="header-actions">
                        {!isEditing ? (
                            <button 
                                className="edit-btn"
                                onClick={() => setIsEditing(true)}
                            >
                                Edit Event
                            </button>
                        ) : (
                            <section className="edit-actions">
                                <button className="save-btn" onClick={handleSave}>Save Changes</button>
                                <button className="cancel-btn" onClick={handleCancel}>Cancel</button>
                            </section>
                        )}
                    </section>
                </section>
                
                <section className="header-main">
                    {!isEditing ? (
                        <section className="event-title-info">
                            <h1>{eventData.name}</h1>
                            <section className="event-meta">
                                <span className="event-date">📅 {formatDate(eventData.date)} at {eventData.time}</span>
                                <span className="event-location">📍 {eventData.location}</span>
                                <span className={`event-status ${eventData.status}`}>{eventData.status}</span>
                            </section>
                        </section>
                    ) : (
                        <section className="edit-title-section">
                            <input 
                                type="text"
                                value={editForm.name}
                                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                                className="edit-title-input"
                                placeholder="Event name"
                            />
                        </section>
                    )}
                </section>
            </section>

            <section className="tabs-container">
                <section className="tabs">
                    <button 
                        className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
                        onClick={() => setActiveTab("overview")}
                    >
                        Overview
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === "guests" ? "active" : ""}`}
                        onClick={() => setActiveTab("guests")}
                    >
                        Guests & RSVP
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === "vendors" ? "active" : ""}`}
                        onClick={() => setActiveTab("vendors")}
                    >
                        Vendors
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === "tasks" ? "active" : ""}`}
                        onClick={() => setActiveTab("tasks")}
                    >
                        Tasks
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === "budget" ? "active" : ""}`}
                        onClick={() => setActiveTab("budget")}
                    >
                        Budget
                    </button>
                </section>

                <section className="tab-content">
                    {activeTab === "overview" && (
                        <section className="overview-content">
                            <section className="overview-grid">
                                <section className="detail-card">
                                    <h3>Event Details</h3>
                                    {!isEditing ? (
                                        <section className="detail-info">
                                            <p><strong>Location:</strong> {eventData.location}</p>
                                            <p><strong>Address:</strong> {eventData.address}</p>
                                            <p><strong>Date:</strong> {formatDate(eventData.date)}</p>
                                            <p><strong>Time:</strong> {eventData.time}</p>
                                            <p><strong>Expected Attendees:</strong> {eventData.attendees}</p>
                                            <p><strong>Category:</strong> {eventData.category}</p>
                                        </section>
                                    ) : (
                                        <section className="edit-form">
                                            <label>
                                                Location:
                                                <input 
                                                    type="text"
                                                    value={editForm.location}
                                                    onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                                                />
                                            </label>
                                            <label>
                                                Address:
                                                <input 
                                                    type="text"
                                                    value={editForm.address}
                                                    onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                                                />
                                            </label>
                                            <label>
                                                Date:
                                                <input 
                                                    type="date"
                                                    value={editForm.date}
                                                    onChange={(e) => setEditForm({...editForm, date: e.target.value})}
                                                />
                                            </label>
                                            <label>
                                                Time:
                                                <input 
                                                    type="time"
                                                    value={editForm.time}
                                                    onChange={(e) => setEditForm({...editForm, time: e.target.value})}
                                                />
                                            </label>
                                            <label>
                                                Expected Attendees:
                                                <input 
                                                    type="number"
                                                    value={editForm.attendees}
                                                    onChange={(e) => setEditForm({...editForm, attendees: parseInt(e.target.value)})}
                                                />
                                            </label>
                                        </section>
                                    )}
                                </section>
                                
                                <section className="detail-card">
                                    <h3>Description</h3>
                                    {!isEditing ? (
                                        <p className="event-description">{eventData.description}</p>
                                    ) : (
                                        <textarea 
                                            value={editForm.description}
                                            onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                                            rows="5"
                                            className="edit-textarea"
                                            placeholder="Event description..."
                                        />
                                    )}
                                </section>
                            </section>
                        </section>
                    )}

                    {activeTab === "guests" && (
                        <section className="guests-content">
                            <GuestRSVPSummary guests={eventData.guests} />
                            
                            <section className="guests-section">
                                <section className="guests-header">
                                    <h3>Guest List</h3>
                                    <button className="add-guest-btn">+ Add Guest</button>
                                </section>
                                
                                <section className="guests-list">
                                    {eventData.guests.map((guest) => (
                                        <section key={guest.id} className="guest-item">
                                            <section className="guest-info">
                                                <h4>{guest.name}</h4>
                                                <p>{guest.email}</p>
                                                <p>{guest.plusOne ? "Plus One: Yes" : "Plus One: No"}</p>
                                            </section>
                                            <section className="guest-rsvp">
                                                <span className={`rsvp-badge ${guest.rsvpStatus}`}>
                                                    {guest.rsvpStatus}
                                                </span>
                                            </section>
                                            <section className="guest-actions">
                                                <button className="send-reminder-btn">Send Reminder</button>
                                                <button className="edit-guest-btn">Edit</button>
                                            </section>
                                        </section>
                                    ))}
                                </section>
                            </section>
                        </section>
                    )}

                    {activeTab === "vendors" && (
                        <section className="vendors-content">
                            <section className="vendors-header">
                                <h3>Event Vendors</h3>
                                <button className="add-vendor-btn">+ Add Vendor</button>
                            </section>
                            <section className="vendors-list">
                                {eventData.vendors.map((vendor) => (
                                    <VendorItem key={vendor.id} vendor={vendor} />
                                ))}
                            </section>
                        </section>
                    )}

                    {activeTab === "tasks" && (
                        <section className="tasks-content">
                            <section className="tasks-header">
                                <h3>Event Tasks</h3>
                                <button className="add-task-btn">+ Add Task</button>
                            </section>
                            <section className="tasks-list">
                                {eventData.tasks.map((task) => (
                                    <TaskItem 
                                        key={task.id} 
                                        task={task} 
                                        onToggle={() => handleTaskToggle(task.id)}
                                    />
                                ))}
                            </section>
                        </section>
                    )}

                    {activeTab === "budget" && (
                        <section className="budget-content">
                            <section className="budget-overview">
                                <section className="budget-card total">
                                    <h4>Total Budget</h4>
                                    <p className="budget-amount">R{eventData.budget.toLocaleString()}</p>
                                </section>
                                <section className="budget-card spent">
                                    <h4>Amount Spent</h4>
                                    <p className="spent-amount">R{eventData.spent.toLocaleString()}</p>
                                </section>
                                <section className="budget-card remaining">
                                    <h4>Remaining</h4>
                                    <p className="remaining-amount">R{(eventData.budget - eventData.spent).toLocaleString()}</p>
                                </section>
                            </section>
                            
                            <section className="budget-progress-section">
                                <h3>Budget Usage</h3>
                                <section className="progress-container">
                                    <section 
                                        className="progress-bar"
                                        style={{width: `${Math.min(budgetPercentage, 100)}%`}}
                                    ></section>
                                </section>
                                <p className="budget-percentage">{budgetPercentage.toFixed(1)}% of budget used</p>
                            </section>

                            <section className="vendor-costs">
                                <h3>Vendor Breakdown</h3>
                                {eventData.vendors.map((vendor) => (
                                    <section key={vendor.id} className="cost-item">
                                        <span className="cost-vendor">{vendor.name}</span>
                                        <span className="cost-amount">R{vendor.cost.toLocaleString()}</span>
                                    </section>
                                ))}
                            </section>
                        </section>
                    )}
                </section>
            </section>
        </section>
    );
}