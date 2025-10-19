import React, { useRef, useEffect, useState } from "react";
import "./FloorplanItem.css";

const ORIGINAL_CANVAS_SIZE = 1000; // matches your design/template size

export default function FloorplanItem({ item, selectedId, onPointerDown, containerSize }) {
  const itemRef = useRef(null);
  const [style, setStyle] = useState({});

  const isSelected = selectedId === item.id;

  // Compute scaled position and size
  useEffect(() => {
    if (!containerSize) return;

    const scaleX = containerSize.width / ORIGINAL_CANVAS_SIZE;
    const scaleY = containerSize.height / ORIGINAL_CANVAS_SIZE;

    const left = item.x * scaleX;
    const top = item.y * scaleY;
    const width = item.w * scaleX;
    const height = item.h * scaleY;

    setStyle({
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
      backgroundColor: item.color || "#999999",
      transform: `rotate(${item.rotation || 0}deg)`,
      position: "absolute",
      zIndex: isSelected ? 999 : 2,
      cursor: "grab",
      userSelect: "none",
      touchAction: "none", // important for mobile drag
    });
  }, [item, containerSize, isSelected]);

  // Pointer down handler for drag/select
  const handlePointerDown = (e) => {
    e.stopPropagation();
    if (onPointerDown) onPointerDown(e, item.id);
  };

  return (
    <div
      ref={itemRef}
      className={`fp-item ${item.shape || ""} ${isSelected ? "selected" : ""} ${item.type || ""}`}
      style={style}
      onPointerDown={handlePointerDown}
      data-id={item.id} // important: lets touch/pointer handlers know this item's id
    >
      <span className="fp-label">{item.type.replace(/_/g, " ")}</span>
    </div>
  );
}
