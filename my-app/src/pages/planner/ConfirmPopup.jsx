import { useState } from "react";
import { Trash2, CheckCircle, Info, MessageCircle } from "lucide-react";

export default function ConfirmPopup({
  children,           // the trigger element
  message = "Are you sure?",
  onConfirm,
  onCancel,
  variant = "info", // 'danger', 'success', 'info', 'chat'
  top ="110%",
  left="50%"   
}) {
  const [open, setOpen] = useState(false);

  const config = {
    danger: { icon: <Trash2 size={18} />, color: "#d9534f" },
    success: { icon: <CheckCircle size={18} />, color: "#28a745" },
    info: { icon: <Info size={18} />, color: "#007bff" },
    chat: { icon: <MessageCircle size={18} />, color: "#17a2b8" },
  };

  const { icon, color } = config[variant] || config.info;

  const handleConfirm = () => {
    setOpen(false);
    onConfirm && onConfirm();
  };

  const handleCancel = () => {
    setOpen(false);
    onCancel && onCancel();
  };

  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      {/* Trigger element */}
      <span onClick={() => setOpen(true)} style={{ cursor: "pointer" }}>
        {children}
      </span>

      {/* Confirmation Popup */}
      {open && (
        <section
          style={{
            position: "absolute",
            top: "-100%",
            left: "-200%",
            transform: "translateX(-50%)",
            marginTop: "6px",
            padding: "14px",
            borderRadius: "8px",
            backgroundColor: "#f9f9f9",
            border: `1px solid ${color}`,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 100,
            minWidth: "220px",
          }}
        >
          <section
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "12px",
              color: color,
            }}
          >
            {icon}
            <span>{message}</span>
          </section>

          <section style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
            <button
              onClick={handleCancel}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid #ccc",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: "none",
                background: color,
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              Confirm
            </button>
          </section>
        </section>
      )}
    </span>
  );
}
