import React, { useState } from 'react';

/**
 * Pipeline Inspector
 * Live telemetry panel rendering the 4 pipeline nodes according to pipeline.png:
 * 🔴 Form Data Payload (Red Circle)
 * 🟡 Extracted Receipt Payload (Yellow Circle)
 * 🟢 Master Context Payload (Green Circle)
 * 🔵 Tools Call Trace (Blue Circle)
 * 🟣 Decision Payload (Purple Circle)
 */
export default function PipelineInspector({ telemetry, activeClaimId }) {
  const [activeTab, setActiveTab] = useState('summary');
  const [expandedNode, setExpandedNode] = useState('decision');

  const nodes = telemetry?.pipeline_nodes || {};
  const decision = nodes.decision || {};
  const ocr = nodes.extracted_receipt || {};
  const form = nodes.form_data || {};
  const master = nodes.master_context || {};
  const tools = nodes.tool_calls || [];

  const getStatusColor = (status) => {
    if (!status) return 'var(--muted)';
    const s = status.toUpperCase();
    if (s.includes('APPROVE')) return 'var(--signalGreen)';
    if (s.includes('REJECT')) return '#ef4444';
    if (s.includes('ESCALAT')) return 'var(--signalAmber)';
    return 'var(--accent)';
  };

  return (
    <div
      className="glass-shell"
      style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '620px',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '14px', marginBottom: '16px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fa-solid fa-microchip" style={{ color: 'var(--accent)', fontSize: '14px' }}></i>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--inkHeading)' }}>Pipeline Telemetry</div>
            <div style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'JetBrains Mono, monospace' }}>
              REFUNDER ARBITRATION MONITOR
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            style={{
              border: 'none',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '10px',
              fontWeight: 600,
              cursor: 'pointer',
              background: activeTab === 'summary' ? '#ffffff' : 'transparent',
              color: activeTab === 'summary' ? 'var(--inkHeading)' : 'var(--muted)',
              boxShadow: activeTab === 'summary' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            Visual Nodes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('raw')}
            style={{
              border: 'none',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '10px',
              fontWeight: 600,
              cursor: 'pointer',
              background: activeTab === 'raw' ? '#ffffff' : 'transparent',
              color: activeTab === 'raw' ? 'var(--inkHeading)' : 'var(--muted)',
              boxShadow: activeTab === 'raw' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            Raw JSON
          </button>
        </div>
      </div>

      {!telemetry ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', padding: '40px 20px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'rgba(59, 130, 246, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px'
          }}>
            <i className="fa-solid fa-radar" style={{ fontSize: '24px', color: 'var(--accent)', opacity: 0.6 }}></i>
          </div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--inkHeading)', marginBottom: '6px' }}>
            Awaiting Pipeline Invocation
          </div>
          <div style={{ fontSize: '11px', maxWidth: '260px', lineHeight: 1.5 }}>
            Send a claim message or choose a scenario preset in the chat to watch the 4 pipeline nodes execute in real time.
          </div>
        </div>
      ) : activeTab === 'raw' ? (
        <div style={{ flex: 1, overflowY: 'auto', background: '#0f172a', borderRadius: '12px', padding: '14px', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#e2e8f0', lineHeight: 1.5 }}>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {JSON.stringify(telemetry, null, 2)}
          </pre>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
          {/* Claim Metadata Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid var(--line)', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace' }}>
            <span style={{ color: 'var(--muted)' }}>CLAIM ID:</span>
            <strong style={{ color: 'var(--accent)' }}>{activeClaimId || telemetry.claim_id || "CLM-ACTIVE"}</strong>
          </div>

          {/* Node 1: Purple Circle - Decision Verdict */}
          <div
            style={{
              borderRadius: '12px',
              border: '1px solid #c084fc',
              background: 'linear-gradient(180deg, #faf5ff 0%, #ffffff 100%)',
              padding: '12px 14px',
              cursor: 'pointer'
            }}
            onClick={() => setExpandedNode(expandedNode === 'decision' ? '' : 'decision')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#a855f7', display: 'inline-block' }}></span>
                <strong style={{ fontSize: '12px', color: '#6b21a8' }}>🟣 Decision Payload</strong>
              </div>
              <span style={{
                fontSize: '11px',
                fontWeight: 800,
                color: getStatusColor(decision.decision_status),
                fontFamily: 'JetBrains Mono, monospace'
              }}>
                {decision.decision_status || "PENDING"}
              </span>
            </div>

            {expandedNode === 'decision' && (
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #e9d5ff', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div>
                  <span style={{ color: 'var(--muted)', fontWeight: 600 }}>Reasoning: </span>
                  <span style={{ color: 'var(--ink)' }}>{decision.reasoning_log}</span>
                </div>
                {decision.policy_reference && (
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#7e22ce' }}>
                    <strong>Policy Ref: </strong>{decision.policy_reference}
                  </div>
                )}
                {decision.confidence_score && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--muted)' }}>
                    <span>Confidence Score:</span>
                    <strong>{(decision.confidence_score * 100).toFixed(0)}%</strong>
                  </div>
                )}
                {decision.escalation_question && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '8px 10px', borderRadius: '8px', color: '#92400e', marginTop: '4px' }}>
                    <div style={{ fontWeight: 700, fontSize: '10px', textTransform: 'uppercase' }}>Escalation Target: {decision.escalation_target}</div>
                    <div>"{decision.escalation_question}"</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Node 2: Blue Circle - Tools Call / MCP */}
          <div
            style={{
              borderRadius: '12px',
              border: '1px solid #93c5fd',
              background: 'linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)',
              padding: '12px 14px',
              cursor: 'pointer'
            }}
            onClick={() => setExpandedNode(expandedNode === 'tools' ? '' : 'tools')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }}></span>
                <strong style={{ fontSize: '12px', color: '#1e40af' }}>🔵 MCP Tools Call ({tools.length})</strong>
              </div>
              <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent)' }}>
                POST /mcp/...
              </span>
            </div>

            {expandedNode === 'tools' && (
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #bfdbfe', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {tools.length === 0 ? (
                  <span style={{ color: 'var(--muted)' }}>No external tools invoked for this turn.</span>
                ) : (
                  tools.map((t, idx) => (
                    <div key={idx} style={{ background: '#ffffff', border: '1px solid #dbeafe', borderRadius: '8px', padding: '8px 10px', fontSize: '10px' }}>
                      <div style={{ fontWeight: 700, color: '#1d4ed8', fontFamily: 'JetBrains Mono, monospace' }}>
                        ⚡ {t.tool_name}
                      </div>
                      <div style={{ color: 'var(--muted)', marginTop: '2px' }}>
                        Arg: {JSON.stringify(t.arguments)}
                      </div>
                      <div style={{ color: '#047857', marginTop: '2px', fontWeight: 600 }}>
                        ➔ {t.result}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Node 3: Green Circle - Master Context Payload */}
          <div
            style={{
              borderRadius: '12px',
              border: '1px solid #86efac',
              background: 'linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%)',
              padding: '12px 14px',
              cursor: 'pointer'
            }}
            onClick={() => setExpandedNode(expandedNode === 'master' ? '' : 'master')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
                <strong style={{ fontSize: '12px', color: '#15803d' }}>🟢 Master Context Payload</strong>
              </div>
              <span style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'monospace' }}>
                Merged
              </span>
            </div>

            {expandedNode === 'master' && (
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #bbf7d0', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ink)' }}>
                  <span>Policy Version:</span>
                  <strong>{master.system_context?.policy_version || "FIN-EXP-001"}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ink)' }}>
                  <span>Employee Location:</span>
                  <strong>{master.system_context?.employee_location || "US"}</strong>
                </div>
                {master.user_answer && (
                  <div style={{ background: '#ecfdf5', padding: '6px 8px', borderRadius: '6px', color: '#065f46', fontSize: '10px' }}>
                    <strong>User Clarification: </strong>"{master.user_answer}"
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Node 4: Yellow Circle - Extracted Receipt Payload */}
          <div
            style={{
              borderRadius: '12px',
              border: '1px solid #fde047',
              background: 'linear-gradient(180deg, #fefce8 0%, #ffffff 100%)',
              padding: '12px 14px',
              cursor: 'pointer'
            }}
            onClick={() => setExpandedNode(expandedNode === 'ocr' ? '' : 'ocr')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#eab308', display: 'inline-block' }}></span>
                <strong style={{ fontSize: '12px', color: '#a16207' }}>🟡 Extracted Receipt Payload</strong>
              </div>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                color: ocr.is_readable ? '#15803d' : '#b91c1c',
                fontFamily: 'monospace'
              }}>
                {ocr.is_readable ? "READABLE" : "UNREADABLE"}
              </span>
            </div>

            {expandedNode === 'ocr' && (
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #fef08a', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--muted)' }}>Merchant:</span>
                  <strong>{ocr.vendor_name || "N/A"}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--muted)' }}>Total Amount:</span>
                  <strong>{ocr.total_amount != null ? `$${ocr.total_amount.toFixed(2)}` : "Illegible / Null"}</strong>
                </div>
                {ocr.line_items && ocr.line_items.length > 0 && (
                  <div style={{ marginTop: '4px' }}>
                    <span style={{ color: 'var(--muted)', fontSize: '10px', fontWeight: 600 }}>Line Items:</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '4px' }}>
                      {ocr.line_items.map((it, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', background: '#ffffff', padding: '3px 6px', borderRadius: '4px', border: '1px solid #fef08a' }}>
                          <span>{it.item}</span>
                          <strong>{it.price != null ? `$${it.price.toFixed(2)}` : "?"}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Node 5: Red Circle - Form Data Payload */}
          <div
            style={{
              borderRadius: '12px',
              border: '1px solid #fca5a5',
              background: 'linear-gradient(180deg, #fef2f2 0%, #ffffff 100%)',
              padding: '12px 14px',
              cursor: 'pointer'
            }}
            onClick={() => setExpandedNode(expandedNode === 'form' ? '' : 'form')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }}></span>
                <strong style={{ fontSize: '12px', color: '#b91c1c' }}>🔴 Form Data Payload</strong>
              </div>
              <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--muted)' }}>
                {form.employee_id || "EMP-1042"}
              </span>
            </div>

            {expandedNode === 'form' && (
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #fecaca', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--muted)' }}>Category:</span>
                  <strong>{form.expense_category || "meal"}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--muted)' }}>Claimed Amount:</span>
                  <strong>${Number(form.claimed_amount || 0).toFixed(2)}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--muted)' }}>Description: </span>
                  <span>{form.description || "N/A"}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ paddingTop: '14px', marginTop: '14px', borderTop: '1px solid var(--line)', fontSize: '10px', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono, monospace' }}>
        <span>AUTONOMOUS GOVERNANCE</span>
        <span>Policy: FIN-EXP-001</span>
      </div>
    </div>
  );
}
