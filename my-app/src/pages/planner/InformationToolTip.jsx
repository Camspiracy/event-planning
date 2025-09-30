import { useState } from "react";
import { Info } from "lucide-react";

function HoverPopup({
  children,
  content,
  top = "110%",
  left = "50%",
  minWidth = "220px"
}) {
  const [showPopup, setShowPopup] = useState(false);

  return (
    <section
      style={{ position: "relative", display: "inline-block" }}
      onMouseEnter={() => setShowPopup(true)}
      onMouseLeave={() => setShowPopup(false)}
    >
      {children}

      {showPopup && (
        <section
          style={{
            position: "absolute",
            top,
            left,
            transform: "translateX(-50%)",
            marginTop: "8px",
            padding: "10px 14px",
            borderRadius: "8px",
            backgroundColor: "#e8f4ff", // light blue
            border: "1px solid #b3daff",
            color: "#003366",
            fontSize: "0.9rem",
            boxShadow: "0px 4px 12px rgba(0,0,0,0.15)",
            zIndex: 100,
            minWidth,
            display: "flex",
            alignItems: "flex-start",
            gap: "8px",
            transition: "opacity 0.2s ease-in-out"
          }}
        >
          <Info size={18} style={{ flexShrink: 0, color: "#0066cc" }} />
          <section>{content}</section>
        </section>
      )}
    </section>
  );
}

export default HoverPopup;
