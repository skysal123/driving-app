/* DriveDesk prototype — classes and the More tab */
'use strict';

function renderSessions() {
  const tabs = [['today', 'Today'], ['upcoming', 'Upcoming'], ['history', 'History']];
  let list = '';

  if (sessionTab === 'today') {
    const rows = Store.todaySchedule();
    list = rows.length
      ? rows.map(classRow).join('')
      : emptyState('calendar', 'No classes today', 'Classes scheduled for today will show up here.');
  } else if (sessionTab === 'upcoming') {
    const rows = Store.upcomingSchedule();
    if (!rows.length) {
      list = emptyState('calendar', 'Nothing scheduled', 'New admissions automatically get a first class slot.');
    } else {
      const groups = [];
      rows.forEach((row) => {
        const key = Store.keyOf(new Date(row.at));
        let group = groups.find((g) => g.key === key);
        if (!group) {
          group = { key, at: row.at, rows: [] };
          groups.push(group);
        }
        group.rows.push(row);
      });
      list = groups.map((g) => `
        <div class="day-group">
          <p class="day-label">${dayLabel(g.at)} · ${fmtDateShort(g.at)}</p>
          ${g.rows.map((row) => `
            <div class="class-row" data-go="/student/${encodeURIComponent(row.student.id)}">
              <div class="time-col"><b>${fmtTime(row.at)}</b><span>${esc(row.student.package.vehicle.split('·')[0].trim())}</span></div>
              ${avatar(row.student)}
              <div class="row-main">
                <p class="row-title">${esc(row.student.name)}</p>
                <p class="row-sub">${esc(row.student.package.instructor)}</p>
              </div>
              <button class="btn-tiny" type="button" data-mark="${esc(row.student.id)}">Mark</button>
            </div>`).join('')}
        </div>`).join('');
    }
  } else {
    const rows = Store.allSessions().slice(0, 60);
    list = rows.length
      ? rows.map((x) => `
        <div class="class-row" data-go="/student/${encodeURIComponent(x.studentId)}">
          <div class="time-col"><b>${fmtTime(x.date)}</b><span>${fmtDateShort(x.date)}</span></div>
          ${avatar(x.student)}
          <div class="row-main">
            <p class="row-title">${esc(x.student.name)}</p>
            <p class="row-sub">Session ${x.sessionNo || 1}${x.instructor ? ' · ' + esc(x.instructor) : ''}${x.signed ? ' · Signature captured' : ' · No signature'}</p>
          </div>
          <span class="chip ${x.status === 'present' ? 'chip-success' : 'chip-danger'}">${x.status === 'present' ? 'Present' : 'Absent'}</span>
        </div>`).join('')
      : emptyState('clock', 'No history yet', 'Attendance records will appear here.');
  }

  const st = Store.stats();
  return `
  <header class="appbar appbar-plain">
    <div class="appbar-title">
      <h1>Classes</h1>
      <p class="muted small">${st.today} today · ${st.present} marked present</p>
    </div>
    <button class="icon-btn" type="button" data-go="/admission" aria-label="New admission">${icon('plus')}</button>
  </header>
  <div class="sticky-tools">
    <div class="segmented" id="session-tabs">
      ${tabs.map((t) => `<button class="${sessionTab === t[0] ? 'on' : ''}" type="button" data-tab="${t[0]}">${t[1]}</button>`).join('')}
    </div>
  </div>
  <main class="page">
    <div class="list card" id="session-list">${list}</div>
  </main>`;
}

function bindSessions() {
  $$('#session-tabs [data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      sessionTab = btn.dataset.tab;
      render();
    });
  });
}

/* ------------------------------ reports ------------------------------ */

let reportKind = 'month';
let reportAnchor = new Date();

function reportKey(value) {
  if (!value) return '';
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : Store.keyOf(date);
}

function reportRange(kind, anchor) {
  const period = ['week', 'month', 'quarter', 'year'].includes(kind) ? kind : 'month';
  const base = new Date(anchor instanceof Date ? anchor.getTime() : Date.now());
  if (Number.isNaN(base.getTime())) base.setTime(Date.now());
  base.setHours(12, 0, 0, 0);

  let start;
  let end;
  let label;

  if (period === 'week') {
    const offset = (base.getDay() + 6) % 7;
    start = new Date(base);
    start.setDate(base.getDate() - offset);
    start.setHours(0, 0, 0, 0);
    end = new Date(start);
    end.setDate(start.getDate() + 7);
    const last = new Date(end.getTime() - 86400000);
    const short = (date) => date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const shortYear = (date) => date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const startLabel = start.getFullYear() === last.getFullYear() ? short(start) : shortYear(start);
    label = `${startLabel} - ${shortYear(last)}`;
  } else if (period === 'quarter') {
    const startMonth = Math.floor(base.getMonth() / 3) * 3;
    start = new Date(base.getFullYear(), startMonth, 1);
    end = new Date(base.getFullYear(), startMonth + 3, 1);
    const last = new Date(end.getTime() - 86400000);
    const monthShort = (date) => date.toLocaleDateString('en-IN', { month: 'short' });
    const startLabel = start.getFullYear() === last.getFullYear()
      ? monthShort(start)
      : `${monthShort(start)} ${start.getFullYear()}`;
    label = `${startLabel} - ${monthShort(last)} ${last.getFullYear()}`;
  } else if (period === 'year') {
    const startYear = base.getMonth() >= 3 ? base.getFullYear() : base.getFullYear() - 1;
    start = new Date(startYear, 3, 1);
    end = new Date(startYear + 1, 3, 1);
    label = `Apr ${startYear} - Mar ${startYear + 1}`;
  } else {
    start = new Date(base.getFullYear(), base.getMonth(), 1);
    end = new Date(base.getFullYear(), base.getMonth() + 1, 1);
    label = start.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }

  const last = new Date(end.getTime() - 86400000);
  return {
    kind: period,
    start,
    end,
    last,
    startKey: Store.keyOf(start),
    endKey: Store.keyOf(end),
    label
  };
}

