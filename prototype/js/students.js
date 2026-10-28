/* DriveDesk prototype — students, profile and attendance */
'use strict';

function studentRow(s) {
  const done = Store.progress(s);
  const pct = s.package.days ? Math.min(100, Math.round((done / s.package.days) * 100)) : 0;
  const due = Math.max(0, s.fees.total - s.fees.paid);
  const search = (s.name + ' ' + s.phone + ' ' + s.id).toLowerCase();
  return `<a class="student-row" href="#/student/${encodeURIComponent(s.id)}"
      data-student-card="${esc(s.id)}"
      data-search="${esc(search)}"
      data-status="${esc(s.status)}"
      data-pending="${due > 0 ? '1' : '0'}">
    ${avatar(s)}
    <div class="student-main">
      <div class="row-between">
        <span class="row-title">${esc(s.name)}</span>
        ${s.status === 'completed' ? '<span class="chip chip-neutral">Completed</span>' : ''}
      </div>
      <p class="row-sub">${esc(s.id)} · ${esc(s.phone)}</p>
      <div class="mini-progress"><span style="width:${pct}%"></span></div>
      <div class="row-between">
        <span class="tiny muted">${done}/${s.package.days} classes</span>
        <span class="tiny ${due ? 'text-danger' : 'text-success'}" style="font-weight:650">${due ? money(due) + ' due' : 'Fees paid'}</span>
      </div>
    </div>
    ${icon('chevron-right', 'chev')}
  </a>`;
}

function renderStudents() {
  const db = Store.state();
  const active = db.students.filter((s) => s.status === 'active').length;
  return `
  <header class="appbar appbar-plain">
    <div class="appbar-title">
      <h1>Students</h1>
      <p class="muted small">${active} active · ${db.students.length} total</p>
    </div>
    <button class="icon-btn" type="button" data-go="/admission" aria-label="New admission">${icon('plus')}</button>
  </header>
  <div class="sticky-tools">
    <div class="search">
      ${icon('search')}
      <input id="stu-search" placeholder="Search name, phone or ID" value="${esc(studentQuery)}" autocomplete="off">
    </div>
    <div class="chip-row scroll-x" id="stu-filters">
      ${[['all', 'All'], ['active', 'Active'], ['pending', 'Fees due'], ['completed', 'Completed']]
        .map((pair) => `<button class="chip chip-select ${studentFilter === pair[0] ? 'on' : ''}" type="button" data-filter="${pair[0]}">${pair[1]}</button>`)
        .join('')}
    </div>
  </div>
  <main class="page">
    <p class="list-count muted" id="stu-count">${db.students.length} students</p>
    <div class="list card" id="stu-list">
      ${db.students.map(studentRow).join('')}
    </div>
    <div class="card" id="stu-empty" hidden>
      ${emptyState('users', 'No students found', 'Try a different search or filter.')}
    </div>
  </main>`;
}

function applyStudentFilter() {
  const q = studentQuery.trim().toLowerCase();
  let visible = 0;
  $$('[data-student-card]').forEach((el) => {
    const hay = el.dataset.search || '';
    const status = el.dataset.status;
    const isPending = el.dataset.pending === '1';
    const queryOk = !q || hay.indexOf(q) !== -1 || (el.dataset.studentCard || '').toLowerCase().indexOf(q) !== -1;
    const filterOk = studentFilter === 'all'
      || (studentFilter === 'active' && status === 'active')
      || (studentFilter === 'pending' && isPending)
      || (studentFilter === 'completed' && status === 'completed');
    const show = queryOk && filterOk;
    el.hidden = !show;
    if (show) visible += 1;
  });

  const count = document.getElementById('stu-count');
  if (count) count.textContent = `${visible} student${visible === 1 ? '' : 's'}`;
  const empty = document.getElementById('stu-empty');
  if (empty) empty.hidden = visible > 0;
}

function bindStudents() {
  const search = document.getElementById('stu-search');
  if (search) {
    search.addEventListener('input', () => {
      studentQuery = search.value;
      applyStudentFilter();
    });
  }

  $$('#stu-filters [data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      studentFilter = btn.dataset.filter;
      $$('#stu-filters [data-filter]').forEach((b) => b.classList.toggle('on', b === btn));
      applyStudentFilter();
    });
  });

  applyStudentFilter();
}

/* ------------------------------ profile ------------------------------ */

