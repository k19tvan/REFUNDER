import React, { useState } from 'react';
import { ApiService } from '../services/api.js';

export default function RefundRequest() {
  const [form, setForm] = useState({
    employee_name: "Alex Johnson",
    employee_id: "EMP-1042",
    approver_id: "MGR-2005",
    category: "meal",
    amount: "45.00",
    description: "Standard business lunch with client partner",
    days_since_expense: 3
  });

  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Review resolution state
  const [reviewAnswer, setReviewAnswer] = useState("");
  const [resolvedStatus, setResolvedStatus] = useState(null);

  const presets = [
    {
      label: "Routine Lunch ($45)",
      data: {
        employee_name: "Alex Johnson",
        employee_id: "EMP-1042",
        approver_id: "MGR-2005",
        category: "meal",
        amount: "45.00",
        description: "Standard business lunch with client partner",
        days_since_expense: 3
      },
      hasReceipt: true
    },
    {
      label: "Prohibited Gift Card ($200) - REJECT",
      data: {
        employee_name: "Daniel White",
        employee_id: "EMP-1066",
        approver_id: "MGR-2001",
        category: "other",
        amount: "200.00",
        description: "Purchased supermarket shopping gift card voucher",
        days_since_expense: 2
      },
      hasReceipt: true
    },
    {
      label: "Blurry Receipt ($450)",
      data: {
        employee_name: "Sarah Miller",
        employee_id: "EMP-1099",
        approver_id: "MGR-2005",
        category: "meal",
        amount: "450.00",
        description: "Team dinner invoice with blurry total amount line",
        days_since_expense: 4
      },
      hasReceipt: false
    },
    {
      label: "High Value Hardware ($5,800)",
      data: {
        employee_name: "David Chen",
        employee_id: "EMP-1077",
        approver_id: "MGR-2001",
        category: "equipment",
        amount: "5800.00",
        description: "AI Workstation server hardware purchase",
        days_since_expense: 5
      },
      hasReceipt: true
    },
    {
      label: "Alcohol Expense ($250)",
      data: {
        employee_name: "Emma Watson",
        employee_id: "EMP-1088",
        approver_id: "MGR-2002",
        category: "meal",
        amount: "250.00",
        description: "Dinner expense including 2 bottles of vintage wine",
        days_since_expense: 6
      },
      hasReceipt: true
    },
    {
      label: "Overdue Claim (42 Days)",
      data: {
        employee_name: "Michael Chang",
        employee_id: "EMP-1033",
        approver_id: "MGR-2001",
        category: "ride",
        amount: "85.00",
        description: "Airport taxi transportation",
        days_since_expense: 42
      },
      hasReceipt: true
    },
    {
      label: "Self-Approval Conflict",
      data: {
        employee_name: "Robert Taylor",
        employee_id: "EMP-1055",
        approver_id: "EMP-1055",
        category: "coworking",
        amount: "150.00",
        description: "Remote coworking pass reimbursement",
        days_since_expense: 8
      },
      hasReceipt: true
    }
  ];

  const handleApplyPreset = (preset) => {
    setForm(preset.data);
    setResult(null);
    setResolvedStatus(null);
    setReviewAnswer("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setResolvedStatus(null);
    setReviewAnswer("");

    const evalRes = await ApiService.submitClaim(form, receiptFile);
    setResult(evalRes);
    setLoading(false);
  };

  const handleResolveEscalation = async (e) => {
    e.preventDefault();
    if (!reviewAnswer.trim()) return;
    setLoading(true);
    const claimId = result?.claim_id || "CLM-TEMP";
    const res = await ApiService.submitClaim({
      ...form,
      claim_id: claimId,
      answer: reviewAnswer,
      clarification: reviewAnswer
    });
    setResult(res);
    setResolvedStatus(`Answer submitted to Agent: "${reviewAnswer}". Decision updated to ${res.decision}!`);
    setLoading(false);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(340px, 0.95fr)', gap: '28px', alignItems: 'start' }}>
      {/* Left Form Card */}
      <div className="glass-shell" style={{ padding: '32px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', marginBottom: '20px', borderBottom: '1px solid var(--line)' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--inkHeading)' }}>Submit Refund Claim</div>
            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Enter claim attributes to trigger autonomous governance check</div>
          </div>
          <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent)', background: '#eff6ff', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--line)' }}>
            POST /api/refund
          </span>
        </div>

        {/* Quick fill presets */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '8px' }}>
            Quick-Load Scenarios:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {presets.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(p)}
                style={{
                  fontSize: '10px',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  background: '#ffffff',
                  border: '1px solid #18181b',
                  color: '#000000',
                  boxShadow: 'none'
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="field-group">
              <label className="field-label">Employee Name</label>
              <input
                type="text"
                className="field-input"
                placeholder="Alex Johnson"
                value={form.employee_name}
                onChange={(e) => setForm({ ...form, employee_name: e.target.value })}
                required
              />
            </div>
            <div className="field-group">
              <label className="field-label">Employee ID</label>
              <input
                type="text"
                className="field-input"
                placeholder="EMP-1001"
                value={form.employee_id}
                onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="field-group">
              <label className="field-label">Approver ID (Supervisor)</label>
              <input
                type="text"
                className="field-input"
                placeholder="MGR-2001"
                value={form.approver_id}
                onChange={(e) => setForm({ ...form, approver_id: e.target.value })}
              />
            </div>
            <div className="field-group">
              <label className="field-label">Days Since Incurred</label>
              <input
                type="number"
                className="field-input"
                placeholder="3"
                value={form.days_since_expense}
                onChange={(e) => setForm({ ...form, days_since_expense: parseInt(e.target.value, 10) || 0 })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="field-group">
              <label className="field-label">Expense Category</label>
              <select
                className="field-input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option value="meal">Meals & Entertainment</option>
                <option value="hotel">Hotel & Lodging</option>
                <option value="flight">Airfare & Travel</option>
                <option value="ride">Local Transportation / Taxi</option>
                <option value="equipment">Equipment & Hardware</option>
                <option value="coworking">Coworking Space</option>
                <option value="other">Other Supplies</option>
              </select>
            </div>
            <div className="field-group">
              <label className="field-label">Amount (USD)</label>
              <input
                type="number"
                step="any"
                className="field-input"
                style={{ fontWeight: 700 }}
                placeholder="120.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">Description / Business Purpose</label>
            <input
              type="text"
              className="field-input"
              placeholder="e.g. Lunch with client partner to review deliverables"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />
          </div>

          <div className="field-group" style={{ paddingTop: '4px' }}>
            <label className="field-label">Receipt Image Proof</label>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <label style={{ flex: 1, border: '1px dashed var(--line)', padding: '14px', borderRadius: '12px', background: '#f8fafc', cursor: 'pointer', textAlign: 'center' }}>
                <i className="fa-solid fa-cloud-arrow-up" style={{ color: 'var(--muted)', marginBottom: '4px', display: 'block' }}></i>
                <span style={{ fontSize: '11px', color: 'var(--ink)' }}>Upload receipt image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setReceiptFile(file);
                      const reader = new FileReader();
                      reader.onloadend = () => setReceiptPreview(reader.result);
                      reader.readAsDataURL(file);
                    }
                  }}
                  style={{ display: 'none' }}
                />
              </label>

              {receiptPreview && (
                <div style={{ position: 'relative', width: '64px', height: '64px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--line)' }}>
                  <img src={receiptPreview} alt="Receipt" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => { setReceiptFile(null); setReceiptPreview(null); }}
                    style={{ position: 'absolute', top: '2px', right: '2px', padding: '2px 5px', fontSize: '9px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none' }}
                  >✕</button>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="primary"
            style={{ justifyContent: 'center', padding: '14px', marginTop: '8px' }}
          >
            <i className={`fa-solid fa-paper-plane ${loading ? 'fa-spin' : ''}`}></i>
            <span>{loading ? 'Evaluating with Policy...' : 'Send Refund Request'}</span>
          </button>
        </form>
      </div>

      {/* Right Result Card */}
      <div className="glass-shell" style={{ padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '480px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', marginBottom: '20px', borderBottom: '1px solid var(--line)' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--inkHeading)' }}>Diagnostic Output</div>
            <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--muted)' }}>VERDICT</span>
          </div>

          {!result ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center', color: 'var(--muted)' }}>
              <i className="fa-solid fa-inbox" style={{ fontSize: '38px', opacity: 0.25, marginBottom: '16px' }}></i>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--inkHeading)', marginBottom: '6px' }}>Awaiting Request</div>
              <div style={{ fontSize: '12px', maxWidth: '280px', lineHeight: 1.5 }}>
                Fill the claim attributes or click a quick preset to trigger real-time AI arbitration.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Claim ID & Pipeline Badge */}
              {result.claim_id && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid var(--line)', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace' }}>
                  <span style={{ color: 'var(--muted)' }}>PIPELINE ID:</span>
                  <strong style={{ color: 'var(--accent)' }}>{result.claim_id}</strong>
                </div>
              )}

              {/* OCR Extract info if returned from backend */}
              {result.extracted_receipt && result.extracted_receipt.vendor_name && (
                <div style={{ padding: '8px 12px', borderRadius: '10px', background: '#eff6ff', border: '1px solid rgba(37,99,235,0.2)', fontSize: '11px', color: '#1e40af' }}>
                  <i className="fa-solid fa-file-invoice" style={{ marginRight: '6px' }}></i>
                  <strong>OCR Bóc Tách: </strong>{result.extracted_receipt.vendor_name} ({result.extracted_receipt.line_items?.length || 0} món)
                </div>
              )}

              {/* Decision pill */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '16px',
                  background:
                    result.decision === 'APPROVE'
                      ? 'var(--signalGreenBg)'
                      : result.decision === 'REJECT'
                      ? 'rgba(239, 68, 68, 0.08)'
                      : 'var(--signalAmberBg)',
                  border: `1px solid ${
                    result.decision === 'APPROVE'
                      ? 'var(--signalGreenBorder)'
                      : result.decision === 'REJECT'
                      ? 'rgba(239, 68, 68, 0.3)'
                      : 'var(--signalAmberBorder)'
                  }`
                }}
              >
                <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--muted)', fontFamily: 'monospace' }}>Decision</div>
                <div
                  style={{
                    fontSize: '20px',
                    fontWeight: 800,
                    marginTop: '4px',
                    color:
                      result.decision === 'APPROVE'
                        ? 'var(--signalGreen)'
                        : result.decision === 'REJECT'
                        ? '#dc2626'
                        : 'var(--signalAmber)'
                  }}
                >
                  {result.decision === 'APPROVE'
                    ? '✓ APPROVE (AUTOMATED)'
                    : result.decision === 'REJECT'
                    ? '✕ REJECT (POLICY VIOLATION)'
                    : '⚠ ESCALATE (HUMAN ARBITRATION)'}
                </div>
              </div>

              {/* Target Role */}
              <div style={{ padding: '14px 16px', borderRadius: '14px', background: '#f8fafc', border: '1px solid var(--line)' }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--muted)', fontFamily: 'monospace' }}>Assigned Target Role</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent)', marginTop: '4px' }}>
                  {result.target_role}
                </div>
              </div>

              {/* Escalation Question */}
              {result.escalation_question && (
                <div style={{ padding: '16px', borderRadius: '14px', background: '#fffbeb', border: '1px solid #fde68a' }}>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--signalAmber)', fontFamily: 'monospace', marginBottom: '6px', fontWeight: 700 }}>
                    Targeted Escalation Inquiry
                  </div>
                  <div style={{ fontSize: '12px', color: '#92400e', lineHeight: 1.5, fontWeight: 500 }}>
                    "{result.escalation_question}"
                  </div>
                </div>
              )}

              {/* Reason & Reference */}
              <div style={{ padding: '14px', borderRadius: '14px', background: '#f1f5f9', border: '1px solid var(--line)', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div>
                  <strong style={{ color: 'var(--inkHeading)' }}>Reason: </strong>
                  <span>{result.reason}</span>
                </div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'var(--muted)' }}>
                  <strong>Policy Ref: </strong>
                  <span>{result.policy_reference}</span>
                </div>
              </div>

              {/* Escalation Resolution Box (Simulate human answer) */}
              {result.decision === 'ESCALATE' && !resolvedStatus && (
                <div style={{ padding: '14px', borderRadius: '14px', background: '#ffffff', border: '1px solid #cbd5e1' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--inkHeading)', marginBottom: '6px' }}>
                    Human Decision-Maker Feedback ({result.target_role})
                  </div>
                  <form onSubmit={handleResolveEscalation} style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="field-input"
                      style={{ padding: '8px 12px', fontSize: '12px' }}
                      placeholder="e.g. Approved exception for quarterly executive dinner"
                      value={reviewAnswer}
                      onChange={(e) => setReviewAnswer(e.target.value)}
                      required
                    />
                    <button type="submit" className="primary" style={{ padding: '8px 14px', fontSize: '11px', whiteSpace: 'nowrap' }}>
                      Submit
                    </button>
                  </form>
                </div>
              )}

              {resolvedStatus && (
                <div style={{ padding: '12px', borderRadius: '12px', background: '#dcfce7', border: '1px solid rgba(74, 222, 128, 0.4)', fontSize: '11px', color: 'var(--signalGreen)' }}>
                  ✓ {resolvedStatus}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ paddingTop: '16px', marginTop: '20px', borderTop: '1px solid var(--line)', fontSize: '10px', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono, monospace' }}>
          <span>REFUNDER ARBITRATION</span>
          <span>Policy: FIN-EXP-001</span>
        </div>
      </div>
    </div>
  );
}