function reportInRange(value, range) {
  const key = reportKey(value);
  return !!key && key >= range.startKey && key < range.endKey;
}

function reportGroupRows(rows, configured, key) {
  const groups = new Map();
  const bucketFor = (name) => {
    const clean = String(name || '').trim() || 'Unassigned';
    if (!groups.has(clean)) {
      groups.set(clean, { name: clean, classes: 0, students: new Map(), rows: [], lastAt: null });
    }
    return groups.get(clean);
  };

  (configured || []).forEach(bucketFor);
  rows.forEach((row) => {
    const bucket = bucketFor(row[key]);
    const at = new Date(row.session.date).getTime();
    bucket.classes += 1;
    bucket.students.set(row.student.id, row.student);
    bucket.rows.push(row);
    if (!bucket.lastAt || at > bucket.lastAt) bucket.lastAt = at;
  });

  const list = Array.from(groups.values());
  list.forEach((bucket) => bucket.rows.sort((a, b) => new Date(b.session.date) - new Date(a.session.date)));
  list.sort((a, b) => {
    if (a.name === 'Unassigned') return 1;
    if (b.name === 'Unassigned') return -1;
    return b.classes - a.classes || a.name.localeCompare(b.name);
  });
  return list;
}

function reportData() {
  const db = Store.state();
  const range = reportRange(reportKind, reportAnchor);
  const students = db.students || [];
  const admissions = students
    .filter((student) => reportInRange(student.startDate, range))
    .sort((a, b) => reportKey(b.startDate).localeCompare(reportKey(a.startDate)));

  const fullyPaid = admissions.filter((student) => {
    const total = Number(student.fees && student.fees.total) || 0;
    const paid = Number(student.fees && student.fees.paid) || 0;
    return total > 0 && paid >= total;
  });

  const remaining = admissions
    .map((student) => {
      const total = Number(student.fees && student.fees.total) || 0;
      const paid = Number(student.fees && student.fees.paid) || 0;
      return { student, total, paid, balance: Math.max(0, total - paid) };
    })
    .filter((row) => row.balance > 0)
    .sort((a, b) => b.balance - a.balance);

  const payments = [];
  students.forEach((student) => {
    (student.payments || []).forEach((payment) => {
      if (reportInRange(payment.paidAt, range)) payments.push({ payment, student });
    });
  });
  payments.sort((a, b) => new Date(b.payment.paidAt) - new Date(a.payment.paidAt));

  const sessions = [];
  students.forEach((student) => {
    (student.sessions || []).forEach((session) => {
      if (session.status !== 'present' || !reportInRange(session.date, range)) return;
      sessions.push({
        session,
        student,
        instructor: String(session.instructor || (student.package && student.package.instructor) || '').trim(),
        vehicle: String(session.vehicle || (student.package && student.package.vehicle) || '').trim()
      });
    });
  });

  const instructors = reportGroupRows(sessions, (db.school && db.school.instructors) || [], 'instructor');
  const vehicles = reportGroupRows(sessions, (db.school && db.school.vehicles) || [], 'vehicle');
  const totalCollection = payments.reduce((sum, row) => sum + (Number(row.payment.amount) || 0), 0);
  const pendingAll = students.reduce((sum, student) => {
    return sum + Math.max(0, (Number(student.fees && student.fees.total) || 0) - (Number(student.fees && student.fees.paid) || 0));
  }, 0);
  const remainingTotal = remaining.reduce((sum, row) => sum + row.balance, 0);

  return {
    db,
    range,
    students,
    admissions,
    fullyPaid,
    remaining,
    remainingTotal,
    payments,
    totalCollection,
    pendingAll,
    sessions,
    instructors,
    vehicles
  };
}

function reportCard(opts) {
  const tag = opts.action ? 'button' : 'div';
  const attrs = opts.action ? `type="button" data-report-open="${opts.action}"` : '';
  const classes = [
    'report-stat',
    opts.span ? 'report-stat-span' : '',
    opts.tone ? `report-tone-${opts.tone}` : '',
    opts.action ? 'has-detail' : 'is-static'
  ].filter(Boolean).join(' ');
  const value = Number(opts.value) || 0;
  const shown = opts.money ? money(value) : value.toLocaleString('en-IN');

  return `<${tag} class="${classes}" ${attrs}>
    <span class="report-stat-top">
      <span class="report-stat-ic">${icon(opts.icon)}</span>
      ${opts.action
        ? `<span class="report-stat-go">${icon('chevron-right', 'chev')}</span>`
        : '<span class="report-live"><i></i>Live</span>'}
    </span>
    <span class="report-stat-label">${esc(opts.label)}</span>
    <b class="report-stat-value" data-count="${value}" data-money="${opts.money ? 1 : 0}">${shown}</b>
    <span class="report-stat-sub">${esc(opts.sub)}</span>
  </${tag}>`;
}

