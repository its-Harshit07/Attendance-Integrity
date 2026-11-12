import React, { useEffect, useState } from 'react';
import { fetchHealth } from '../../api/client';

export type NavTab = 'overview' | 'anomalies' | 'audit';

interface LayoutProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onBrandClick?: () => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  activeTab,
  setActiveTab,
  onBrandClick,
  children
}) => {
  const [healthState, setHealthState] = useState<'checking' | 'operational' | 'degraded'>('checking');

  useEffect(() => {
    let active = true;
    fetchHealth()
      .then((res) => {
        if (!active) return;
        const ok = res.status === 'ok' && res.database === 'connected';
        setHealthState(ok ? 'operational' : 'degraded');
      })
      .catch(() => {
        if (active) setHealthState('degraded');
      });
    return () => {
      active = false;
    };
  }, []);

  const navItems: { id: NavTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'anomalies', label: 'Anomalies' },
    { id: 'audit', label: 'Audit Log' }
  ];

  const statusLabel =
    healthState === 'operational'
      ? 'System Operational'
      : healthState === 'checking'
      ? 'Checking Status'
      : 'Service Degraded';

  return (
    <div id="dashboard-workspace" className="dashboard-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <button
            type="button"
            className="brand-wordmark"
            onClick={onBrandClick}
            aria-label="Attendance Integrity"
          >
            <span className="brand-mark" />
            <span>Attendance Integrity</span>
          </button>

          <nav className="nav-links" aria-label="Primary navigation">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`nav-tab ${isActive ? 'active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="status-pill" aria-live="polite">
            <span
              className={`status-dot ${
                healthState === 'degraded'
                  ? 'degraded'
                  : healthState === 'checking'
                  ? 'checking'
                  : ''
              }`}
            />
            <span>{statusLabel}</span>
          </div>
        </div>
      </header>

      <main className="app-main">{children}</main>

      <footer className="app-footer">
        <span>Attendance Integrity</span>
        <span>AI-Assisted Attendance Monitoring</span>
      </footer>
    </div>
  );
};
