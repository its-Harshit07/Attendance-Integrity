import React from 'react';
import { MotionConfig } from 'motion/react';
import { AttendanceIntegrityWorkspace } from './components/dashboard/AttendanceIntegrityWorkspace';

export const App: React.FC = () => {
  return (
    <MotionConfig reducedMotion="user">
      <AttendanceIntegrityWorkspace />
    </MotionConfig>
  );
};

export default App;