function sessionRow(x) {
  const present = x.status === 'present';
  return `<div class="session-row">
    <div class="session-ic ${present ? '' : 'absent'}">${icon(present ? 'check' : 'x')}</div>
    <div class="session-main">
      <b>Session ${x.sessionNo || 1} · ${fmtDate(x.date)} · ${fmtTime(x.date)}</b>
      <p>${present ? 'Present' : 'Absent'}${x.instructor ? ' · ' + esc(x.instructor) : ''}${x.signed ? ' · Signature captured' : ''}${x.notes ? ' · ' + esc(x.notes) : ''}</p>
    </div>
    ${x.signature
      ? `<button class="btn-tiny" type="button" data-view-sig="${esc(x.id)}">View sign</button>`
      : `<span class="chip ${present ? 'chip-success' : 'chip-danger'}">${present ? 'Present' : 'Absent'}</span>`}
  </div>`;
}

function renderStudent(id) {
  const s = Store.getStudent(id);
  if (!s) {
    return `<header class="appbar">
      <button class="icon-btn" type="button" data-go="/students">${icon('arrow-left')}</button>
      <div class="appbar-title"><h1>Student</h1></div>
      <div style="width:40px"></div>
    </header>
    <main class="page"><div class="card">${emptyState('alert', 'Student not found', 'Choose a student from the list.')}</div></main>`;
  }

  const done = Store.progress(s);
  const pct = s.package.days ? Math.min(100, Math.round((done / s.package.days) * 100)) : 0;
  const due = Math.max(0, s.fees.total - s.fees.paid);
  const paidPct = s.fees.total ? Math.min(100, Math.round((s.fees.paid / s.fees.total) * 100)) : 0;
  const sessions = (s.sessions || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date));

  return `
  <header class="appbar">
    <button class="icon-btn" type="button" data-go="/students" aria-label="Back">${icon('arrow-left')}</button>
    <div class="appbar-title"><h1>Student profile</h1></div>
    <button class="icon-btn" type="button" id="edit-student" aria-label="Edit">${icon('pen')}</button>
  </header>
  <main class="page">
    <section class="card profile-head">
      ${avatar(s, 'avatar-lg')}
      <h2>${esc(s.name)}</h2>
      <p class="muted">${esc(s.id)} · Joined ${fmtDate(s.createdAt || s.startDate)}</p>
      <div class="chip-row center">
        <span class="chip ${s.status === 'active' ? 'chip-success' : 'chip-neutral'}">${s.status === 'active' ? 'Active' : 'Completed'}</span>
        <span class="chip">${esc(s.package.type)}</span>
      </div>
      <div class="profile-actions">
        <a class="action" href="tel:+91${esc(s.phone)}">${icon('phone')}<span>Call</span></a>
        <a class="action" href="https://wa.me/91${esc(s.phone)}" target="_blank" rel="noopener">${icon('message')}<span>WhatsApp</span></a>
        <button class="action" type="button" id="profile-mark">${icon('check-circle')}<span>Attendance</span></button>
        <button class="action" type="button" id="profile-docs">${icon('file')}<span>Documents</span></button>
      </div>
    </section>

    <section class="card pad">
      <div class="row-between">
        <h3 style="font-size:14px;font-weight:750">Course progress</h3>
        <b style="font-size:13px">${done}/${s.package.days}</b>
      </div>
      <div class="progress"><span style="width:${pct}%"></span></div>
      <p class="muted small">${Math.max(0, s.package.days - done)} classes remaining · ${fmtClock(s.package.timing)} daily</p>
      <div class="detail-grid">
        <div><span>Timing</span><b>${fmtClock(s.package.timing)}</b></div>
        <div><span>Instructor</span><b>${esc(s.package.instructor)}</b></div>
        <div><span>Vehicle</span><b>${esc(s.package.vehicle)}</b></div>
        <div><span>Start date</span><b>${esc(s.startDate)}</b></div>
      </div>
    </section>

    <section class="card pad">
      <h3 style="font-size:14px;font-weight:750;margin-bottom:2px">Contact</h3>
      <div class="kv"><span>${icon('phone')}Mobile</span><b>+91 ${esc(s.phone)}</b></div>
      <div class="kv"><span>${icon('map-pin')}Address</span><b>${esc(s.address)}</b></div>
    </section>

    <section class="card pad">
      <div class="row-between">
        <h3 style="font-size:14px;font-weight:750">Fees</h3>
        <span class="chip ${due ? 'chip-warning' : 'chip-success'}">${due ? 'Balance due' : 'Paid in full'}</span>
      </div>
      <div class="progress"><span style="width:${paidPct}%"></span></div>
      <div class="row-between" style="font-size:12px">
        <span class="muted">Paid ${money(s.fees.paid)}</span>
        <b>${money(s.fees.total)} total</b>
      </div>
      <div class="review-total" style="margin-top:12px">
        <div class="review-row"><span>Balance</span><b>${money(due)}</b></div>
      </div>
      <button class="btn btn-ghost btn-block" type="button" id="record-payment" style="margin-top:12px">
        ${icon('receipt')} Record payment
      </button>
    </section>

    <section class="card pad" id="docs-card">
      <h3 style="font-size:14px;font-weight:750;margin-bottom:8px">Documents</h3>
      <div class="doc-row" id="doc-license">
        <div class="doc-ic">${icon('id')}</div>
        <div class="doc-main">
          <b>Learner's licence</b>
          <p>${s.license.present ? esc(s.license.number || 'Added') : 'Not provided'}</p>
        </div>
        <span class="chip ${s.license.present ? 'chip-success' : 'chip-neutral'}">${s.license.present ? 'On file' : 'Missing'}</span>
      </div>
      <div class="doc-row" id="doc-agreement">
        <div class="doc-ic">${icon('file')}</div>
        <div class="doc-main">
          <b>Signed agreement</b>
          <p>${s.agreement.signed ? 'Accepted ' + fmtDate(s.agreement.signedAt) : 'Not signed'}</p>
        </div>
        ${icon('chevron-right', 'chev')}
      </div>
      <div class="doc-row" id="doc-photo">
        <div class="doc-ic">${icon('camera')}</div>
        <div class="doc-main">
          <b>Student photo</b>
          <p>${s.photo ? 'Uploaded' : 'No photo'}</p>
        </div>
        ${icon('chevron-right', 'chev')}
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2>Recent sessions</h2>
        <span class="muted small">${sessions.length} recorded</span>
      </div>
      <div class="card list">
        ${sessions.length
          ? sessions.slice(0, 6).map(sessionRow).join('')
          : emptyState('calendar', 'No sessions yet', 'Mark attendance to start the student log.')}
      </div>
    </section>
  </main>`;
}

