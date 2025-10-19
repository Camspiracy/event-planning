import { useRef } from "react";

export function useFloorplanHandlers({ containerRef, items, setItems, selectedId, setSelectedId, setIsDirty }) {
  const dragRef = useRef({});

  // --- ADD ITEM ---
  const addItem = (proto) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    const newItem = {
      id: `it-${crypto.randomUUID()}`,
      ...proto,
      x: rect.width / 2,
      y: rect.height / 2,
      w: proto.w || 50,
      h: proto.h || 50,
      rotation: 0,
      color: proto.color || "#999999",
    };

    setItems((prev) => [...prev, newItem]);
    setSelectedId(newItem.id);
    if (setIsDirty) setIsDirty(true);
  };

  // --- REMOVE ITEM ---
  const removeSelected = () => {
    if (!selectedId) return;
    setItems((prev) => prev.filter((it) => it.id !== selectedId));
    setSelectedId(null);
    if (setIsDirty) setIsDirty(true);
  };

  // --- EDIT ITEM ---
  const editItem = (id, updates) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...updates } : it))
    );
    if (setIsDirty) setIsDirty(true);
  };

  // --- SCALE & ROTATE SELECTED ---
  const scaleSelected = (factor) => {
    if (!selectedId) return;
    setItems((prev) =>
      prev.map((it) =>
        it.id === selectedId
          ? { ...it, w: Math.max(8, it.w * factor), h: Math.max(8, it.h * factor) }
          : it
      )
    );
    if (setIsDirty) setIsDirty(true);
  };

  const rotateSelected = (delta) => {
    if (!selectedId) return;
    setItems((prev) =>
      prev.map((it) =>
        it.id === selectedId
          ? { ...it, rotation: ((it.rotation || 0) + delta + 360) % 360 }
          : it
      )
    );
    if (setIsDirty) setIsDirty(true);
  };

  // --- POINTER HANDLERS ---
  const onPointerDownItem = (e, id) => {
    e.stopPropagation();
    e.preventDefault();

    const container = containerRef.current;
    if (!container) return;
    container.setPointerCapture(e.pointerId);

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const it = items.find((i) => i.id === id);
    if (!it) return;

    setSelectedId(id);

    const isRotating = e.shiftKey;

    dragRef.current = {
      dragging: !isRotating,
      rotating: isRotating,
      pointerId: e.pointerId,
      id,
      offsetX: mouseX - it.x,
      offsetY: mouseY - it.y,
      lastAngle: isRotating ? Math.atan2(mouseY - it.y, mouseX - it.x) * (180 / Math.PI) : 0,
    };
  };

  const onPointerMove = (e) => {
    const drag = dragRef.current;
    if (!drag.id || drag.pointerId !== e.pointerId) return;

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== drag.id) return it;

        if (drag.dragging) {
          // Move with offset
          let newX = mouseX - drag.offsetX;
          let newY = mouseY - drag.offsetY;

          // Keep inside canvas
          const halfW = it.w / 2;
          const halfH = it.h / 2;
          newX = Math.max(halfW, Math.min(rect.width - halfW, newX));
          newY = Math.max(halfH, Math.min(rect.height - halfH, newY));

          return { ...it, x: newX, y: newY };
        } else if (drag.rotating) {
          const angle = Math.atan2(mouseY - it.y, mouseX - it.x) * (180 / Math.PI);
          const delta = angle - drag.lastAngle;
          drag.lastAngle = angle;
          return { ...it, rotation: ((it.rotation || 0) + delta + 360) % 360 };
        }
        return it;
      })
    );

    if (setIsDirty) setIsDirty(true);
  };

  const onPointerUp = (e) => {
    const container = containerRef.current;
    if (container && dragRef.current.pointerId === e.pointerId) {
      container.releasePointerCapture(e.pointerId);
      dragRef.current = {};
    }
  };

  // --- TOUCH HANDLERS ---
  const onTouchStart = (e) => onPointerDownItem(e.touches[0], e.target.dataset.id);
  const onTouchMove = (e) => onPointerMove(e.touches[0]);
  const onTouchEnd = (e) => onPointerUp(e.changedTouches[0]);

  return {
    addItem,
    removeSelected,
    editItem,
    scaleSelected,
    rotateSelected,
    onPointerDownItem,
    onPointerMove,
    onPointerUp,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}