function reportPhone(student) {
  const digits = String(student.phone || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.length === 10 ? `91${digits}` : digits;
}

function reportWhatsAppLink(student, message) {
  const phone = reportPhone(student);
  return phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : '';
}

function reportStudentSub(student) {
  const parts = [
    student.id,
    student.package && student.package.type,
    student.phone
  ].filter(Boolean);
  return parts.map(esc).join(' · ');
}

function reportStudentRow(student, trailing) {
  return `<button class="class-row report-row" type="button" data-report-student="${esc(student.id)}">
    ${avatar(student)}
    <div class="row-main">
      <p class="row-title">${esc(student.name)}</p>
      <p class="row-sub">${reportStudentSub(student)}</p>
    </div>
    ${trailing || ''}
    ${icon('chevron-right', 'chev')}
  </button>`;
}

function reportGroupRow(group, kind) {
  const isVehicle = kind === 'vehicle';
  const iconHtml = isVehicle
    ? `<span class="report-group-ic">${icon('car')}</span>`
    : `<div class="avatar avatar-text">${esc(UI.initials(group.name))}</div>`;
  const sub = group.classes
    ? `${group.classes} class${group.classes === 1 ? '' : 'es'} · ${group.students.size} student${group.students.size === 1 ? '' : 's'} · last ${fmtDateShort(group.lastAt)}`
    : 'No classes in this period';

  return `<button class="class-row report-row" type="button" data-report-group="${esc(group.name)}" data-report-group-kind="${kind}">
    ${iconHtml}
    <div class="row-main">
      <p class="row-title">${esc(group.name)}</p>
      <p class="row-sub">${sub}</p>
    </div>
    <span class="chip ${group.classes ? 'chip-success' : 'chip-neutral'}">${group.classes}</span>
    ${icon('chevron-right', 'chev')}
  </button>`;
}

function reportSessionRow(row, kind) {
  const other = kind === 'trainer'
    ? (row.vehicle || 'Vehicle not recorded')
    : (row.instructor || 'Trainer not recorded');
  return `<div class="class-row">
    <div class="time-col"><b>${fmtTime(row.session.date)}</b><span>${fmtDateShort(row.session.date)}</span></div>
    ${avatar(row.student)}
    <div class="row-main">
      <p class="row-title">${esc(row.student.name)}</p>
      <p class="row-sub">Session ${row.session.sessionNo || 1} · ${esc(other)}${row.session.notes ? ' · ' + esc(row.session.notes) : ''}</p>
    </div>
    <span class="chip chip-success">Present</span>
  </div>`;
}

function reportSheet(title, subtitle, body) {
  return UI.openModal(`
    <div class="sheet-head">
      <div>
        <h3>${esc(title)}</h3>
        <p class="muted small">${esc(subtitle)}</p>
      </div>
      <button class="icon-btn" type="button" data-close>${icon('x')}</button>
    </div>
    ${body}`);
}

function bindReportStudentRows(overlay) {
  if (!overlay) return;
  overlay.querySelectorAll('[data-report-student]').forEach((button) => {
    button.addEventListener('click', () => {
      UI.closeAllModals();
      go('/student/' + encodeURIComponent(button.dataset.reportStudent));
    });
  });
}

function openAdmissionsReport(data) {
  const rows = data.admissions.length
    ? data.admissions.map((student) => {
      const balance = Math.max(0, (Number(student.fees && student.fees.total) || 0) - (Number(student.fees && student.fees.paid) || 0));
      return reportStudentRow(
        student,
        `<span class="chip ${balance ? 'chip-warning' : 'chip-success'}">${balance ? money(balance) + ' due' : 'Paid'}</span>`
      );
    }).join('')
    : emptyState('user', 'No admissions', 'New students admitted in this period will appear here.');

  const overlay = reportSheet('Admissions', `${data.admissions.length} students · ${data.range.label}`, `
    <div class="stats-strip" style="margin-bottom:14px">
      <div><b>${data.admissions.length}</b><span>Admissions</span></div>
      <div><b>${data.fullyPaid.length}</b><span>Fully paid</span></div>
      <div><b>${money(data.remainingTotal)}</b><span>Balance</span></div>
    </div>
    <p class="section-label">Admitted in this period</p>
    <div class="card list" style="margin-top:8px">${rows}</div>`);
  bindReportStudentRows(overlay);
}

function openFullyPaidReport(data) {
  const rows = data.fullyPaid.length
    ? data.fullyPaid.map((student) => reportStudentRow(
      student,
      `<span class="chip chip-success">${money(Number(student.fees && student.fees.total) || 0)}</span>`
    )).join('')
    : emptyState('check-circle', 'No fully paid students', 'Students admitted in this period with zero balance will appear here.');

  const overlay = reportSheet('Fully paid students', `${data.fullyPaid.length} students · ${data.range.label}`, `
    <div class="stats-strip" style="margin-bottom:14px">
      <div><b>${data.fullyPaid.length}</b><span>Fully paid</span></div>
      <div><b>${data.admissions.length}</b><span>Admissions</span></div>
      <div><b>${data.admissions.length ? Math.round((data.fullyPaid.length / data.admissions.length) * 100) : 0}%</b><span>Paid rate</span></div>
    </div>
    <p class="section-label">Zero balance</p>
    <div class="card list" style="margin-top:8px">${rows}</div>`);
  bindReportStudentRows(overlay);
}

function openRemainingFeesReport(data) {
  const schoolName = (data.db.school && data.db.school.name) || 'DriveDesk';
  const rows = data.remaining.length
    ? data.remaining.map(({ student, total, paid, balance }) => {
      const phone = reportPhone(student);
      const message = `Hello ${student.name}, this is ${schoolName}. Your course balance is ${money(balance)}. Please contact us to complete the payment.`;
      const whatsapp = reportWhatsAppLink(student, message);
      const actions = phone
        ? `<div class="report-contact">
            <a class="report-contact-btn" href="tel:+${esc(phone)}">${icon('phone')} Call</a>
            <a class="report-contact-btn" href="${esc(whatsapp)}" target="_blank" rel="noopener">${icon('message')} WhatsApp</a>
          </div>`
        : '<p class="tiny muted report-no-phone">No phone number on file</p>';

      return `<div class="report-person-card">
        <div class="report-person">
          ${avatar(student)}
          <div class="row-main">
            <p class="row-title">${esc(student.name)}</p>
            <p class="row-sub">${esc(student.id)} · ${money(paid)} of ${money(total)} paid</p>
          </div>
          <div class="report-due"><b>${money(balance)}</b><span>due</span></div>
        </div>
        ${actions}
      </div>`;
    }).join('')
    : emptyState('check-circle', 'No remaining fees', 'All students admitted in this period have paid in full.');

  reportSheet('Remaining fees', `${data.remaining.length} students · ${money(data.remainingTotal)} · ${data.range.label}`, `
    <div class="stats-strip" style="margin-bottom:14px">
      <div><b>${data.remaining.length}</b><span>Students</span></div>
      <div><b>${money(data.remainingTotal)}</b><span>To collect</span></div>
      <div><b>${data.admissions.length}</b><span>Admissions</span></div>
    </div>
    <p class="section-label">Follow up</p>
    <div class="report-person-list">${rows}</div>`);
}

function openGroupListReport(kind, data) {
  const isVehicle = kind === 'vehicle';
  const groups = isVehicle ? data.vehicles : data.instructors;
  const totalClasses = groups.reduce((sum, group) => sum + group.classes, 0);
  const active = groups.filter((group) => group.classes > 0 && group.name !== 'Unassigned').length;
  const covered = new Set();
  groups.forEach((group) => group.students.forEach((_, id) => covered.add(id)));
  const rows = groups.length
    ? groups.map((group) => reportGroupRow(group, kind)).join('')
    : emptyState(isVehicle ? 'car' : 'users', isVehicle ? 'No vehicles yet' : 'No instructors yet', 'Add them from More, then mark classes to see this report.');

  const overlay = reportSheet(
    isVehicle ? 'Vehicle sessions' : 'Trainer sessions',
    `${totalClasses} classes · ${data.range.label}`,
    `<div class="stats-strip" style="margin-bottom:14px">
      <div><b>${totalClasses}</b><span>Classes</span></div>
      <div><b>${active}</b><span>${isVehicle ? 'Vehicles' : 'Trainers'}</span></div>
      <div><b>${covered.size}</b><span>Students</span></div>
    </div>
    <p class="section-label">${isVehicle ? 'By vehicle' : 'By trainer'}</p>
    <div class="card list" style="margin-top:8px">${rows}</div>`
  );

  if (!overlay) return;
  overlay.querySelectorAll('[data-report-group]').forEach((button) => {
    button.addEventListener('click', () => {
      openGroupSessions(button.dataset.reportGroupKind, button.dataset.reportGroup, data);
    });
  });
}

function openGroupSessions(kind, name, data) {
  const groups = kind === 'vehicle' ? data.vehicles : data.instructors;
  const group = groups.find((item) => item.name === name);
  if (!group) return;
  const rows = group.rows.length
    ? group.rows.slice(0, 200).map((row) => reportSessionRow(row, kind)).join('')
    : emptyState('calendar', 'No classes', 'No present classes match this selection.');

  reportSheet(
    group.name,
    `${group.classes} classes · ${group.students.size} students · ${data.range.label}`,
    `<div class="stats-strip" style="margin-bottom:14px">
      <div><b>${group.classes}</b><span>Classes</span></div>
      <div><b>${group.students.size}</b><span>Students</span></div>
      <div><b>${group.lastAt ? fmtDateShort(group.lastAt) : '-'}</b><span>Last class</span></div>
    </div>
    <p class="section-label">Classes in this period</p>
    <div class="card list" style="margin-top:8px">${rows}</div>`
  );
}

function openReportDetail(kind) {
  const data = reportData();
  if (kind === 'admissions') openAdmissionsReport(data);
  else if (kind === 'fully-paid') openFullyPaidReport(data);
  else if (kind === 'remaining') openRemainingFeesReport(data);
  else if (kind === 'trainers') openGroupListReport('trainer', data);
  else if (kind === 'vehicles') openGroupListReport('vehicle', data);
}

function animateReportCounts() {
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  $$('[data-count]').forEach((element) => {
    const target = Math.max(0, Number(element.dataset.count) || 0);
    const isMoney = element.dataset.money === '1';
    const render = (value) => {
      const rounded = Math.round(value);
      element.textContent = isMoney ? money(rounded) : rounded.toLocaleString('en-IN');
    };
    if (reduce) {
      render(target);
      return;
    }
    const started = performance.now();
    const duration = 720;
    const tick = (now) => {
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      render(target * eased);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

function renderReports() {
  const data = reportData();
  const currentRange = reportRange(reportKind, new Date());
  const canNext = data.range.startKey < currentRange.startKey;
  const kinds = [['week', 'Week'], ['month', 'Month'], ['quarter', 'Quarter'], ['year', 'Year']];
  const activeInstructors = data.instructors.filter((group) => group.classes > 0 && group.name !== 'Unassigned').length;
  const activeVehicles = data.vehicles.filter((group) => group.classes > 0 && group.name !== 'Unassigned').length;

  const tabs = kinds.map(([kind, label]) => `
    <button class="report-period-tab${reportKind === kind ? ' on' : ''}" type="button" data-report-kind="${kind}" aria-pressed="${reportKind === kind}">${label}</button>`).join('');

  const instructorRows = data.instructors.length
    ? data.instructors.map((group) => reportGroupRow(group, 'trainer')).join('')
    : emptyState('users', 'No instructors yet', 'Add instructors from More, then mark classes to see their reports.');

  return `
  <header class="appbar">
    <button class="icon-btn" type="button" data-go="/more" aria-label="Back">${icon('arrow-left')}</button>
    <div class="appbar-title"><h1>Reports</h1></div>
    <div style="width:40px"></div>
  </header>
  <main class="page">
    <section class="report-period-card">
      <div class="report-period-tabs">${tabs}</div>
      <div class="report-period-nav">
        <button class="icon-btn" type="button" data-report-shift="-1" aria-label="Previous period">${icon('chevron-left')}</button>
        <div class="report-period-label"><b>${esc(data.range.label)}</b><span>Business report</span></div>
        <button class="icon-btn" type="button" data-report-shift="1" aria-label="Next period"${canNext ? '' : ' disabled'}>${icon('chevron-right')}</button>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2>Business snapshot</h2>
        <span class="tiny muted">Select for details</span>
      </div>
      <div class="report-grid">
        ${reportCard({
          label: 'Admissions',
          value: data.admissions.length,
          icon: 'user',
          sub: 'New students in period',
          action: 'admissions',
          tone: 'brand'
        })}
        ${reportCard({
          label: 'Fully paid students',
          value: data.fullyPaid.length,
          icon: 'check-circle',
          sub: `${data.admissions.length ? Math.round((data.fullyPaid.length / data.admissions.length) * 100) : 0}% of admissions`,
          action: 'fully-paid',
          tone: 'success'
        })}
        ${reportCard({
          label: 'Remaining fees',
          value: data.remainingTotal,
          icon: 'rupee',
          sub: `${data.remaining.length} student${data.remaining.length === 1 ? '' : 's'} to follow up`,
          action: 'remaining',
          tone: 'warning',
          money: true,
          span: true
        })}
        ${reportCard({
          label: 'Total collection',
          value: data.totalCollection,
          icon: 'trending',
          sub: 'Payments received in period',
          money: true,
          tone: 'success'
        })}
        ${reportCard({
          label: 'Total collection pending',
          value: data.pendingAll,
          icon: 'clock',
          sub: 'Across all students',
          money: true,
          tone: 'danger'
        })}
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2>Classes</h2>
        <span class="tiny muted">Present classes only</span>
      </div>
      <div class="report-grid">
        ${reportCard({
          label: 'Trainer sessions',
          value: data.sessions.length,
          icon: 'users',
          sub: `${activeInstructors} trainer${activeInstructors === 1 ? '' : 's'} active`,
          action: 'trainers',
          tone: 'brand'
        })}
        ${reportCard({
          label: 'Vehicle sessions',
          value: data.sessions.length,
          icon: 'car',
          sub: `${activeVehicles} vehicle${activeVehicles === 1 ? '' : 's'} active`,
          action: 'vehicles',
          tone: 'brand'
        })}
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2>By trainer</h2>
        <span class="tiny muted">${esc(data.range.label)}</span>
      </div>
      <div class="card list">${instructorRows}</div>
    </section>

    ${data.instructors.length ? '' : `<div class="sheet-note">${icon('users')}<span>No instructors configured. Add them in More → Instructors &amp; vehicles so every class can be credited correctly.</span></div>`}

    <p class="tiny muted center">Weeks start Monday. Quarters and years follow the financial calendar.</p>
  </main>`;
}

function bindReports() {
  const data = reportData();

  $$('[data-report-kind]').forEach((button) => {
    button.addEventListener('click', () => {
      reportKind = button.dataset.reportKind;
      reportAnchor = new Date();
      render();
    });
  });

  $$('[data-report-shift]').forEach((button) => {
    if (button.disabled) return;
    button.addEventListener('click', () => {
      const direction = Number(button.dataset.reportShift) || 1;
      const next = new Date(reportAnchor);
      if (reportKind === 'week') {
        next.setDate(next.getDate() + (7 * direction));
      } else {
        next.setDate(15);
        const months = reportKind === 'month' ? 1 : (reportKind === 'quarter' ? 3 : 12);
        next.setMonth(next.getMonth() + (months * direction));
      }
      reportAnchor = next;
      render();
    });
  });

  $$('[data-report-open]').forEach((button) => {
    button.addEventListener('click', () => openReportDetail(button.dataset.reportOpen));
  });

  $$('[data-report-group]').forEach((button) => {
    button.addEventListener('click', () => {
      openGroupSessions(button.dataset.reportGroupKind, button.dataset.reportGroup, data);
    });
  });

  animateReportCounts();
}

/* ------------------------------ more ------------------------------ */

function menuItem(opts) {
  const tag = opts.href ? 'a' : 'button';
  const attr = opts.href ? `href="${opts.href}"` : 'type="button"';
  const id = opts.id ? `id="${opts.id}"` : '';
  const danger = opts.danger ? ' danger' : '';
  return `<${tag} class="menu-item${danger}" ${attr} ${id} ${opts.action ? `data-more="${esc(opts.action)}"` : ''}>
    <span class="menu-ic ${opts.tone || ''}">${icon(opts.ic)}</span>
    <span class="menu-main"><b>${esc(opts.label)}</b>${opts.sub ? `<p>${esc(opts.sub)}</p>` : ''}</span>
    ${opts.badge ? `<span class="chip ${opts.badgeTone || ''}">${esc(opts.badge)}</span>` : icon('chevron-right', 'chev')}
  </${tag}>`;
}

function renderMore() {
  const db = Store.state();
  const st = Store.stats();
  const days = Math.max(0, Math.ceil((new Date(db.subscription.endsAt) - new Date()) / 86400000));
  const live = Store.mode() === 'api';
  const state = db.subscription.state || (days > 0 ? 'active' : 'expired');
  const renewalNote = state === 'expired'
    ? 'Access paused. Submit your payment reference to restore write access.'
    : (state === 'grace' ? 'Grace window active. Renew now to avoid interruption.' : days + ' day' + (days === 1 ? '' : 's') + ' left ? renews on ' + fmtDateShort(db.subscription.endsAt));

  return `
  <header class="appbar appbar-plain">
    <div class="appbar-title"><h1>More</h1></div>
  </header>
  <main class="page">
    <section class="card profile-mini">
      <div class="avatar avatar-text avatar-lg">${esc(UI.initials(db.user.name))}</div>
      <div class="row-main">
        <h2>${esc(db.user.name)}</h2>
        <p class="muted small">${esc(db.school.name)}</p>
        <span class="chip">${esc(db.user.role)}</span>
      </div>
      <button class="icon-btn" type="button" data-more="profile" aria-label="Edit profile">${icon('pen')}</button>
    </section>

    <section class="card premium-card">
      <div class="premium-top">
        <div>
          <span class="premium-tag">${icon('sparkles')} ${esc(db.subscription.plan)}</span>
          <h3>${money(db.subscription.price)}<span>/month</span></h3>
          <p>${days} day${days === 1 ? '' : 's'} left · renews on ${fmtDateShort(db.subscription.endsAt)}</p>
        </div>
        <div class="premium-ring">${days}<span>days</span></div>
      </div>
      <button class="btn btn-light btn-block" type="button" data-more="renew">
        ${icon('refresh')} Renew subscription
      </button>
    </section>

    <section class="stats-strip">
      <div><b>${st.active}</b><span>Active</span></div>
      <div><b>${st.completed}</b><span>Completed</span></div>
      <div><b>${st.pendingCount}</b><span>Fees due</span></div>
    </section>

    <section class="section">
      <p class="section-label">School</p>
      <div class="card list">
        ${menuItem({ ic: 'car', label: 'Instructors & vehicles', sub: db.school.instructors.length + ' instructors · ' + db.school.vehicles.length + ' vehicles', action: 'fleet' })}
        ${menuItem({ ic: 'users', label: 'Courses', sub: 'Per-class fee and course length', action: 'courses' })}
        ${menuItem({ ic: 'trending', label: 'Reports', sub: 'Business, trainer and vehicle reports', href: '#/reports' })}
      </div>
    </section>

    <section class="section">
      <p class="section-label">App</p>
      <div class="card list">
        ${menuItem({ ic: 'globe', label: 'Language', sub: window.I18N ? I18N.label() : 'English', action: 'language' })}
        ${menuItem({ ic: 'bell', label: 'Notifications', sub: 'Class reminders for students', action: 'notifications' })}
        ${menuItem({ ic: 'shield', label: 'Privacy & data', sub: 'Consent, exports and deletion', action: 'privacy' })}
        ${menuItem({ ic: 'message', label: 'Help & support', sub: 'hello@drivedesk.in', action: 'support' })}
        ${live ? '' : menuItem({ ic: 'refresh', label: 'Reset demo data', sub: 'Restore the sample school', action: 'reset' })}
        ${menuItem({ ic: 'logout', label: 'Log out', action: 'logout', danger: true })}
      </div>
    </section>

    <p class="version">DriveDesk prototype · v0.1 · Made for Indian driving schools</p>
  </main>`;
}

function openCoursesModal() {
  const overlay = UI.openModal(`
    <div class="sheet-head">
      <div>
        <h3>Courses</h3>
        <p class="muted small">These choices appear during admission.</p>
      </div>
      <button class="icon-btn" type="button" data-close aria-label="Close">${icon('x')}</button>
    </div>
    <div id="courses-body"></div>`);
  if (!overlay) return;
  const body = overlay.querySelector('#courses-body');
  if (!body) return;

  const courses = JSON.parse(JSON.stringify(courseCatalog()));

  const readForm = () => {
    body.querySelectorAll('[data-course]').forEach((card) => {
      const course = courses[Number(card.dataset.course)];
      if (!course) return;
      const nameInput = card.querySelector('[data-course-name]');
      if (nameInput) course.name = nameInput.value.trim();
      const rateInput = card.querySelector('[data-course-rate]');
      course.pricePerSession = Number(rateInput ? rateInput.value : 0) || 0;
      const daysInput = card.querySelector('[data-course-days]');
      course.defaultDays = Number(daysInput ? daysInput.value : 0) || 0;
    });
  };

  const paint = () => {
    body.innerHTML = `
      <p class="modal-text">Set each course name with a per-class fee and default course length. Admission fees are prefilled as per-class fee × sessions and can still be edited there.</p>
      <div class="course-edit-list">
        ${courses.map((course, courseIndex) => `
          <section class="course-edit" data-course="${courseIndex}">
            <div class="course-edit-head">
              <span class="menu-ic">${icon('clipboard')}</span>
              <input class="input" data-course-name maxlength="60" value="${esc(course.name)}" placeholder="Course name">
              <button class="icon-btn" type="button" data-remove-course="${courseIndex}" aria-label="Remove ${esc(course.name || 'course')}">${icon('trash')}</button>
            </div>
            <div class="pkg-grid">
              <label class="pkg-field">
                <span>Fee per class (₹)</span>
                <input class="input" data-course-rate type="number" inputmode="numeric" min="1" max="100000" step="1" value="${course.pricePerSession || ''}">
              </label>
              <label class="pkg-field">
                <span>Default classes</span>
                <input class="input" data-course-days type="number" inputmode="numeric" min="1" max="90" step="1" value="${course.defaultDays || ''}">
              </label>
            </div>
          </section>`).join('')}
      </div>
      <button class="btn btn-ghost btn-sm course-add" type="button" data-add-course>${icon('plus')} Add course</button>
      <div class="sheet-note">${icon('info')}<span>Changes apply to new admissions. Existing students keep the course and fee recorded with them.</span></div>
      <div class="modal-actions">
        <button class="btn btn-ghost" type="button" data-close>Cancel</button>
        <button class="btn btn-primary" type="button" id="courses-save">Save changes</button>
      </div>`;
    if (window.I18N) I18N.apply(body);
  };

  const validate = () => {
    if (!courses.length) return 'Add at least one course.';
    const courseNames = new Set();
    for (const course of courses) {
      if (!course.name) return 'Every course needs a name.';
      const courseKey = course.name.toLowerCase();
      if (courseNames.has(courseKey)) return `Course names must be unique. '${course.name}' is repeated.`;
      courseNames.add(courseKey);
      if (!Number.isInteger(course.pricePerSession) || course.pricePerSession < 1 || course.pricePerSession > 100000) {
        return `Enter a valid fee per class for ${course.name}.`;
      }
      if (!Number.isInteger(course.defaultDays) || course.defaultDays < 1 || course.defaultDays > 90) {
        return `Default classes for ${course.name} must be between 1 and 90.`;
      }
    }
    return '';
  };

  body.addEventListener('click', async (event) => {
    const addCourse = event.target.closest('[data-add-course]');
    if (addCourse) {
      readForm();
      if (courses.length >= 12) {
        UI.toast('You can add up to 12 courses', 'info');
        return;
      }
      courses.push({ name: 'New course', pricePerSession: 500, defaultDays: 20 });
      paint();
      const input = body.querySelector(`[data-course="${courses.length - 1}"] [data-course-name]`);
      if (input) {
        input.focus();
        input.select();
      }
      return;
    }

    const removeCourse = event.target.closest('[data-remove-course]');
    if (removeCourse) {
      readForm();
      if (courses.length === 1) {
        UI.toast('Keep at least one course', 'info');
        return;
      }
      courses.splice(Number(removeCourse.dataset.removeCourse), 1);
      paint();
      return;
    }

    const save = event.target.closest('#courses-save');
    if (!save) return;
    readForm();
    const problem = validate();
    if (problem) {
      UI.toast(problem, 'danger');
      return;
    }
    save.disabled = true;
    save.textContent = 'Saving...';
    try {
      await Store.updateSchool({ courses });
      UI.closeOverlay(overlay);
      UI.toast('Courses updated', 'success');
      render();
    } catch (error) {
      UI.toast(error.message || 'Could not save changes', 'danger');
      save.disabled = false;
      save.textContent = window.I18N ? I18N.t('Save changes') : 'Save changes';
    }
  });

  paint();
}

function openFleetModal() {
  const db = Store.state();
  const instructors = (db.school.instructors || []).slice();
  const vehicles = (db.school.vehicles || []).slice();

  const overlay = UI.openModal(`
    <div class="sheet-head">
      <h3>Instructors & vehicles</h3>
      <button class="icon-btn" type="button" data-close>${icon('x')}</button>
    </div>
    <div id="fleet-body"></div>`);
  if (!overlay) return;
  const body = overlay.querySelector('#fleet-body');
  if (!body) return;

  const row = (kind, name, index) => `
    <div class="class-row">
      <span class="menu-ic">${icon(kind === 'instructors' ? 'user' : 'car')}</span>
      <div class="row-main"><p class="row-title">${esc(name)}</p></div>
      <button class="icon-btn" type="button" data-remove="${kind}" data-index="${index}" aria-label="Remove ${esc(name)}">${icon('x')}</button>
    </div>`;

  const group = (kind, label, list, placeholder) => `
    <div class="field">
      <label class="label">${label}</label>
      <div class="card list" style="margin-bottom:8px">
        ${list.length
          ? list.map((name, index) => row(kind, name, index)).join('')
          : `<p class="muted small" style="padding:12px 14px">No ${label.toLowerCase()} added yet.</p>`}
      </div>
      <div style="display:flex;gap:8px">
        <input class="input" data-fleet-input="${kind}" maxlength="80" placeholder="${placeholder}">
        <button class="btn btn-primary" type="button" data-add="${kind}">Add</button>
      </div>
    </div>`;

  const paint = () => {
    body.innerHTML = `
      <p class="modal-text">These options appear when admitting a student and scheduling classes. Changes apply for the whole school.</p>
      ${group('instructors', 'Instructors', instructors, 'Instructor name')}
      ${group('vehicles', 'Vehicles', vehicles, 'e.g. MH12 AB 1234 · Swift')}
      <div class="modal-actions">
        <button class="btn btn-ghost" type="button" data-close>Cancel</button>
        <button class="btn btn-primary" type="button" id="fleet-save">Save changes</button>
      </div>`;
    if (window.I18N) I18N.apply(body);
  };

  const listFor = (kind) => (kind === 'instructors' ? instructors : vehicles);

  const add = (kind) => {
    const list = listFor(kind);
    const input = body.querySelector(`[data-fleet-input="${kind}"]`);
    const value = ((input && input.value) || '').trim();
    if (!value) {
      if (input) input.focus();
      return;
    }
    if (list.length >= 20) {
      UI.toast('You can add up to 20 ' + kind, 'info');
      return;
    }
    if (list.some((item) => item.toLowerCase() === value.toLowerCase())) {
      UI.toast('Already in the list', 'info');
      return;
    }
    list.push(value.slice(0, 80));
    paint();
    const next = body.querySelector(`[data-fleet-input="${kind}"]`);
    if (next) next.focus();
  };

  body.addEventListener('click', async (event) => {
    const addButton = event.target.closest('[data-add]');
    if (addButton) {
      add(addButton.dataset.add);
      return;
    }

    const remove = event.target.closest('[data-remove]');
    if (remove) {
      listFor(remove.dataset.remove).splice(Number(remove.dataset.index), 1);
      paint();
      return;
    }

    const save = event.target.closest('#fleet-save');
    if (!save) return;
    save.disabled = true;
    save.textContent = 'Saving...';
    try {
      await Store.updateSchool({ instructors, vehicles });
      UI.closeOverlay(overlay);
      UI.toast('Instructors and vehicles updated', 'success');
      render();
    } catch (error) {
      UI.toast(error.message || 'Could not save changes', 'danger');
      save.disabled = false;
      save.textContent = window.I18N ? I18N.t('Save changes') : 'Save changes';
    }
  });

  body.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || !event.target.matches('[data-fleet-input]')) return;
    event.preventDefault();
    add(event.target.dataset.fleetInput);
  });

  paint();
}

function bindMore() {
  const actions = {
    profile: () => UI.toast('Profile editing comes with accounts', 'info'),
    renew: () => {
      const sub = Store.state().subscription;
      const price = money(sub.price);
      const upiId = sub.upiId || 'drivedesk@upi';
      const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=DriveDesk&am=${sub.price}&cu=INR`;
      const overlay = UI.openModal(`
        <div class="sheet-head">
          <h3>Renew subscription</h3>
          <button class="icon-btn" type="button" data-close>${icon('x')}</button>
        </div>
        <p class="modal-text">Pay ${price} to <b>${esc(upiId)}</b> from any UPI app, then enter the 12-digit UTR below. Access continues after verification.</p>
        <div class="modal-actions" style="margin:0 0 8px">
          <a class="btn btn-ghost" href="${esc(upiLink)}">${icon('rupee')} Open UPI app</a>
          <button class="btn btn-ghost" type="button" id="renew-copy">Copy UPI ID</button>
        </div>
        <div class="review-total">
          <div class="review-row"><span>Plan</span><b>Monthly ? ${price}</b></div>
          <div class="review-row"><span>Valid for</span><b>30 days</b></div>
        </div>
        <div class="field">
          <label class="label" for="renew-utr">UTR / reference number <span class="req">*</span></label>
          <input class="input" id="renew-utr" inputmode="numeric" maxlength="12" placeholder="12-digit UTR">
        </div>
        <div class="field">
          <label class="label" for="renew-note">Note (optional)</label>
          <input class="input" id="renew-note" maxlength="240" placeholder="e.g. Paid via GPay">
        </div>
        <div id="renew-history"></div>
        <div class="modal-actions">
          <button class="btn btn-ghost" type="button" data-close>Later</button>
          <button class="btn btn-primary" type="button" id="renew-submit">${icon('refresh')} Submit for verification</button>
        </div>`);
      if (!overlay) return;

      const copy = overlay.querySelector('#renew-copy');
      if (copy) {
        copy.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(upiId);
            UI.toast('UPI ID copied', 'success');
          } catch (error) {
            UI.toast('UPI ID: ' + upiId, 'info');
          }
        });
      }

      const history = overlay.querySelector('#renew-history');
      Store.renewals().then((rows) => {
        if (!history || !rows.length) return;
        history.innerHTML = `
          <p class="section-label" style="margin-top:18px">Recent requests</p>
          <div class="list card">
            ${rows.slice(0, 3).map((row) => `
              <div class="class-row">
                <div class="time-col"><b>${fmtDateShort(row.submittedAt)}</b><span>${esc(row.utr)}</span></div>
                <div class="row-main">
                  <p class="row-title">${money(row.amount)}</p>
                  <p class="row-sub">${esc(row.status)}${row.note ? ' ? ' + esc(row.note) : ''}</p></div>
                <span class="chip ${row.status === 'approved' ? 'chip-success' : (row.status === 'rejected' ? 'chip-danger' : 'chip-warning')}">${esc(row.status)}</span>
              </div>`).join('')}
          </div>`;
        if (window.I18N) I18N.apply(history);
      }).catch(() => {});

      const submit = overlay.querySelector('#renew-submit');
      if (!submit) return;
      submit.addEventListener('click', async () => {
        const utr = ((overlay.querySelector('#renew-utr') || {}).value || '').replace(/\D/g, '');
        if (utr.length !== 12) {
          UI.toast('Enter the 12-digit UTR from your UPI app', 'danger');
          return;
        }
        submit.disabled = true;
        submit.textContent = window.I18N ? I18N.t('Submitting...') : 'Submitting...';
        try {
          await Store.submitRenewal(utr, ((overlay.querySelector('#renew-note') || {}).value || ''));
          UI.closeOverlay(overlay);
          UI.toast('Renewal submitted for verification', 'success');
          render();
        } catch (error) {
          UI.toast(error.message || 'Could not submit the renewal', 'danger');
          submit.disabled = false;
          submit.innerHTML = icon('refresh') + (window.I18N ? ' ' + I18N.t('Submit for verification') : ' Submit for verification');
        }
      });
    },
    fleet: () => openFleetModal(),
    courses: () => openCoursesModal(),
    language: () => {
      const next = window.I18N && I18N.current() === 'mr' ? 'en' : 'mr';
      if (window.I18N) I18N.set(next);
      render();
      UI.toast(next === 'mr' ? 'भाषा: मराठी' : 'Language: English', 'success');
    },
    notifications: () => UI.toast('Reminder settings — next', 'info'),
    privacy: () => UI.toast('Privacy controls — next', 'info'),
    support: () => UI.toast('Support: hello@drivedesk.in', 'info'),
    reset: async () => {
      const ok = await UI.confirm({
        title: 'Reset demo data?',
        message: 'All students, sessions and admissions you added will be removed and the sample school restored.',
        confirmText: 'Reset demo',
        danger: true
      });
      if (!ok) return;
      Store.reset();
      admission = null;
      admPad = null;
      studentFilter = 'all';
      studentQuery = '';
      sessionTab = 'today';
      go('/dashboard');
      setTimeout(() => UI.toast('Demo data restored', 'success'), 120);
    },
    logout: async () => {
      const ok = await UI.confirm({
        title: 'Log out?',
        message: 'You can sign back in with the demo account any time.',
        confirmText: 'Log out',
        danger: true
      });
      if (!ok) return;
      Store.logout();
      go('/login');
    }
  };

  const screen = document.querySelector('#view .screen');
  if (!screen) return;
  screen.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-more]');
    if (!trigger) return;
    const action = trigger.dataset.more;
    if (actions[action]) {
      event.preventDefault();
      actions[action]();
    }
  });
}