function bindStudent(id) {
  const s = Store.getStudent(id);
  if (!s) return;

  const mark = document.getElementById('profile-mark');
  if (mark) mark.addEventListener('click', () => openAttendance(s.id));

  const docs = document.getElementById('profile-docs');
  if (docs) {
    docs.addEventListener('click', () => {
      const card = document.getElementById('docs-card');
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  const record = document.getElementById('record-payment');
  if (record) record.addEventListener('click', () => openPayment(s));

  const edit = document.getElementById('edit-student');
  if (edit) edit.addEventListener('click', () => openEditStudent(s.id));

  const agreement = document.getElementById('doc-agreement');
  if (agreement) agreement.addEventListener('click', () => showAgreement(s));

  const photo = document.getElementById('doc-photo');
  if (photo) {
    photo.addEventListener('click', () => {
      if (!s.photo) {
        UI.toast('No photo uploaded for this student', 'info');
        return;
      }
      UI.openModal(`
        <div class="sheet-head">
          <h3>Student photo</h3>
          <button class="icon-btn" type="button" data-close>${icon('x')}</button>
        </div>
        <img src="${s.photo}" alt="" style="width:100%;border-radius:16px">`, { center: true });
    });
  }

  const license = document.getElementById('doc-license');
  if (license) {
    license.addEventListener('click', () => {
      const body = s.license.present
        ? `<div class="kv"><span>Number</span><b>${esc(s.license.number || '—')}</b></div>
           <div class="kv"><span>Valid till</span><b>${esc(s.license.expiry || '—')}</b></div>
           <div class="sheet-note">${icon('shield')}<span>Production will store the licence scan or photo alongside these details.</span></div>`
        : '<p class="modal-text">No licence details were captured at admission. You can add them from Edit student.</p>';
      UI.openModal(`
        <div class="sheet-head">
          <h3>Learner's licence</h3>
          <button class="icon-btn" type="button" data-close>${icon('x')}</button>
        </div>
        ${body}`, { center: true });
    });
  }

  $$('[data-view-sig]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const record2 = (s.sessions || []).find((x) => x.id === btn.dataset.viewSig);
      if (!record2 || !record2.signature) return;
      UI.openModal(`
        <div class="sheet-head">
          <h3>Session signature</h3>
          <button class="icon-btn" type="button" data-close>${icon('x')}</button>
        </div>
        <p class="muted small">${fmtDate(record2.date)} · ${fmtTime(record2.date)}</p>
        <div class="sig-preview"><img src="${record2.signature}" alt="Student signature"></div>`, { center: true });
    });
  });
}

