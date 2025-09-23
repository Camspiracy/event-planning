import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Upload, User, FileText, Mail, Calendar, Clock, Search, Eye, X, Trash2, Edit3, Settings, Download, DollarSign, Save, Plus } from "lucide-react";
import { auth, storage, db } from "../../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, collection, setDoc, deleteDoc, getDocs, updateDoc } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import PDFSignatureEditor from "./PDFSignatureEditor";
import "./VendorContract.css";

// Custom debounce hook
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

const VendorContract = ({ setActivePage }) => {
  const [clients, setClients] = useState([]);
  const [allContracts, setAllContracts] = useState([]);
  const [uploading, setUploading] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContract, setSelectedContract] = useState(null);
  const [showContractModal, setShowContractModal] = useState(false);
  const [iframeSrc, setIframeSrc] = useState(null);
  
  // E-signature states
  const [showSignatureEditor, setShowSignatureEditor] = useState(false);
  const [editingContractForSignature, setEditingContractForSignature] = useState(null);
  
  // Final pricing states
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [currentClient, setCurrentClient] = useState(null);
  const [currentFile, setCurrentFile] = useState(null);
  const [currentReplacingContractId, setCurrentReplacingContractId] = useState(null);
  const [currentSignatureFields, setCurrentSignatureFields] = useState([]);
  const [finalPrices, setFinalPrices] = useState({});
  const [clientServices, setClientServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const cacheKey = `vendorClients_${auth.currentUser?.uid}`;
  const cacheTTL = 5 * 60 * 1000;

  const vendorId = auth.currentUser?.uid;
  // Function to fetch services for a client (placeholder URL)
  const fetchClientServices = useCallback(async (eventId, vendorId) => {
    if (!auth.currentUser) return [];
    setLoadingServices(true);
    try {
      const token = await auth.currentUser.getIdToken();
      // Placeholder URL - replace with actual API endpoint
      const url = `https://us-central1-planit-sdp.cloudfunctions.net/api/${vendorId}/${eventId}/services-for-contract`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch services: ${res.status}`);
      }
      const data = await res.json();
      return data.services || [];
    } catch (error) {
      console.error("Error fetching client services:", error);
      // Fallback mock data for development
      return [
        { id: '1', name: 'Photography Package', description: 'Wedding photography service' },
        { id: '2', name: 'Videography Package', description: 'Wedding videography service' },
        { id: '3', name: 'Additional Hours', description: 'Extended coverage time' }
      ];
    } finally {
      setLoadingServices(false);
    }
  }, []);

  // Function to update final prices in the event (placeholder URL)
  const updateEventFinalPrices = useCallback(async (eventId, vendorId, pricesData) => {
    if (!auth.currentUser) return;
    try {
      const token = await auth.currentUser.getIdToken();
      // Placeholder URL - replace with actual API endpoint
      const url = `https://us-central1-planit-sdp.cloudfunctions.net/api/${vendorId}/${eventId}/update-final-prices`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ finalPrices: pricesData })
      });
      if (!res.ok) {
        throw new Error(`Failed to update final prices: ${res.status}`);
      }
      console.log('Final prices updated successfully');
    } catch (error) {
      console.error("Error updating final prices:", error);
      throw error;
    }
  }, []);

  // Function to fetch contract final prices (placeholder URL)
  const fetchContractFinalPrices = useCallback(async (eventId, vendorId) => {
    if (!auth.currentUser) return {};
    try {
      const token = await auth.currentUser.getIdToken();
      // Placeholder URL - replace with actual API endpoint
      const url = `https://us-central1-planit-sdp.cloudfunctions.net/api/${eventId}/${vendorId}/contract-prices-final`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch contract prices: ${res.status}`);
      }
      const data = await res.json();
      return data.finalPrices || {};
    } catch (error) {
      console.error("Error fetching contract prices:", error);
      return {};
    }
  }, []);

  const loadContractsFromFirestore = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
      const vendorId = auth.currentUser.uid;
      const contractsData = [];
      const contractsRef = collection(db, "Event");
      const snapshot = await getDocs(contractsRef);
      for (const eventDoc of snapshot.docs) {
        const vendorContractsRef = collection(db, "Event", eventDoc.id, "Vendors", vendorId, "Contracts");
        const vendorContractsSnapshot = await getDocs(vendorContractsRef);
        for (const doc of vendorContractsSnapshot.docs) {
          const contractData = { id: doc.id, ...doc.data() };
          // Fetch final prices for each contract
          const prices = await fetchContractFinalPrices(eventDoc.id, vendorId);
          contractData.finalPrices = prices;
          contractsData.push(contractData);
        }
      }
      setAllContracts(contractsData);
    } catch (error) {
      console.error("Error loading contracts:", error);
      setError("Failed to load contracts");
    }
  }, [fetchContractFinalPrices]);

  const fetchClients = useCallback(async () => {
    if (!auth.currentUser) {
      setError("User not authenticated");
      setLoading(false);
      return;
    }
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < cacheTTL) {
        setClients(data);
        setLoading(false);
        return;
      }
    }
    try {
      const token = await auth.currentUser.getIdToken();
      const url = "https://us-central1-planit-sdp.cloudfunctions.net/api/vendor/bookings";
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch clients: ${res.status}`);
      }
      const data = await res.json();
      const formattedClients = (data.bookings || []).map(booking => ({
        id: booking.eventId,
        eventId: booking.eventId,
        name: booking.client || "Unknown Client",
        email: booking.email || "No email provided",
        event: booking.eventName || "Unnamed Event",
        contractUrl: booking.contractUrl || null,
        firstuploaded: booking.firstuploaded || null,
        lastedited: booking.lastedited || null,
        status: booking.status || "pending",
      }));
      setClients(formattedClients);
      localStorage.setItem(cacheKey, JSON.stringify({ data: formattedClients, timestamp: Date.now() }));
    } catch (err) {
      console.error("Error fetching clients:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initializeContracts = async () => {
      if (auth.currentUser) {
        await loadContractsFromFirestore();
        if (clients.length > 0) {
          const existingContracts = clients
            .filter(client => client.contractUrl)
            .map(client => ({
              id: uuidv4(),
              eventId: client.eventId,
              vendorId: auth.currentUser?.uid || '',
              clientName: client.name,
              clientEmail: client.email,
              eventName: client.event,
              contractUrl: client.contractUrl,
              googleApisUrl: client.contractUrl,
              fileName: client.contractUrl ? client.contractUrl.split('/').pop().split('?')[0] : 'unknown.pdf',
              fileSize: 0,
              status: "active",
              firstuploaded: client.firstuploaded || null,
              lastedited: client.lastedited || null,
              finalPrices: {},
              signatureWorkflow: {
                isElectronic: false,
                workflowStatus: 'completed',
                createdAt: new Date().toISOString(),
                sentAt: null,
                completedAt: new Date().toISOString(),
                expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                reminderSettings: {
                  enabled: true,
                  frequency: 3,
                  maxReminders: 3,
                  lastReminderSent: null
                }
              },
              signatureFields: [],
              signers: [],
              uploadHistory: client.firstuploaded ? [{
                uploadDate: client.firstuploaded,
                fileName: 'existing_contract',
                fileSize: 0,
                action: "existing_contract"
              }] : []
            }));
         
          setAllContracts(prev => {
            const existingEventIds = prev.map(contract => contract.eventId);
            const newContracts = existingContracts.filter(contract =>
              !existingEventIds.includes(contract.eventId)
            );
            return [...prev, ...newContracts];
          });
        }
      }
    };
    if (clients.length > 0) {
      initializeContracts();
    }
  }, [clients, loadContractsFromFirestore]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }
      await fetchClients();
    });
    return () => unsubscribe();
  }, [fetchClients]);

  // Group contracts by eventId for multiple contracts per client
  const groupedContracts = useMemo(() => {
    const groups = {};
    allContracts.forEach(contract => {
      if (!groups[contract.eventId]) {
        groups[contract.eventId] = [];
      }
      groups[contract.eventId].push(contract);
    });
    return groups;
  }, [allContracts]);

  // Persistent counters based on Firestore data
  const clientsWithContracts = useMemo(() => {
    const eventIdsWithContracts = new Set(allContracts.map(c => c.eventId));
    return clients.filter(client => eventIdsWithContracts.has(client.eventId));
  }, [clients, allContracts]);

  const uploadedCount = clientsWithContracts.length;
  const pendingCount = clients.length - uploadedCount;
  const eSignatureCount = allContracts.filter(c => c.signatureWorkflow?.isElectronic).length;

  // Helper function to create signers from signature fields
  const createSignersFromFields = (signatureFields, clientInfo) => {
    const signers = new Map();
   
    signatureFields.forEach(field => {
      if (!signers.has(field.signerEmail)) {
        signers.set(field.signerEmail, {
          id: uuidv4(),
          role: field.signerRole,
          name: field.signerRole === 'client' ? clientInfo.name : 'Vendor Name',
          email: field.signerEmail,
          status: 'pending',
          accessToken: uuidv4(),
          accessCode: field.signerRole === 'client' ? generateAccessCode() : null,
          invitedAt: null,
          accessedAt: null,
          signedAt: null,
          ipAddress: null,
          userAgent: null,
          declineReason: null
        });
      }
    });
   
    return Array.from(signers.values());
  };

  // Generate random access code for additional security
  const generateAccessCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const createOrUpdateContractEntry = useCallback(async (eventId, contractUrl, fileName, fileSize, clientInfo, isUpdate = false, replacingContractId = null, signatureFields = [], finalPricesData = {}) => {
    const vendorId = auth.currentUser?.uid || '';
    const currentTime = { seconds: Math.floor(Date.now() / 1000) };
    try {
      const contractId = uuidv4();
     
      const newContract = {
        id: contractId,
        eventId,
        vendorId,
        clientName: clientInfo.name,
        clientEmail: clientInfo.email,
        eventName: clientInfo.event,
        contractUrl,
        googleApisUrl: contractUrl,
        fileName,
        fileSize,
        status: "active",
        finalPrices: finalPricesData,
       
        // Enhanced signature workflow
        signatureWorkflow: {
          isElectronic: signatureFields.length > 0,
          workflowStatus: signatureFields.length > 0 ? 'draft' : 'completed',
          createdAt: new Date().toISOString(),
          sentAt: null,
          completedAt: signatureFields.length === 0 ? new Date().toISOString() : null,
          expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          reminderSettings: {
            enabled: true,
            frequency: 3,
            maxReminders: 3,
            lastReminderSent: null
          }
        },
       
        signatureFields: signatureFields,
        signers: signatureFields.length > 0 ? createSignersFromFields(signatureFields, clientInfo) : [],
       
        auditTrail: [{
          id: uuidv4(),
          timestamp: new Date().toISOString(),
          action: 'contract_created',
          actor: auth.currentUser?.email || 'vendor',
          actorRole: 'vendor',
          details: `Contract ${signatureFields.length > 0 ? 'created with e-signature fields' : 'uploaded as traditional contract'} with final pricing`,
          ipAddress: 'system'
        }],
       
        documentVersions: [{
          version: 1,
          type: 'original',
          url: contractUrl,
          createdAt: new Date().toISOString(),
          description: 'Original contract document'
        }],
       
        firstuploaded: currentTime,
        lastedited: currentTime,
        createdAt: currentTime,
        updatedAt: currentTime,
        uploadHistory: [{
          uploadDate: currentTime,
          fileName,
          fileSize,
          action: replacingContractId ? `replacement for ${replacingContractId}` : "initial_upload"
        }]
      };

      const contractRef = doc(db, "Event", eventId, "Vendors", vendorId, "Contracts", contractId);
      await setDoc(contractRef, newContract);
     
      // Update final prices in the event
      if (Object.keys(finalPricesData).length > 0) {
        await updateEventFinalPrices(eventId, vendorId, finalPricesData);
      }

      setAllContracts(prev => [...prev, newContract]);
      
      // Update client with latest contractUrl
      setClients(prev =>
        prev.map(c => c.eventId === eventId ? {
          ...c,
          contractUrl: contractUrl,
          lastedited: currentTime,
          firstuploaded: c.firstuploaded || currentTime,
          signatureStatus: signatureFields.length > 0 ? 'pending_signature' : 'completed'
        } : c)
      );
      console.log(`${replacingContractId ? 'Updated' : 'New'} contract saved with${signatureFields.length > 0 ? ' signature fields' : 'out signature fields'} and final pricing:`, contractId);
      return contractId;
     
    } catch (error) {
      console.error("Error in contract management:", error);
      setError("Failed to save contract");
      return null;
    }
  }, [updateEventFinalPrices]);

  const handleFileUpload = useCallback(async (eventId, file, replacingContractId = null, signatureFields = []) => {
    if (!auth.currentUser || !file) return;
    const allowedTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowedTypes.includes(file.type)) {
      alert("Invalid file type. Please upload PDF, DOC, or DOCX files only.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("File size too large. Please upload files smaller than 10MB.");
      return;
    }

    const clientInfo = clients.find(c => c.eventId === eventId);
    if (!clientInfo) {
      alert("Client information not found.");
      return;
    }

    // Store upload details and show pricing modal
    setCurrentClient(clientInfo);
    setCurrentFile(file);
    setCurrentReplacingContractId(replacingContractId);
    setCurrentSignatureFields(signatureFields);
    
    // Fetch client services
    const services = await fetchClientServices(eventId, vendorId);
    setClientServices(services);
    
    // Initialize final prices object
    const initialPrices = {};
    services.forEach(service => {
      initialPrices[service.id] = '';
    });
    setFinalPrices(initialPrices);
    
    setShowPricingModal(true);
  }, [clients, fetchClientServices]);

  const handlePricingSubmit = async () => {
    if (!currentFile || !currentClient) return;

    // Validate that all prices are filled
    const emptyPrices = Object.values(finalPrices).some(price => price === '' || price === null || price === undefined);
    if (emptyPrices) {
      alert("Please enter final prices for all services.");
      return;
    }

    setUploading(currentClient.eventId);
    
    try {
      const vendorId = auth.currentUser.uid;
      const isUpdate = currentReplacingContractId !== null;
      const fileName = `Contracts/${currentClient.eventId}/${vendorId}/${uuidv4()}-${currentFile.name}`;
      const storageRef = ref(storage, fileName);
      const snapshot = await uploadBytes(storageRef, currentFile);
      const downloadUrl = await getDownloadURL(snapshot.ref);

      // Convert prices to proper format
      const formattedPrices = {};
      Object.keys(finalPrices).forEach(serviceId => {
        formattedPrices[serviceId] = parseFloat(finalPrices[serviceId]) || 0;
      });

      const contractId = await createOrUpdateContractEntry(
        currentClient.eventId, 
        downloadUrl, 
        currentFile.name, 
        currentFile.size, 
        currentClient, 
        isUpdate, 
        currentReplacingContractId, 
        currentSignatureFields,
        formattedPrices
      );
     
      if (currentSignatureFields.length > 0) {
        alert("Contract uploaded successfully with final pricing! You can now send it for electronic signature.");
      } else {
        alert(isUpdate ? "Contract updated successfully with final pricing!" : "Contract uploaded successfully with final pricing!");
      }
     
      // Reset states
      setShowPricingModal(false);
      setCurrentClient(null);
      setCurrentFile(null);
      setCurrentReplacingContractId(null);
      setCurrentSignatureFields([]);
      setFinalPrices({});
      setClientServices([]);
     
      return contractId;
     
    } catch (err) {
      console.error("Upload error:", err);
      alert(`Failed to ${currentReplacingContractId ? 'update' : 'upload'} contract: ${err.message}`);
      return null;
    } finally {
      setUploading(null);
    }
  };

  const handleDeleteContract = useCallback(async (eventId, contractId) => {
    if (!auth.currentUser) {
      setError("User not authenticated");
      return;
    }
    if (!confirm(`Are you sure you want to delete this contract?`)) {
      return;
    }
    try {
      const vendorId = auth.currentUser.uid;
      const contractRef = doc(db, "Event", eventId, "Vendors", vendorId, "Contracts", contractId);
      await deleteDoc(contractRef);
      setAllContracts(prev => {
        const updatedContracts = prev.filter(contract => contract.id !== contractId);
        return updatedContracts;
      });
      // Update client contractUrl if no contracts remain for the event
      setClients(prev =>
        prev.map(c => {
          if (c.eventId === eventId) {
            const remainingContracts = groupedContracts[eventId]?.filter(c => c.id !== contractId) || [];
            return {
              ...c,
              contractUrl: remainingContracts.length > 0 ? remainingContracts[remainingContracts.length - 1].contractUrl : null,
              firstuploaded: remainingContracts.length > 0 ? c.firstuploaded : null,
              lastedited: remainingContracts.length > 0 ? c.lastedited : null,
            };
          }
          return c;
        })
      );
      alert("Contract deleted successfully!");
    } catch (err) {
      console.error("Delete error:", err);
      alert(`Failed to delete contract: ${err.message}`);
    }
  }, [groupedContracts]);

  // Function to handle signature setup
  const handleSetupSignatures = (contract) => {
    setEditingContractForSignature(contract);
    setShowSignatureEditor(true);
  };

  // Function to save signature fields
  const handleSaveSignatureFields = async (signatureFields) => {
    if (!editingContractForSignature) return;
   
    try {
      const contractRef = doc(db, "Event", editingContractForSignature.eventId, "Vendors", auth.currentUser.uid, "Contracts", editingContractForSignature.id);
     
      const signers = createSignersFromFields(signatureFields, {
        name: editingContractForSignature.clientName,
        email: editingContractForSignature.clientEmail
      });
     
      await updateDoc(contractRef, {
        signatureFields: signatureFields,
        signers: signers,
        'signatureWorkflow.isElectronic': true,
        'signatureWorkflow.workflowStatus': 'draft',
        'auditTrail': [...(editingContractForSignature.auditTrail || []), {
          id: uuidv4(),
          timestamp: new Date().toISOString(),
          action: 'signature_fields_defined',
          actor: auth.currentUser?.email || 'vendor',
          actorRole: 'vendor',
          details: `${signatureFields.length} signature fields defined`,
          ipAddress: 'system'
        }],
        updatedAt: new Date().toISOString()
      });
     
      // Update local state
      setAllContracts(prev =>
        prev.map(contract =>
          contract.id === editingContractForSignature.id
            ? {
                ...contract,
                signatureFields,
                signers,
                signatureWorkflow: {
                  ...contract.signatureWorkflow,
                  isElectronic: true,
                  workflowStatus: 'draft'
                }
              }
            : contract
        )
      );
     
      setShowSignatureEditor(false);
      setEditingContractForSignature(null);
      alert('Signature fields saved successfully!');
     
    } catch (error) {
      console.error('Error saving signature fields:', error);
      alert('Failed to save signature fields');
    }
  };

  // Function to send contract for signature
  const handleSendForSignature = async (signatureFields) => {
    if (!editingContractForSignature) return;
   
    try {
      // First save the signature fields
      await handleSaveSignatureFields(signatureFields);
     
      // Update contract status to sent
      const contractRef = doc(db, "Event", editingContractForSignature.eventId, "Vendors", auth.currentUser.uid, "Contracts", editingContractForSignature.id);
      await updateDoc(contractRef, {
        'signatureWorkflow.workflowStatus': 'sent',
        'signatureWorkflow.sentAt': new Date().toISOString(),
        'auditTrail': [...(editingContractForSignature.auditTrail || []), {
          id: uuidv4(),
          timestamp: new Date().toISOString(),
          action: 'sent_for_signature',
          actor: auth.currentUser?.email || 'vendor',
          actorRole: 'vendor',
          details: 'Contract sent for electronic signature',
          ipAddress: 'system'
        }]
      });
     
      alert('Contract sent for signature successfully!');
      setShowSignatureEditor(false);
      setEditingContractForSignature(null);
     
      // Refresh contracts
      await loadContractsFromFirestore();
     
    } catch (error) {
      console.error('Error sending contract for signature:', error);
      alert('Failed to send contract for signature');
    }
  };

  const filteredClients = useMemo(() => {
    return clients.filter(client =>
      client.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      client.event.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [clients, debouncedSearchTerm]);

  const uploadedClients = useMemo(() => {
    const eventIdsWithContracts = new Set(allContracts.map(c => c.eventId));
    return filteredClients.filter(client => eventIdsWithContracts.has(client.eventId));
  }, [filteredClients, allContracts]);

  const pendingClients = useMemo(() => {
    const eventIdsWithContracts = new Set(allContracts.map(c => c.eventId));
    return filteredClients.filter(client => !eventIdsWithContracts.has(client.eventId));
  }, [filteredClients, allContracts]);

  const getContractInfo = useCallback((eventId) => groupedContracts[eventId] || [], [groupedContracts]);

  const viewContractDetails = useCallback((contract) => {
    setSelectedContract(contract);
    setShowContractModal(true);
    if (contract.fileName.toLowerCase().endsWith('.pdf')) {
      setIframeSrc(`${contract.contractUrl}#toolbar=1&navpanes=0&scrollbar=1`);
    }
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getTotalContractValue = (finalPrices) => {
    if (!finalPrices || Object.keys(finalPrices).length === 0) return 0;
    return Object.values(finalPrices).reduce((sum, price) => sum + (parseFloat(price) || 0), 0);
  };

  const ClientCard = React.memo(({ client, isUploaded }) => {
    const eventContracts = getContractInfo(client.eventId);

    const handleDownloadContract = (contractUrl, fileName) => {
      const link = document.createElement('a');
      link.href = contractUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    return (
      <div className={`client-card ${isUploaded ? 'uploaded' : 'pending'}`}>
        <div className="client-header">
          <div className="client-info">
            <h3 className="client-name">
              <User size={16} />
              {client.name}
            </h3>
            <p className="client-email">
              <Mail size={16} />
              {client.email}
            </p>
            <p className="event-name">
              <Calendar size={16} />
              {client.event}
            </p>
          </div>
          {eventContracts.length > 0 && (
            <div className="contract-summary">
              <div className="contract-count">
                <FileText size={16} />
                <span>{eventContracts.length} Contract{eventContracts.length !== 1 ? 's' : ''}</span>
              </div>
              {eventContracts[0]?.finalPrices && Object.keys(eventContracts[0].finalPrices).length > 0 && (
                <div className="total-value">
                  <DollarSign size={16} />
                  <span className="total-amount">
                    {formatCurrency(getTotalContractValue(eventContracts[0].finalPrices))}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="contract-section">
          {eventContracts.length === 0 ? (
            <div className="upload-area">
              <label className="upload-btn primary">
                <Upload size={16} />
                {uploading === client.eventId ? "Uploading..." : "Upload Contract"}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  hidden
                  disabled={uploading === client.eventId}
                  onChange={e => e.target.files[0] && handleFileUpload(client.eventId, e.target.files[0])}
                />
              </label>
            </div>
          ) : (
            <div className="contract-actions">
              <label className="upload-btn secondary">
                <Plus size={16} />
                {uploading === client.eventId ? "Uploading..." : "Add Contract"}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  hidden
                  disabled={uploading === client.eventId}
                  onChange={e => e.target.files[0] && handleFileUpload(client.eventId, e.target.files[0])}
                />
              </label>
              <div className="contracts-list">
                {eventContracts.map((contract) => (
                  <div key={contract.id} className="contract-item">
                    <div className="contract-main-info">
                      <div className="contract-details">
                        <button
                          className="contract-name-btn"
                          onClick={() => viewContractDetails(contract)}
                          title="Click to view contract details"
                        >
                          <FileText size={14} />
                          {contract.fileName}
                        </button>
                        <div className="contract-meta">
                          <span className="upload-date">
                            <Clock size={12} />
                            {new Date(contract.lastedited.seconds * 1000).toLocaleDateString()}
                          </span>
                          <span className={`status-badge status-${contract.status}`}>
                            {contract.status}
                          </span>
                          {contract.signatureWorkflow?.isElectronic && (
                            <span className={`signature-badge ${contract.signatureWorkflow.workflowStatus}`}>
                              {contract.signatureWorkflow.workflowStatus.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      </div>
                      {contract.finalPrices && Object.keys(contract.finalPrices).length > 0 && (
                        <div className="pricing-info">
                          <DollarSign size={14} />
                          <span className="contract-value">
                            {formatCurrency(getTotalContractValue(contract.finalPrices))}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="contract-item-actions">
                      <button
                        className="action-btn signature-btn"
                        onClick={() => handleSetupSignatures(contract)}
                        title="Setup electronic signature"
                      >
                        <Edit3 size={12} />
                        E-Sign
                      </button>
                      <button
                        className="action-btn download-btn"
                        onClick={() => handleDownloadContract(contract.contractUrl, contract.fileName)}
                        title="Download contract"
                      >
                        <Download size={12} />
                      </button>
                      <label className="action-btn edit-btn" title="Replace contract">
                        <Upload size={12} />
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          hidden
                          disabled={uploading === client.eventId}
                          onChange={e => e.target.files[0] && handleFileUpload(client.eventId, e.target.files[0], contract.id)}
                        />
                      </label>
                      <button
                        className="action-btn delete-btn"
                        onClick={() => handleDeleteContract(client.eventId, contract.id)}
                        title="Delete contract"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  });

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner"></div>
      <p>Loading your clients...</p>
    </div>
  );
 
  if (error) return <p className="error">{error}</p>;
  if (!clients.length) return (
    <div className="empty-state">
      <FileText size={48} />
      <h2>No clients found</h2>
      <p>Your client contracts will appear here once you have bookings.</p>
    </div>
  );

  return (
    <section className="contracts-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Contract Management</h1>
          <p>Manage contracts and final pricing for your events and clients</p>
        </div>
        
        <div className="stats-dashboard">
          <div className="stat-card">
            <div className="stat-icon">
              <FileText size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-number">{allContracts.length}</span>
              <span className="stat-label">Total Contracts</span>
            </div>
          </div>
          <div className="stat-card uploaded">
            <div className="stat-icon">
              <User size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-number">{uploadedCount}</span>
              <span className="stat-label">Clients with Contracts</span>
            </div>
          </div>
          <div className="stat-card pending">
            <div className="stat-icon">
              <Upload size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-number">{pendingCount}</span>
              <span className="stat-label">Pending Contracts</span>
            </div>
          </div>
          <div className="stat-card signature">
            <div className="stat-icon">
              <Edit3 size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-number">{eSignatureCount}</span>
              <span className="stat-label">E-Signature Ready</span>
            </div>
          </div>
        </div>
      </div>

      <div className="search-section">
        <div className="search-container">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search by client name, event name, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} className="clear-search">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="contracts-content">
        {uploadedClients.length > 0 && (
          <div className="contracts-section">
            <div className="section-header">
              <h2 className="section-title uploaded-title">
                <FileText size={20} />
                Clients with Contracts
                <span className="count-badge">{uploadedClients.length}</span>
              </h2>
            </div>
            <div className="clients-grid">
              {uploadedClients.map(client => (
                <ClientCard key={client.id} client={client} isUploaded={true} />
              ))}
            </div>
          </div>
        )}

        {pendingClients.length > 0 && (
          <div className="contracts-section">
            <div className="section-header">
              <h2 className="section-title pending-title">
                <Upload size={20} />
                Clients Pending Contracts
                <span className="count-badge">{pendingClients.length}</span>
              </h2>
            </div>
            <div className="clients-grid">
              {pendingClients.map(client => (
                <ClientCard key={client.id} client={client} isUploaded={false} />
              ))}
            </div>
          </div>
        )}

        {debouncedSearchTerm && filteredClients.length === 0 && (
          <div className="no-results">
            <Search size={48} />
            <h3>No contracts found</h3>
            <p>No contracts match "{debouncedSearchTerm}"</p>
          </div>
        )}
      </div>

      {/* Final Pricing Modal */}
      {showPricingModal && currentClient && (
        <div className="modal-overlay pricing-modal-overlay" onClick={() => setShowPricingModal(false)}>
          <div className="modal-content pricing-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-section">
                <h3>Set Final Pricing</h3>
                <p>Enter the final contracted prices for {currentClient.name}</p>
              </div>
              <button onClick={() => setShowPricingModal(false)} className="close-btn">
                <X size={20} />
              </button>
            </div>
           
            <div className="pricing-form">
              <div className="client-summary">
                <div className="client-info">
                  <User size={16} />
                  <span>{currentClient.name}</span>
                </div>
                <div className="event-info">
                  <Calendar size={16} />
                  <span>{currentClient.event}</span>
                </div>
              </div>

              {loadingServices ? (
                <div className="loading-services">
                  <div className="spinner-small"></div>
                  <p>Loading services...</p>
                </div>
              ) : (
                <div className="services-pricing">
                  <h4>Service Final Prices</h4>
                  <div className="pricing-fields">
                    {clientServices.map((service) => (
                      <div key={service.id} className="price-field">
                        <label className="price-label">
                          <span className="service-name">{service.serviceName}</span>
                          {service.description && (
                            <span className="service-description">{service.description}</span>
                          )}
                        </label>
                        <div className="price-input-container">
                          R 
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={finalPrices[service.id] || ''}
                            onChange={(e) => setFinalPrices(prev => ({
                              ...prev,
                              [service.id]: e.target.value
                            }))}
                            className="price-input"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pricing-summary">
                    <div className="total-calculation">
                      <span className="total-label">Total Contract Value:</span>
                      <span className="total-amount">
                        {formatCurrency(
                          Object.values(finalPrices).reduce((sum, price) => 
                            sum + (parseFloat(price) || 0), 0
                          )
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button 
                onClick={() => setShowPricingModal(false)} 
                className="btn-secondary"
              >
                Cancel
              </button>
              <button 
                onClick={handlePricingSubmit} 
                className="btn-primary"
                disabled={loadingServices || uploading}
              >
                <Save size={16} />
                {uploading ? 'Uploading...' : 'Upload Contract with Pricing'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Signature Editor Modal */}
      {showSignatureEditor && editingContractForSignature && (
        <div className="modal-overlay signature-editor-overlay" onClick={() => setShowSignatureEditor(false)}>
          <div className="modal-content signature-editor-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Setup Electronic Signature - {editingContractForSignature.fileName}</h3>
              <button onClick={() => setShowSignatureEditor(false)} className="close-btn">
                <X size={20} />
              </button>
            </div>
           
            <PDFSignatureEditor
              contractUrl={editingContractForSignature.contractUrl}
              onSave={handleSaveSignatureFields}
              onSend={handleSendForSignature}
            />
          </div>
        </div>
      )}

      {/* Contract Details Modal */}
      {showContractModal && selectedContract && (
        <div className="modal-overlay" role="dialog" aria-labelledby="modal-title" onClick={() => { setShowContractModal(false); setIframeSrc(null); }}>
          <div className="modal-content contract-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-section">
                <h3 id="modal-title">Contract Details</h3>
                <div className="contract-quick-info">
                  <span className="file-name">{selectedContract.fileName}</span>
                  <span className={`status-badge status-${selectedContract.status}`}>
                    {selectedContract.status}
                  </span>
                </div>
              </div>
              <div className="modal-header-actions">
                <button
                  onClick={() => {
                    setShowContractModal(false);
                    handleSetupSignatures(selectedContract);
                  }}
                  className="btn-primary"
                >
                  <Edit3 size={14} />
                  Setup E-Signature
                </button>
                <button onClick={() => { setShowContractModal(false); setIframeSrc(null); }} className="close-btn">
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="modal-body">
              {iframeSrc ? (
                <div className="contract-viewer">
                  <iframe
                    src={iframeSrc}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    title="Contract Preview"
                  />
                </div>
              ) : (
                <div className="unsupported-file">
                  <FileText size={48} />
                  <p>Preview not available for this file type. Please download to view.</p>
                </div>
              )}
              
              <div className="contract-info-panel">
                <div className="info-section">
                  <h4>Contract Information</h4>
                  <div className="info-grid">
                    <div className="info-item">
                      <label>Event:</label>
                      <span>{selectedContract.eventName}</span>
                    </div>
                    <div className="info-item">
                      <label>Client:</label>
                      <span>{selectedContract.clientName}</span>
                    </div>
                    <div className="info-item">
                      <label>Status:</label>
                      <span className={`status-badge status-${selectedContract.status}`}>
                        {selectedContract.status}
                      </span>
                    </div>
                    <div className="info-item">
                      <label>Last Edited:</label>
                      <span>{new Date(selectedContract.lastedited.seconds * 1000).toLocaleDateString()}</span>
                    </div>
                    {selectedContract.signatureWorkflow?.isElectronic && (
                      <div className="info-item">
                        <label>Signature Status:</label>
                        <span className={`signature-badge ${selectedContract.signatureWorkflow.workflowStatus}`}>
                          {selectedContract.signatureWorkflow.workflowStatus.replace('_', ' ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedContract.finalPrices && Object.keys(selectedContract.finalPrices).length > 0 && (
                  <div className="info-section">
                    <h4>Final Pricing</h4>
                    <div className="pricing-breakdown">
                      {Object.entries(selectedContract.finalPrices).map(([serviceId, price]) => {
                        const service = clientServices.find(s => s.id === serviceId);
                        return (
                          <div key={serviceId} className="price-item">
                            <span className="service-name">
                              {service ? service.name : `Service ${serviceId}`}
                            </span>
                            <span className="price-value">{formatCurrency(price)}</span>
                          </div>
                        );
                      })}
                      <div className="price-total">
                        <span className="total-label">Total Contract Value:</span>
                        <span className="total-value">
                          {formatCurrency(getTotalContractValue(selectedContract.finalPrices))}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="info-section">
                  <button
                    className="btn-primary download-full"
                    onClick={() => handleDownloadContract(selectedContract.contractUrl, selectedContract.fileName)}
                  >
                    <Download size={16} />
                    Download Contract
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default VendorContract;