import React, { useState } from 'react';

/**
 * In-chat Human-in-the-Loop Escalation Card
 * Allows the user or manager to resolve ambiguities/exceptions directly within the conversation thread.
 */
export default function EscalationCard({ decision, claimId, onResolve, loading }) {
  const [replyText, setReplyText] = useState("");

  const suggestedOptions = decision.escalation_category === "THIEU_THONG_TIN"
    ? [
        "Confirm actual total paid is $450.00 (from card statement)",
        "Confirm actual total paid is $480.00",
        "Re-upload higher resolution receipt"
      ]
    : decision.escalation_category === "NGOAI_QUY_DINH"
    ? [
        "Direct Manager approves exception for client entertainment",
        "Agree to deduct $25.00 alcohol expense from claim",
        "Provide business executive rationale"
      ]
    : [
        "Procurement approved under Framework Agreement PO-8891",
        "Split purchase into authorized departmental batches"
      ];

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!replyText.trim()) return;
    onResolve(replyText.trim(), claimId);
  };

  const handleSelectQuickReply = (opt) => {
    setReplyText(opt);
    onResolve(opt, claimId);
  };

  return (
    <div
      style={{
        margin: '12px 0',
        padding: '16px 20px',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.6) 0%, rgba(254, 215, 170, 0.4) 100%)',
        border: '1px solid rgba(245, 158, 11, 0.4)',
        boxShadow: '0 8px 24px -6px rgba(245, 158, 11, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            background: 'var(--signalAmber)',
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: 800,
            padding: '2px 8px',
            borderRadius: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em'
          }}>
            Human-in-the-Loop
          </span>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#92400e' }}>
            Escalation Target: <strong>{decision.escalation_target || "Requester"}</strong>
          </span>
        </div>
        <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: '#b45309' }}>
          {decision.escalation_category}
        </span>
      </div>

      <div style={{
        fontSize: '13px',
        fontWeight: 600,
        color: '#78350f',
        lineHeight: 1.5,
        padding: '10px 14px',
        background: 'rgba(255, 255, 255, 0.8)',
        borderRadius: '10px',
        border: '1px solid rgba(245, 158, 11, 0.25)'
      }}>
        <i className="fa-solid fa-circle-question" style={{ marginRight: '8px', color: 'var(--signalAmber)' }}></i>
        {decision.escalation_question}
      </div>

      {/* Quick response buttons */}
      <div>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
          Recommended Fast Resolutions:
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {suggestedOptions.map((opt, i) => (
            <button
              key={i}
              type="button"
              disabled={loading}
              onClick={() => handleSelectQuickReply(opt)}
              style={{
                fontSize: '11.5px',
                fontWeight: 600,
                padding: '7px 14px',
                borderRadius: '10px',
                background: '#ffffff',
                border: '1px solid rgba(217, 119, 6, 0.35)',
                color: '#92400e',
                cursor: 'pointer',
                textAlign: 'left',
                boxShadow: '0 2px 6px rgba(245, 158, 11, 0.08)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#fef3c7';
                e.currentTarget.style.borderColor = '#b45309';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.borderColor = 'rgba(217, 119, 6, 0.35)';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <i className="fa-solid fa-reply" style={{ marginRight: '6px', opacity: 0.8 }}></i>
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Custom input form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
        <input
          type="text"
          className="field-input"
          placeholder="Or provide direct manager clarification or approval note..."
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          disabled={loading}
          style={{
            flex: 1,
            padding: '10px 14px',
            fontSize: '12.5px',
            borderRadius: '12px',
            background: '#ffffff',
            border: '1.5px solid rgba(245, 158, 11, 0.4)'
          }}
        />
        <button
          type="submit"
          disabled={loading || !replyText.trim()}
          style={{
            padding: '10px 18px',
            fontSize: '12px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
            color: '#ffffff',
            border: 'none',
            boxShadow: '0 4px 12px rgba(217, 119, 6, 0.25)',
            cursor: 'pointer'
          }}
        >
          {loading ? (
            <i className="fa-solid fa-spinner fa-spin"></i>
          ) : (
            <>
              <i className="fa-solid fa-paper-plane" style={{ marginRight: '6px' }}></i>
              Submit Clarification
            </>
          )}
        </button>
      </form>
    </div>
  );
}