function openEditStudent(studentId) {
  const s = Store.getStudent(studentId);
  if (!s) {
    UI.toast('Student not found', 'danger');
    return;
  }

  const db = Store.state();
  const instructors = ((db.school && db.school.instructors) || []).slice();
  const vehicles = ((db.school && db.school.vehicles) || []).slice();
  const configuredTypes = courseCatalog().map((course) => course.name);
  const typeOptions = configuredTypes.includes(s.package.type) ? configuredTypes : [s.package.type, ...configuredTypes];
  const modes = Array.from(new Set([s.fees.mode, 'Cash', 'UPI', 'Card', 'Other'].filter(Boolean)));
  const withBlank = (list, selected) => {
    const values = Array.from(new Set((list || []).filter(Boolean)));
    if (selected && !values.includes(selected)) values.unshift(selected);
    return `<option value="" ${selected ? '' : 'selected'}>Unassigned</option>`
      + values.map((item) => `<option value="${esc(item)}" ${item === selected ? 'selected' : ''}>${esc(item)}</option>`).join('');
  };

  let photo = null;
  const overlay = UI.openModal(`
    <div class="sheet-head">
      <div>
        <h3>Edit student</h3>
        <p class="muted small">${esc(s.id)} · changes apply immediately</p>
      </div>
      <button class="icon-btn" type="button" data-close>${icon('x')}</button>
    </div>

    <form id="edit-student-form" novalidate>
      <div class="photo-row">
        <button class="photo-pick" id="edit-photo-btn" type="button" aria-label="Change student photo">
          ${s.photo ? `<img src="${s.photo}" alt="">` : `${icon('camera')}<span>Add photo</span>`}
        </button>
        <input type="file" id="edit-photo-file" accept="image/*" hidden>
        <div class="photo-copy">
          <b>Student photo</b>
          <p>Tap to replace. Used on the ID card and profile.</p>
        </div>
      </div>

      <p class="section-label" style="margin-top:16px">Personal details</p>
      <div class="field">
        <label class="label" for="edit-name">Full name <span class="req">*</span></label>
        <input class="input" id="edit-name" value="${esc(s.name)}" autocomplete="name">
      </div>
      <div class="field">
        <label class="label" for="edit-phone">Mobile number <span class="req">*</span></label>
        <input class="input" id="edit-phone" inputmode="numeric" maxlength="10" value="${esc(s.phone)}" autocomplete="tel">
      </div>
      <div class="field">
        <label class="label" for="edit-address">Address <span class="req">*</span></label>
        <textarea class="textarea" id="edit-address" rows="3">${esc(s.address)}</textarea>
      </div>

      <p class="section-label" style="margin-top:16px">Course &amp; schedule</p>
      <div class="field">
        <label class="label" for="edit-type">Course</label>
        <select class="select" id="edit-type">${selectOptions(typeOptions, s.package.type)}</select>
      </div>
      <div class="inline-fields" style="margin-top:14px">
        <div class="field">
          <label class="label" for="edit-days">Course length (classes) <span class="req">*</span></label>
          <input class="input" id="edit-days" type="number" min="1" max="90" value="${s.package.days}">
        </div>
        <div class="field">
          <label class="label" for="edit-timing">Class timing <span class="req">*</span></label>
          <input class="input" id="edit-timing" type="time" value="${esc(s.package.timing)}">
        </div>
      </div>
      <div class="field">
        <label class="label" for="edit-start">Start date <span class="req">*</span></label>
        <input class="input" id="edit-start" type="date" value="${esc(s.startDate || '')}">
      </div>
      <div class="inline-fields" style="margin-top:14px">
        <div class="field">
          <label class="label" for="edit-instructor">Instructor</label>
          <select class="select" id="edit-instructor">${withBlank(instructors, s.package.instructor)}</select>
        </div>
        <div class="field">
          <label class="label" for="edit-vehicle">Vehicle</label>
          <select class="select" id="edit-vehicle">${withBlank(vehicles, s.package.vehicle)}</select>
        </div>
      </div>

      <p class="section-label" style="margin-top:16px">Fees &amp; licence</p>
      <div class="inline-fields">
        <div class="field">
          <label class="label" for="edit-total">Total course fee <span class="req">*</span></label>
          <input class="input" id="edit-total" type="number" min="1" value="${s.fees.total}">
        </div>
        <div class="field">
          <label class="label" for="edit-mode">Payment mode</label>
          <select class="select" id="edit-mode">${selectOptions(modes, s.fees.mode)}</select>
        </div>
      </div>
      <p class="field-hint" style="margin-top:6px">Already paid: ${money(s.fees.paid)}</p>

      <div class="switch-row" style="margin-top:14px">
        <div>
          <b>Learner's licence</b>
          <p>Store the licence number and expiry</p>
        </div>
        <input class="switch" id="edit-license-present" type="checkbox" ${s.license.present ? 'checked' : ''}>
      </div>
      <div id="edit-license-fields" class="inline-fields" style="margin-top:10px" ${s.license.present ? '' : 'hidden'}>
        <div class="field">
          <label class="label" for="edit-license-number">Licence number</label>
          <input class="input" id="edit-license-number" value="${esc(s.license.number || '')}">
        </div>
        <div class="field">
          <label class="label" for="edit-license-expiry">Valid till</label>
          <input class="input" id="edit-license-expiry" type="date" value="${esc(s.license.expiry || '')}">
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn btn-ghost" type="button" data-close>Cancel</button>
        <button class="btn btn-primary" type="submit" id="edit-save">${icon('check')} Save changes</button>
      </div>
    </form>`);
  if (!overlay) return;

  const form = overlay.querySelector('#edit-student-form');
  const saveBtn = overlay.querySelector('#edit-save');
  const licenceToggle = overlay.querySelector('#edit-license-present');
  const licenceFields = overlay.querySelector('#edit-license-fields');
  const photoBtn = overlay.querySelector('#edit-photo-btn');
  const photoFile = overlay.querySelector('#edit-photo-file');

  if (licenceToggle && licenceFields) {
    const syncLicence = () => { licenceFields.hidden = !licenceToggle.checked; };
    licenceToggle.addEventListener('change', syncLicence);
    syncLicence();
  }

  if (photoBtn && photoFile) {
    photoBtn.addEventListener('click', () => photoFile.click());
    photoFile.addEventListener('change', async (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      try {
        photo = await UI.fileToDataURL(file, 520, 0.8);
        photoBtn.innerHTML = `<img src="${photo}" alt="">`;
        UI.toast('New photo ready to save', 'success');
      } catch (error) {
        UI.toast('Could not read that image', 'danger');
      }
    });
  }

  const read = (id) => {
    const el = overlay.querySelector('#' + id);
    return el ? el.value : '';
  };
  const readChecked = (id) => {
    const el = overlay.querySelector('#' + id);
    return !!(el && el.checked);
  };

  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const patch = {
        name: read('edit-name').trim(),
        phone: read('edit-phone').replace(/\D/g, ''),
        address: read('edit-address').trim(),
        type: read('edit-type'),
        days: Number(read('edit-days')),
        timing: read('edit-timing'),
        startDate: read('edit-start'),
        instructor: read('edit-instructor'),
        vehicle: read('edit-vehicle'),
        total: Number(read('edit-total')),
        mode: read('edit-mode'),
        licensePresent: readChecked('edit-license-present'),
        licenseNumber: read('edit-license-number').trim(),
        licenseExpiry: read('edit-license-expiry')
      };

      let error = '';
      if (patch.name.length < 2) error = 'Enter the student name.';
      else if (!/^\d{10}$/.test(patch.phone)) error = 'Enter a valid 10-digit mobile number.';
      else if (patch.address.length < 3) error = 'Enter the address.';
      else if (!Number.isInteger(patch.days) || patch.days < 1 || patch.days > 90) error = 'Course length must be between 1 and 90 classes.';
      else if (!patch.timing) error = 'Pick a class timing.';
      else if (!patch.startDate) error = 'Pick a start date.';
      else if (!Number.isFinite(patch.total) || patch.total < 1) error = 'Enter a valid total course fee.';
      else if (patch.total < s.fees.paid) error = 'Total fee cannot be less than the amount already paid.';
      else if (patch.licensePresent && patch.licenseNumber.length < 3) error = 'Enter the learner licence number.';

      if (error) {
        UI.toast(error, 'danger');
        return;
      }

      if (photo) patch.photo = photo;
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
      try {
        await Store.updateStudent(s.id, patch);
        UI.closeModal();
        UI.toast('Student details updated', 'success');
        render();
      } catch (err) {
        UI.toast(err.message || 'Could not update student', 'danger');
        saveBtn.disabled = false;
        saveBtn.innerHTML = icon('check') + ' Save changes';
      }
    });
  }
}

