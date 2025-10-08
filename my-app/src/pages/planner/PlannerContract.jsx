import React, {
	useEffect,
	useState,
	useMemo,
	useCallback,
	useRef,
} from "react";
import {
	Calendar,
	User,
	FileText,
	Search,
	X,
	Send,
	Edit3,
	Download,
	Save,
	RefreshCw,
	FileCheck,
	Trash2,
} from "lucide-react";
import { auth } from "../../firebase";
import "./PlannerContract.css";
import Popup from "../general/popup/Popup.jsx";

const API_BASE = "https://us-central1-planit-sdp.cloudfunctions.net/api";
const API_TEST = "http://127.0.0.1:5001/planit-sdp/us-central1/api";

const useDebounce = (value, delay) => {
	const [debouncedValue, setDebouncedValue] = useState(value);
	useEffect(() => {
		const handler = setTimeout(() => setDebouncedValue(value), delay);
		return () => clearTimeout(handler);
	}, [value, delay]);
	return debouncedValue;
};

const PlannerContract = () => {
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

	function formatDate(date) {
		if (!date) return "";

		if(typeof date === 'object' && typeof date._seconds === 'number' && typeof date._nanoseconds === 'number') {
			const jsDate = new Date( date._seconds * 1000 + date._nanoseconds / 1e6);
			return jsDate.toLocaleString();
		}

		// Already a JS Date
		if (date instanceof Date) {
			return date.toLocaleString();
		}

		// String
		if (typeof date === "string") {
			return new Date(date).toLocaleString();
		}

		return String(date); // fallback
	}

	// Get auth token for API requests
	const getAuthToken = async () => {
		if (!auth.currentUser) {
			throw new Error("User not authenticated");
		}
		return await auth.currentUser.getIdToken();
	};

	// Fetch all contracts for the planner
	const fetchContracts = useCallback(async () => {
		if (!auth.currentUser) {
			setError("User not authenticated");
			setLoading(false);
			return;
		}

		try {
			const token = await getAuthToken();
			const response = await fetch(`${API_BASE}/planner/contracts`, {
				headers: { Authorization: `Bearer ${token}` },
			});

			if (!response.ok) {
				throw new Error(`Failed to fetch contracts: ${response.status}`);
			}

			const data = await response.json();
			setContracts(data.contracts || []);
		} catch (err) {
			console.error("Error fetching contracts:", err);
			setError("Failed to load contracts: " + err.message);
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
			await fetchContracts();
		});
		return () => unsubscribe();
	}, [fetchContracts]);

	// Canvas drawing functions
	const startDrawing = (fieldId, e) => {
		const canvas = canvasRefs.current[fieldId];
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
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
		const rect = canvas.getBoundingClientRect();
		const ctx = canvas.getContext("2d");
		const currentPosition = {
			x: e.clientX - rect.left,
			y: e.clientY - rect.top,
		};

		ctx.strokeStyle = "#1e293b";
		ctx.lineWidth = 2;
		ctx.lineCap = "round";
		ctx.lineJoin = "round";

		ctx.moveTo(
			canvasRefs.current[`${fieldId}_prevPosition`].x,
			canvasRefs.current[`${fieldId}_prevPosition`].y
		);
		ctx.lineTo(currentPosition.x, currentPosition.y);
		ctx.stroke();

		canvasRefs.current[`${fieldId}_prevPosition`] = currentPosition;
	};

	const stopDrawing = (fieldId) => {
		canvasRefs.current[`${fieldId}_isDrawing`] = false;
		canvasRefs.current[`${fieldId}_prevPosition`] = null;
		const canvas = canvasRefs.current[fieldId];
		setSignatureData((prev) => ({
			...prev,
			[fieldId]: canvas.toDataURL(),
		}));
	};

	const clearSignature = (fieldId) => {
		const canvas = canvasRefs.current[fieldId];
		const ctx = canvas.getContext("2d");
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		setSignatureData((prev) => {
			const newData = { ...prev };
			delete newData[fieldId];
			return newData;
		});
	};

	// Convert base64 signature to blob for upload
	const dataURLtoBlob = (dataURL) => {
		const arr = dataURL.split(',');
		const mime = arr[0].match(/:(.*?);/)[1];
		const bstr = atob(arr[1]);
		let n = bstr.length;
		const u8arr = new Uint8Array(n);
		while (n--) {
			u8arr[n] = bstr.charCodeAt(n);
		}
		return new Blob([u8arr], { type: mime });
	};

	// Upload signature to backend
	const uploadSignature = async (fieldId, dataURL, contractId, eventId) => {
		try {
			const token = await getAuthToken();
			const blob = dataURLtoBlob(dataURL);
			const formData = new FormData();
			formData.append('signature', blob, `${fieldId}.png`);

			console.log(contractId);

			const response = await fetch(
				`${API_BASE}/planner/contracts/${eventId}/${contractId}/${fieldId}/signatures/upload`,
				{
					method: 'POST',
					headers: { Authorization: `Bearer ${token}` },
					body: formData,
				}
			);

			if (!response.ok) {
				throw new Error(`Upload failed: ${response.status}`);
			}

			const data = await response.json();
			return {
				url: data.downloadURL,
				metadata: {
					fieldId,
					signerId: auth.currentUser.uid,
					signerRole: 'client',
					contractId,
					eventId,
					signatureUrl: data.downloadURL,
					signedAt: new Date().toISOString(),
					userAgent: navigator.userAgent,
				}
			};
		} catch (error) {
			console.error('Error uploading signature:', error);
			throw error;
		}
	};

	// Save draft signatures
	const saveDraftSignature = useCallback(async () => {
		if (!selectedContract || Object.keys(signatureData).length === 0) {
			setSaveStatus("No signatures to save");
			return;
		}

		setIsSaving(true);
		setSaveStatus("Saving draft...");

		try {
			const draftSignatures = {};

			// Upload each signature
			for (const [fieldId, dataURL] of Object.entries(signatureData)) {
				const savedSignature = await uploadSignature(
					fieldId,
					dataURL,
					selectedContract.id,
					selectedContract.eventId,
					selectedContract.vendorId
				);
				draftSignatures[fieldId] = savedSignature;
			}

			// Save draft to backend 
			const token = await getAuthToken();
			const response = await fetch(
				`${API_BASE}/planner/contracts/${selectedContract.id}/signatures/draft`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						eventId: selectedContract.eventId,
						vendorId: selectedContract.vendorId,
						signatures: draftSignatures,
					}),
				}
			);

			if (!response.ok) {
				throw new Error(`Failed to save draft: ${response.status}`);
			}

			const result = await response.json();

			// Update local state
			setContracts((prev) =>
				prev.map((c) =>
					c.id === selectedContract.id
						? {
								...c,
								signatureFields: result.signatureFields,
								draftSignatures,
								lastedited: { seconds: Math.floor(Date.now() / 1000) },
						  }
						: c
				)
			);

			setSaveStatus("Draft saved successfully!");
			setTimeout(() => setSaveStatus(""), 3000);
		} catch (error) {
			console.error("Error saving draft signature:", error);
			setSaveStatus(`Failed to save draft: ${error.message}`);
			setTimeout(() => setSaveStatus(""), 3000);
		} finally {
			setIsSaving(false);
		}
	}, [selectedContract, signatureData]);

	// Finalize and sign contract
	const sendSignedContract = async () => {
		if (!selectedContract) return;

		const requiredFields = selectedContract.signatureFields.filter(
			(f) => f.signerRole === "client" && f.required
		);
		const signedFieldIds = Object.keys(signatureData);
		const missingRequired = requiredFields.filter(
			(f) => !signedFieldIds.includes(f.id)
		);

		if (missingRequired.length > 0) {
			alert(
				`Please sign all required fields: ${missingRequired
					.map((f) => f.label)
					.join(", ")}`
			);
			return;
		}

		const confirmSign = window.confirm(
			"Are you sure you want to finalize and submit these signatures? This action cannot be undone."
		);
		if (!confirmSign) return;

		setIsSaving(true);
		setSaveStatus("Finalizing signatures...");

		try {
			const finalSignatures = {};

			// Upload all signatures
			for (const [fieldId, dataURL] of Object.entries(signatureData)) {
				const savedSignature = await uploadSignature(
					fieldId,
					dataURL,
					selectedContract.id,
					selectedContract.eventId,
					selectedContract.vendorId
				);
				finalSignatures[fieldId] = savedSignature;
			}

			// Finalize contract on backend
			const token = await getAuthToken();
			const response = await fetch(
				`${API_BASE}/planner/contracts/${selectedContract.id}/finalize`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						eventId: selectedContract.eventId,
						vendorId: selectedContract.vendorId,
						signatures: finalSignatures,
						signatureFields: selectedContract.signatureFields,
					}),
				}
			);

			if (!response.ok) {
				throw new Error(`Failed to finalize contract: ${response.status}`);
			}

			const result = await response.json();

			// Confirm services
			await fetch(
				`${API_BASE}/planner/contracts/${selectedContract.id}/confirm-services`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						eventId: selectedContract.eventId,
						vendorId: selectedContract.vendorId,
					}),
				}
			);

			// Update local state
			setContracts((prev) =>
				prev.map((c) =>
					c.id === selectedContract.id
						? { ...c, ...result.contract }
						: c
				)
			);

			setShowSignModal(false);
			setSelectedContract(null);
			setSignatureData({});
			setSaveStatus("");

			alert("Contract signed successfully!");
			await fetchContracts();
		} catch (err) {
			console.error("Error finalizing contract:", err);
			alert(`Failed to finalize contract: ${err.message}`);
			setSaveStatus(`Failed to finalize: ${err.message}`);
		} finally {
			setIsSaving(false);
		}
	};

	// Delete contract
	const deleteContract = useCallback(
		async (eventId, contractId, contractUrl, vendorId) => {
			if (!auth.currentUser) {
				setError("User not authenticated");
				return;
			}

			const confirmDelete = window.confirm(
				"Are you sure you want to delete this contract? This action cannot be undone."
			);
			if (!confirmDelete) return;

			try {
				const token = await getAuthToken();
				const response = await fetch(
					`${API_BASE}/planner/contracts/${contractId}?eventId=${eventId}&vendorId=${vendorId}&contractUrl=${encodeURIComponent(contractUrl)}`,
					{
						method: 'DELETE',
						headers: { Authorization: `Bearer ${token}` },
					}
				);

				if (!response.ok) {
					throw new Error(`Failed to delete contract: ${response.status}`);
				}

				// Update local state
				setContracts((prev) => prev.filter((c) => c.id !== contractId));
				setSaveStatus("Contract deleted successfully!");
				setTimeout(() => setSaveStatus(""), 5000);
			} catch (error) {
				console.error("Error deleting contract:", error);
				setError(`Failed to delete contract: ${error.message}`);
				setSaveStatus(`Failed to delete contract: ${error.message}`);
				setTimeout(() => setSaveStatus(""), 5000);
			}
		},
		[]
	);

	// Load draft signatures when opening modal
	const loadDraftSignatures = useCallback((contract) => {
		if (contract.signatureFields) {
			const draftData = {};
			contract.signatureFields.forEach((field) => {
				if (field.draftSignature && !field.signed) {
					draftData[field.id] = field.draftSignature;
				}
			});
			setSignatureData(draftData);
		}
	}, []);

	// Group contracts by event
	const groupedContracts = useMemo(() => {
		const groups = {};
		contracts.forEach((contract) => {
			if (!groups[contract.eventId]) {
				groups[contract.eventId] = {
					eventName: contract.eventName,
					eventDate: contract.eventDate,
					contracts: []
				};
			}
			groups[contract.eventId].contracts.push(contract);
		});
		return groups;
	}, [contracts]);

	// Filter events by search term
	const filteredEventIds = useMemo(() => {
		return Object.keys(groupedContracts).filter((eventId) => {
			const event = groupedContracts[eventId];
			return event.eventName
				.toLowerCase()
				.includes(debouncedSearchTerm.toLowerCase());
		});
	}, [groupedContracts, debouncedSearchTerm]);

	const totalContracts = contracts.length;
	const pendingContracts = contracts.filter(
		(c) => c.signatureWorkflow?.workflowStatus === "sent"
	).length;
	const signedContracts = contracts.filter(
		(c) => c.signatureWorkflow?.workflowStatus === "completed"
	).length;

	const handleDownloadContract = (contractUrl, fileName) => {
		const link = document.createElement("a");
		link.href = contractUrl;
		link.download = fileName;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	const EventCard = React.memo(({ eventId, eventData }) => {
		return (
			<section className="event-card">
				<section className="event-info">
					<p>
						<FileText size={16} /> {eventData.eventName}
					</p>
					<p>
						<Calendar size={16} /> Date: {eventData.eventDate
							? formatDate(eventData.eventDate)
							: "No date"}
					</p>
				</section>
				<section className="contract-section">
					{eventData.contracts.length === 0 ? (
						<p>No contracts for this event.</p>
					) : (
						<section className="contracts-list">
							{eventData.contracts.map((contract) => (
								<section key={contract.id} className="contract-row">
									<section className="contract-info">
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
													? new Date(
															contract.lastedited.seconds * 1000
													  ).toLocaleDateString()
													: "Unknown date"}
												)
											</span>
										</p>
										<span className={`status-${contract.status}`}>
											{contract.status}
										</span>
										{contract.signatureWorkflow?.isElectronic && (
											<span
												className={`status-badge ${contract.signatureWorkflow.workflowStatus}`}
											>
												{contract.signatureWorkflow.workflowStatus.replace(
													"_",
													" "
												)}
											</span>
										)}
									</section>
									<section className="contract-actions">
										<button
											className="sign-btn"
											onClick={() => {
												setSelectedContract(contract);
												loadDraftSignatures(contract);
												setShowSignModal(true);
											}}
											title="Sign contract"
											disabled={
												contract.signatureWorkflow?.workflowStatus === "completed"
											}
										>
											<Edit3 size={12} />
											{contract.signatureWorkflow?.workflowStatus === "completed"
												? "Signed"
												: "Sign"}
										</button>
										<button
											className="download-btn small"
											onClick={() =>
												handleDownloadContract(
													contract.contractUrl,
													contract.fileName
												)
											}
											title="Download contract"
										>
											<Download size={12} />
											Download
										</button>
										<button
											className="delete-btn small"
											onClick={() =>
												deleteContract(
													contract.eventId,
													contract.id,
													contract.contractUrl,
													contract.vendorId
												)
											}
											title="Delete contract"
										>
											<Trash2 size={12} />
											Delete
										</button>
									</section>
								</section>
							))}
						</section>
					)}
				</section>
			</section>
		);
	});

	if (loading) {
		return (
			<section className="loading-screen">
				<section className="spinner"></section>
				<p>Loading your contracts...</p>
			</section>
		);
	}

	if (error) {
		return <p className="error">{error}</p>;
	}

	if (contracts.length === 0) {
		return (
			<section className="events-page">
				<header>
					<h1>Contract Management</h1>
					<p>Manage vendor contracts for your events.</p>
				</header>
				<p className="no-events">No contracts found.</p>
			</section>
		);
	}

	return (
		<section className="events-page">
			<header>
				<h1>Contract Management</h1>
				<p>Manage vendor contracts for your events.</p>
				<section className="stats-summary">
					<section className="stat-item">
						<FileText size={20} />
						<span>Total Contracts: {totalContracts}</span>
					</section>
					<section className="stat-item pending-stat">
						<span>Pending Contracts: {pendingContracts}</span>
					</section>
					<section className="stat-item signed-stat">
						<span>Signed Contracts: {signedContracts}</span>
					</section>
				</section>
				<section className="search-container">
					<Search size={20} />
					<input
						type="text"
						placeholder="Search by event name..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="search-input"
					/>
					{searchTerm && (
						<button
							onClick={() => setSearchTerm("")}
							className="clear-search"
						>
							<X size={16} />
						</button>
					)}
				</section>
			</header>
			<section className="events-section">
				<h2 className="section-title">
					<Calendar size={20} />
					Your Events ({filteredEventIds.length})
				</h2>
				<section className="events-list">
					{filteredEventIds.map((eventId) => (
						<EventCard
							key={eventId}
							eventId={eventId}
							eventData={groupedContracts[eventId]}
						/>
					))}
				</section>
			</section>
			{debouncedSearchTerm && filteredEventIds.length === 0 && (
				<section className="no-results">
					<p>No events found matching "{debouncedSearchTerm}"</p>
				</section>
			)}
			<Popup
				isOpen={showSignModal}
				onClose={() => {
					setShowSignModal(false);
					setSelectedContract(null);
					setSignatureData({});
					setSaveStatus("");
				}}
			>
				{selectedContract && (
					<section className="sign-modal">
						<section className="modal-header">
							<h3 id="modal-title">
								{selectedContract.signatureWorkflow?.workflowStatus === "completed"
									? "View Signed Contract: "
									: "Sign Contract: "}
								{selectedContract.fileName}
							</h3>
							<section className="document-version-info">
								<span className="original-doc-indicator">
									<FileText size={16} />
									Contract document
								</span>
							</section>
							<section className="modal-status">
								{saveStatus && (
									<span
										className={`save-status ${
											saveStatus.includes("Failed") ? "error" : "success"
										}`}
									>
										{saveStatus}
									</span>
								)}
								{isSaving && (
									<span className="processing-indicator">
										<RefreshCw size={16} className="spinning" />
										Processing...
									</span>
								)}
							</section>
						</section>
						<section className="contract-viewer">
							<iframe
								src={`${selectedContract.contractUrl}#toolbar=1&navpanes=0&scrollbar=1`}
								style={{
									width: "100%",
									height: "500px",
									border: "none",
								}}
								title="Contract Preview"
							/>
							{selectedContract.signatureFields
								.filter((field) => field.signerRole === "client")
								.map((field) => (
									<section
										key={field.id}
										className="signature-field-overlay"
										style={{
											position: "absolute",
											left: field.position.x,
											top: field.position.y,
											width: field.position.width,
											height: field.position.height,
											border: field.signed
												? "2px solid #10b981"
												: "2px dashed #2563eb",
											backgroundColor: field.signed
												? "rgba(16, 185, 129, 0.1)"
												: "rgba(37, 99, 235, 0.1)",
											zIndex: 10,
										}}
									>
										{field.signed ? (
											<section className="signed-indicator">
												<img
													src={field.signatureData}
													alt="Signed"
													style={{
														width: "100%",
														height: "100%",
														objectFit: "contain",
													}}
												/>
											</section>
										) : (
											<canvas
												ref={(el) => (canvasRefs.current[field.id] = el)}
												width={field.position.width}
												height={field.position.height}
												onMouseDown={(e) => startDrawing(field.id, e)}
												onMouseMove={(e) => handleSign(field.id, e)}
												onMouseUp={() => stopDrawing(field.id)}
												onMouseLeave={() => stopDrawing(field.id)}
												style={{
													border: "1px solid #ccc",
													borderRadius: "4px",
												}}
											/>
										)}
										<section
											className="signature-field-label"
											style={{
												position: "absolute",
												top: "-24px",
												color: field.signed ? "#10b981" : "#2563eb",
												fontWeight: field.signed ? "bold" : "normal",
											}}
										>
											{field.label} {field.required && "*"}{" "}
											{field.signed && "✓"}
										</section>
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
									</section>
								))}
						</section>
						<section className="signature-actions">
							{selectedContract.signatureWorkflow?.workflowStatus !== "completed" && (
								<>
									<button
										className="save-draft-btn"
										onClick={saveDraftSignature}
										disabled={isSaving || Object.keys(signatureData).length === 0}
									>
										{isSaving ? (
											<RefreshCw size={16} className="spinning" />
										) : (
											<Save size={16} />
										)}
										Save Draft
									</button>
									<button
										className="sign-btn"
										onClick={sendSignedContract}
										disabled={isSaving}
									>
										{isSaving ? (
											<RefreshCw size={16} className="spinning" />
										) : (
											<Send size={16} />
										)}
										Finalize & Submit
									</button>
								</>
							)}
							{selectedContract.signatureWorkflow?.workflowStatus === "completed" && (
								<section className="signed-contract-info">
									<span className="completion-status">
										<FileCheck size={16} />
										Contract completed and signed on{" "}
										{new Date(selectedContract.signedAt).toLocaleDateString()}
									</span>
									<button
										className="download-btn"
										onClick={() =>
											handleDownloadContract(
												selectedContract.contractUrl,
												selectedContract.fileName
											)
										}
									>
										<Download size={16} />
										Download Contract
									</button>
								</section>
							)}
							<button
								className="delete-btn"
								onClick={() => {
									deleteContract(
										selectedContract.eventId,
										selectedContract.id,
										selectedContract.contractUrl,
										selectedContract.vendorId
									);
									setShowSignModal(false);
									setSelectedContract(null);
									setSignatureData({});
									setSaveStatus("");
								}}
							>
								<Trash2 size={16} />
								Delete Contract
							</button>
						</section>
					</section>
				)}
			</Popup>
		</section>
	);
};

export default PlannerContract;