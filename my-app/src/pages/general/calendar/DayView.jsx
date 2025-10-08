// components/Calendar/DayView.jsx
import React from "react";
import { getEventsForDay, formatDateKey, getTodayKey, pad } from "./dateUtils";
import EventBlock from "./EventBlock";
import "./DayView.css";

export default function DayView({ selectedDate, events, onEventClick }) {
	const y = selectedDate.getFullYear();
	const m = selectedDate.getMonth();
	const d = selectedDate.getDate();
	const dayEvents = getEventsForDay(events, y, m, d);
	const todayKey = getTodayKey();
	const selectedKey = formatDateKey(selectedDate);
	const isToday = selectedKey === todayKey;

	const pxPerMinute = 2;
	const dayHeight = 24 * 60 * pxPerMinute;

	return (
		<section className="day" aria-label="Day view">
			<header className="day__header">
				<h3 className="day__title">{selectedDate.toDateString()}</h3>
				{isToday && (
					<time className="day__today-badge" dateTime={selectedKey}>
						Today
					</time>
				)}
			</header>

			<main className="day__body" role="main">
				<aside
					className={`day__timecol ${
						isToday ? "day__timecol--today" : ""
					}`}
					aria-hidden="false"
				>
					<ul className="day__hours" aria-hidden="true">
						{Array.from({ length: 24 }).map((_, h) => (
							<li
								key={h}
								className="day__hour"
								style={{ height: pxPerMinute * 60 }}
							>
								{pad(h)}:00
							</li>
						))}
					</ul>
				</aside>

				<article
					className={`day__col ${isToday ? "day__col--today" : ""}`}
					style={{ height: dayHeight }}
					aria-label="Day timeline"
				>
					<main className="day__grid" aria-hidden="true">
						<ul className="day__grid-rows" aria-hidden="true">
							{Array.from({ length: 24 }).map((_, h) => (
								<li
									key={h}
									className="day__grid-row"
									style={{ height: pxPerMinute * 60 }}
								/>
							))}
						</ul>
					</main>

					<section
						className="day__events-layer"
						aria-live="polite"
						aria-label="Events for today"
					>
						{dayEvents.map((ev) => (
							<EventBlock
								key={ev.id}
								event={ev}
								pxPerMinute={pxPerMinute}
								onEventClick={onEventClick}
							/>
						))}
					</section>
				</article>
			</main>
		</section>
	);
}
