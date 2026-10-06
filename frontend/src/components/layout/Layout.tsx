import React from 'react';

interface LayoutProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ activeTab, setActiveTab, children }) => {
  const navItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'anomalies', label: 'Anomaly Queue' },
    { id: 'students', label: 'Student Context' },
    { id: 'compliance', label: 'Compliance Preview' },
    { id: 'audit', label: 'Audit Log' },
    { id: 'system', label: 'System Provenance' }
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF' }}>
      {/* Top Banner / Navigation Bar */}
      <header
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid var(--border-color, #E5E7EB)',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}
      >
        <div
          style={{
            maxWidth: '1400px',
            margin: '0 auto',
            padding: '0 1.5rem',
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          {/* Brand & Subtitle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'var(--primary-color, #2563EB)',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '1.1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              AI
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#1E293B', lineHeight: 1.2 }}>
                Attendance Integrity System
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 500 }}>
                Administrator Decision-Support Dashboard
              </div>
            </div>
          </div>

          {/* Nav Links */}
          <nav style={{ display: 'flex', gap: '0.5rem' }}>
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  style={{
                    padding: '0.5rem 0.85rem',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#2563EB' : '#475569',
                    backgroundColor: isActive ? '#EFF6FF' : 'transparent',
                    border: isActive ? '1px solid #BFDBFE' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* System Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#10B981'
              }}
            />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#047857' }}>
              Phase 4 Frozen (v1.0.0)
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main
        style={{
          flex: 1,
          maxWidth: '1400px',
          width: '100%',
          margin: '0 auto',
          padding: '2rem 1.5rem',
          boxSizing: 'border-box'
        }}
      >
        {children}
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid #E5E7EB',
          padding: '1.25rem 1.5rem',
          backgroundColor: '#FAFAFA',
          textAlign: 'center',
          fontSize: '0.8rem',
          color: '#64748B'
        }}
      >
        Attendance Integrity System • Phase 5 Decision Support Workflow • All Phase 4 rules and model weights are strictly frozen.
      </footer>
    </div>
  );
};
