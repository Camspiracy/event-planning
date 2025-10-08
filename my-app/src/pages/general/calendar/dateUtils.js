export function pad(n) {
    return String(n).padStart(2, "0");
}

export function parseTimeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [hh, mm] = timeStr.split(":").map((s) => parseInt(s, 10));
    return hh * 60 + mm;
}

export function minutesToDurationString(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
}

export function getTodayKey() {
    const t = new Date();
    return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
}

export function formatDateKey(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
        date.getDate()
    )}`;
}

// 2. Updated to accept an 'events' array as an argument
export function getEventsForDay(events, y, m, d) {
    // **FIX:** Add a guard clause to handle undefined or null events
    if (!events || !Array.isArray(events)) {
        return []; // Return an empty array if events is not a valid array
    }

    const key = `${y}-${pad(m + 1)}-${pad(d)}`;
    return events
        .filter((e) => e.start && formatDateKey(e.start) === key) // Also check if e.start exists
        .map((e) => {
            const startMin = parseTimeToMinutes(e.start.toTimeString().slice(0, 5));
            // Default to 1 hr if no end time is provided
            const endMin = e.end ? parseTimeToMinutes(e.end.toTimeString().slice(0, 5)) : startMin + 60;
            const durationMin = Math.max(0, endMin - startMin);
            return { ...e, startMin, endMin, durationMin };
        })
        .sort((a, b) => a.startMin - b.startMin);
}

// 3. Updated to accept an 'events' array as an argument
export function getAllEventsSorted(events) {
    // **FIX:** Add a guard clause here as well for safety
    if (!events || !Array.isArray(events)) {
        return [];
    }
    return [...events].sort((a, b) => a.start - b.start);
}

export function getWeekDaysFromDate(date) {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay() + 1); // Monday
    return Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return d;
    });
}

export function generateMonthDays(year, month) {
    const days = [];
    // Adjust for Monday start
    const firstDay = (new Date(year, month, 1).getDay() + 6) % 7; 
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
}

export function getMonthName(m) {
    const names = [
        "January", "February", "March", "April", "May", "June", 
        "July", "August", "September", "October", "November", "December"
    ];
    return names[m];
}

export function getWeekDays(date) {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay()); // Go to the Sunday of the week
    return Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return d;
    });
}