// components/Calendar/ScheduleView.jsx
import React, {
	forwardRef,
	useImperativeHandle,
	useRef,
	useEffect,
} from "react";
import {
	getAllEventsSorted,
	getTodayKey,
	minutesToDurationString,
	formatDateKey,
} from "./dateUtils";
import "./ScheduleView.css";

// 1. Accept onEventClick as a prop
const ScheduleView = forwardRef(({ events, onEventClick }, ref) => {
	const listRef = useRef(null);
	const sortedEvents = getAllEventsSorted(events);
	const todayKey = getTodayKey();

	useImperativeHandle(ref, () => ({
		scrollToToday: () => {
			if (!listRef.current) return;
			const firstToday = sortedEvents.find(
				(e) => formatDateKey(e.start) === todayKey
			);
			if (!firstToday) return;
			const el = listRef.current.querySelector(
				`#schedule-item-${firstToday.id}`
			);
			if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
		},
	}));

	useEffect(() => {
		// The goToday functionality in Calendar.jsx handles scrolling
	}, [sortedEvents, todayKey]);

	return (
		<section className="schedule" ref={listRef} aria-label="Schedule view">
			<ul className="schedule__list">
				{sortedEvents.map((e) => {
					const isToday = formatDateKey(e.start) === todayKey;
					const duration = e.end
						? Math.round(
								(e.end.getTime() - e.start.getTime()) / 60000
						  )
						: 60; // duration in minutes

					return (
						// 2. Add the onClick handler to the list item
						<li
							key={e.id}
							id={`schedule-item-${e.id}`}
							className={`schedule__item ${
								isToday ? "schedule__item--today" : ""
							}`}
							onClick={() => onEventClick(e.raw)} // Pass the raw event data to the handler
						>
							<article>
								<h4 className="schedule__title">{e.title}</h4>
								<p className="schedule__meta">
									<time dateTime={e.start.toISOString()}>
										{e.start.toLocaleDateString()}
									</time>{" "}
									—{" "}
									<time dateTime={e.start.toISOString()}>
										{e.start.toLocaleTimeString([], {
											hour: "2-digit",
											minute: "2-digit",
											hour12: false,
										})}
									</time>
									–
									{e.end && (
										<time dateTime={e.end.toISOString()}>
											{e.end.toLocaleTimeString([], {
												hour: "2-digit",
												minute: "2-digit",
												hour12: false,
											})}
										</time>
									)}{" "}
									({minutesToDurationString(duration)})
								</p>
							</article>
						</li>
					);
				})}
			</ul>
		</section>
	);
});

export default ScheduleView;