function showAgreement(s) {
  UI.openModal(`
    <div class="sheet-head">
      <div>
        <h3>Signed agreement</h3>
        <p class="muted small">${esc(s.name)} · ${esc(s.id)}</p>
      </div>
      <button class="icon-btn" type="button" data-close>${icon('x')}</button>
    </div>
    <div class="kv"><span>Signed on</span><b>${fmtDate(s.agreement.signedAt)}</b></div>
    <div class="kv"><span>Version</span><b>${esc(s.agreement.version || 'v1')}</b></div>
    <div class="kv"><span>Status</span><b class="text-success">Accepted</b></div>
    <div class="sig-preview">
      ${s.agreement.signature
        ? `<img src="${s.agreement.signature}" alt="Signature">`
        : '<div class="sig-ph">Signature captured on the student device at admission.</div>'}
    </div>
    <div class="sheet-note">${icon('shield')}<span>Demo note: production will also store a SHA-256 hash, timestamp, IP and device ID as proof of signing.</span></div>
  `);
}


/* ------------------------------ payments ------------------------------ */

function openPayment(s) {
  const due = Math.max(0, s.fees.total - s.fees.paid);
  if (!due) {
    UI.toast('This student has paid in full', 'info');
    return;
  }
  const modes = ['Cash', 'UPI', 'Card', 'Other'];
  const overlay = UI.openModal(`
    <div class="sheet-head">
      <div>
        <h3>Record payment</h3>
        <p class="muted small">${esc(s.name)} ? ${money(due)} balance</p>
      </div>
      <button class="icon-btn" type="button" data-close>${icon('x')}</button>
    </div>
    <div class="field">
      <label class="label" for="pay-amount">Amount <span class="req">*</span></label>
      <input class="input" id="pay-amount" type="number" inputmode="numeric" min="1" max="${due}" value="${due}">
    </div>
    <div class="field">
      <label class="label" for="pay-mode">Payment mode</label>
      <select class="input" id="pay-mode">
        ${modes.map((m) => `<option value="${esc(m)}" ${m === (s.fees.mode || 'Cash') ? 'selected' : ''}>${esc(m)}</option>`).join('')}
      </select>
    </div>
    <div class="field">
      <label class="label" for="pay-note">Note (optional)</label>
      <input class="input" id="pay-note" maxlength="200" placeholder="e.g. Balance fees">
    </div>
    <div class="review-total">
      <div class="review-row"><span>Balance after payment</span><b id="pay-after">${money(0)}</b></div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" type="button" data-close>Cancel</button>
      <button class="btn btn-primary" type="button" id="pay-save">${icon('receipt')} Record payment</button>
    </div>`);
  if (!overlay) return;

  const amount = overlay.querySelector('#pay-amount');
  const after = overlay.querySelector('#pay-after');
  const save = overlay.querySelector('#pay-save');
  const sync = () => {
    const entered = Number(amount && amount.value) || 0;
    if (after) after.textContent = money(Math.max(0, due - entered));
  };
  if (amount) amount.addEventListener('input', sync);
  sync();

  if (!save) return;
  save.addEventListener('click', async () => {
    const value = Number(amount && amount.value) || 0;
    if (value < 1 || value > due) {
      UI.toast('Enter an amount between ' + money(1) + ' and ' + money(due), 'danger');
      return;
    }
    save.disabled = true;
    save.textContent = 'Saving...';
    try {
      await Store.addPayment(s.id, {
        amount: value,
        mode: (overlay.querySelector('#pay-mode') || {}).value || 'Cash',
        note: (overlay.querySelector('#pay-note') || {}).value || ''
      });
      UI.closeOverlay(overlay);
      UI.toast('Payment of ' + money(value) + ' recorded', 'success');
      render();
    } catch (error) {
      UI.toast(error.message || 'Could not record the payment', 'danger');
      save.disabled = false;
      save.innerHTML = icon('receipt') + ' Record payment';
    }
  });
}

