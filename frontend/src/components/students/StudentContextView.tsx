import React, { useState } from 'react';
import type { StudentContext } from '../../types/dashboard';
import { fetchStudentContext } from '../../api/client';

interface StudentContextProps {
  initialStudentId?: string;
  onSelectAnomaly: (anomalyId: string) => void;
}

export const StudentContextView: React.FC<StudentContextProps> = ({
  initialStudentId,
  onSelectAnomaly
}) => {
  const [studentIdInput, setStudentIdInput] = useState<string>(initialStudentId || '');
  const [studentData, setStudentData] = useState<StudentContext | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!studentIdInput.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchStudentContext(studentIdInput.trim().toUpperCase());
      setStudentData(data);
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      setStudentData(null);
      setErrorMsg(err.message || 'Student not found');
    }
  };

  // React to initialStudentId changes if passed
  React.useEffect(() => {
    if (initialStudentId) {
      setStudentIdInput(initialStudentId);
      fetchStudentContext(initialStudentId)
        .then(setStudentData)
        .catch((err) => setErrorMsg(err.message));
    }
  }, [initialStudentId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1E293B', margin: '0 0 0.25rem 0' }}>
          Student Context Audit
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
          Inspect comprehensive student temporal attendance timeline and anomaly history.
        </p>
      </div>

      {/* Search Input Box */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '10px',
          padding: '1.25rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            type="text"
            placeholder="Enter Student ID (e.g. S001, S042)..."
            value={studentIdInput}
            onChange={(e) => setStudentIdInput(e.target.value)}
            style={{
              flex: 1,
              padding: '0.6rem 0.85rem',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              fontSize: '0.875rem',
              outline: 'none'
            }}
          />
          <button
            type="submit"
            style={{
              padding: '0.6rem 1.25rem',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Lookup Context
          </button>
        </form>
      </div>

      {errorMsg && (
        <div
          style={{
            backgroundColor: '#FFE1E1',
            color: '#991B1B',
            border: '1px solid #FCA5A5',
            padding: '1rem',
            borderRadius: '8px',
            fontSize: '0.875rem'
          }}
        >
          {errorMsg}
        </div>
      )}

      {loading && (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
          Fetching student attendance context...
        </div>
      )}

      {studentData && !loading && (
        <>
          {/* Profile Overview Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '10px',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>
                  {studentData.student_name}
                </h2>
                <div style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '0.2rem' }}>
                  Student ID: <span style={{ fontWeight: 600, color: '#1E293B' }}>{studentData.student_id}</span> • Class ID:{' '}
                  <span style={{ fontWeight: 600, color: '#1E293B' }}>{studentData.class_id}</span>
                </div>
              </div>
              <span
                style={{
                  backgroundColor: '#EFF6FF',
                  color: '#1E40AF',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  border: '1px solid #BFDBFE'
                }}
              >
                {studentData.anomaly_history_count} Anomaly Signal(s) Recorded
              </span>
            </div>

            {/* Metric Mini-Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div style={{ backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Total Observations</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1E293B', marginTop: '0.25rem' }}>
                  {studentData.total_evaluable_observations}
                </div>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Source Exceptions</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#D97706', marginTop: '0.25rem' }}>
                  {studentData.source_exception_count}
                </div>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Historical Exception Rate</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2563EB', marginTop: '0.25rem' }}>
                  {(studentData.historical_exception_rate * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Associated Anomaly Signals List */}
          {studentData.anomalies && studentData.anomalies.length > 0 && (
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '10px',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}
            >
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1E293B', margin: '0 0 1rem 0' }}>
                Detected Anomaly Signals for Student
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {studentData.anomalies.map((a) => (
                  <div
                    key={a.anomaly_id}
                    style={{
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      padding: '1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: '#FFFFFF'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 700, fontFamily: 'monospace', color: '#1E293B' }}>{a.anomaly_id}</span>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            backgroundColor:
                              a.risk_tier === 'CRITICAL'
                                ? '#FFE1E1'
                                : a.risk_tier === 'HIGH'
                                ? '#FFF1CC'
                                : a.risk_tier === 'MEDIUM'
                                ? '#DCEBFF'
                                : '#F1F5F9',
                            color:
                              a.risk_tier === 'CRITICAL'
                                ? '#991B1B'
                                : a.risk_tier === 'HIGH'
                                ? '#9A3412'
                                : a.risk_tier === 'MEDIUM'
                                ? '#1E40AF'
                                : '#475569',
                            padding: '0.15rem 0.4rem',
                            borderRadius: '4px'
                          }}
                        >
                          {a.risk_tier}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Category: {a.anomaly_category}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                        Date: <strong>{a.date}</strong> • Detection Source: <strong>{a.detection_source}</strong> • Status:{' '}
                        <strong>{a.review_status}</strong>
                      </div>
                    </div>

                    <button
                      onClick={() => onSelectAnomaly(a.anomaly_id)}
                      style={{
                        padding: '0.4rem 0.85rem',
                        backgroundColor: '#2563EB',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Review Anomaly Signal
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full Observation Timeline */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '10px',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1E293B', margin: '0 0 1rem 0' }}>
              Full Attendance Observation Timeline
            </h3>

            <div style={{ overflowX: 'auto', maxHeight: '500px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: '#F8FAFC', zIndex: 1 }}>
                  <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                    <th style={{ padding: '0.75rem', color: '#475569', fontWeight: 600 }}>Record ID</th>
                    <th style={{ padding: '0.75rem', color: '#475569', fontWeight: 600 }}>Date</th>
                    <th style={{ padding: '0.75rem', color: '#475569', fontWeight: 600 }}>Day of Week</th>
                    <th style={{ padding: '0.75rem', color: '#475569', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '0.75rem', color: '#475569', fontWeight: 600 }}>Raw Mark</th>
                    <th style={{ padding: '0.75rem', color: '#475569', fontWeight: 600 }}>School Day</th>
                  </tr>
                </thead>
                <tbody>
                  {studentData.observation_timeline.map((obs) => {
                    const isException = obs.attendance_status === 'ABSENT' || obs.attendance_status === 'LATE';

                    return (
                      <tr
                        key={obs.record_id}
                        style={{
                          borderBottom: '1px solid #F1F5F9',
                          backgroundColor: isException ? '#FFFBEB' : 'transparent'
                        }}
                      >
                        <td style={{ padding: '0.75rem', fontFamily: 'monospace', color: '#64748B' }}>
                          {obs.record_id}
                        </td>
                        <td style={{ padding: '0.75rem', fontWeight: 600, color: '#1E293B' }}>{obs.date}</td>
                        <td style={{ padding: '0.75rem', color: '#64748B' }}>{obs.day_of_week}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <span
                            style={{
                              backgroundColor:
                                obs.attendance_status === 'PRESENT'
                                  ? '#DDF7E8'
                                  : obs.attendance_status === 'ABSENT'
                                  ? '#FFE1E1'
                                  : obs.attendance_status === 'LATE'
                                  ? '#FFF1CC'
                                  : '#F1F5F9',
                              color:
                                obs.attendance_status === 'PRESENT'
                                  ? '#047857'
                                  : obs.attendance_status === 'ABSENT'
                                  ? '#991B1B'
                                  : obs.attendance_status === 'LATE'
                                  ? '#9A3412'
                                  : '#475569',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600
                            }}
                          >
                            {obs.attendance_status}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', color: '#64748B' }}>{obs.raw_status}</td>
                        <td style={{ padding: '0.75rem', color: '#64748B' }}>{obs.is_school_day}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
