import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { fetchHealth } from '../../api/client';

export type NavTab = 'overview' | 'anomalies' | 'audit';

interface LayoutProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ activeTab, setActiveTab, children }) => {
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
    { id: 'anomalies', label: 'Anomaly Queue' },
    { id: 'audit', label: 'Audit Log' }
  ];

  const statusLabel =
    healthState === 'operational'
      ? 'System Operational'
      : healthState === 'checking'
      ? 'Checking'
      : 'Degraded';

  return (
    <motion.div
      className="aurora-right"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="dash-header">
        <div className="dash-header-top">
          <div className="dash-brand-label">
            <span className="aurora-brand-dot" />
            <span>ATTENDANCE INTEGRITY</span>
          </div>

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

        <div className="dash-nav-row">
          <nav className="nav-tabs" aria-label="Dashboard navigation">
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
        </div>
      </header>

      <main className="dash-main">{children}</main>
    </motion.div>
  );
};