function openCollectPayment() {
  const db = Store.state();
  const pending = db.students
    .filter((s) => s.fees.total > s.fees.paid)
    .sort((a, b) => (b.fees.total - b.fees.paid) - (a.fees.total - a.fees.paid));
  if (!pending.length) {
    UI.toast('No pending fees — all students have paid in full', 'info');
    return;
  }
  if (pending.length === 1) {
    openPayment(pending[0]);
    return;
  }
  const overlay = UI.openModal(`
    <div class="sheet-head">
      <div>
        <h3>Collect payment</h3>
        <p class="muted small">${pending.length} student${pending.length === 1 ? '' : 's'} with a balance</p>
      </div>
      <button class="icon-btn" type="button" data-close>${icon('x')}</button>
    </div>
    <div class="list card">
      ${pending.map((s) => `
        <div class="class-row" data-collect="${esc(s.id)}">
          ${avatar(s)}
          <div class="row-main">
            <p class="row-title">${esc(s.name)}</p>
            <p class="row-sub">${esc(s.package.type)}</p>
          </div>
          <b style="font-size:12.5px;color:var(--warning)">${money(s.fees.total - s.fees.paid)}</b>
        </div>`).join('')}
    </div>`);
  if (!overlay) return;
  overlay.addEventListener('click', (event) => {
    const row = event.target.closest('[data-collect]');
    if (!row) return;
    const s = Store.getStudent(row.dataset.collect);
    UI.closeOverlay(overlay);
    if (s) openPayment(s);
  });
}

