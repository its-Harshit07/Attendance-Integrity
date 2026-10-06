/**
 * Attendance Integrity System - Administrator Dashboard JavaScript SPA
 * File: static/js/app.js
 */

document.addEventListener('DOMContentLoaded', () => {
  let activeView = 'overview';
  let currentAnomalyId = null;

  // DOM Elements
  const navItems = document.querySelectorAll('.nav-item');
  const viewSections = document.querySelectorAll('.view-section');
  const viewTitle = document.getElementById('view-title');
  const viewSubtitle = document.getElementById('view-subtitle');

  // Queue Controls
  const queueSearch = document.getElementById('queue-search');
  const filterRisk = document.getElementById('filter-risk');
  const filterStatus = document.getElementById('filter-status');
  const filterCategory = document.getElementById('filter-category');
  const queueTableBody = document.getElementById('queue-table-body');

  // Drawer Elements
  const detailBackdrop = document.getElementById('detail-backdrop');
  const btnCloseDrawer = document.getElementById('btn-close-drawer');
  const drawerAnomalyId = document.getElementById('drawer-anomaly-id');
  const drawerStuId = document.getElementById('drawer-stu-id');
  const drawerClassId = document.getElementById('drawer-class-id');
  const drawerRiskBadge = document.getElementById('drawer-risk-badge');
  const drawerScore = document.getElementById('drawer-score');
  const drawerEvidenceContainer = document.getElementById('drawer-evidence-container');
  const drawerTemporalGrid = document.getElementById('drawer-temporal-grid');
  const reviewStatusSelect = document.getElementById('review-status-select');
  const reviewNoteInput = document.getElementById('review-note-input');
  const btnSaveReview = document.getElementById('btn-save-review');

  // Student View Elements
  const studentSearchInput = document.getElementById('student-search-input');
  const btnStudentSearch = document.getElementById('btn-student-search');
  const studentProfileContainer = document.getElementById('student-profile-container');

  // View Navigation
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const view = item.getAttribute('data-view');
      switchView(view);
    });
  });

  function switchView(viewName) {
    activeView = viewName;
    navItems.forEach(i => i.classList.remove('active'));
    viewSections.forEach(s => s.classList.remove('active'));

    const activeItem = document.querySelector(`.nav-item[data-view="${viewName}"]`);
    if (activeItem) activeItem.classList.add('active');

    const activeSec = document.getElementById(`view-${viewName}`);
    if (activeSec) activeSec.classList.add('active');

    const titles = {
      overview: ['Overview Dashboard', 'AI-assisted decision-support metrics and operational review queue.'],
      queue: ['Anomaly Review Queue', 'Filter, search, and manage student attendance anomaly review signals.'],
      student: ['Student Attendance Context', 'Longitudinal attendance observation profile and exception timeline.'],
      reports: ['Compliance Preview', 'Administrator compliance decision-support summary preview.'],
      audit: ['Audit Log', 'Immutable human review action history and audit trail.'],
      info: ['System Provenance', 'Technical metadata, frozen Phase 4 model specs, and test verifications.']
    };

    if (titles[viewName]) {
      viewTitle.textContent = titles[viewName][0];
      viewSubtitle.textContent = titles[viewName][1];
    }

    // Refresh view data
    if (viewName === 'overview') loadOverview();
    if (viewName === 'queue') loadQueue();
    if (viewName === 'reports') loadReports();
    if (viewName === 'audit') loadAuditLog();
    if (viewName === 'info') loadSystemInfo();
  }

  // Load Overview Data
  async function loadOverview() {
    try {
      const res = await fetch('/api/dashboard/summary');
      const json = await res.json();
      if (json.status === 'success') {
        const d = json.data;
        document.getElementById('metric-total').textContent = d.total_anomalies || 0;
        document.getElementById('metric-unreviewed').textContent = d.unreviewed_count || 0;
        document.getElementById('metric-high-risk').textContent = (d.critical_risk_count || 0) + (d.high_risk_count || 0);
        document.getElementById('metric-validated').textContent = d.validated_count || 0;

        document.getElementById('metric-data-integrity').textContent = d.data_integrity_count || 0;
        document.getElementById('metric-behavioral').textContent = d.behavioral_count || 0;

        document.getElementById('metric-source-rules').textContent = d.rules_detected || 0;
        document.getElementById('metric-source-ml').textContent = d.ml_detected || 0;
        document.getElementById('metric-source-combined').textContent = d.combined_detected || 0;
      }
    } catch (err) {
      console.error('Failed to load overview:', err);
    }
  }

  // Load Anomaly Queue Data
  async function loadQueue() {
    try {
      const risk = filterRisk.value;
      const status = filterStatus.value;
      const category = filterCategory.value;
      const search = queueSearch.value.trim();

      let url = `/api/anomalies?limit=100&risk=${risk}&status=${status}&category=${category}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await fetch(url);
      const json = await res.json();

      if (json.status === 'success') {
        renderQueueTable(json.data);
      }
    } catch (err) {
      console.error('Failed to load queue:', err);
    }
  }

  function renderQueueTable(rows) {
    queueTableBody.innerHTML = '';
    if (!rows || rows.length === 0) {
      queueTableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:32px; color:var(--text-muted);">No anomalies found matching the current filters.</td></tr>`;
      return;
    }

    rows.forEach(r => {
      const tr = document.createElement('tr');

      const riskBadgeClass = `badge-${r.risk_tier.toLowerCase()}`;
      const statusBadgeClass = `status-${r.review_status.toLowerCase()}`;

      tr.innerHTML = `
        <td><span class="badge ${riskBadgeClass}">${r.risk_tier}</span></td>
        <td><strong>${r.student_id}</strong></td>
        <td>${r.class_id}</td>
        <td>${r.date}</td>
        <td><code>${r.anomaly_category}</code></td>
        <td><span class="badge" style="background:rgba(99,102,241,0.15); color:var(--accent-primary); border:1px solid rgba(99,102,241,0.3);">${r.detection_source}</span></td>
        <td>${(r.anomaly_score * 100).toFixed(1)}%</td>
        <td><span class="badge ${statusBadgeClass}">${r.review_status}</span></td>
        <td><button class="btn-action btn-review-item" data-id="${r.anomaly_id}">Review Evidence</button></td>
      `;

      tr.querySelector('.btn-review-item').addEventListener('click', (e) => {
        e.stopPropagation();
        openDrawer(r.anomaly_id);
      });

      tr.addEventListener('click', () => openDrawer(r.anomaly_id));
      queueTableBody.appendChild(tr);
    });
  }

  // Event Listeners for Queue Controls
  filterRisk.addEventListener('change', loadQueue);
  filterStatus.addEventListener('change', loadQueue);
  filterCategory.addEventListener('change', loadQueue);

  let searchDebounce;
  queueSearch.addEventListener('input', () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(loadQueue, 300);
  });

  // Open Detail Drawer
  async function openDrawer(anomId) {
    currentAnomalyId = anomId;
    try {
      const res = await fetch(`/api/anomalies/${anomId}/evidence`);
      const json = await res.json();

      if (json.status === 'success') {
        const d = json;
        drawerAnomalyId.textContent = d.anomaly_id;
        drawerStuId.textContent = d.student_id;
        drawerClassId.textContent = `Date: ${d.date}`;
        
        const riskClass = `badge-${d.risk_tier.toLowerCase()}`;
        drawerRiskBadge.innerHTML = `<span class="badge ${riskClass}">${d.risk_tier} Risk</span>`;
        drawerScore.textContent = `Anomaly Score: ${(d.anomaly_score * 100).toFixed(1)}%`;

        // Render Evidence Rules
        drawerEvidenceContainer.innerHTML = '';
        if (d.evidence_rules && d.evidence_rules.length > 0) {
          d.evidence_rules.forEach(ev => {
            const box = document.createElement('div');
            box.className = 'evidence-box';
            box.innerHTML = `
              <div class="evidence-title">
                <span>Rule ${ev.rule_id} — ${ev.rule_name}</span>
                <span class="badge badge-medium">${ev.severity}</span>
              </div>
              <div class="evidence-detail">
                <p><strong>Evidence:</strong> ${ev.explanation}</p>
                <p style="margin-top:4px;"><strong>Observed Value:</strong> <code>${ev.observed_value}</code> | <strong>Threshold:</strong> <code>${ev.threshold_value}</code></p>
              </div>
            `;
            drawerEvidenceContainer.appendChild(box);
          });
        } else {
          drawerEvidenceContainer.innerHTML = `<p style="font-size:0.85rem; color:var(--text-muted);">Statistical multivariate anomaly score flagged by Isolation Forest detector without static rule triggers.</p>`;
        }

        // Render Temporal Context
        drawerTemporalGrid.innerHTML = '';
        if (d.temporal_features && Object.keys(d.temporal_features).length > 0) {
          const tf = d.temporal_features;
          const items = [
            ['Recent 7-Day Exception Rate', 'exception_rate_7d', `${(tf.exception_rate_7d * 100).toFixed(1)}%`],
            ['Historical Exception Rate', 'historical_exception_rate', `${(tf.historical_exception_rate * 100).toFixed(1)}%`],
            ['Consecutive Exception Days', 'consecutive_exception_days', `${tf.consecutive_exception_days} school days`],
            ['Recent vs Historical Deviation', 'recent_vs_historical_deviation', `${(tf.recent_vs_historical_deviation * 100).toFixed(1)}%`],
            ['Peer Class Exception Rate', 'class_exception_rate_7d', `${(tf.class_exception_rate_7d * 100).toFixed(1)}%`],
            ['Student vs Class Deviation', 'student_vs_class_deviation', `${(tf.student_vs_class_deviation * 100).toFixed(1)}%`]
          ];

          items.forEach(([label, featName, val]) => {
            const div = document.createElement('div');
            div.innerHTML = `<span style="color:var(--text-muted);">${label} (<code>${featName}</code>):</span> <strong style="color:#fff;">${val}</strong>`;
            drawerTemporalGrid.appendChild(div);
          });
        }

        detailBackdrop.classList.add('active');
      }
    } catch (err) {
      console.error('Failed to open drawer:', err);
    }
  }

  btnCloseDrawer.addEventListener('click', () => detailBackdrop.classList.remove('active'));
  detailBackdrop.addEventListener('click', (e) => {
    if (e.target === detailBackdrop) detailBackdrop.classList.remove('active');
  });

  // Submit Review Decision
  btnSaveReview.addEventListener('click', async () => {
    if (!currentAnomalyId) return;
    const status = reviewStatusSelect.value;
    const note = reviewNoteInput.value.trim();

    try {
      const res = await fetch(`/api/anomalies/${currentAnomalyId}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: status,
          note: note,
          reviewer: 'Administrator (Dev)'
        })
      });

      const json = await res.json();
      if (json.status === 'success') {
        alert(`Review status successfully updated to '${status}'`);
        detailBackdrop.classList.remove('active');
        reviewNoteInput.value = '';
        if (activeView === 'overview') loadOverview();
        if (activeView === 'queue') loadQueue();
      } else {
        alert(`Error updating review: ${json.detail || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to submit review:', err);
      alert('Failed to submit review transition.');
    }
  });

  // Student Search
  btnStudentSearch.addEventListener('click', async () => {
    const stuId = studentSearchInput.value.trim();
    if (!stuId) return;

    try {
      const res = await fetch(`/api/students/${stuId}/attendance-context`);
      const json = await res.json();

      if (json.status === 'success') {
        const d = json;
        document.getElementById('stu-prof-id').textContent = d.student_id;
        document.getElementById('stu-prof-class').textContent = `${d.student_name} (${d.class_id})`;
        document.getElementById('stu-prof-obs').textContent = d.total_evaluable_observations;
        document.getElementById('stu-prof-rate').textContent = `${(d.historical_exception_rate * 100).toFixed(1)}% (${d.source_exception_count} marks)`;

        const tbody = document.getElementById('stu-timeline-body');
        tbody.innerHTML = '';
        d.observation_timeline.forEach(t => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${t.date}</td>
            <td>${t.day_of_week}</td>
            <td><code>${t.attendance_status}</code></td>
            <td>${t.raw_status || 'N/A'}</td>
            <td>${t.is_school_day}</td>
          `;
          tbody.appendChild(tr);
        });

        studentProfileContainer.style.display = 'block';
      } else {
        alert(json.detail || 'Student not found.');
      }
    } catch (err) {
      console.error('Failed to load student context:', err);
      alert('Student ID not found in canonical records.');
    }
  });

  // Load Reports Preview
  async function loadReports() {
    try {
      const res = await fetch('/api/reports/compliance-preview');
      const json = await res.json();
      if (json.status === 'success') {
        const d = json.summary;
        document.getElementById('rep-reviewed').textContent = (d.validated_count || 0) + (d.rejected_count || 0);
        document.getElementById('rep-pending').textContent = d.unreviewed_count || 0;
        document.getElementById('rep-validated').textContent = d.validated_count || 0;
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    }
  }

  // Load Audit Log
  async function loadAuditLog() {
    try {
      const res = await fetch('/api/anomalies/SYSTEM/history');
      const json = await res.json();
      if (json.status === 'success') {
        const tbody = document.getElementById('audit-table-body');
        tbody.innerHTML = '';
        if (json.audit_trail && json.audit_trail.length > 0) {
          json.audit_trail.forEach(a => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td>${a.timestamp.substring(0, 19).replace('T', ' ')}</td>
              <td><code>${a.anomaly_id}</code></td>
              <td>${a.action}</td>
              <td><span class="badge status-${(a.previous_status || 'none').toLowerCase()}">${a.previous_status || 'N/A'}</span></td>
              <td><span class="badge status-${(a.new_status || 'none').toLowerCase()}">${a.new_status}</span></td>
              <td>${a.reviewer}</td>
              <td>${a.note || 'Initial ingestion'}</td>
            `;
            tbody.appendChild(tr);
          });
        } else {
          tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:24px; color:var(--text-muted);">No audit entries recorded yet.</td></tr>`;
        }
      }
    } catch (err) {
      console.error('Failed to load audit log:', err);
    }
  }

  // Load System Info
  async function loadSystemInfo() {
    try {
      const res = await fetch('/api/system/info');
      const json = await res.json();
      if (json.status === 'success') {
        document.getElementById('info-model-version').textContent = json.model_version;
        document.getElementById('info-train-range').textContent = json.training_date_range;
        document.getElementById('info-val-range').textContent = json.validation_date_range;
        document.getElementById('info-test-range').textContent = json.test_date_range;
        document.getElementById('info-seed').textContent = json.random_seed;
        document.getElementById('info-thresh').textContent = `${json.operating_threshold_raw.toFixed(6)} (99th percentile validation)`;
        document.getElementById('info-tests').textContent = json.phase4_tests_passed;

        const rulesUl = document.getElementById('info-rules-list');
        rulesUl.innerHTML = '';
        json.production_rules.forEach(r => {
          const li = document.createElement('li');
          li.textContent = r;
          rulesUl.appendChild(li);
        });
      }
    } catch (err) {
      console.error('Failed to load system info:', err);
    }
  }

  // Initial Overview Load
  loadOverview();
});
