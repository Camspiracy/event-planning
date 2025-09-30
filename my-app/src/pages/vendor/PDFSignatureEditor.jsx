import React, { useState, useRef, useEffect } from 'react';
import { Move, Type, Edit3, Calendar, CheckSquare, X, Save, Send } from 'lucide-react';

const PDFSignatureEditor = ({ contractUrl, onSave, onSend }) => {
  const [signatureFields, setSignatureFields] = useState([]);
  const [selectedTool, setSelectedTool] = useState('signature');
  const [isPlacing, setIsPlacing] = useState(false);
  const [draggedField, setDraggedField] = useState(null);
  const [pdfDimensions, setPdfDimensions] = useState({ width: 816, height: 1056 });
  const [estimatedPages, setEstimatedPages] = useState(1);
  const pdfViewerRef = useRef(null);
  const pdfContainerRef = useRef(null);

  const fieldTypes = [
    { type: 'signature', icon: Edit3, label: 'Signature', color: '#2563eb' },
    { type: 'initial', icon: Type, label: 'Initial', color: '#7c3aed' },
    { type: 'date', icon: Calendar, label: 'Date', color: '#059669' },
    { type: 'text', icon: Type, label: 'Text', color: '#d97706' },
    { type: 'checkbox', icon: CheckSquare, label: 'Checkbox', color: '#dc2626' }
  ];

  const signerRoles = ['vendor', 'client', 'witness'];

  useEffect(() => {
    if (contractUrl && pdfViewerRef.current) {
      loadPDF();
    }
    return () => {
      setSignatureFields([]);
      setPdfDimensions({ width: 816, height: 1056 });
      setEstimatedPages(1);
    };
  }, [contractUrl]);

  const loadPDF = async () => {
    let width = 816; // US Letter at 96 DPI
    let height = 1056;

    const tempObject = document.createElement('object');
    tempObject.data = contractUrl;
    tempObject.style.position = 'absolute';
    tempObject.style.visibility = 'hidden';
    document.body.appendChild(tempObject);

    tempObject.onload = () => {
      const observer = new ResizeObserver((entries) => {
        const contentHeight = entries[0].contentRect.height;
        // Estimate page height with more precision
        const possiblePageHeights = [1056, 1123, 792, 1224]; // US Letter, A4, US Letter landscape, A4 landscape at 96 DPI
        let estimatedPageHeight = 1056;
        let minDiff = Infinity;
        for (const ph of possiblePageHeights) {
          const pageCount = Math.round(contentHeight / ph);
          const diff = Math.abs(contentHeight / pageCount - ph);
          if (diff < minDiff && pageCount > 0) {
            minDiff = diff;
            estimatedPageHeight = ph;
          }
        }
        const estimatedPageCount = Math.max(1, Math.round(contentHeight / estimatedPageHeight));
        setPdfDimensions({ width, height: estimatedPageHeight });
        setEstimatedPages(estimatedPageCount);
        document.body.removeChild(tempObject);
        observer.disconnect();
      });
      observer.observe(tempObject);
    };

    tempObject.onerror = () => {
      console.error('Error loading PDF for dimension detection');
      setPdfDimensions({ width, height });
      setEstimatedPages(1);
      document.body.removeChild(tempObject);
    };
  };

  const getCurrentPage = () => {
    if (!pdfContainerRef.current) return 1;
    const scrollTop = pdfContainerRef.current.scrollTop;
    const pageHeight = pdfDimensions.height;
    return Math.max(1, Math.floor(scrollTop / pageHeight) + 1);
  };

  const handleContainerClick = (e) => {
    if (!isPlacing) return;

    const rect = pdfViewerRef.current.getBoundingClientRect();
    const scrollTop = pdfContainerRef.current.scrollTop;
    const currentPage = getCurrentPage();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top - (currentPage - 1) * pdfDimensions.height + scrollTop;

    if (e.target.closest('.signature-field-overlay')) {
      return;
    }

    const newField = {
      id: `field_${Date.now()}`,
      type: selectedTool,
      label: `${selectedTool.charAt(0).toUpperCase() + selectedTool.slice(1)} Field`,
      signerRole: 'client',
      signerEmail: '',
      required: true,
      position: {
        page: currentPage,
        x: Math.max(0, Math.round(x - getDefaultWidth(selectedTool) / 2)),
        y: Math.max(0, Math.round(y - getDefaultHeight(selectedTool) / 2)),
        width: getDefaultWidth(selectedTool),
        height: getDefaultHeight(selectedTool)
      },
      signed: false,
      signedAt: null,
      signatureData: null
    };

    setSignatureFields([...signatureFields, newField]);
    setIsPlacing(false);
  };

  const getDefaultWidth = (type) => {
    switch (type) {
      case 'signature': return 200;
      case 'initial': return 100;
      case 'date': return 120;
      case 'text': return 150;
      case 'checkbox': return 20;
      default: return 150;
    }
  };

  const getDefaultHeight = (type) => {
    switch (type) {
      case 'signature': return 60;
      case 'initial': return 40;
      case 'date': return 30;
      case 'text': return 30;
      case 'checkbox': return 20;
      default: return 40;
    }
  };

  const handleFieldDragStart = (e, fieldId) => {
    setDraggedField(fieldId);
    e.dataTransfer.effectAllowed = 'move';

    const dragImage = document.createElement('div');
    dragImage.style.cssText = `
      background: rgba(37, 99, 235, 0.2);
      border: 2px dashed #2563eb;
      border-radius: 4px;
      padding: 8px;
      position: absolute;
      top: -1000px;
      left: -1000px;
      pointer-events: none;
    `;
    dragImage.textContent = 'Moving field...';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 50, 20);

    setTimeout(() => document.body.removeChild(dragImage), 0);
  };

  const handleFieldDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleFieldDrop = (e) => {
    e.preventDefault();
    if (!draggedField) return;

    const rect = pdfViewerRef.current.getBoundingClientRect();
    const scrollTop = pdfContainerRef.current.scrollTop;
    const currentPage = getCurrentPage();
    const x = Math.max(0, e.clientX - rect.left);
    const y = Math.max(0, e.clientY - rect.top - (currentPage - 1) * pdfDimensions.height + scrollTop);

    setSignatureFields(fields =>
      fields.map(field =>
        field.id === draggedField
          ? {
              ...field,
              position: {
                ...field.position,
                page: currentPage,
                x: Math.round(x - field.position.width / 2),
                y: Math.round(y - field.position.height / 2)
              }
            }
          : field
      )
    );
    setDraggedField(null);
  };

  const updateFieldProperty = (fieldId, property, value) => {
    setSignatureFields(fields =>
      fields.map(field =>
        field.id === fieldId
          ? { ...field, [property]: value }
          : field
      )
    );
  };

  const deleteField = (fieldId) => {
    setSignatureFields(fields => fields.filter(field => field.id !== fieldId));
  };

  const handleSave = () => {
    if (signatureFields.length === 0) {
      alert('Please add at least one signature field before saving.');
      return;
    }

    const missingEmails = signatureFields.filter(field => !field.signerEmail);
    if (missingEmails.length > 0) {
      alert('Please specify signer emails for all fields.');
      return;
    }

    onSave(signatureFields);
  };

  const handleSendForSignature = () => {
    if (signatureFields.length === 0) {
      alert('Please add at least one signature field before sending.');
      return;
    }

    const missingEmails = signatureFields.filter(field => !field.signerEmail);
    if (missingEmails.length > 0) {
      alert('Please specify signer emails for all fields.');
      return;
    }

    onSend(signatureFields);
  };

  const handleToolSelect = (toolType) => {
    setSelectedTool(toolType);
    setIsPlacing(true);
  };

  return (
    <div className="signature-editor">
      <div className="editor-toolbar">
        <div className="tool-group">
          <h3>Add Fields</h3>
          {fieldTypes.map(({ type, icon: Icon, label, color }) => (
            <button
              key={type}
              className={`tool-btn ${selectedTool === type && isPlacing ? 'active' : ''}`}
              onClick={() => handleToolSelect(type)}
              style={{ borderColor: selectedTool === type && isPlacing ? color : '#d1d5db' }}
              aria-label={`Add ${label} field`}
            >
              <Icon size={16} style={{ color }} />
              {label}
            </button>
          ))}
        </div>

        <div className="action-group">
          <button onClick={handleSave} className="save-btn" aria-label="Save signature fields">
            <Save size={16} />
            Save Fields
          </button>
          <button onClick={handleSendForSignature} className="send-btn" aria-label="Send for signature">
            <Send size={16} />
            Send for Signature
          </button>
        </div>
      </div>

      <div className="editor-content">
        <div className="pdf-editor-container" ref={pdfContainerRef}>
          <div className="pdf-viewer" ref={pdfViewerRef}>
            <div
              className="pdf-viewer-container"
              style={{
                position: 'relative',
                width: pdfDimensions.width,
                minHeight: pdfDimensions.height * estimatedPages
              }}
            >
              {/* PDF Rendering with <object> */}
              <object
                data={contractUrl}
                type="application/pdf"
                width={pdfDimensions.width}
                height={pdfDimensions.height * estimatedPages}
                className="pdf-background"
                style={{
                  border: 'none',
                  borderRadius: '0.5rem',
                  position: 'absolute',
                  top: 0,
                  left: 0
                }}
                aria-label="Contract PDF"
              >
                <p>PDF cannot be displayed. Please download the contract to view.</p>
              </object>

              {/* Transparent overlay for field placement */}
              {isPlacing && (
                <div
                  className="pdf-interaction-overlay"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: pdfDimensions.width,
                    height: pdfDimensions.height * estimatedPages,
                    zIndex: 5,
                    pointerEvents: 'auto'
                  }}
                  onClick={handleContainerClick}
                  onDragOver={handleFieldDragOver}
                  onDrop={handleFieldDrop}
                />
              )}

              {/* Per-page field overlays */}
              {Array.from({ length: estimatedPages }, (_, i) => i + 1).map(page => (
                <div
                  key={`page-${page}`}
                  className="field-page-overlay"
                  style={{
                    position: 'absolute',
                    top: (page - 1) * pdfDimensions.height,
                    left: 0,
                    width: pdfDimensions.width,
                    height: pdfDimensions.height,
                    pointerEvents: 'none'
                  }}
                >
                  {signatureFields
                    .filter(field => field.position.page === page)
                    .map(field => {
                      const fieldType = fieldTypes.find(t => t.type === field.type);
                      const Icon = fieldType?.icon || Edit3;

                      return (
                        <div
                          key={field.id}
                          className="signature-field-overlay"
                          draggable
                          onDragStart={(e) => handleFieldDragStart(e, field.id)}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            position: 'absolute',
                            left: field.position.x,
                            top: field.position.y,
                            width: field.position.width,
                            height: field.position.height,
                            border: `3px dashed ${fieldType?.color || '#2563eb'}`,
                            backgroundColor: `${fieldType?.color || '#2563eb'}15`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'move',
                            fontSize: '11px',
                            fontWeight: '600',
                            borderRadius: '4px',
                            boxShadow: `0 2px 4px ${fieldType?.color || '#2563eb'}40`,
                            pointerEvents: 'auto',
                            zIndex: 10,
                            contain: 'strict',
                            willChange: 'transform'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = `${fieldType?.color || '#2563eb'}25`;
                            e.target.style.transform = 'scale(1.02)';
                            e.target.style.boxShadow = `0 4px 8px ${fieldType?.color || '#2563eb'}60`;
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = `${fieldType?.color || '#2563eb'}15`;
                            e.target.style.transform = 'scale(1)';
                            e.target.style.boxShadow = `0 2px 4px ${fieldType?.color || '#2563eb'}40`;
                          }}
                          aria-label={`${field.type} field for ${field.signerRole} on page ${field.position.page}`}
                        >
                          <div className="field-indicator" style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: fieldType?.color || '#2563eb'
                          }}>
                            <Icon size={12} />
                            <span>{field.type.toUpperCase()}</span>
                          </div>

                          <div className="field-label-overlay" style={{
                            position: 'absolute',
                            top: '-24px',
                            left: '0',
                            background: fieldType?.color || '#2563eb',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '3px',
                            fontSize: '10px',
                            fontWeight: '500',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                          }}>
                            {field.label} {field.required && '*'}
                          </div>

                          <div className="signer-role-indicator" style={{
                            position: 'absolute',
                            bottom: '-20px',
                            left: '0',
                            background: 'rgba(0,0,0,0.8)',
                            color: 'white',
                            padding: '1px 4px',
                            borderRadius: '2px',
                            fontSize: '9px',
                            textTransform: 'capitalize'
                          }}>
                            {field.signerRole}
                          </div>

                          <button
                            className="delete-field-btn-overlay"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteField(field.id);
                            }}
                            style={{
                              position: 'absolute',
                              top: '-10px',
                              right: '-10px',
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              background: '#dc2626',
                              color: 'white',
                              border: '2px solid white',
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                              transition: 'all 0.2s ease',
                              zIndex: 20
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = '#b91c1c';
                              e.target.style.transform = 'scale(1.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = '#dc2626';
                              e.target.style.transform = 'scale(1)';
                            }}
                            aria-label={`Delete ${field.type} field`}
                          >
                            <X size={10} />
                          </button>
                        </div>
                      );
                    })}
                </div>
              ))}
              {isPlacing && (
                <div className="placement-guide" style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  background: 'rgba(0,0,0,0.8)',
                  color: 'white',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '500',
                  zIndex: 100,
                  pointerEvents: 'none'
                }}>
                  Click on the document to place a {selectedTool} field
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="field-properties-panel">
          <h3>Field Properties</h3>
          {signatureFields.length === 0 ? (
            <p>No fields added yet. Click on a field type and then click on the document to place it.</p>
          ) : (
            <div className="fields-list">
              {signatureFields.map((field, index) => (
                <div key={field.id} className="field-config">
                  <div className="field-header">
                    <strong>Field {index + 1}: {field.type} (Page {field.position.page})</strong>
                    <button
                      onClick={() => deleteField(field.id)}
                      className="delete-btn-small"
                      aria-label={`Delete field ${index + 1}`}
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="config-row">
                    <label>Label:</label>
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => updateFieldProperty(field.id, 'label', e.target.value)}
                      aria-label={`Label for field ${field.type}`}
                    />
                  </div>

                  <div className="config-row">
                    <label>Signer Role:</label>
                    <select
                      value={field.signerRole}
                      onChange={(e) => updateFieldProperty(field.id, 'signerRole', e.target.value)}
                      aria-label={`Signer role for field ${field.type}`}
                    >
                      {signerRoles.map(role => (
                        <option key={role} value={role}>
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="config-row">
                    <label>Signer Email:</label>
                    <input
                      type="email"
                      value={field.signerEmail}
                      onChange={(e) => updateFieldProperty(field.id, 'signerEmail', e.target.value)}
                      placeholder="Enter signer's email"
                      aria-label={`Signer email for field ${field.type}`}
                    />
                  </div>

                  <div className="config-row">
                    <label>
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => updateFieldProperty(field.id, 'required', e.target.checked)}
                        aria-label={`Required field ${field.type}`}
                      />
                      Required field
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PDFSignatureEditor;