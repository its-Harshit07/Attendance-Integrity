import React, { useEffect, useRef, useState } from 'react';

const DESKTOP_VIDEO_URL =
  'https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/65fdef53-5686-4659-8761-52d61bf1a4f7.mp4';
const MOBILE_VIDEO_URL =
  'https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/9a30e5e9-9f03-4755-9bc1-7bcf1510aab3.mp4';
const POSTER_URL =
  'https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/33150b94-09f7-47da-a7c9-3ae76c2dd7eb.jpg';

interface CinematicHeroProps {
  onOpenDashboard: () => void;
  onViewAnomalies: () => void;
}

export const CinematicHero: React.FC<CinematicHeroProps> = ({
  onOpenDashboard,
  onViewAnomalies
}) => {
  const runwayRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false
  );
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );

  useEffect(() => {
    const mobileQuery = window.matchMedia('(max-width: 768px)');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleMobileChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    const handleMotionChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);

    mobileQuery.addEventListener('change', handleMobileChange);
    motionQuery.addEventListener('change', handleMotionChange);
    return () => {
      mobileQuery.removeEventListener('change', handleMobileChange);
      motionQuery.removeEventListener('change', handleMotionChange);
    };
  }, []);

  useEffect(() => {
    if (reducedMotion || isMobile) {
      return;
    }

    let rafId = 0;

    const updateFromScroll = () => {
      const runway = runwayRef.current;
      if (!runway) return;

      const rect = runway.getBoundingClientRect();
      const scrollable = Math.max(runway.offsetHeight - window.innerHeight, 1);
      const raw = Math.min(Math.max(-rect.top / scrollable, 0), 1);

      setScrollProgress(raw);

      const video = videoRef.current;
      if (video && Number.isFinite(video.duration) && video.duration > 0) {
        const targetTime = raw * video.duration;
        if (Math.abs(video.currentTime - targetTime) > 0.04) {
          video.currentTime = targetTime;
        }
      }
    };

    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateFromScroll);
    };

    updateFromScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [reducedMotion, isMobile]);

  const videoSrc = isMobile ? MOBILE_VIDEO_URL : DESKTOP_VIDEO_URL;
  const effectiveProgress = reducedMotion || isMobile ? 0 : scrollProgress;
  const contentOpacity =
    reducedMotion || isMobile ? 1 : Math.max(1 - effectiveProgress * 1.15, 0.15);
  const contentTranslateY =
    reducedMotion || isMobile ? 0 : effectiveProgress * -36;

  return (
    <section ref={runwayRef} className="hero-runway" aria-label="Attendance Integrity introduction">
      <div className="hero-sticky">
        {/* Background Media */}
        <div className="hero-media" aria-hidden="true">
          <img
            src={POSTER_URL}
            alt=""
            className="hero-poster"
            style={{ opacity: videoReady ? 0 : 1 }}
          />
          {!reducedMotion && (
            <video
              ref={videoRef}
              key={videoSrc}
              src={videoSrc}
              poster={POSTER_URL}
              muted
              playsInline
              preload="auto"
              autoPlay={isMobile}
              loop={isMobile}
              onLoadedData={() => setVideoReady(true)}
              className="hero-video"
              style={{ opacity: videoReady ? 1 : 0 }}
            />
          )}
          <div className="hero-overlay" />
        </div>

        {/* Minimal Top Brand Bar */}
        <div className="hero-topbar">
          <div className="hero-brand">
            <span className="hero-brand-dot" />
            <span>ATTENDANCE INTEGRITY</span>
          </div>
          <button
            type="button"
            onClick={onOpenDashboard}
            className="btn btn-ghost btn-sm"
          >
            Skip to Dashboard
          </button>
        </div>

        {/* Hero Copy */}
        <div
          className="hero-content"
          style={{
            opacity: contentOpacity,
            transform: `translate3d(0, ${contentTranslateY}px, 0)`
          }}
        >
          <div className="hero-kicker">AI-ASSISTED ATTENDANCE MONITORING</div>
          <h1 className="hero-title">Attendance. Verified.</h1>
          <p className="hero-subtitle">
            Intelligent anomaly detection. Transparent evidence. Accountable decisions.
          </p>
          <div className="hero-actions">
            <button type="button" onClick={onOpenDashboard} className="btn btn-primary">
              OPEN DASHBOARD
            </button>
            <button type="button" onClick={onViewAnomalies} className="btn btn-secondary">
              VIEW ANOMALIES
            </button>
          </div>
        </div>

        {/* Subtle Scroll Indicator */}
        <div className="hero-scroll-hint" aria-hidden="true">
          <span>Scroll to enter workspace</span>
          {!isMobile && !reducedMotion && (
            <div className="hero-progress-track">
              <div
                className="hero-progress-fill"
                style={{ width: `${Math.round(scrollProgress * 100)}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
