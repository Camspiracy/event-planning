import React, { useRef, useEffect, useState } from "react";
import "./FloorplanItem.css";

export default function FloorplanItem({ item, selectedId, onPointerDown }) {
  const itemRef = useRef(null);
  const [style, setStyle] = useState({});

  const isSelected = selectedId === item.id;

  useEffect(() => {
    setStyle({
      left: `${item.x - item.w / 2}px`,  // position based on center
      top: `${item.y - item.h / 2}px`,
      width: `${item.w}px`,
      height: `${item.h}px`,
      backgroundColor: item.color || "#999999",
      transform: `rotate(${item.rotation || 0}deg)`,
      position: "absolute",
      zIndex: isSelected ? 3 : 2,  // ensure above canvas but below sidebar
      touchAction: "none",
      userSelect: "none",
      cursor: "grab",
      pointerEvents: "auto", // make sure it's clickable/draggable
    });
  }, [item, isSelected]);

  const handlePointerDown = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (onPointerDown) onPointerDown(e, item.id);
  };

  return (
    <div
      ref={itemRef}
      className={`fp-item ${item.shape || ""} ${isSelected ? "selected" : ""} ${item.type || ""}`}
      style={style}
      onPointerDown={handlePointerDown}
    >
      <span className="fp-label">{item.type.replace(/_/g, " ")}</span>
    </div>
  );
}
