import React, { useState, useEffect } from "react";

// Popup component for viewing/editing a schedule entry
function ViewSchedulePopup({ isOpen, onClose, onSave, eventData, onDelete }) {
    const [scheduleForm, setScheduleForm] = useState(
        eventData || {
            StartTime: "",
            EndTime: "",
            appointment: "",
            description: "",
        }
    );
    const [timeError, setTimeError] = useState("");

    useEffect(() => {
        setScheduleForm(
            eventData || {
                StartTime: "",
                EndTime: "",
                appointment: "",
                description: "",
            }
        );
        setTimeError("");
    }, [eventData]);

    // Helper to add minutes to a time string "HH:MM"
    function addMinutesToTime(time, minutesToAdd) {
        const [h, m] = time.split(":").map(Number);
        const date = new Date(0, 0, 0, h, m + minutesToAdd);
        const hh = String(date.getHours()).padStart(2, "0");
        const mm = String(date.getMinutes()).padStart(2, "0");
        return `${hh}:${mm}`;
    }

    // Helper to check if EndTime is before StartTime
    function isEndBeforeStart(start, end) {
        if (!start || !end) return false;
        const [sh, sm] = start.split(":").map(Number);
        const [eh, em] = end.split(":").map(Number);
        return (eh * 60 + em) < (sh * 60 + sm);
    }

    const handleStartTimeChange = (e) => {
        const newStart = e.target.value;
        const { StartTime, EndTime } = scheduleForm;
        if (StartTime && EndTime) {
            // Calculate previous duration in minutes
            const [sh, sm] = StartTime.split(":").map(Number);
            const [eh, em] = EndTime.split(":").map(Number);
            const prevDuration = (eh * 60 + em) - (sh * 60 + sm);

            // Set new EndTime based on new StartTime + previous duration
            const newEnd = addMinutesToTime(newStart, prevDuration);
            setScheduleForm({ ...scheduleForm, StartTime: newStart, EndTime: newEnd });
            setTimeError(isEndBeforeStart(newStart, newEnd) ? "End time must be after start time." : "");
        } else {
            setScheduleForm({ ...scheduleForm, StartTime: newStart });
            setTimeError(isEndBeforeStart(newStart, EndTime) ? "End time must be after start time." : "");
        }
    };

    const handleEndTimeChange = (e) => {
        const newEnd = e.target.value;
        setScheduleForm({ ...scheduleForm, EndTime: newEnd });
        setTimeError(isEndBeforeStart(scheduleForm.StartTime, newEnd) ? "End time must be after start time." : "");
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const { StartTime, EndTime } = scheduleForm;
        if (isEndBeforeStart(StartTime, EndTime)) {
            setTimeError("End time must be after start time.");
            return;
        }
        setTimeError("");
        onSave(scheduleForm);
        onClose();
    };

    const handleClose = () => {
        onClose();
    };

    const handleDelete = () => {
        if (window.confirm("Are you sure you want to delete this event?")) {
            onDelete(eventData);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <section className="popup-overlay" onClick={handleClose}>
            <section className="popup-content" onClick={(e) => e.stopPropagation()}>
                <section className="popup-header">
                    <h3>View Timeslot</h3>
                </section>
                <form onSubmit={handleSubmit} className="schedule-form">
                    <section className="form-row">
                        <label>
                            Start Time *
                            <input
                                type="time"
                                value={scheduleForm.StartTime}
                                onChange={handleStartTimeChange}
                                required
                                autoFocus
                            />
                        </label>
                        <label style={{ width: "100%" }}>
                            {timeError && (
                                <div style={{ color: "red", marginBottom: "4px" }}>
                                    {timeError}
                                </div>
                            )}
                            End Time *
                            <input
                                type="time"
                                value={scheduleForm.EndTime}
                                onChange={handleEndTimeChange}
                                required
                            />
                        </label>
                    </section>
                    <label>
                        Title *
                        <input
                            type="text"
                            value={scheduleForm.appointment}
                            onChange={(e) => setScheduleForm({ ...scheduleForm, appointment: e.target.value })}
                            required
                        />
                    </label>
                    <label>
                        Description
                        <input
                            type="text"
                            value={scheduleForm.description}
                            onChange={(e) => setScheduleForm({ ...scheduleForm, description: e.target.value })}
                        />
                    </label>

                    <section className="form-actions">
                        <button type="button" className="cancel-form-btn" onClick={handleClose}>
                            Cancel
                        </button>
                        <button type="submit" className="save-form-btn" disabled={!!timeError}>
                            Save Changes
                        </button>
                        {eventData && (
                            <button
                                type="button"
                                className="delete-form-btn"
                                style={{ marginLeft: "auto", color: "white", background: "red" }}
                                onClick={handleDelete}
                            >
                                Delete
                            </button>
                        )}
                    </section>
                </form>
            </section>
        </section>
    );
}

function getAllSlots(start, end, scheduleData) {
    const slotsSet = new Set();

    // Add all hourly slots
    let current = new Date(start);
    while (current <= end) {
        slotsSet.add(current.toTimeString().slice(0, 5));
        current.setHours(current.getHours() + 1, 0, 0, 0);
    }

    // Add all event start times
    scheduleData.forEach(e => {
        slotsSet.add(e.StartTime);
    });

    // Sort times
    const slots = Array.from(slotsSet).sort();
    return slots;
}

function groupEventsByStartTime(scheduleData) {
    const map = {};
    scheduleData.forEach(e => {
        if (!map[e.StartTime]) map[e.StartTime] = [];
        map[e.StartTime].push(e);
    });
    return map;
}

function SameDayScheduler() {
    const event = {
        startDate: new Date("2023-10-10T09:00:00"),
        endDate: new Date("2023-10-10T17:00:00"),
    };

    const [scheduleData, setScheduleData] = useState([
        { StartTime: "09:00", appointment: "Breakfast", EndTime: "09:30", description: "Morning meal" },
        { StartTime: "09:00", appointment: "Call", EndTime: "09:15", description: "Quick call" },
        { StartTime: "10:00", appointment: "Meeting", EndTime: "11:00", description: "Project discussion" },
        { StartTime: "12:00", appointment: "Lunch", EndTime: "13:00", description: "Afternoon meal" },
    ]);
    const [popupOpen, setPopupOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);

    const slots = getAllSlots(event.startDate, event.endDate, scheduleData);
    const eventsByTime = groupEventsByStartTime(scheduleData);

    // Find the max number of events at any single time for column count
    const maxEventsPerSlot = Math.max(
        1,
        ...slots.map(time => (eventsByTime[time] ? eventsByTime[time].length : 0))
    );

    const handleRowClick = (eventObj) => {
        if (eventObj) {
            setSelectedEvent(eventObj);
            setPopupOpen(true);
        }
    };

    const handlePopupClose = () => {
        setPopupOpen(false);
        setSelectedEvent(null);
    };

    const handleSave = (updatedEvent) => {
        setScheduleData((prev) => {
            // Remove the old event (by original StartTime and appointment)
            const filtered = prev.filter(
                (e) =>
                    !(
                        e.StartTime === (selectedEvent ? selectedEvent.StartTime : updatedEvent.StartTime) &&
                        e.appointment === (selectedEvent ? selectedEvent.appointment : updatedEvent.appointment)
                    )
            );
            // Add the updated event
            return [...filtered, updatedEvent];
        });
    };

    const handleDelete = (eventToDelete) => {
        setScheduleData(prev =>
            prev.filter(
                e =>
                    !(
                        e.StartTime === eventToDelete.StartTime &&
                        e.appointment === eventToDelete.appointment &&
                        e.EndTime === eventToDelete.EndTime
                    )
            )
        );
    };

    // Handler for Add Timeslot button
    const handleAddTimeslot = () => {
        setSelectedEvent(null); // No event selected, so popup will be empty
        setPopupOpen(true);
    };

    return (
        <>
        <section className="schedule-header">
            <h3>Event Schedule</h3>
            <button className="add-timeslot-btn" onClick={handleAddTimeslot}>Add Timeslot</button>
        </section>
        <section className="schedule-body">
                <table>
                    <thead>
                        <tr>
                            <th>Time</th>
                            {[...Array(maxEventsPerSlot)].map((_, i) => (
                                <th key={i}>Event {i + 1}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {slots.map((time, idx) => {
                            const events = eventsByTime[time] || [];
                            return (
                                <tr key={idx}>
                                    <td>{time}</td>
                                    {[...Array(maxEventsPerSlot)].map((_, colIdx) => (
                                        <td
                                            key={colIdx}
                                            style={{ cursor: events[colIdx] ? "pointer" : "default" }}
                                            onClick={() => events[colIdx] && handleRowClick(events[colIdx])}
                                        >
                                            {events[colIdx] ? events[colIdx].appointment : ""}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                <ViewSchedulePopup
                    isOpen={popupOpen}
                    onClose={handlePopupClose}
                    onSave={handleSave}
                    eventData={selectedEvent}
                    onDelete={handleDelete}
                />
            </section>
        </>
    );
}

export default SameDayScheduler;

