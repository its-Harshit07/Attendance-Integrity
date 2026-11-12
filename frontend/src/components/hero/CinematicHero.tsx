import React from 'react';
import { motion } from 'motion/react';

const AURORA_VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260506_081238_406ed0e3-5d83-436e-a512-0bbff7ec5b95.mp4';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as const
    }
  }
};

const PRINCIPLES = [
  { num: '01', text: 'Detect anomalies' },
  { num: '02', text: 'Explain the evidence' },
  { num: '03', text: 'Enable human review' }
];

export const CinematicHero: React.FC = () => {
  return (
    <aside className="aurora-left" aria-label="Attendance Integrity overview">
      <video
        className="aurora-video"
        src={AURORA_VIDEO_URL}
        autoPlay
        muted
        loop
        playsInline
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }}
      />

      <motion.div
        className="aurora-left-inner"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="aurora-brand">
          <span className="aurora-brand-dot" />
          <span>ATTENDANCE INTEGRITY</span>
        </motion.div>

        <div className="aurora-copy">
          <motion.h1 variants={itemVariants} className="aurora-heading">
            Attendance.
            <br />
            Verified.
          </motion.h1>

          <motion.p variants={itemVariants} className="aurora-description">
            Intelligent anomaly detection. Transparent evidence. Accountable decisions.
          </motion.p>

          <motion.ul variants={itemVariants} className="aurora-principles">
            {PRINCIPLES.map((item) => (
              <li key={item.num} className="aurora-principle-item">
                <span className="aurora-principle-num">{item.num}</span>
                <span>—</span>
                <span>{item.text}</span>
              </li>
            ))}
          </motion.ul>
        </div>
      </motion.div>
    </aside>
  );
};
