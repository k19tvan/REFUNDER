import React, { useState, useRef } from 'react';

export default function ChatComposer({ onSendMessage, loading, onNavigateToPolicy }) {
  const [text, setText] = useState("");
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setReceiptPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveFile = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if ((!text.trim() && !receiptFile) || loading) return;
    onSendMessage({
      message: text.trim(),
      receiptFile
    });
    setText("");
    handleRemoveFile();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="chat-composer-wrapper" style={{ padding: '14px 28px 16px 28px' }}>
      {/* Attachment Preview Card */}
      {receiptPreview && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
          padding: '8px 14px',
          borderRadius: '12px',
          border: '1px solid #bfdbfe',
          marginBottom: '4px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img
              src={receiptPreview}
              alt="Receipt Preview"
              style={{ width: '38px', height: '38px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #93c5fd' }}
            />
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--inkHeading)' }}>
                {receiptFile?.name || "receipt.jpg"}
              </div>
              <div style={{ fontSize: '10px', color: '#2563eb', fontWeight: 600 }}>
                {((receiptFile?.size || 0) / 1024).toFixed(1)} KB • Attached for Multimodal Verification
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemoveFile}
            style={{
              border: 'none',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#dc2626',
              cursor: 'pointer',
              fontSize: '11px',
              padding: '4px 10px',
              borderRadius: '6px',
              fontWeight: 600
            }}
          >
            <i className="fa-solid fa-xmark" style={{ marginRight: '4px' }}></i>
            Remove
          </button>
        </div>
      )}

      {/* Main Input Bar */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*,.pdf"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        <div className="chat-input-pill" style={{ flex: 1, padding: '6px 8px 6px 14px' }}>
          {/* File attach button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach receipt image or PDF"
            style={{
              border: 'none',
              background: receiptFile ? '#eff6ff' : 'transparent',
              color: receiptFile ? '#2563eb' : '#64748b',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
          >
            <i className="fa-solid fa-paperclip" style={{ fontSize: '16px' }}></i>
          </button>

          {/* Text input */}
          <textarea
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your refund request (e.g. 'Business lunch with Acme partner, $45.00') or attach receipt..."
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              fontSize: '13px',
              color: 'var(--ink)',
              resize: 'none',
              outline: 'none',
              padding: '6px 0',
              fontFamily: 'inherit',
              lineHeight: 1.4
            }}
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={loading || (!text.trim() && !receiptFile)}
            className="chat-send-btn"
            title="Send claim to referee"
          >
            {loading ? (
              <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '14px' }}></i>
            ) : (
              <i className="fa-solid fa-arrow-up" style={{ fontSize: '14px' }}></i>
            )}
          </button>
        </div>
      </form>

      {/* Direct Policy Link Below Input */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '6px',
        fontSize: '11.5px',
        color: 'var(--muted)',
        paddingTop: '6px'
      }}>
        <span>Company Policy:</span>
        <button
          type="button"
          onClick={onNavigateToPolicy}
          style={{
            border: 'none',
            background: 'transparent',
            color: '#2563eb',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '2px 4px',
            textDecoration: 'underline',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11.5px',
            boxShadow: 'none'
          }}
        >
          <i className="fa-solid fa-file-shield" style={{ fontSize: '12px' }}></i>
          <span>Global Travel & Expense Policy (FIN-EXP-001)</span>
          <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '9px', opacity: 0.8 }}></i>
        </button>
      </div>
    </div>
  );
}
