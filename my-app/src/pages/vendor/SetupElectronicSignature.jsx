import React, { useState, useEffect } from "react";
import { ArrowLeft, Save, Send } from "lucide-react";
import { auth, db } from "../../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import PDFSignatureEditor from "./PDFSignatureEditor";
import "./SetupElectronicSignature.css";

const SetupElectronicSignature = ({ setActivePage }) => {
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Retrieve contract data from localStorage
    const contractData = localStorage.getItem('contractForSignature');
    if (contractData) {
      setContract(JSON.parse(contractData));
    }
    setLoading(false);
  }, []);

  // Helper function to create signers from signature fields
  const createSignersFromFields = (signatureFields, clientInfo) => {
    const signers = new Map();

    signatureFields.forEach((field) => {
      if (!signers.has(field.signerEmail)) {
        signers.set(field.signerEmail, {
          id: uuidv4(),
          role: field.signerRole,
          name: field.signerRole === "client" ? clientInfo.name : "Vendor Name",
          email: field.signerEmail,
          status: "pending",
          accessToken: uuidv4(),
          accessCode: field.signerRole === "client" ? generateAccessCode() : null,
          invitedAt: null,
          accessedAt: null,
          signedAt: null,
          ipAddress: null,
          userAgent: null,
          declineReason: null,
        });
      }
    });

    return Array.from(signers.values());
  };

  const generateAccessCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleSaveSignatureFields = async (signatureFields) => {
    if (!contract) return;

    try {
      const contractRef = doc(
        db,
        "Event",
        contract.eventId,
        "Vendors",
        auth.currentUser.uid,
        "Contracts",
        contract.id
      );

      const signers = createSignersFromFields(signatureFields, {
        name: contract.clientName,
        email: contract.clientEmail,
      });

      await updateDoc(contractRef, {
        signatureFields: signatureFields,
        signers: signers,
        "signatureWorkflow.isElectronic": true,
        "signatureWorkflow.workflowStatus": "draft",
        auditTrail: [
          ...(contract.auditTrail || []),
          {
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            action: "signature_fields_defined",
            actor: auth.currentUser?.email || "vendor",
            actorRole: "vendor",
            details: `${signatureFields.length} signature fields defined`,
            ipAddress: "system",
          },
        ],
        updatedAt: new Date().toISOString(),
      });

      alert("Signature fields saved successfully!");
      
      // Dispatch event to notify contract page
      window.dispatchEvent(new Event('contractUpdated'));
      
      // Navigate back to contracts page
      localStorage.removeItem('contractForSignature');
      setActivePage("contracts");
    } catch (error) {
      console.error("Error saving signature fields:", error);
      alert("Failed to save signature fields");
    }
  };

  const handleSendForSignature = async (signatureFields) => {
    if (!contract) return;

    try {
      // First save the signature fields
      const contractRef = doc(
        db,
        "Event",
        contract.eventId,
        "Vendors",
        auth.currentUser.uid,
        "Contracts",
        contract.id
      );

      const signers = createSignersFromFields(signatureFields, {
        name: contract.clientName,
        email: contract.clientEmail,
      });

      await updateDoc(contractRef, {
        signatureFields: signatureFields,
        signers: signers,
        "signatureWorkflow.isElectronic": true,
        "signatureWorkflow.workflowStatus": "sent",
        "signatureWorkflow.sentAt": new Date().toISOString(),
        auditTrail: [
          ...(contract.auditTrail || []),
          {
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            action: "sent_for_signature",
            actor: auth.currentUser?.email || "vendor",
            actorRole: "vendor",
            details: "Contract sent for electronic signature",
            ipAddress: "system",
          },
        ],
        updatedAt: new Date().toISOString(),
      });

      alert("Contract sent for signature successfully!");
      
      // Dispatch event to notify contract page
      window.dispatchEvent(new Event('contractUpdated'));
      
      // Navigate back to contracts page
      localStorage.removeItem('contractForSignature');
      setActivePage("contracts");
    } catch (error) {
      console.error("Error sending contract for signature:", error);
      alert("Failed to send contract for signature");
    }
  };

  const handleBack = () => {
    localStorage.removeItem('contractForSignature');
    setActivePage("contracts");
  };

  if (loading) {
    return (
      <div className="setup-signature-loading">
        <div className="spinner"></div>
        <p>Loading contract...</p>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="setup-signature-error">
        <h2>Contract Not Found</h2>
        <p>Unable to load contract data. Please try again.</p>
        <button onClick={handleBack} className="btn-primary">
          <ArrowLeft size={16} />
          Back to Contracts
        </button>
      </div>
    );
  }

  return (
    <div className="setup-signature-page">
      <div className="setup-signature-header">
        <button onClick={handleBack} className="back-button">
          <ArrowLeft size={20} />
          Back to Contracts
        </button>
        <div className="header-info">
          <h1>Setup Electronic Signature</h1>
          <p className="contract-name">{contract.fileName}</p>
          <div className="contract-meta">
            <span>Client: {contract.clientName}</span>
            <span>•</span>
            <span>Event: {contract.eventName}</span>
          </div>
        </div>
      </div>

      <div className="setup-signature-content">
        <PDFSignatureEditor
          contractUrl={contract.contractUrl}
          onSave={handleSaveSignatureFields}
          onSend={handleSendForSignature}
        />
      </div>
    </div>
  );
};

export default SetupElectronicSignature;