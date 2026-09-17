import React, { useState, useEffect, useRef } from 'react';
import EscalationCard from './EscalationCard.jsx';

export default function ChatMessageList({ messages, loading, onResolveEscalation }) {
  const [expandedSteps, setExpandedSteps] = useState({});
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const toggleStep = (msgId) => {
    setExpandedSteps(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}
      className="custom-scrollbar"
    >
      {messages.map((msg) => {
        const isBot = msg.sender === 'bot';
        const nodes = msg.pipeline_nodes || {};
        const decision = nodes.decision;
        const ocr = nodes.extracted_receipt;
        const tools = nodes.tool_calls || [];
        const isEscalation = decision?.decision_status === 'ESCALATE' && !msg.escalationResolved;

        return (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: isBot ? 'flex-start' : 'flex-end',
              width: '100%'
            }}
          >
            {/* Header info */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '11px',
              color: 'var(--muted)',
              marginBottom: '6px',
              padding: '0 4px'
            }}>
              {isBot ? (
                <>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '6px',
                    background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontSize: '10px'
                  }}>
                    <i className="fa-solid fa-robot"></i>
                  </div>
                  <strong style={{ color: 'var(--inkHeading)' }}>Refunder Referee</strong>
                  <span>•</span>
                  <span>{msg.timestamp || "Just now"}</span>
                </>
              ) : (
                <>
                  <span>{msg.timestamp || "Just now"}</span>
                  <span>•</span>
                  <strong style={{ color: 'var(--inkHeading)' }}>{msg.senderName || "Alex Johnson"}</strong>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '6px',
                    background: '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#475569',
                    fontSize: '10px'
                  }}>
                    <i className="fa-solid fa-user"></i>
                  </div>
                </>
              )}
            </div>

            {/* Bubble */}
            <div
              style={{
                maxWidth: isBot ? '90%' : '75%',
                padding: isBot ? '18px 22px' : '14px 18px',
                borderRadius: isBot ? '6px 20px 20px 20px' : '20px 6px 20px 20px',
                background: isBot ? '#ffffff' : 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                color: isBot ? 'var(--ink)' : '#ffffff',
                boxShadow: isBot
                  ? '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(226, 232, 240, 0.8)'
                  : '0 8px 24px -4px rgba(15, 23, 42, 0.25)',
                lineHeight: 1.55,
                fontSize: '13.5px'
              }}
            >
              {/* If user attached receipt */}
              {msg.receiptPreview && (
                <div style={{
                  marginBottom: '10px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  padding: '8px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.15)'
                }}>
                  <img
                    src={msg.receiptPreview}
                    alt="Attached Receipt"
                    style={{
                      width: '54px',
                      height: '54px',
                      borderRadius: '8px',
                      objectFit: 'cover'
                    }}
                  />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff' }}>
                      {msg.receiptName || "receipt.jpg"}
                    </div>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                      Attached proof document
                    </div>
                  </div>
                </div>
              )}

              {/* Text content */}
              <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>

              {/* Bot Decision Card */}
              {isBot && decision && (
                <div style={{ marginTop: '16px' }}>
                  <div
                    style={{
                      padding: '14px 18px',
                      borderRadius: '14px',
                      background:
                        decision.decision_status === 'APPROVE'
                          ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
                          : decision.decision_status === 'REJECT'
                          ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'
                          : 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                      border: `1.5px solid ${
                        decision.decision_status === 'APPROVE'
                          ? '#86efac'
                          : decision.decision_status === 'REJECT'
                          ? '#fca5a5'
                          : '#fcd34d'
                      }`,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background:
                            decision.decision_status === 'APPROVE' ? '#15803d' : decision.decision_status === 'REJECT' ? '#dc2626' : '#d97706',
                          color: '#ffffff',
                          fontSize: '12px'
                        }}>
                          {decision.decision_status === 'APPROVE' ? '✓' : decision.decision_status === 'REJECT' ? '✕' : '!'}
                        </span>
                        <div>
                          <div style={{
                            fontSize: '13px',
                            fontWeight: 800,
                            letterSpacing: '0.02em',
                            color:
                              decision.decision_status === 'APPROVE' ? '#14532d' : decision.decision_status === 'REJECT' ? '#7f1d1d' : '#78350f'
                          }}>
                            {decision.decision_status === 'APPROVE'
                              ? 'VERDICT: APPROVED FOR SETTLEMENT'
                              : decision.decision_status === 'REJECT'
                              ? 'VERDICT: STRICT POLICY REJECTION'
                              : 'VERDICT: HUMAN ARBITRATION REQUIRED'}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                            {decision.reasoning_log}
                          </div>
                        </div>
                      </div>

                      {decision.confidence_score && (
                        <div style={{
                          fontSize: '10px',
                          fontFamily: 'JetBrains Mono, monospace',
                          fontWeight: 700,
                          background: '#ffffff',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: '1px solid rgba(0,0,0,0.08)'
                        }}>
                          Confidence: {(decision.confidence_score * 100).toFixed(0)}%
                        </div>
                      )}
                    </div>

                    {decision.policy_reference && (
                      <div style={{
                        marginTop: '10px',
                        paddingTop: '8px',
                        borderTop: '1px dashed rgba(0,0,0,0.1)',
                        fontSize: '11px',
                        fontFamily: 'JetBrains Mono, monospace',
                        color: decision.decision_status === 'APPROVE' ? '#15803d' : decision.decision_status === 'REJECT' ? '#b91c1c' : '#b45309'
                      }}>
                        <strong>Policy Clause: </strong>{decision.policy_reference}
                      </div>
                    )}
                  </div>

                  {/* Expandable Pipeline Execution Trace */}
                  <div style={{ marginTop: '10px' }}>
                    <button
                      type="button"
                      onClick={() => toggleStep(msg.id)}
                      style={{
                        border: '1px solid #e2e8f0',
                        background: '#f8fafc',
                        color: 'var(--accent)',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <i className={`fa-solid fa-chevron-${expandedSteps[msg.id] ? 'down' : 'right'}`} style={{ fontSize: '10px' }}></i>
                      <span>Inspect 4-Node Pipeline Chaining Trace</span>
                    </button>

                    {expandedSteps[msg.id] && (
                      <div style={{
                        marginTop: '8px',
                        padding: '14px 16px',
                        borderRadius: '12px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        fontSize: '11px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        {/* 1. Yellow OCR */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <span style={{ color: '#ca8a04', fontWeight: 800 }}>🟡 1. OCR Extraction:</span>
                          <span style={{ color: 'var(--ink)' }}>
                            {ocr?.vendor_name ? `${ocr.vendor_name} ($${ocr.total_amount != null ? ocr.total_amount : 'Smudged'})` : "Synthetic receipt validation applied"}
                          </span>
                        </div>

                        {/* 2. Green Master Context */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <span style={{ color: '#16a34a', fontWeight: 800 }}>🟢 2. Master Context:</span>
                          <span style={{ color: 'var(--ink)' }}>
                            Consolidated User Claim + Extracted Receipt + System Context (Policy: FIN-EXP-001)
                          </span>
                        </div>

                        {/* 3. Blue Tools */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <span style={{ color: '#2563eb', fontWeight: 800 }}>🔵 3. MCP Tools:</span>
                          <span style={{ color: 'var(--ink)' }}>
                            {tools.length > 0 ? tools.map(t => `${t.tool_name} (status: OK)`).join(' • ') : "Internal rule evaluator"}
                          </span>
                        </div>

                        {/* 4. Purple Decision */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <span style={{ color: '#9333ea', fontWeight: 800 }}>🟣 4. Arbitration Decision:</span>
                          <span style={{ color: 'var(--ink)' }}>
                            {decision.decision_status} (Target: {decision.escalation_target || 'ERP Accounting'})
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* In-chat Human-in-the-loop Escalation Component */}
            {isBot && isEscalation && (
              <div style={{ width: '90%', marginTop: '6px' }}>
                <EscalationCard
                  decision={decision}
                  claimId={msg.claim_id}
                  loading={loading}
                  onResolve={(resolutionText, cid) => onResolveEscalation(resolutionText, cid, msg.id)}
                />
              </div>
            )}

            {/* Resolved note */}
            {isBot && msg.escalationResolved && (
              <div style={{
                marginTop: '6px',
                padding: '8px 14px',
                borderRadius: '10px',
                background: '#dcfce7',
                border: '1px solid #86efac',
                fontSize: '11px',
                color: '#15803d',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <i className="fa-solid fa-circle-check"></i>
                <span>Escalation resolved: "{msg.escalationResolutionNote}"</span>
              </div>
            )}
          </div>
        );
      })}

      {/* Typing animation */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 4px', color: 'var(--muted)', fontSize: '12px' }}>
          <div style={{
            width: '30px',
            height: '30px',
            borderRadius: '8px',
            background: '#eff6ff',
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <i className="fa-solid fa-robot fa-bounce"></i>
          </div>
          <span>Refunder Agent is running OCR Extraction & Policy Arbitration...</span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