/* ------------------------------ attendance ------------------------------ */

function openAttendance(studentId) {
  const s = Store.getStudent(studentId);
  if (!s) {
    UI.toast('Student not found', 'danger');
    return;
  }
  const done = Store.progress(s);
  const remaining = Math.max(0, s.package.days - done);
  const db = Store.state();
  const instructors = ((db.school && db.school.instructors) || []).slice();
  const preferred = instructors.indexOf(s.package.instructor) >= 0 ? s.package.instructor : instructors[0];
  const todayKey = Store.keyOf(new Date());
  const todaySessions = (s.sessions || []).filter((x) => Store.keyOf(new Date(x.date)) === todayKey);
  const nextSessionNo = Math.max(
    todaySessions.reduce((max, x) => Math.max(max, Number(x.sessionNo) || 0), 0),
    todaySessions.length
  ) + 1;
  const instructorField = instructors.length
    ? `<div class="field">
        <label class="label" for="att-instructor">Instructor <span class="req">*</span></label>
        <select class="input" id="att-instructor">${selectOptions(instructors, preferred)}</select>
        <p class="tiny muted">This class is credited to the instructor in reports.</p>
      </div>`
    : `<div class="sheet-note">${icon('users')}<span>No instructors yet. Add one before marking a class. <button class="link" type="button" id="att-manage">Add instructor</button></span></div>`;

  UI.openModal(`
    <div class="sheet-head">
      <div>
        <h3>Mark attendance</h3>
        <p class="muted small">${esc(s.name)} · ${done}/${s.package.days} classes done</p>
      </div>
      <button class="icon-btn" type="button" data-close>${icon('x')}</button>
    </div>
    <div class="att-student">
      ${avatar(s)}
      <div class="row-main">
        <b>${esc(s.name)}</b>
        <p>${esc(s.package.type)} · ${fmtClock(s.package.timing)}</p>
      </div>
      <span class="chip chip-brand">${done}/${s.package.days}</span>
    </div>
    <p class="tiny muted" style="margin:8px 0 2px">Sessions are numbered automatically for today. Each present class counts once.</p>

    ${instructorField}

    <div class="field">
      <label class="label" for="att-count">Classes attended today</label>
      <div class="count-picker" id="att-count-row">
        ${[1, 2, 3].map((n) => `<button class="chip chip-select${n === 1 ? ' on' : ''}" type="button" data-count="${n}" ${n > remaining ? 'disabled' : ''} aria-pressed="${n === 1}">${n}</button>`).join('')}
        <input class="input count-input" id="att-count" type="number" inputmode="numeric" min="1" max="${Math.max(1, remaining)}" step="1" value="1" />
      </div>
      <p class="tiny muted" id="att-count-hint">Will mark Session ${nextSessionNo} today.</p>
    </div>

    <div class="field">
      <label class="label">Student signature <span class="req">*</span></label>
      <div class="sig-wrap">
        <canvas id="att-sig"></canvas>
        <div class="sig-hint" id="att-hint">${icon('pen')}<span>Sign here as proof</span></div>
      </div>
      <div class="sig-actions">
        <span class="tiny muted">Signature is timestamped</span>
        <button class="link" type="button" id="att-clear">Clear</button>
      </div>
    </div>

    <div class="field">
      <label class="label" for="att-notes">Session notes (optional)</label>
      <input class="input" id="att-notes" placeholder="e.g. Reverse parking practice">
    </div>

    <label class="check inline" style="margin-top:12px">
      <input type="checkbox" checked id="att-geo">
      <span>Attach time &amp; location with the record</span>
    </label>

    <div class="modal-actions">
      <button class="btn btn-ghost" type="button" id="att-absent">Mark absent</button>
      <button class="btn btn-primary" type="button" id="att-save" disabled>${icon('check')} Mark present</button>
    </div>
  `);

  const canvas = document.getElementById('att-sig');
  const hint = document.getElementById('att-hint');
  const saveBtn = document.getElementById('att-save');
  const instructorSelect = document.getElementById('att-instructor');
  const countInput = document.getElementById('att-count');
  const countHint = document.getElementById('att-count-hint');
  const countButtons = Array.from(document.querySelectorAll('#att-count-row [data-count]'));
  const pad = UI.signaturePad(canvas);

  const countValue = () => {
    const value = Number(countInput ? countInput.value : 1);
    return Number.isInteger(value) ? value : NaN;
  };

  const countValid = () => {
    const count = countValue();
    return count >= 1 && count <= remaining;
  };

  const syncCount = () => {
    const count = countValue();
    const valid = countValid();
    countButtons.forEach((button) => {
      const on = valid && count === Number(button.dataset.count);
      button.classList.toggle('on', on);
      button.setAttribute('aria-pressed', String(on));
    });
    if (countHint) {
      if (remaining < 1) countHint.textContent = 'No classes are remaining in this course.';
      else if (!valid) countHint.textContent = `Enter a whole number from 1 to ${remaining}.`;
      else if (count === 1) countHint.textContent = `Will mark Session ${nextSessionNo} today.`;
      else countHint.textContent = `Will mark ${count} classes: Session ${nextSessionNo} to Session ${nextSessionNo + count - 1}.`;
    }
    if (saveBtn) {
      saveBtn.innerHTML = icon('check') + (valid && count > 1 ? ` Mark ${count} classes` : ' Mark present');
    }
  };

  const sync = () => {
    const drawn = !pad.isEmpty();
    const hasInstructor = !!(instructorSelect && instructorSelect.value);
    if (hint) hint.classList.toggle('hide', drawn);
    if (saveBtn) saveBtn.disabled = !(drawn && hasInstructor && countValid());
  };

  canvas.addEventListener('sig:change', sync);
  if (instructorSelect) instructorSelect.addEventListener('change', sync);
  countButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (!countInput || button.disabled) return;
      countInput.value = button.dataset.count;
      syncCount();
      sync();
    });
  });
  if (countInput) {
    countInput.addEventListener('input', () => { syncCount(); sync(); });
    countInput.addEventListener('blur', () => {
      const value = Math.floor(Number(countInput.value) || 1);
      countInput.value = Math.max(1, Math.min(Math.max(1, remaining), value));
      syncCount();
      sync();
    });
  }
  syncCount();

  const manage = document.getElementById('att-manage');
  if (manage) manage.addEventListener('click', () => {
    UI.closeModal();
    if (typeof openFleetModal === 'function') openFleetModal();
  });

  const clear = document.getElementById('att-clear');
  if (clear) clear.addEventListener('click', () => { pad.clear(); sync(); });

  saveBtn.addEventListener('click', async () => {
    if (pad.isEmpty()) return;
    const instructor = instructorSelect ? instructorSelect.value : '';
    if (!instructor) {
      UI.toast('Add an instructor before marking a class', 'danger');
      return;
    }
    const count = countValue();
    if (!countValid()) {
      UI.toast(remaining < 1 ? 'No classes are remaining in this course' : `Enter a number from 1 to ${remaining}`, 'danger');
      return;
    }
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    try {
      await Store.markAttendance(s.id, {
        signature: pad.dataURL(),
        instructor,
        count,
        notes: val('att-notes'),
        location: checked('att-geo')
      });
      UI.closeModal();
      UI.toast(count === 1 ? 'Attendance marked - signature saved' : `${count} classes marked - signature saved`, 'success');
      render();
    } catch (error) {
      UI.toast(error.message || 'Could not mark attendance', 'danger');
      syncCount();
      sync();
    }
  });

  const absent = document.getElementById('att-absent');
  if (absent) {
    absent.addEventListener('click', async () => {
      const ok = await UI.confirm({
        title: 'Mark as absent?',
        message: 'Session ' + nextSessionNo + ' will be marked absent for ' + s.name + '.',
        confirmText: 'Mark absent',
        danger: true
      });
      if (!ok) return;
      absent.disabled = true;
      try {
        await Store.markAttendance(s.id, { absent: true, location: checked('att-geo') });
        UI.closeModal();
        UI.toast('Marked absent', 'info');
        render();
      } catch (error) {
        UI.toast(error.message || 'Could not mark absent', 'danger');
        absent.disabled = false;
      }
    });
  }
}
