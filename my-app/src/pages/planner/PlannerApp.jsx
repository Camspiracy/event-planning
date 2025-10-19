// src/vendor/VendorApp.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Calendar,
  MapPin,
  FileText,
  ArrowLeft,
  Building2,
  BarChart3,
  MoreHorizontal,
} from "lucide-react";

import PlannerDashboard from "./PlannerDashboard";
import PlannerVendorMarketplace from "./PlannerVendorMarketplace";
import "./PlannerApp.css";
import PlannerViewEvent from "./PlannerViewEvent";
import PlannerReview from "./PlannerReview";
import PlannerContract from "./PlannerContract";
import PlannerFloorPlan from "./components/PlannerFloorPlan";
import PlannerSchedules from "./PlannerSchedules";
import PlannerCalendar from "./PlannerCalendar";

const PlannerApp = () => {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activePage, setActivePage] = useState(
    localStorage.getItem("activePage") || "dashboard"
  );
  const [overflowItems, setOverflowItems] = useState([]); // ids that go to More
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const navigate = useNavigate();
  const navRef = useRef(null);
  const dropdownRef = useRef(null);

  const navigationItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "events", label: "Events", icon: Calendar },
    { id: "vendor", label: "Vendor Marketplace", icon: Users },
    { id: "schedule management", label: "Schedule Management", icon: Users },
    { id: "floorplan", label: "Floorplan", icon: MapPin },
    { id: "review", label: "Reviews", icon: FileText },
    { id: "documents", label: "Documents", icon: FileText },
  ];

  const handleSetActivePage = (page) => {
    setActivePage(page);
    localStorage.setItem("activePage", page);
    setDropdownOpen(false);
  };

  const onSelectEvent = (event) => {
    setSelectedEvent(event);
    handleSetActivePage("selected-event");
    localStorage.setItem("selectedEvent", JSON.stringify(event));
  };

  const onOpenMarketplace = () => {
    handleSetActivePage("vendor-marketplace");
  };

  const renderCurrentPage = () => {
    switch (activePage) {
      case "dashboard":
        return (
          <PlannerDashboard
            data-testid="planner-dashboard"
            setActivePage={setActivePage}
            onSelectEvent={onSelectEvent}
          />
        );
      case "events":
        return (
          <PlannerCalendar
            setActivePage={setActivePage}
            onSelectEvent={onSelectEvent}
          />
        );
      case "vendor":
        return (
          <PlannerVendorMarketplace
            setActivePage={setActivePage}
            event={selectedEvent}
          />
        );
      case "floorplan":
        return <PlannerFloorPlan setActivePage={setActivePage} />;
      case "schedule management":
        return <PlannerSchedules setActivePage={setActivePage} />;
      case "documents":
        return <PlannerContract setActivePage={setActivePage} />;
      case "selected-event":
        return (
          <PlannerViewEvent
            event={selectedEvent}
            onOpenMarketplace={onOpenMarketplace}
            setActivePage={setActivePage}
          />
        );
      case "review":
        return <PlannerReview />;
      default:
        return (
          <PlannerDashboard
            setActivePage={setActivePage}
            onSelectEvent={onSelectEvent}
          />
        );
    }
  };

  // Compute overflow whenever the nav width or window size changes
  useEffect(() => {
    const calculateOverflow = () => {
      const nav = navRef.current;
      if (!nav) return;

      // container width where the nav buttons live
      const containerWidth = nav.clientWidth;

      // NodeList of nav buttons (we render them all and hide via JS)
      const buttons = Array.from(nav.querySelectorAll(".nav-btn:not(.more-btn)"));

      // Measure each button width (including margin)
      const widths = buttons.map((btn) => {
        const rect = btn.getBoundingClientRect();
        const style = window.getComputedStyle(btn);
        const marginLeft = parseFloat(style.marginLeft || 0);
        const marginRight = parseFloat(style.marginRight || 0);
        return Math.ceil(rect.width + marginLeft + marginRight);
      });

      // estimate more button width (if needed) by creating a virtual width or using 84px fallback
      // accurate enough for decisions; if you want exact, render a hidden more button and measure
      const moreBtnWidth = 84;

      // Find how many buttons fit (no "plus one" logic: only put items that actually don't fit)
      let sum = 0;
      const visible = [];
      const hidden = [];
      for (let i = 0; i < widths.length; i++) {
        const w = widths[i];
        // if adding this button would exceed width (and we'd need to reserve space for "More")
        if (sum + w > containerWidth) {
          // this button and the rest must be hidden
          for (let j = i; j < widths.length; j++) hidden.push(buttons[j].dataset.id);
          break;
        }
        sum += w;
        visible.push(buttons[i].dataset.id);
      }

      // if something is hidden we must ensure More button fits; if More doesn't fit we must move
      if (hidden.length > 0) {
        // ensure space for More button; if not enough, shift more visible items into hidden until it fits
        while (sum + moreBtnWidth > containerWidth && visible.length > 0) {
          const moved = visible.pop();
          hidden.unshift(moved);
          const idx = buttons.findIndex((b) => b.dataset.id === moved);
          if (idx >= 0) sum -= widths[idx];
        }
      }

      setOverflowItems(hidden);
      setDropdownOpen(false); // close dropdown on recalc
    };

    // Recalculate on next animation frame (gives DOM a chance to layout)
    const rAF = () => {
      requestAnimationFrame(calculateOverflow);
    };
    rAF();

    window.addEventListener("resize", rAF);
    // also observe nav size changes (in case of font load or container change)
    const ro = new ResizeObserver(rAF);
    if (navRef.current) ro.observe(navRef.current);

    return () => {
      window.removeEventListener("resize", rAF);
      try {
        ro.disconnect();
      } catch (e) {}
    };
  }, [navigationItems.length]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const onDocClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <section className="vendor-app">
      {/* Navigation Bar */}
      <nav className="vendor-navbar">
        <section className="navbar-container">
          <section className="navbar-content">
            <section className="navbar-left">
              <button className="home-btn" onClick={() => navigate("/home")}>
                <ArrowLeft size={20} />
                <section>Home</section>
              </button>

              <section className="vendor-logo">
                <Building2 size={24} />
                <section className="logo-text">PlannerHub</section>
              </section>
            </section>

            <section className="navbar-right" ref={navRef}>
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isHidden = overflowItems.includes(item.id);
                return (
                  <button
                    key={item.id}
                    data-id={item.id}
                    className={`nav-btn ${activePage === item.id ? "active" : ""} ${
                      isHidden ? "hidden-nav-item" : ""
                    }`}
                    onClick={() => handleSetActivePage(item.id)}
                    aria-hidden={isHidden}
                    tabIndex={isHidden ? -1 : 0}
                  >
                    <Icon size={18} />
                    {item.label}
                  </button>
                );
              })}

              {overflowItems.length > 0 && (
                <div className="nav-more-dropdown" ref={dropdownRef}>
                  <button
                    className="nav-btn more-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDropdownOpen((v) => !v);
                    }}
                    aria-expanded={dropdownOpen}
                  >
                    <MoreHorizontal size={18} />
                    More
                  </button>

                  {dropdownOpen && (
                    <div className="nav-dropdown-menu show" role="menu">
                      {overflowItems.map((id) => {
                        const item = navigationItems.find((i) => i.id === id);
                        if (!item) return null;
                        const Icon = item.icon;
                        return (
                          <button
                            key={id}
                            className={`dropdown-item ${activePage === id ? "active" : ""}`}
                            onClick={() => handleSetActivePage(id)}
                          >
                            <Icon size={16} /> {item.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </section>
          </section>
        </section>
      </nav>

      <main className="vendor-main">{renderCurrentPage()}</main>
    </section>
  );
};

export default PlannerApp;
