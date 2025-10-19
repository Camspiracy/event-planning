import React, { useEffect, useRef, useState } from "react";
import { fetchEvents, fetchVendors } from "../helpers";
import { getAuth } from "firebase/auth";
import { useFloorplanHandlers } from "../hooks/useFloorplanHandlers";
import { useFloorplanStorage } from "../hooks/useFloorplanStorage";
import { uploadToVendor, exportToPNG } from "../utils/floorplanImage";
import { ITEM_PROTOTYPES } from "../constants/floorplanItems";
import FloorplanItem from "./FloorplanItem";
import "./PlannerFloorPlan.css";

import { MapPin } from "lucide-react";

const AddItemDropdown = ({ addItem }) => {
  const handleChange = (e) => {
    const key = e.target.value;
    if (!key) return;
    addItem(key);
    e.target.value = "";
  };
  return (
    <select onChange={handleChange} defaultValue="">
      <option value="">— Add Item —</option>
      {Object.keys(ITEM_PROTOTYPES).map((key) => (
        <option key={key} value={key}>
          {ITEM_PROTOTYPES[key].type.replace(/_/g, " ")}
        </option>
      ))}
    </select>
  );
};

const SelectedControls = ({
  selectedId,
  items,
  setSelectedId,
  scaleSelected,
  rotateSelected,
  removeSelected,
  editItem,
}) => {
  const selectedItem = items.find((it) => it.id === selectedId);
  const [editValues, setEditValues] = useState({
    type: selectedItem?.type || "",
    w: selectedItem?.w || 50,
    h: selectedItem?.h || 50,
    rotation: selectedItem?.rotation || 0,
  });

  useEffect(() => {
    if (selectedItem) {
      setEditValues({
        type: selectedItem.type,
        w: selectedItem.w,
        h: selectedItem.h,
        rotation: selectedItem.rotation,
      });
    }
  }, [selectedId, selectedItem]);

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditValues((prev) => ({
      ...prev,
      [name]: name === "type" ? value : Number(value),
    }));
  };

  const applyEdit = () => {
    if (selectedId) editItem(selectedId, { ...editValues });
  };

  return (
    <div className="selected-controls">
      <label>Selected ID:</label>
      <select value={selectedId || ""} onChange={(e) => setSelectedId(e.target.value || null)}>
        <option value="">—</option>
        {items.map((it) => (
          <option key={it.id} value={it.id}>
            {it.id} ({it.type.replace(/_/g, " ")})
          </option>
        ))}
      </select>

      {selectedItem && (
        <>
          <div className="control-buttons">
            <button onClick={() => scaleSelected(0.9)}>Scale Down</button>
            <button onClick={() => scaleSelected(1.1)}>Scale Up</button>
            <button onClick={() => rotateSelected(-15)}>Rotate -15°</button>
            <button onClick={() => rotateSelected(15)}>Rotate +15°</button>
            <button className="danger" onClick={removeSelected}>Remove</button>
          </div>

          <div className="edit-controls">
            <h4>Edit Item</h4>
            <label>
              Type:
              <select name="type" value={editValues.type} onChange={handleEditChange}>
                {Object.keys(ITEM_PROTOTYPES).map((key) => (
                  <option key={key} value={ITEM_PROTOTYPES[key].type}>
                    {ITEM_PROTOTYPES[key].type.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Width:
              <input type="number" name="w" value={editValues.w} onChange={handleEditChange} min={8} />
            </label>
            <label>
              Height:
              <input type="number" name="h" value={editValues.h} onChange={handleEditChange} min={8} />
            </label>
            <label>
              Rotation:
              <input type="number" name="rotation" value={editValues.rotation} onChange={handleEditChange} />
            </label>
            <button onClick={applyEdit}>Apply</button>
          </div>
        </>
      )}
    </div>
  );
};

const PlannerFloorPlan = ({ eventId: initialEventId }) => {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(initialEventId || "");
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState("");
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const containerRef = useRef(null);

  const {
    addItem: handleAddItem,
    removeSelected,
    scaleSelected,
    rotateSelected,
    editItem,
    onPointerDownItem,
    onPointerMove,
    onPointerUp,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  } = useFloorplanHandlers({
    containerRef,
    items,
    setItems,
    selectedId,
    setSelectedId,
  });

  const { handleImageUpload, clearBackgroundImage, saveLocal, loadLocal, deleteLocal } =
    useFloorplanStorage({
      selectedEventId,
      items,
      backgroundImage,
      setItems,
      setBackgroundImage,
    });

  useEffect(() => {
    fetchEvents().then(setEvents).catch(() => setEvents([]));
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchVendors(selectedEventId).then(setVendors).catch(() => setVendors([]));
    }
  }, [selectedEventId]);

  const addItem = (key) => {
    const proto = ITEM_PROTOTYPES[key];
    const newItem = {
      ...proto,
      id: `item_${Date.now()}`,
      x: 100,
      y: 100,
      color: proto.color || "#999",
    };
    setItems((p) => [...p, newItem]);
    setSelectedId(newItem.id);
  };

  return (
    <div className="floorplan-page">
      <header className="ps-header">
        <div className="ps-header-content">
          <div className="ps-header-title">
            <MapPin className="ps-header-icon" />
            <h1>Floorplan Manager</h1>
          </div>
        </div>
      </header>

      <div className="floorplan-topbar">
        <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)}>
          <option value="">Select Event</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>{ev.name || ev.id}</option>
          ))}
        </select>
        <select
          value={selectedVendor}
          onChange={(e) => setSelectedVendor(e.target.value)}
          disabled={!selectedEventId}
        >
          <option value="">Select Vendor</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>{v.businessName || v.id}</option>
          ))}
        </select>
      </div>

      <div className="floorplan-content">
        <div className="floorplan-canvas-wrap" ref={containerRef}>
          <button
            className="sidebar-toggle"
            onClick={() => document.querySelector(".floorplan-sidebar").classList.toggle("open")}
          >
            ☰
          </button>

          <div className="floorplan-canvas"
               onPointerMove={onPointerMove}
               onPointerUp={onPointerUp}
               onPointerCancel={onPointerUp}
               onTouchStart={onTouchStart}
               onTouchMove={onTouchMove}
               onTouchEnd={onTouchEnd}
          >
            {items.map((it) => (
              <FloorplanItem
                key={it.id}
                item={it}
                selectedId={selectedId}
                onPointerDown={onPointerDownItem}
              />
            ))}
          </div>
        </div>

        <aside className="floorplan-sidebar">
          <h3>Background Image</h3>
          <input type="file" accept="image/*" onChange={handleImageUpload} />
          {backgroundImage && (
            <div className="image-preview">
              <img src={backgroundImage} alt="Preview" style={{ width: "100%", marginTop: 10 }} />
              <button onClick={clearBackgroundImage} className="danger">Clear Image</button>
            </div>
          )}

          <h3>Add Items</h3>
          <AddItemDropdown addItem={addItem} />

          <h3>Selected Item</h3>
          <SelectedControls
            selectedId={selectedId}
            items={items}
            setSelectedId={setSelectedId}
            scaleSelected={scaleSelected}
            rotateSelected={rotateSelected}
            removeSelected={removeSelected}
            editItem={editItem}
          />

          <h3>Save / Upload</h3>
          <button onClick={() => exportToPNG({ containerRef, backgroundImage, items, selectedEventId })}>
            Download PNG
          </button>
          <button onClick={() => uploadToVendor({ containerRef, backgroundImage, items, selectedEventId, selectedVendor })}>
            Send to Vendor
          </button>
          <button onClick={saveLocal}>Save Draft</button>
          <button onClick={loadLocal}>Load Draft</button>
          <button onClick={deleteLocal} className="danger">Delete Draft</button>
        </aside>
      </div>
    </div>
  );
};

export default PlannerFloorPlan;
