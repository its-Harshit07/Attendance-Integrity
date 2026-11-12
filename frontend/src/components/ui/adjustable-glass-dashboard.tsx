import React, { type CSSProperties } from 'react';
import {
  AlertTriangle,
  BarChart3,
  History,
  Home,
  Layers
} from 'lucide-react';

export type GlassNavId = 'overview' | 'anomalies' | 'audit' | 'reports';

export interface GlassSettings {
  useHostTheme: boolean;
  blur: number;
  opacity: number;
  saturation: number;
  edge: number;
  tint: string;
}

export const DEFAULT_GLASS_SETTINGS: GlassSettings = {
  useHostTheme: false,
  blur: 22,
  opacity: 0.3,
  saturation: 1.2,
  edge: 0.6,
  tint: '#eadbc7'
};

export const warmPalette: CSSProperties = {
  '--gw-ink': '#f4f4ed',
  '--gw-muted': '#d0c9bf',
  '--gw-accent': '#91d5b0',
  '--gw-line': 'rgba(255, 255, 255, 0.14)',
  '--gw-background': '#282a25',
  '--gw-shade': 'rgba(18, 16, 14, 0.38)',
  '--gw-surface': 'rgba(38, 35, 34, 0.56)',
  '--gw-panel': 'rgba(43, 40, 37, 0.48)',
  '--gw-brand': '#e2eee0',
  '--gw-brand-ink': '#183725',
  '--gw-avatar': '#616e58',
  '--gw-rail-active': 'rgba(255, 255, 255, 0.18)',
  '--gw-positive-surface': 'rgba(145, 213, 176, 0.16)',
  '--gw-account-surface': 'rgba(255, 255, 255, 0.08)',
  '--gw-account-action': 'rgba(255, 255, 255, 0.12)',
  '--gw-segment': 'rgba(255, 255, 255, 0.08)',
  '--gw-segment-active': 'rgba(255, 255, 255, 0.22)',
  '--gw-transaction-surface': 'rgba(255, 255, 255, 0.06)',
  '--gw-dock': 'rgba(28, 26, 24, 0.64)',
  '--gw-dock-active': 'rgba(255, 255, 255, 0.9)',
  '--gw-dock-ink': '#1f2421',
  '--gw-button': '#e8ede6',
  '--gw-button-ink': '#19241d',
  '--gw-search': 'rgba(20, 20, 18, 0.45)',
  '--gw-popover': 'rgba(32, 30, 28, 0.92)',
  '--gw-shadow': 'rgba(12, 14, 12, 0.42)',
  '--gw-panel-shadow': 'rgba(12, 14, 12, 0.28)',
  '--gw-hover': 'rgba(255, 255, 255, 0.08)'
} as CSSProperties;

export interface GlassWorkspaceProps {
  brand: string;
  workspaceLabel?: string;
  backgroundImage: string;
  activeNav: GlassNavId;
  onSelectNav: (nav: GlassNavId) => void;
  healthState?: 'checking' | 'operational' | 'degraded';
  glass?: Partial<GlassSettings>;
  style?: CSSProperties;
  footerNote?: string;
  children: React.ReactNode;
}

const NAV_ITEMS: { id: GlassNavId; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'anomalies', label: 'Anomalies', icon: AlertTriangle },
  { id: 'audit', label: 'Audit Log', icon: History },
  { id: 'reports', label: 'Reports', icon: BarChart3 }
];

export const GlassWorkspace: React.FC<GlassWorkspaceProps> = ({
  brand,
  workspaceLabel = 'Administrator Workspace',
  backgroundImage,
  activeNav,
  onSelectNav,
  healthState = 'checking',
  glass,
  style,
  footerNote,
  children
}) => {
  const resolvedGlass: GlassSettings = {
    ...DEFAULT_GLASS_SETTINGS,
    ...glass
  };

  const rootStyle: CSSProperties = {
    ...warmPalette,
    ...style,
    '--gw-blur': `${resolvedGlass.blur}px`,
    '--gw-opacity': String(resolvedGlass.opacity),
    '--gw-saturation': String(resolvedGlass.saturation),
    '--gw-edge': String(resolvedGlass.edge),
    '--gw-tint': resolvedGlass.tint
  } as CSSProperties;

  const statusText =
    healthState === 'operational'
      ? 'System Operational'
      : healthState === 'checking'
      ? 'Checking'
      : 'Service Degraded';

  return (
    <div className="gw-root" style={rootStyle}>
      <div
        className="gw-room"
        aria-hidden="true"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />
      <div className="gw-room-shade" aria-hidden="true" />

      <div className="gw-workspace">
        {/* Top Floating Navigation Bar */}
        <header className="gw-topbar gw-glass">
          <div className="gw-topbar-left">
            <div className="gw-logo-badge" aria-hidden="true">
              <Layers size={15} />
            </div>
            <span className="gw-brand-name">{brand}</span>
            <span className="gw-brand-sep" aria-hidden="true">
              |
            </span>
            <span className="gw-workspace-label">{workspaceLabel}</span>
          </div>

          <div className="gw-topbar-right">
            <div className="gw-status-pill" aria-live="polite">
              <span
                className={`gw-status-dot ${
                  healthState === 'degraded'
                    ? 'degraded'
                    : healthState === 'checking'
                    ? 'checking'
                    : ''
                }`}
              />
              <span>{statusText}</span>
            </div>
          </div>
        </header>

        {/* Stage: Floating Left Rail + Main Translucent Workspace */}
        <div className="gw-stage">
          <nav className="gw-rail gw-glass" aria-label="Workspace navigation rail">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`gw-rail-btn ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectNav(item.id)}
                  title={item.label}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon size={17} />
                </button>
              );
            })}
          </nav>

          <main className="gw-main gw-glass">
            <div className="gw-view">{children}</div>

            {footerNote && (
              <div className="gw-footer-row">
                <span>• {footerNote}</span>
              </div>
            )}

            {/* Bottom Floating Navigation Dock */}
            <div className="gw-dock-wrap">
              <nav className="gw-dock" aria-label="Workspace navigation dock">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeNav === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`gw-dock-btn ${isActive ? 'active' : ''}`}
                      onClick={() => onSelectNav(item.id)}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon size={14} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default GlassWorkspace;

