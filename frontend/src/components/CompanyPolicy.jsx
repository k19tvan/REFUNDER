import React, { useState, useRef } from 'react';
import { marked } from 'marked';

export default function CompanyPolicy({
  policyText,
  setPolicyText,
  policyMeta,
  setPolicyMeta,
  onSavePolicy,
  onResetPolicy
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLoading(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
        const content = event.target.result;
        setPolicyText(content);
        const meta = {
          filename: file.name,
          size: `${(file.size / 1024).toFixed(1)} KB`,
          imported_at: new Date().toLocaleTimeString()
        };
        setPolicyMeta(meta);
        await onSavePolicy(file.name, content);
        setSuccessMsg(`Imported "${file.name}" successfully!`);
        setLoading(false);
        setTimeout(() => setSuccessMsg(""), 3000);
      };
      reader.readAsText(file);
    }
  };

  const handleSave = async () => {
    if (!policyText.trim()) return;
    setLoading(true);
    const meta = {
      filename: policyMeta?.filename || "custom_policy.md",
      size: `${(policyText.length / 1024).toFixed(1)} KB`,
      imported_at: new Date().toLocaleTimeString()
    };
    setPolicyMeta(meta);
    await onSavePolicy(meta.filename, policyText);
    setIsEditing(false);
    setSuccessMsg("Policy updated successfully!");
    setLoading(false);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleDownload = () => {
    const blob = new Blob([policyText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = policyMeta?.filename || "policy.md";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Controls Header */}
      <div className="glass-shell" style={{ padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--inkHeading)', marginBottom: '4px' }}>
            Active Corporate Regulations
          </div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'monospace' }}>
            {policyMeta ? `${policyMeta.filename} · ${policyMeta.size}` : "FIN-EXP-001.md · 16.8 KB"}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="file"
            ref={fileInputRef}
            accept=".md,.txt,.json,.markdown"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            className="primary"
            disabled={loading}
          >
            <i className="fa-solid fa-cloud-arrow-up"></i>
            <span>Import Policy (.md)</span>
          </button>

          {policyText && (
            <>
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                disabled={loading}
              >
                <i className={`fa-solid ${isEditing ? 'fa-eye' : 'fa-pen-to-square'}`}></i>
                <span>{isEditing ? 'View Rendered' : 'Edit Source'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownload}
                title="Download policy markdown"
              >
                <i className="fa-solid fa-download"></i>
                <span>Download</span>
              </button>

              <button
                type="button"
                onClick={onResetPolicy}
                title="Reset to default company policy"
              >
                <i className="fa-solid fa-rotate-left"></i>
                <span>Reset Default</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Success alert message */}
      {successMsg && (
        <div style={{ padding: '12px 18px', background: '#dcfce7', border: '1px solid rgba(74, 222, 128, 0.4)', borderRadius: '12px', fontSize: '12px', color: 'var(--signalGreen)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fa-solid fa-circle-check"></i>
          <span>{successMsg}</span>
        </div>
      )}

      {/* Content Body */}
      <div className="glass-shell" style={{ padding: '28px' }}>
        {!policyText ? (
          <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--muted)' }}>
            <i className="fa-solid fa-book-open" style={{ fontSize: '36px', marginBottom: '16px', opacity: 0.4 }}></i>
            <div style={{ fontWeight: 600, color: 'var(--inkHeading)', marginBottom: '6px' }}>No Policy Loaded</div>
            <div style={{ fontSize: '12px' }}>Click "Import Policy (.md)" above to load your regulation file.</div>
          </div>
        ) : isEditing ? (
          <div>
            <textarea
              rows={22}
              className="field-input custom-scrollbar"
              style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', lineHeight: 1.6, resize: 'vertical' }}
              value={policyText}
              onChange={(e) => setPolicyText(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button type="button" onClick={() => setIsEditing(false)}>Cancel</button>
              <button type="button" onClick={handleSave} className="primary">Save Changes</button>
            </div>
          </div>
        ) : (
          <div
            className="markdown-body custom-scrollbar"
            style={{ maxHeight: '680px', overflowY: 'auto', paddingRight: '12px' }}
            dangerouslySetInnerHTML={{ __html: marked.parse(policyText) }}
          />
        )}
      </div>
    </div>
  );
}

