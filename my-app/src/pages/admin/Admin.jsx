// Admin.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Users,
  Calendar,
  ArrowLeft,
  Building2,
  House,
} from "lucide-react";
import AdminHome from "./adminHomeDashboard/AdminHomeDashboard.jsx";
import AdminReports from "./adminReportsAndAnalytics/AdminReports.jsx";
import AdminAllEvents from "./adminEventManagement/AdminAllEvents.jsx";
import AdminProfile from "./adminProfile/AdminProfile.jsx";
import "./Admin.css";
import AdminVendorManagement from "./adminVendorManagement/AdminVendorManagement.jsx";
import AdminPlannerManagement from "./adminPlannerManagement/AdminPlannerManagement.jsx";
import AdminViewEvent from "./adminEventManagement/AdminViewEvent.jsx";

const Admin = () => {
  const [activePage, setActivePage] = useState("home");
  const [selectedEvent, setSelectedEvent] = useState(null);

  const navigate = useNavigate();

  const navigationItems = [
    { id: "home", label: "Reports & Analytics", icon: House },
    { id: "event-management", label: "Event Management", icon: Calendar },
    { id: "planner-management", label: "Planner Management", icon: Users },
    { id: "vendor-management", label: "Vendor Management", icon: Users },
    { id: "my-profile", label: "My Profile", icon: User },
  ];

  const renderPlaceholderPage = (pageTitle) => (
    <section className="placeholder-page">
      <section className="placeholder-content">
        <section className="placeholder-icon">
          {navigationItems.find((item) => item.id === activePage)?.icon &&
            React.createElement(
              navigationItems.find((item) => item.id === activePage).icon,
              { size: 32 }
            )}
        </section>
        <h1 className="placeholder-title">{pageTitle}</h1>
        <p className="placeholder-text">
          This page is coming soon. All the functionality will be built here.
        </p>
        <button
          onClick={() => setActivePage("home")}
          className="back-to-home-btn"
        >
          Back to Dashboard
        </button>
      </section>
    </section>
  );

  const renderCurrentPage = () => {
    switch (activePage) {
      case "home":
        return <AdminHome setActivePage={setActivePage} />;
      case "planner-management":
        return <AdminPlannerManagement setActivePage={setActivePage} />;
      case "vendor-management":
        return <AdminVendorManagement setActivePage={setActivePage} />;
      case "my-profile":
        return <AdminProfile setActivePage={setActivePage} />;
	case "event-management":
			return (
				<AdminAllEvents
				setActivePage={setActivePage}
				setSelectedEvent={setSelectedEvent}   // pass setter
				/>
			);

	case "AdminViewEvent":
			return (
				<AdminViewEvent
				setActivePage={setActivePage}
				event={selectedEvent}   // pass full event object
				/>
			);
      default:
        return <AdminHome setActivePage={setActivePage} />;
    }
  };

  return (
    <section className="admin-app">
      {/* Navigation Bar */}
      <nav className="admin-navbar">
        <section className="navbar-container">
          <section className="navbar-content">
            <section className="navbar-left">
              <button
                className="home-btn"
                onClick={() => navigate("/home")}
              >
                <ArrowLeft size={20} />
                <section>Home</section>
              </button>

              <section className="admin-logo">
                <Building2 size={24} />
                <section className="logo-text">AdminHub</section>
              </section>
            </section>

            <section className="navbar-right">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    className={`nav-btn ${
                      activePage === item.id ? "active" : ""
                    }`}
                    onClick={() => setActivePage(item.id)}
                  >
                    <Icon size={18} />
                    {item.label}
                  </button>
                );
              })}
            </section>
          </section>
        </section>
      </nav>

      {/* Main Content */}
      <main className="admin-main">{renderCurrentPage()}</main>
    </section>
  );
};

export default Admin;
