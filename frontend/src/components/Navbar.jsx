import React from 'react';

export default function Navbar({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'introduction', label: 'Introduction', icon: 'fa-compass' },
    { id: 'policy', label: 'Company Policy', icon: 'fa-book-bookmark' },
    { id: 'refund_request', label: 'Refund Chatbot', icon: 'fa-comments-dollar' },
  ];

  return (
    <header className="topbar">
      <div className="brand">
        <div
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '9px',
            background: '#eff6ff',
            border: '1px solid rgba(37, 99, 235, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 12px rgba(37, 99, 235, 0.15)',
            color: 'var(--accent)'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '0.04em', color: 'var(--inkHeading)' }}>
              Refunder
            </span>
            <span
              style={{
                fontSize: '9px',
                fontWeight: 700,
                background: 'rgba(37, 99, 235, 0.08)',
                color: 'var(--accent)',
                padding: '2px 6px',
                borderRadius: '6px',
                border: '1px solid rgba(37, 99, 235, 0.2)'
              }}
            >
              ESCALATION REFEREE
            </span>
          </div>
          <span style={{ fontSize: '9px', letterSpacing: '0.12em', color: 'var(--muted)', fontFamily: 'monospace' }}>
            AUTONOMOUS GOVERNANCE & ARBITRATION
          </span>
        </div>
      </div>

      <nav className="nav-tabs" aria-label="System Navigation">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={activeTab === tab.id ? 'active' : ''}
          >
            <i className={`fa-solid ${tab.icon}`} style={{ marginRight: '6px' }}></i>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </header>
  );
}

