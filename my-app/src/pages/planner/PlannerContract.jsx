import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Calendar, User, FileText, Search, X, Send, Edit3, Download, Save, RefreshCw, FileCheck, Trash2 } from "lucide-react";
import { auth, db, storage } from "../../firebase";
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import "./PlannerContract.css";

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

const PlannerContract = ({ setActivePage }) => {
  const [events, setEvents] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContract, setSelectedContract] = useState(null);
  const [showSignModal, setShowSignModal] = useState(false);
  const [signatureData, setSignatureData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const canvasRefs = useRef({});
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const confirmRelevantServices = async(eventId, vendorId) => {
      if (!auth.currentUser) {
        setError("User not authenticated");
        setLoading(false);
        return;
    }


    try{
      const token = await auth.currentUser.getIdToken();

      const res = await fetch(
        `https://us-central1-planit-sdp.cloudfunctions.net/api/planner/${eventId}/${vendorId}/confirm-services`, 
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if(!res.ok) alert("Failed to confirm services");
      return res;
    }catch(err){
      console.error(err);
    }
  }

  const fetchEventsAndContracts = useCallback(async () => {
    if (!auth.currentUser) {
      setError("User not authenticated");
      setLoading(false);
      return;
    }
    try {
      const token = await auth.currentUser.getIdToken();
      const eventsResponse = await fetch(
        "https://us-central1-planit-sdp.cloudfunctions.net/api/planner/me/events",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!eventsResponse.ok) {
        throw new Error(`Failed to fetch events: ${eventsResponse.status}`);
      }
      const eventsData = await eventsResponse.json();
      const formattedEvents = (eventsData.events || []).map(event => ({
        ...event,
        date: event.date?._seconds
          ? new Date(event.date._seconds * 1000).toISOString().split("T")[0]
          : event.date || "No date",
      }));
      setEvents(formattedEvents);

      const contractsData = [];
      for (const event of formattedEvents) {
        const vendorsResponse = await fetch(
          `https://us-central1-planit-sdp.cloudfunctions.net/api/planner/${event.id}/vendors`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!vendorsResponse.ok) {
          console.warn(`No vendors found for event ${event.id}`);
          continue;
        }
        const vendorsData = await vendorsResponse.json();
        for (const vendor of vendorsData.vendors || []) {
          const contractsSnapshot = await getDocs(
            collection(db, `Event/${event.id}/Vendors/${vendor.id}/Contracts`)
          );
          contractsSnapshot.forEach(doc => {
            const contract = doc.data();
            contractsData.push({
              id: doc.id,
              eventId: event.id,
              eventName: event.name,
              vendorId: vendor.id,
              vendorName: vendor.businessName || "Unknown Vendor",
              contractUrl: contract.contractUrl,
              fileName:
                contract.fileName || contract.contractUrl?.split("/").pop().split("?")[0] || "unknown.pdf",
              signatureFields: contract.signatureFields || [],
              signatureWorkflow: contract.signatureWorkflow || {
                isElectronic: true,
                workflowStatus: "sent",
              },
              status: contract.status || "active",
              lastedited: contract.lastedited?._seconds
                ? { seconds: contract.lastedited._seconds }
                : contract.lastedited || { seconds: Math.floor(Date.now() / 1000) },
            });
          });
        }
      }
      setContracts(contractsData);
    } catch (err) {
      console.error("Error fetching events and contracts:", err);
      setError("Failed to load events and contracts: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }
      await fetchEventsAndContracts();
    });
    return () => unsubscribe();
  }, [fetchEventsAndContracts]);

  const startDrawing = (fieldId, e) => {
    const canvas = canvasRefs.current[fieldId];
    if (!canvas) return;
    const rect = canvas.getBoundingRect();
    const ctx = canvas.getContext("2d");
    ctx.beginPath();
    canvasRefs.current[`${fieldId}_isDrawing`] = true;
    canvasRefs.current[`${fieldId}_prevPosition`] = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleSign = (fieldId, e) => {
    if (!canvasRefs.current[`${fieldId}_isDrawing`]) return;
    const canvas = canvasRefs.current[fieldId];
    const rect = canvas.getBoundingRect();
    const ctx = canvas.getContext("2d");
    const currentPosition = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.moveTo(canvasRefs.current[`${fieldId}_prevPosition`].x, canvasRefs.current[`${fieldId}_prevPosition`].y);
    ctx.lineTo(currentPosition.x, currentPosition.y);
    ctx.stroke();

    canvasRefs.current[`${fieldId}_prevPosition`] = currentPosition;
  };

  const stopDrawing = (fieldId) => {
    canvasRefs.current[`${fieldId}_isDrawing`] = false;
    canvasRefs.current[`${fieldId}_prevPosition`] = null;
    const canvas = canvasRefs.current[fieldId];
    setSignatureData(prev => ({
      ...prev,
      [fieldId]: canvas.toDataURL(),
    }));
  };

  const clearSignature = (fieldId) => {
    const canvas = canvasRefs.current[fieldId];
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData(prev => {
      const newData = { ...prev };
      delete newData[fieldId];
      return newData;
    });
  };

  const fetchWithRetry = async (url, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`Fetching PDF (attempt ${i + 1}/${retries}): ${url}`);
        const res = await fetch(url, {
          method: 'GET',
        });
        if (!res.ok) {
          const errorText = await res.text().catch(() => 'No response text');
          throw new Error(`Failed to fetch: ${res.status} ${res.statusText} - ${errorText}`);
        }
        return await res.arrayBuffer();
      } catch (err) {
        console.warn(`Retry ${i + 1}/${retries} failed: ${err.message}`);
        if (i === retries - 1) throw err;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  };

  const getFreshDownloadURL = async (contractUrl) => {
    try {
      // Extract the storage path from the URL
      const urlObj = new URL(contractUrl);
      const path = decodeURIComponent(urlObj.pathname.split('/o/')[1].split('?')[0]);
      console.log('Extracted storage path:', path);
      const storageRef = ref(storage, path);
      const freshUrl = await getDownloadURL(storageRef);
      console.log('Refreshed download URL:', freshUrl);
      return freshUrl;
    } catch (error) {
      console.error('Error refreshing download URL:', error);
      throw new Error(`Failed to refresh download URL: ${error.message}`);
    }
  };

  const updateSignedPDF = async (originalPdfUrl, signatureData, signatureFields, contractId, eventId) => {
    try {
      setIsSaving(true);
      setSaveStatus("Updating contract with signatures...");

      console.log('Original PDF URL:', originalPdfUrl);
      // Refresh the download URL to ensure it's valid
      const freshPdfUrl = await getFreshDownloadURL(originalPdfUrl);

      const { PDFDocument, rgb } = await import('pdf-lib');
      
      const existingPdfBytes = await fetchWithRetry(freshPdfUrl).catch(err => {
        throw new Error(`Failed to fetch PDF from ${freshPdfUrl}: ${err.message}`);
      });
      
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { width, height } = firstPage.getSize();
      
      for (const field of signatureFields) {
        if (field.signerRole === "client" && signatureData[field.id]) {
          const signatureImageBytes = await fetch(signatureData[field.id]).then(res => {
            if (!res.ok) throw new Error(`Failed to fetch signature image: ${res.status} ${res.statusText}`);
            return res.arrayBuffer();
          });
          const signatureImage = await pdfDoc.embedPng(signatureImageBytes);
          
          const x = field.position.x;
          const y = height - field.position.y - field.position.height;
          const signatureWidth = field.position.width;
          const signatureHeight = field.position.height;
          
          firstPage.drawImage(signatureImage, {
            x: x,
            y: y,
            width: signatureWidth,
            height: signatureHeight,
            opacity: 1,
          });
          
          firstPage.drawText(`Signed by: ${auth.currentUser.email} at ${new Date().toISOString()}`, {
            x: x,
            y: y - 10,
            size: 1,
            color: rgb(1, 1, 1),
          });
        }
      }
      
      const signatureInfo = `\nDocument signed electronically on ${new Date().toLocaleString()}\nSigned by: ${auth.currentUser.email}\nContract ID: ${contractId}`;
      firstPage.drawText(signatureInfo, {
        x: 50,
        y: 50,
        size: 8,
        color: rgb(0.5, 0.5, 0.5),
      });
      
      const modifiedPdfBytes = await pdfDoc.save();
      
      // Extract storage path from original URL
      const urlObj = new URL(originalPdfUrl);
      const storagePath = decodeURIComponent(urlObj.pathname.split('/o/')[1].split('?')[0]);
      console.log('Uploading to storage path:', storagePath);
      const storageRef = ref(storage, storagePath);
      
      const signedPdfBlob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
      await uploadBytes(storageRef, signedPdfBlob);
      const updatedUrl = await getDownloadURL(storageRef);
      console.log('Updated PDF URL:', updatedUrl);
      
      setSaveStatus("Contract updated with signatures successfully!");
      return updatedUrl;
      
    } catch (error) {
      console.error('Error updating signed PDF:', error);
      setSaveStatus(`Failed to update contract: ${error.message}`);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const saveSignatureToStorage = async (fieldId, signatureDataUrl, contractId, eventId) => {
    try {
      const plannerId = auth.currentUser.uid;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      const response = await fetch(signatureDataUrl);
      if (!response.ok) throw new Error(`Failed to fetch signature data: ${response.status} ${response.statusText}`);
      const blob = await response.blob();
      
      const storageRef = ref(
        storage,
        `Signatures/${eventId}/${contractId}/${fieldId}_${plannerId}_${timestamp}.png`
      );
      
      const snapshot = await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      const signatureMetadata = {
        fieldId,
        signerId: plannerId,
        signerRole: 'client',
        contractId,
        eventId,
        signatureUrl: downloadURL,
        signedAt: new Date().toISOString(),
        signatureData: signatureDataUrl,
        ipAddress: null,
        userAgent: navigator.userAgent,
        timestamp: new Date(),
      };
      
      await addDoc(collection(db, 'SignatureAudit'), signatureMetadata);
      
      return {
        url: downloadURL,
        metadata: signatureMetadata
      };
    } catch (error) {
      console.error('Error saving signature to storage:', error);
      throw error;
    }
  };

  const saveDraftSignature = useCallback(async () => {
    if (!selectedContract || Object.keys(signatureData).length === 0) {
      setSaveStatus("No signatures to save");
      return;
    }

    setIsSaving(true);
    setSaveStatus("Saving draft...");

    try {
      const plannerId = auth.currentUser.uid;
      const draftSignatures = {};
      
      for (const [fieldId, dataUrl] of Object.entries(signatureData)) {
        const savedSignature = await saveSignatureToStorage(
          fieldId, 
          dataUrl, 
          selectedContract.id, 
          selectedContract.eventId
        );
        draftSignatures[fieldId] = savedSignature;
      }

      const contractRef = doc(
        db, 
        `Event/${selectedContract.eventId}/Vendors/${selectedContract.vendorId}/Contracts`, 
        selectedContract.id
      );

      const updatedFields = selectedContract.signatureFields.map(field => {
        if (draftSignatures[field.id]) {
          return {
            ...field,
            draftSignature: draftSignatures[field.id].url,
            draftSignatureData: draftSignatures[field.id].metadata,
            lastDraftSaved: new Date().toISOString(),
          };
        }
        return field;
      });

      await updateDoc(contractRef, {
        signatureFields: updatedFields,
        draftSignatures: draftSignatures,
        lastDraftSaved: new Date().toISOString(),
        lastedited: { seconds: Math.floor(Date.now() / 1000) },
      });

      setContracts(prev =>
        prev.map(c =>
          c.id === selectedContract.id
            ? { ...c, signatureFields: updatedFields, draftSignatures, lastedited: { seconds: Math.floor(Date.now() / 1000) } }
            : c
        )
      );

      setSaveStatus("Draft saved successfully!");
      setTimeout(() => setSaveStatus(""), 3000);
      
    } catch (error) {
      console.error('Error saving draft signature:', error);
      setSaveStatus(`Failed to save draft: ${error.message}`);
      setTimeout(() => setSaveStatus(""), 3000);
    } finally {
      setIsSaving(false);
    }
  }, [selectedContract, signatureData]);

  const sendSignedContract = async () => {
    if (!selectedContract) return;
    
    const requiredFields = selectedContract.signatureFields.filter(f => f.signerRole === "client" && f.required);
    const signedFieldIds = Object.keys(signatureData);
    const missingRequired = requiredFields.filter(f => !signedFieldIds.includes(f.id));
    
    if (missingRequired.length > 0) {
      alert(`Please sign all required fields: ${missingRequired.map(f => f.label).join(', ')}`);
      return;
    }

    const confirmSign = window.confirm(
      "Are you sure you want to finalize and submit these signatures? This will update the existing contract document with your signatures. This action cannot be undone."
    );
    if (!confirmSign) return;

    setIsSaving(true);
    setSaveStatus("Finalizing signatures...");

    try {
      const plannerId = auth.currentUser.uid;
      const finalSignatures = {};
      
      for (const [fieldId, dataUrl] of Object.entries(signatureData)) {
        const savedSignature = await saveSignatureToStorage(
          fieldId, 
          dataUrl, 
          selectedContract.id, 
          selectedContract.eventId
        );
        finalSignatures[fieldId] = savedSignature;
      }

      const updatedUrl = await updateSignedPDF(
        selectedContract.contractUrl,
        signatureData,
        selectedContract.signatureFields,
        selectedContract.id,
        selectedContract.eventId
      );

      const updatedFields = selectedContract.signatureFields.map(field => {
        if (finalSignatures[field.id]) {
          return {
            ...field,
            signed: true,
            signedAt: new Date().toISOString(),
            signerId: plannerId,
            signatureData: finalSignatures[field.id].url,
            signatureMetadata: finalSignatures[field.id].metadata,
            finalizedAt: new Date().toISOString(),
          };
        }
        return field;
      });

      const allSigned = updatedFields.every(field => !field.required || field.signed);

      const response = await fetch(
        `https://us-central1-planit-sdp.cloudfunctions.net/api/contracts/${selectedContract.id}/signature-fields`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            eventId: selectedContract.eventId,
            signatureFields: updatedFields,
            signers: selectedContract.signers || [],
            vendorId: selectedContract.vendorId
          }),
        });

      
      const contractRef = doc(
        db, 
        `Event/${selectedContract.eventId}/Vendors/${selectedContract.vendorId}/Contracts`, 
        selectedContract.id

      );
      
      const updateData = {
        signatureFields: updatedFields,
        finalSignatures: finalSignatures,
        signatureWorkflow: {
          ...selectedContract.signatureWorkflow,
          workflowStatus: allSigned ? "completed" : "partially_signed",
          completedAt: allSigned ? new Date().toISOString() : null,
          completedBy: plannerId,
        },
        status: "signed",
        signedAt: new Date().toISOString(),
        signedBy: plannerId,
        contractUrl: updatedUrl,
        lastedited: { seconds: Math.floor(Date.now() / 1000) },
        documentHistory: [
          ...(selectedContract.documentHistory || []),
          {
            action: 'document_signed',
            timestamp: new Date().toISOString(),
            url: updatedUrl,
            signedBy: plannerId,
          }
        ],
      };
      
      await updateDoc(contractRef, updateData);

      await addDoc(collection(db, 'ContractAudit'), {
        contractId: selectedContract.id,
        eventId: selectedContract.eventId,
        vendorId: selectedContract.vendorId,
        action: 'contract_signed',
        performedBy: plannerId,
        performedAt: new Date().toISOString(),
        details: {
          signedFields: updatedFields.filter(f => f.signed).length,
          totalFields: updatedFields.length,
          allRequiredSigned: allSigned,
          updatedDocumentUrl: updatedUrl,
        },
      });

      setContracts(prev =>
        prev.map(c =>
          c.id === selectedContract.id
            ? { ...c, ...updateData, lastedited: { seconds: Math.floor(Date.now() / 1000) } }
            : c
        )
      );

      const res = await confirmRelevantServices(selectedContract.eventId, selectedContract.vendorId);
      if(res.ok){
        alert("Services confirmed successfully!");
      }

      setShowSignModal(false);
      setSelectedContract(null);
      setSignatureData({});
      setSaveStatus("");
      
      alert("Contract signatures saved successfully! The contract document has been updated with your signatures.");
      await fetchEventsAndContracts();
      
    } catch (err) {
      console.error("Error finalizing signed contract:", err);
      alert(`Failed to finalize signed contract: ${err.message}`);
      setSaveStatus(`Failed to finalize signatures: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteContract = useCallback(async (eventId, contractId, contractUrl) => {
    if (!auth.currentUser) {
      setError("User not authenticated");
      return;
    }

    const confirmDelete = window.confirm("Are you sure you want to delete this contract? This action cannot be undone.");
    if (!confirmDelete) return;

    try {
      const vendorId = contracts.find(c => c.id === contractId)?.vendorId;
      if (!vendorId) throw new Error("Vendor ID not found for contract");

      const contractRef = doc(db, `Event/${eventId}/Vendors/${vendorId}/Contracts`, contractId);

      await deleteDoc(contractRef);

      const storageRef = ref(storage, contractUrl);
      await deleteObject(storageRef).catch(err => {
        console.warn("Failed to delete contract file from storage:", err);
      });

      setContracts(prev => prev.filter(c => c.id !== contractId));

      await addDoc(collection(db, "ContractAudit"), {
        contractId,
        eventId,
        vendorId,
        action: "contract_deleted",
        performedBy: auth.currentUser.uid,
        performedAt: new Date().toISOString(),
        details: {
          fileName: contractUrl.split('/').pop().split('?')[0],
          deletedAt: new Date().toISOString(),
        },
      });

      setSaveStatus("Contract deleted successfully!");
      setTimeout(() => setSaveStatus(""), 5000);
    } catch (error) {
      console.error("Error deleting contract:", error);
      setError(`Failed to delete contract: ${error.message}`);
      setSaveStatus(`Failed to delete contract: ${error.message}`);
      setTimeout(() => setSaveStatus(""), 5000);
    }
  }, [contracts]);

  const loadDraftSignatures = useCallback((contract) => {
    if (contract.signatureFields) {
      const draftData = {};
      contract.signatureFields.forEach(field => {
        if (field.draftSignature && !field.signed) {
          draftData[field.id] = field.draftSignature;
        }
      });
      setSignatureData(draftData);
    }
  }, []);

  const groupedContracts = useMemo(() => {
    const groups = {};
    contracts.forEach(contract => {
      if (!groups[contract.eventId]) {
        groups[contract.eventId] = [];
      }
      groups[contract.eventId].push(contract);
    });
    return groups;
  }, [contracts]);

  const filteredEvents = useMemo(() => {
    return events.filter(
      event =>
        event.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        event.clientName?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        event.clientEmail?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [events, debouncedSearchTerm]);

  const totalContracts = contracts.length;
  const pendingContracts = contracts.filter(c => c.signatureWorkflow?.workflowStatus === "sent").length;
  const signedContracts = contracts.filter(c => c.signatureWorkflow?.workflowStatus === "completed").length;

  const handleDownloadContract = (contractUrl, fileName) => {
    const link = document.createElement("a");
    link.href = contractUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const EventCard = React.memo(({ event }) => {
    const eventContracts = groupedContracts[event.id] || [];

    return (
      <div className="event-card">
        <div className="event-info">
          <p>
            <Calendar size={16} /> {event.name}
          </p>
          <p>
            <User size={16} /> {event.clientName || "Unknown Client"}
          </p>
          <p>
            <FileText size={16} /> Date: {event.date}
          </p>
          <p>Status: {event.status}</p>
        </div>
        <div className="contract-section">
          {eventContracts.length === 0 ? (
            <p>No contracts received for this event.</p>
          ) : (
            <div className="contracts-list">
              {eventContracts.map(contract => (
                <div key={contract.id} className="contract-row">
                  <div className="contract-info">
                    <p className="file-name">
                      <button
                        className="file-name-btn"
                        onClick={() => {
                          setSelectedContract(contract);
                          loadDraftSignatures(contract);
                          setShowSignModal(true);
                        }}
                        title="View and sign contract"
                      >
                        {contract.fileName}
                      </button>
                      <span>
                        (
                        {contract.lastedited?.seconds
                          ? new Date(contract.lastedited.seconds * 1000).toLocaleDateString()
                          : "Unknown date"}
                        )
                      </span>
                    </p>
                    <span className={`status-${contract.status}`}>{contract.status}</span>
                    {contract.signatureWorkflow?.isElectronic && (
                      <span className={`status-badge ${contract.signatureWorkflow.workflowStatus}`}>
                        {contract.signatureWorkflow.workflowStatus.replace("_", " ")}
                      </span>
                    )}
                  </div>
                  <div className="contract-actions">
                    <button
                      className="sign-btn"
                      onClick={() => {
                        setSelectedContract(contract);
                        loadDraftSignatures(contract);
                        setShowSignModal(true);
                      }}
                      title="Sign contract"
                      disabled={contract.signatureWorkflow?.workflowStatus === "completed"}
                    >
                      <Edit3 size={12} />
                      {contract.signatureWorkflow?.workflowStatus === "completed" ? "Signed" : "Sign"}
                    </button>
                    <button
                      className="download-btn small"
                      onClick={() => handleDownloadContract(
                        contract.contractUrl, 
                        contract.fileName
                      )}
                      title="Download contract"
                    >
                      <Download size={12} />
                      Download
                    </button>
                    <button
                      className="delete-btn small"
                      onClick={() => deleteContract(contract.eventId, contract.id, contract.contractUrl)}
                      title="Delete contract"
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  });

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading your events...</p>
      </div>
    );
  }

  if (error) {
    return <p className="error">{error}</p>;
  }

  if (!events.length) {
    return <p className="no-events">No events found.</p>;
  }

  return (
    <section className="events-page">
      <header>
        <h1>Contract Management</h1>
        <p>Manage vendor contracts for your events.</p>
        <div className="stats-summary">
          <div className="stat-item">
            <FileText size={20} />
            <span>Total Contracts: {totalContracts}</span>
          </div>
          <div className="stat-item pending-stat">
            <span>Pending Contracts: {pendingContracts}</span>
          </div>
          <div className="stat-item signed-stat">
            <span>Signed Contracts: {signedContracts}</span>
          </div>
        </div>
        <div className="search-container">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search by event name, client name, or email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} className="clear-search">
              <X size={16} />
            </button>
          )}
        </div>
      </header>
      <div className="events-section">
        <h2 className="section-title">
          <Calendar size={20} />
          Your Events ({filteredEvents.length})
        </h2>
        <div className="events-list">
          {filteredEvents.map(event => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </div>
      {debouncedSearchTerm && filteredEvents.length === 0 && (
        <div className="no-results">
          <p>No events found matching "{debouncedSearchTerm}"</p>
        </div>
      )}
      {showSignModal && selectedContract && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-labelledby="modal-title"
          onClick={() => {
            setShowSignModal(false);
            setSelectedContract(null);
            setSignatureData({});
            setSaveStatus("");
          }}
        >
          <div className="modal-content sign-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 id="modal-title">
                {selectedContract.signatureWorkflow?.workflowStatus === "completed" ? "View Signed Contract: " : "Sign Contract: "}
                {selectedContract.fileName}
              </h3>
              <div className="document-version-info">
                <span className="original-doc-indicator">
                  <FileText size={16} />
                  Contract document
                </span>
              </div>
              <div className="modal-status">
                {saveStatus && (
                  <span className={`save-status ${saveStatus.includes('Failed') ? 'error' : 'success'}`}>
                    {saveStatus}
                  </span>
                )}
                {isSaving && (
                  <span className="processing-indicator">
                    <RefreshCw size={16} className="spinning" />
                    Processing...
                  </span>
                )}
              </div>
              <button 
                onClick={() => {
                  setShowSignModal(false);
                  setSelectedContract(null);
                  setSignatureData({});
                  setSaveStatus("");
                }} 
                className="close-btn"
              >
                <X size={20} />
              </button>
            </div>
            <div className="contract-viewer">
              <iframe
                src={`${selectedContract.contractUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                style={{ width: "100%", height: "500px", border: "none" }}
                title="Contract Preview"
              />
              {selectedContract.signatureFields
                .filter(field => field.signerRole === "client")
                .map(field => (
                  <div
                    key={field.id}
                    className="signature-field-overlay"
                    style={{
                      position: "absolute",
                      left: field.position.x,
                      top: field.position.y,
                      width: field.position.width,
                      height: field.position.height,
                      border: field.signed ? "2px solid #10b981" : "2px dashed #2563eb",
                      backgroundColor: field.signed 
                        ? "rgba(16, 185, 129, 0.1)" 
                        : "rgba(37, 99, 235, 0.1)",
                      zIndex: 10,
                    }}
                  >
                    {field.signed ? (
                      <div className="signed-indicator">
                        <img 
                          src={field.signatureData} 
                          alt="Signed" 
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      </div>
                    ) : (
                      <canvas
                        ref={el => (canvasRefs.current[field.id] = el)}
                        width={field.position.width}
                        height={field.position.height}
                        onMouseDown={e => startDrawing(field.id, e)}
                        onMouseMove={e => handleSign(field.id, e)}
                        onMouseUp={() => stopDrawing(field.id)}
                        onMouseLeave={() => stopDrawing(field.id)}
                        style={{ border: "1px solid #ccc", borderRadius: "4px" }}
                      />
                    )}
                    <div
                      className="signature-field-label"
                      style={{ 
                        position: "absolute", 
                        top: "-24px", 
                        color: field.signed ? "#10b981" : "#2563eb",
                        fontWeight: field.signed ? "bold" : "normal"
                      }}
                    >
                      {field.label} {field.required && "*"} {field.signed && "✓"}
                    </div>
                    {!field.signed && (
                      <button
                        className="clear-signature-btn"
                        onClick={() => clearSignature(field.id)}
                        style={{
                          position: "absolute",
                          top: "-10px",
                          right: "-10px",
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%",
                          background: "#dc2626",
                          color: "white",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>
                ))}
            </div>
            <div className="signature-actions">
              {selectedContract.signatureWorkflow?.workflowStatus !== "completed" && (
                <>
                  <button 
                    className="save-draft-btn" 
                    onClick={saveDraftSignature}
                    disabled={isSaving || Object.keys(signatureData).length === 0}
                  >
                    {isSaving ? <RefreshCw size={16} className="spinning" /> : <Save size={16} />}
                    Save Draft
                  </button>
                  <button 
                    className="sign-btn" 
                    onClick={sendSignedContract}
                    disabled={isSaving}
                  >
                    {isSaving ? <RefreshCw size={16} className="spinning" /> : <Send size={16} />}
                    Finalize & Update Contract
                  </button>
                </>
              )}
              {selectedContract.signatureWorkflow?.workflowStatus === "completed" && (
                <div className="signed-contract-info">
                  <span className="completion-status">
                    <FileCheck size={16} />
                    Contract completed and signed on {new Date(selectedContract.signedAt).toLocaleDateString()}
                  </span>
                  <button
                    className="download-btn"
                    onClick={() => handleDownloadContract(
                      selectedContract.contractUrl, 
                      selectedContract.fileName
                    )}
                  >
                    <Download size={16} />
                    Download Contract
                  </button>
                </div>
              )}
              <button
                className="delete-btn"
                onClick={() => {
                  deleteContract(selectedContract.eventId, selectedContract.id, selectedContract.contractUrl);
                  setShowSignModal(false);
                  setSelectedContract(null);
                  setSignatureData({});
                  setSaveStatus("");
                }}
              >
                <Trash2 size={16} />
                Delete Contract
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default PlannerContract;