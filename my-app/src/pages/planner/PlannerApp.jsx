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
import PlannerCalendar from "./PlannerCalendar";

const PlannerApp = () => {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activePage, setActivePage] = useState(
    localStorage.getItem("activePage") || "dashboard"
  );
  const [overflowItems, setOverflowItems] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const navigate = useNavigate();
  const navRef = useRef(null);
  const dropdownRef = useRef(null);

  const navigationItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "events", label: "Events", icon: Calendar },
    { id: "vendor", label: "Vendor Marketplace", icon: Users },
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

  // --- Overflow Calculation ---
  useEffect(() => {
    const calculateOverflow = () => {
      if (!navRef.current) return;

      const container = navRef.current;
      const allButtons = Array.from(container.querySelectorAll(".nav-btn:not(.more-btn)"));

      // Temporarily unhide all buttons to measure
      allButtons.forEach(btn => btn.classList.remove("hidden-nav-item"));

      const moreButton = container.querySelector(".nav-more-dropdown");
      const moreWidth = moreButton ? moreButton.offsetWidth : 0;

      let totalWidth = moreWidth; // start with More button width
      const newOverflow = [];

      // Add buttons left to right
      for (let i = 0; i < allButtons.length; i++) {
        const btn = allButtons[i];
        const btnWidth = btn.offsetWidth;
        totalWidth += btnWidth;

        if (totalWidth > container.offsetWidth) {
          const id = btn.getAttribute("data-id");
          if (id) newOverflow.push(id);
        }
      }

      // Hide overflow items
      allButtons.forEach(btn => {
        const id = btn.getAttribute("data-id");
        if (newOverflow.includes(id)) {
          btn.classList.add("hidden-nav-item");
        } else {
          btn.classList.remove("hidden-nav-item");
        }
      });

      // Update state only if changed
      setOverflowItems(prev => {
        const isSame = prev.length === newOverflow.length && prev.every((id, idx) => id === newOverflow[idx]);
        return isSame ? prev : newOverflow;
      });
    };

    window.addEventListener("resize", calculateOverflow);
    calculateOverflow(); // initial call

    return () => window.removeEventListener("resize", calculateOverflow);
  }, [navigationItems]);

  // --- Page Renderer ---
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

  return (
    <section className="planner-app">
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

              {/* Only show More button if there are overflow items */}
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

      <main className="planner-main">{renderCurrentPage()}</main>
    </section>
  );
};

export default PlannerApp;
