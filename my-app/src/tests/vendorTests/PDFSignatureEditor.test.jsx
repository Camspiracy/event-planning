// PDFSignatureEditor.working-tests.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import PDFSignatureEditor from '../../pages/vendor/PDFSignatureEditor';

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Move: () => <span>MoveIcon</span>,
  Type: () => <span>TypeIcon</span>,
  Edit3: () => <span>Edit3Icon</span>,
  Calendar: () => <span>CalendarIcon</span>,
  CheckSquare: () => <span>CheckSquareIcon</span>,
  X: () => <span>XIcon</span>,
  Save: () => <span>SaveIcon</span>,
  Send: () => <span>SendIcon</span>,
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock alert
global.alert = vi.fn();

describe('PDFSignatureEditor - Working Tests', () => {
  const mockOnSave = vi.fn();
  const mockOnSend = vi.fn();
  const mockContractUrl = 'https://example.com/contract.pdf';

  const defaultProps = {
    contractUrl: mockContractUrl,
    onSave: mockOnSave,
    onSend: mockOnSend,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: Basic component rendering
  test('renders PDFSignatureEditor with all main sections', () => {
    render(<PDFSignatureEditor {...defaultProps} />);
    
    // Toolbar section
    expect(screen.getByText('Add Fields')).toBeInTheDocument();
    expect(screen.getByText('Save Fields')).toBeInTheDocument();
    expect(screen.getByText('Send for Signature')).toBeInTheDocument();
    
    // Field types
    expect(screen.getByText('Signature')).toBeInTheDocument();
    expect(screen.getByText('Initial')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Text')).toBeInTheDocument();
    expect(screen.getByText('Checkbox')).toBeInTheDocument();
    
    // Properties panel
    expect(screen.getByText('Field Properties')).toBeInTheDocument();
    expect(screen.getByText(/No fields added yet/)).toBeInTheDocument();
  });

 
  // Test 3: Tool switching
  test('switches between different tools correctly', () => {
    render(<PDFSignatureEditor {...defaultProps} />);
    
    const signatureButton = screen.getByLabelText('Add Signature field');
    const initialButton = screen.getByLabelText('Add Initial field');
    const dateButton = screen.getByLabelText('Add Date field');
    
    // Select signature tool
    fireEvent.click(signatureButton);
    expect(signatureButton).toHaveClass('active');
    expect(initialButton).not.toHaveClass('active');
    expect(dateButton).not.toHaveClass('active');
    
    // Switch to initial tool
    fireEvent.click(initialButton);
    expect(initialButton).toHaveClass('active');
    expect(signatureButton).not.toHaveClass('active');
    expect(dateButton).not.toHaveClass('active');
    
    // Switch to date tool
    fireEvent.click(dateButton);
    expect(dateButton).toHaveClass('active');
    expect(signatureButton).not.toHaveClass('active');
    expect(initialButton).not.toHaveClass('active');
  });

  // Test 4: Save validation - no fields
  test('validates save operation when no fields exist', () => {
    render(<PDFSignatureEditor {...defaultProps} />);
    
    const saveButton = screen.getByLabelText('Save signature fields');
    fireEvent.click(saveButton);
    
    expect(global.alert).toHaveBeenCalledWith('Please add at least one signature field before saving.');
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  // Test 5: Send validation - no fields
  test('validates send operation when no fields exist', () => {
    render(<PDFSignatureEditor {...defaultProps} />);
    
    const sendButton = screen.getByLabelText('Send for signature');
    fireEvent.click(sendButton);
    
    expect(global.alert).toHaveBeenCalledWith('Please add at least one signature field before sending.');
    expect(mockOnSend).not.toHaveBeenCalled();
  });

  // Test 6: PDF viewer rendering
  test('renders PDF viewer with correct properties', () => {
    render(<PDFSignatureEditor {...defaultProps} />);
    
    const pdfObject = screen.getByLabelText('Contract PDF');
    expect(pdfObject).toBeInTheDocument();
    expect(pdfObject).toHaveAttribute('data', mockContractUrl);
    expect(pdfObject).toHaveAttribute('type', 'application/pdf');
  });

  // Test 7: All field tool buttons are accessible
  test('all field tool buttons are present and accessible', () => {
    render(<PDFSignatureEditor {...defaultProps} />);
    
    const toolButtons = [
      'Add Signature field',
      'Add Initial field',
      'Add Date field',
      'Add Text field',
      'Add Checkbox field'
    ];
    
    toolButtons.forEach(label => {
      const button = screen.getByLabelText(label);
      expect(button).toBeInTheDocument();
      expect(button).toBeEnabled();
    });
  });

  // Test 8: Action buttons are properly configured
  test('action buttons have correct labels and are enabled', () => {
    render(<PDFSignatureEditor {...defaultProps} />);
    
    const saveButton = screen.getByLabelText('Save signature fields');
    const sendButton = screen.getByLabelText('Send for signature');
    
    expect(saveButton).toBeInTheDocument();
    expect(sendButton).toBeInTheDocument();
    expect(saveButton).toBeEnabled();
    expect(sendButton).toBeEnabled();
    expect(saveButton).toHaveTextContent('Save Fields');
    expect(sendButton).toHaveTextContent('Send for Signature');
  });

  // Test 9: Properties panel shows correct empty state
  test('properties panel shows appropriate empty state message', () => {
    render(<PDFSignatureEditor {...defaultProps} />);
    
    const emptyState = screen.getByText(/No fields added yet/);
    const instructions = screen.getByText(/Click on a field type and then click on the document to place it/);
    
    expect(emptyState).toBeInTheDocument();
    expect(instructions).toBeInTheDocument();
  });

  // Test 10: Component works without contract URL
  test('renders correctly without contract URL', () => {
    render(<PDFSignatureEditor onSave={mockOnSave} onSend={mockOnSend} />);
    
    // Should still render all interface elements
    expect(screen.getByText('Add Fields')).toBeInTheDocument();
    expect(screen.getByText('Field Properties')).toBeInTheDocument();
    expect(screen.getByText('Save Fields')).toBeInTheDocument();
    expect(screen.getByText('Send for Signature')).toBeInTheDocument();
  });

  // Test 11: Tool button styling reflects active state
  test('tool buttons show active state with correct styling', () => {
    render(<PDFSignatureEditor {...defaultProps} />);
    
    const signatureButton = screen.getByLabelText('Add Signature field');
    const initialButton = screen.getByLabelText('Add Initial field');
    
    // Initially no tool should be active
    expect(signatureButton).not.toHaveClass('active');
    expect(initialButton).not.toHaveClass('active');
    
    // Activate signature tool
    fireEvent.click(signatureButton);
    expect(signatureButton).toHaveClass('active');
    expect(initialButton).not.toHaveClass('active');
    
    // Switch to initial tool
    fireEvent.click(initialButton);
    expect(initialButton).toHaveClass('active');
    expect(signatureButton).not.toHaveClass('active');
  });

  // Test 12: Placement guide shows correct field type
  test('placement guide displays correct field type message', () => {
    render(<PDFSignatureEditor {...defaultProps} />);
    
    const fieldTypes = [
      { tool: 'Add Signature field', type: 'signature' },
      { tool: 'Add Initial field', type: 'initial' },
      { tool: 'Add Date field', type: 'date' },
      { tool: 'Add Text field', type: 'text' },
      { tool: 'Add Checkbox field', type: 'checkbox' }
    ];
    
    fieldTypes.forEach(({ tool, type }) => {
      const button = screen.getByLabelText(tool);
      fireEvent.click(button);
      
      expect(screen.getByText(new RegExp(`Click on the document to place a ${type} field`))).toBeInTheDocument();
      
      // Clean up for next iteration
      fireEvent.click(button);
    });
  });

  
  // Test 14: Component structure verification
  test('has correct CSS classes for main sections', () => {
    const { container } = render(<PDFSignatureEditor {...defaultProps} />);
    
    expect(container.querySelector('.signature-editor')).toBeInTheDocument();
    expect(container.querySelector('.editor-toolbar')).toBeInTheDocument();
    expect(container.querySelector('.editor-content')).toBeInTheDocument();
    expect(container.querySelector('.pdf-editor-container')).toBeInTheDocument();
    expect(container.querySelector('.field-properties-panel')).toBeInTheDocument();
  });

  // Test 15: All field types have correct labels and icons
  test('all field types have appropriate labels and are accessible', () => {
    render(<PDFSignatureEditor {...defaultProps} />);
    
    const fieldTypes = [
      { label: 'Signature', ariaLabel: 'Add Signature field' },
      { label: 'Initial', ariaLabel: 'Add Initial field' },
      { label: 'Date', ariaLabel: 'Add Date field' },
      { label: 'Text', ariaLabel: 'Add Text field' },
      { label: 'Checkbox', ariaLabel: 'Add Checkbox field' }
    ];
    
    fieldTypes.forEach(({ label, ariaLabel }) => {
      const button = screen.getByLabelText(ariaLabel);
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent(label);
    });
  });

  // Test 16: Tool group organization
  test('tool group is properly organized with heading', () => {
    render(<PDFSignatureEditor {...defaultProps} />);
    
    const toolGroup = screen.getByText('Add Fields').closest('.tool-group');
    expect(toolGroup).toBeInTheDocument();
    
    // Should contain all tool buttons
    const buttons = toolGroup?.querySelectorAll('button');
    expect(buttons).toHaveLength(5); // 5 field types
  });

  // Test 17: Action group organization
  test('action group contains save and send buttons', () => {
    render(<PDFSignatureEditor {...defaultProps} />);
    
    const actionGroup = screen.getByText('Save Fields').closest('.action-group');
    expect(actionGroup).toBeInTheDocument();
    
    // Should contain both action buttons
    const saveButton = screen.getByLabelText('Save signature fields');
    const sendButton = screen.getByLabelText('Send for signature');
    
    expect(actionGroup).toContainElement(saveButton);
    expect(actionGroup).toContainElement(sendButton);
  });

  // Test 18: Handles PDF loading issues gracefully
  test('handles PDF loading failure gracefully', () => {
    render(<PDFSignatureEditor contractUrl="invalid-url.pdf" onSave={vi.fn()} onSend={vi.fn()} />);
    
    // Should still render the interface
    expect(screen.getByText('Add Fields')).toBeInTheDocument();
    expect(screen.getByText('Field Properties')).toBeInTheDocument();
    
    // PDF fallback message should be present
    expect(screen.getByText(/PDF cannot be displayed/)).toBeInTheDocument();
  });

  // Test 19: No console errors during rendering
  test('renders without throwing console errors', () => {
    const consoleSpy = vi.spyOn(console, 'error');
    
    render(<PDFSignatureEditor {...defaultProps} />);
    
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  // Test 20: Component is accessible with proper ARIA labels
  test('has proper accessibility attributes', () => {
    render(<PDFSignatureEditor {...defaultProps} />);
    
    // PDF viewer should have proper ARIA label
    const pdfViewer = screen.getByLabelText('Contract PDF');
    expect(pdfViewer).toBeInTheDocument();
    
    // All interactive elements should be accessible
    expect(screen.getByLabelText('Save signature fields')).toBeInTheDocument();
    expect(screen.getByLabelText('Send for signature')).toBeInTheDocument();
    expect(screen.getByLabelText('Add Signature field')).toBeInTheDocument();
  });
});

// Test field interactions that don't require actual field creation
describe('PDFSignatureEditor - Interaction Tests', () => {
  const mockOnSave = vi.fn();
  const mockOnSend = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  
  // Test 22: Placement guide updates for each field type
  test('placement guide updates dynamically for each field type', () => {
    render(<PDFSignatureEditor contractUrl="test.pdf" onSave={mockOnSave} onSend={mockOnSend} />);
    
    const fieldTypes = [
      { tool: 'Add Signature field', type: 'signature' },
      { tool: 'Add Initial field', type: 'initial' },
      { tool: 'Add Date field', type: 'date' }
    ];
    
    fieldTypes.forEach(({ tool, type }) => {
      const button = screen.getByLabelText(tool);
      
      // Activate tool and verify placement guide
      fireEvent.click(button);
      const placementText = screen.getByText(new RegExp(`place a ${type} field`));
      expect(placementText).toBeInTheDocument();
      
      // Deactivate tool
      fireEvent.click(button);
    });
  });

  // Test 23: Save and send buttons remain accessible
  test('save and send buttons remain enabled throughout interactions', () => {
    render(<PDFSignatureEditor contractUrl="test.pdf" onSave={mockOnSave} onSend={mockOnSend} />);
    
    const saveButton = screen.getByLabelText('Save signature fields');
    const sendButton = screen.getByLabelText('Send for signature');
    
    // Interact with various tools
    const tools = [
      'Add Signature field',
      'Add Initial field',
      'Add Date field'
    ];
    
    tools.forEach(tool => {
      const button = screen.getByLabelText(tool);
      fireEvent.click(button);
      fireEvent.click(button); // Toggle off
      
      // Buttons should remain enabled
      expect(saveButton).toBeEnabled();
      expect(sendButton).toBeEnabled();
    });
  });

  // Test 24: Component maintains state during tool interactions
  test('maintains consistent UI state during tool interactions', () => {
    const { container } = render(<PDFSignatureEditor contractUrl="test.pdf" onSave={mockOnSave} onSend={mockOnSend} />);
    
    // Store initial state
    const initialPdfContainer = container.querySelector('.pdf-editor-container');
    const initialPropertiesPanel = screen.getByText('Field Properties');
    
    // Perform various interactions
    const signatureButton = screen.getByLabelText('Add Signature field');
    fireEvent.click(signatureButton);
    fireEvent.click(signatureButton);
    
    const initialButton = screen.getByLabelText('Add Initial field');
    fireEvent.click(initialButton);
    fireEvent.click(initialButton);
    
    // UI should remain consistent
    expect(container.querySelector('.pdf-editor-container')).toBe(initialPdfContainer);
    expect(screen.getByText('Field Properties')).toBe(initialPropertiesPanel);
    expect(screen.getByText('Add Fields')).toBeInTheDocument();
  });

  // Test 25: Error boundaries work correctly
  test('handles invalid props without crashing', () => {
    // Test with various invalid prop combinations
    expect(() => {
      render(<PDFSignatureEditor contractUrl={null} onSave={undefined} onSend={undefined} />);
    }).not.toThrow();
    
    expect(() => {
      render(<PDFSignatureEditor contractUrl={123} onSave={mockOnSave} onSend={mockOnSend} />);
    }).not.toThrow();
  });
});