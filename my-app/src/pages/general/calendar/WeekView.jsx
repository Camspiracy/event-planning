// components/Calendar/WeekView.jsx
import React from "react";
import {
	getWeekDaysFromDate,
	getEventsForDay,
	getTodayKey,
	pad,
} from "./dateUtils";
import EventBlock from "./EventBlock";
import "./WeekView.css";

export default function WeekView({ events, selectedDate, onEventClick }) {
	// Pass onEventClick
	const days = getWeekDaysFromDate(selectedDate);
	const todayKey = getTodayKey();
	const pxPerMinute = 2;
	const dayHeight = 24 * 60 * pxPerMinute;

	return (
		<section className="week" aria-label="Week view">
			<header className="week__header" role="rowgroup">
				<aside className="week__timecol-spacer" aria-hidden="true" />
				{days.map((d) => {
					const key = `${d.getFullYear()}-${pad(
						d.getMonth() + 1
					)}-${pad(d.getDate())}`;
					const isToday = key === todayKey;
					return (
						<article
							key={d.toISOString()}
							className={`week__day-head ${
								isToday ? "week__day-head--today" : ""
							}`}
							aria-label={`Day ${d.toDateString()}`}
						>
							<header>
								<h4>
									{
										[
											"Sun",
											"Mon",
											"Tue",
											"Wed",
											"Thu",
											"Fri",
											"Sat",
										][d.getDay()]
									}{" "}
									{d.getDate()}
								</h4>
							</header>
						</article>
					);
				})}
			</header>

			<main className="week__body" role="group" aria-label="Week body">
				<aside className="week__timecol" aria-hidden="false">
					<ul className="week__hours" aria-hidden="true">
						{Array.from({ length: 24 }).map((_, h) => (
							<li
								key={h}
								className="week__hour"
								style={{ height: pxPerMinute * 60 }}
							>
								{pad(h)}:00
							</li>
						))}
					</ul>
				</aside>

				{days.map((d) => {
					const key = `${d.getFullYear()}-${pad(
						d.getMonth() + 1
					)}-${pad(d.getDate())}`;
					const isToday = key === todayKey;
					const dayEvents = getEventsForDay(
						events,
						d.getFullYear(),
						d.getMonth(),
						d.getDate()
					);

					return (
						<article
							key={d.toISOString()}
							className={`week__daycol ${
								isToday ? "week__daycol--today" : ""
							}`}
							style={{ height: dayHeight }}
							aria-label={`Events for ${d.toDateString()}`}
						>
							<main className="week__grid" aria-hidden="true">
								<ul
									className="week__grid-rows"
									aria-hidden="true"
								>
									{Array.from({ length: 24 }).map((_, h) => (
										<li
											key={h}
											className="week__grid-row"
											style={{ height: pxPerMinute * 60 }}
										/>
									))}
								</ul>
							</main>

							<section
								className="week__events-layer"
								aria-live="polite"
								aria-label={`Scheduled events for ${d.toDateString()}`}
							>
								{dayEvents.map((ev) => (
									<EventBlock
										key={ev.id}
										event={ev}
										pxPerMinute={pxPerMinute}
										onEventClick={onEventClick} // Pass it down
									/>
								))}
							</section>
						</article>
					);
				})}
			</main>
		</section>
	);
}
