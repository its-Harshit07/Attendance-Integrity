import React, { useState, useEffect } from 'react';
import { requestOtp, verifyOtp } from '../../api/client';
import { warmPalette } from '../ui/adjustable-glass-dashboard';

interface LoginCardProps {
  onSuccess: (email: string) => void;
  sessionNotice?: string | null;
}

const ROOM_BACKGROUND_IMAGE =
  'https://cdn.21st.dev/assets/mirror/4a/4a0ed73b8ab76bd427aa70ab124329127f3df27cc7f31223a832ed7d28b3dda4.jpg';

export const LoginCard: React.FC<LoginCardProps> = ({ onSuccess, sessionNotice }) => {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(sessionNotice || null);
  const [cooldown, setCooldown] = useState(0);

  // 60-second resend countdown
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [cooldown]);

  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Enter a valid email');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await requestOtp(cleanEmail);
      setStep('otp');
      setCooldown(60);
      setOtp('');
    } catch (err: any) {
      setError(err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      setError('Enter 6-digit OTP');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await verifyOtp(email.trim(), cleanOtp);
      onSuccess(res.email);
    } catch (err: any) {
      setError(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    if (step === 'email') {
      handleRequestOtp(e);
    } else {
      handleVerifyOtp(e);
    }
  };

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
          {/* Header */}
          <h1 className="login-title">
            Attendance Integrity
          </h1>
          <p className="login-subtitle">
            ADMINISTRATOR
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="login-form">
            {/* Email Input */}
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Enter your email"
              autoFocus={step === 'email'}
              required
              autoComplete="email"
              className="login-input"
            />

            {/* OTP Input (Revealed after OTP request succeeds) */}
            {step === 'otp' && (
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                  if (error) setError(null);
                }}
                placeholder="Enter OTP"
                autoFocus
                required
                autoComplete="one-time-code"
                className="login-input login-input-mono"
              />
            )}

            {/* Concise Error Message */}
            {error && (
              <p className="login-error-text">
                {error}
              </p>
            )}

            {/* Primary Action Button */}
            <button
              type="submit"
              disabled={loading || (step === 'email' ? !email.trim() : otp.length !== 6)}
              className="login-primary-btn"
            >
              {loading && <span className="login-spinner" aria-hidden="true" />}
              <span>{step === 'email' ? 'Request OTP' : 'Validate OTP'}</span>
            </button>

            {/* Resend Action with Countdown */}
            {step === 'otp' && (
              <div className="login-resend-wrap">
                {cooldown > 0 ? (
                  <span className="login-resend-countdown">
                    Resend OTP in {cooldown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRequestOtp()}
                    disabled={loading}
                    className="login-resend-btn"
                  >
                    Request another OTP
                  </button>
                )}
              </div>
            )}
          </form>
        </div>
      </main>
    </div>
  );
};
