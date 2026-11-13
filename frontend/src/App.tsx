import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MotionConfig } from 'motion/react';
import { AttendanceIntegrityWorkspace } from './components/dashboard/AttendanceIntegrityWorkspace';
import { LoginCard } from './components/auth/LoginCard';
import { logout, setUnauthorizedHandler } from './api/client';
import { warmPalette } from './components/ui/adjustable-glass-dashboard';

const ROOM_BACKGROUND_IMAGE =
  'https://cdn.21st.dev/assets/mirror/4a/4a0ed73b8ab76bd427aa70ab124329127f3df27cc7f31223a832ed7d28b3dda4.jpg';

const INACTIVITY_TIMEOUT_MS = 60 * 1000; // 60 seconds strict inactivity limit
const THROTTLE_MS = 1000; // 1 second activity throttle

export const App: React.FC = () => {
  const [checkingSession, setCheckingSession] = useState<boolean>(true);
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  const initRef = useRef(false);
  const lastActivityRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Requirement 1: Fresh frontend launch or page reload must NOT auto-restore session.
  // Invalidate any previous session associated with the existing browser cookie.
  useEffect(() => {
    // Global unauthorized handler triggered by 401 response from any protected API call
    setUnauthorizedHandler(() => {
      setAuthenticated(false);
      setAdminEmail(null);
      setSessionNotice('Session expired due to inactivity. Please verify again.');
    });

    if (initRef.current) return;
    initRef.current = true;

    // Fail-closed initialization: revoke session, clear cookie, require fresh OTP
    logout()
      .catch(() => {})
      .finally(() => {
        setAuthenticated(false);
        setAdminEmail(null);
        setCheckingSession(false);
      });
  }, []);

  const handleLoginSuccess = (email: string) => {
    setAuthenticated(true);
    setAdminEmail(email);
    setSessionNotice(null);
  };

  const handleLogout = async () => {
    await logout();
    setAuthenticated(false);
    setAdminEmail(null);
    setSessionNotice(null);
  };

  const handleInactivityLogout = useCallback(async () => {
    await logout();
    setAuthenticated(false);
    setAdminEmail(null);
    setSessionNotice('Session expired due to inactivity. Please verify again.');
  }, []);

  // Requirement 2: Strict 60-second inactivity logout tracking
  useEffect(() => {
    if (!authenticated) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Reset activity timestamp upon authentication
    lastActivityRef.current = Date.now();

    const scheduleTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const elapsed = Date.now() - lastActivityRef.current;
        if (elapsed >= INACTIVITY_TIMEOUT_MS) {
          handleInactivityLogout();
        } else {
          timerRef.current = setTimeout(handleInactivityLogout, INACTIVITY_TIMEOUT_MS - elapsed);
        }
      }, INACTIVITY_TIMEOUT_MS);
    };

    let lastThrottleTime = 0;
    const onUserActivity = () => {
      const now = Date.now();
      if (now - lastThrottleTime < THROTTLE_MS) return;
      lastThrottleTime = now;
      lastActivityRef.current = now;
      scheduleTimer();
    };

    scheduleTimer();

    // Meaningful user interactions: mouse, keyboard, touch, scroll, pointer
    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'pointerdown'];
    activityEvents.forEach((evt) => {
      window.addEventListener(evt, onUserActivity, { passive: true });
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, onUserActivity);
      });
    };
  }, [authenticated, handleInactivityLogout]);

  // 1. Initial Launch Invalidation (Checking State with identical card dimensions)
  if (checkingSession) {
    return (
      <div className="gw-root" style={warmPalette}>
        <div
          className="gw-room"
          aria-hidden="true"
          style={{ backgroundImage: `url(${ROOM_BACKGROUND_IMAGE})` }}
        />
        <div className="gw-room-shade" aria-hidden="true" />

        <main className="login-viewport-wrapper">
          <div className="login-card-white-glass">
            <h1 className="login-title">
              Attendance Integrity
            </h1>
            <p className="login-subtitle">
              ADMINISTRATOR
            </p>
            <div style={{ padding: '38px 0 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="login-spinner-orange" aria-hidden="true" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  // 2. Unauthenticated: Render ONLY Login Card
  if (!authenticated) {
    return (
      <MotionConfig reducedMotion="user">
        <LoginCard onSuccess={handleLoginSuccess} sessionNotice={sessionNotice} />
      </MotionConfig>
    );
  }

  // 3. Authenticated: Render Full Workspace Dashboard
  return (
    <MotionConfig reducedMotion="user">
      <AttendanceIntegrityWorkspace adminEmail={adminEmail} onLogout={handleLogout} />
    </MotionConfig>
  );
};

export default App;
