/* DriveDesk prototype — new admission wizard */
'use strict';

function newAdmission() {
  const db = Store.state();
  const courses = courseCatalog();
  const course = courses[0] || { name: courseTypes[0], pricePerSession: 0, defaultDays: 20 };
  const days = course.defaultDays || 20;
  return {
    step: 1,
    photo: null,
    name: '',
    phone: '',
    address: '',
    type: course.name,
    days,
    timing: '07:00',
    instructor: (db.school.instructors || [])[0] || '',
    vehicle: (db.school.vehicles || [])[0] || '',
    startDate: Store.keyOf(new Date()),
    total: calculateCourseFee(course, days),
    paid: 0,
    mode: 'UPI',
    licensePresent: false,
    licenseNumber: '',
    licenseExpiry: '',
    agree: false,
    signature: null,
    errors: {}
  };
}

function renderAdmission() {
  if (!admission) admission = newAdmission();
  const a = admission;
  const step = a.step;
  let body = '';
  if (step === 1) body = admissionStep1(a);
  else if (step === 2) body = admissionStep2(a);
  else if (step === 3) body = admissionStep3(a);
  else body = admissionStep4(a);

  return `
  <div class="wizard">
    <header class="appbar">
      <button class="icon-btn" id="adm-exit" type="button" aria-label="Close">${icon('x')}</button>
      <div class="appbar-title">
        <h1>New admission</h1>
        <p class="muted small">Step ${step} of 4</p>
      </div>
      <div style="width:40px"></div>
    </header>
    <div class="wizard-progress"><span style="width:${step * 25}%"></span></div>
    <div class="wizard-body">
      <div>
        <p class="step-eyebrow">Step ${step} of 4</p>
        <h2 class="step-title">${stepTitles[step]}</h2>
        <p class="step-sub">${stepSubs[step]}</p>
      </div>
      ${body}
    </div>
    <footer class="wizard-footer">
      ${step > 1 ? `<button class="btn btn-ghost btn-prev" id="adm-prev" type="button">Back</button>` : ''}
      ${step < 4
        ? `<button class="btn btn-primary" id="adm-next" type="button">Continue ${icon('arrow-right')}</button>`
        : `<button class="btn btn-primary" id="adm-submit" type="button" disabled>${icon('check')} Complete admission</button>`}
    </footer>
  </div>`;
}

function admissionStep1(a) {
  const e = a.errors || {};
  return `
  <section class="card pad">
    <div class="photo-row">
      <button class="photo-pick" id="photo-btn" type="button" aria-label="Add student photo">
        ${a.photo ? `<img src="${a.photo}" alt="">` : `${icon('camera')}<span>Add photo</span>`}
      </button>
      <input type="file" id="f-photo" accept="image/*" hidden>
      <div class="photo-copy">
        <b>Student photo</b>
        <p>Optional. Used on the ID card and the signed agreement.</p>
      </div>
    </div>

    <div class="field">
      <label class="label" for="f-name">Full name <span class="req">*</span></label>
      <input class="input ${e.name ? 'invalid' : ''}" id="f-name" value="${esc(a.name)}" placeholder="e.g. Rahul Sharma" autocomplete="name">
      ${e.name ? `<p class="field-error">${esc(e.name)}</p>` : ''}
    </div>

    <div class="field">
      <label class="label" for="f-phone">Mobile number <span class="req">*</span></label>
      <input class="input ${e.phone ? 'invalid' : ''}" id="f-phone" inputmode="numeric" maxlength="10" value="${esc(a.phone)}" placeholder="10-digit mobile">
      ${e.phone ? `<p class="field-error">${esc(e.phone)}</p>` : '<p class="field-hint">Used for class reminders and WhatsApp updates.</p>'}
    </div>

    <div class="field">
      <label class="label" for="f-address">Address <span class="req">*</span></label>
      <textarea class="textarea ${e.address ? 'invalid' : ''}" id="f-address" rows="3" placeholder="Area, city">${esc(a.address)}</textarea>
      ${e.address ? `<p class="field-error">${esc(e.address)}</p>` : ''}
    </div>
  </section>`;
}

function admissionStep2(a) {
  const db = Store.state();
  const e = a.errors || {};
  const courses = courseCatalog();
  const course = courses.find((item) => item.name === a.type) || courses[0];
  return `
  <section class="card pad">
    <div class="field">
      <label class="label" for="f-type">Course</label>
      <select class="select" id="f-type">${selectOptions(courses.map((item) => item.name), course.name)}</select>
      <p class="field-hint">${money(course.pricePerSession)} per class · default ${course.defaultDays} classes</p>
    </div>

    <div class="field">
      <label class="label" for="f-days">Course length (classes) <span class="req">*</span></label>
      <div class="chip-row" id="days-chips">
        ${[10, 15, 20, 30].map((d) => `<button class="chip chip-select ${a.days === d ? 'on' : ''}" type="button" data-days="${d}">${d} classes</button>`).join('')}
      </div>
      <input class="input ${e.days ? 'invalid' : ''}" id="f-days" type="number" inputmode="numeric" min="1" max="90" value="${a.days}">
      ${e.days ? `<p class="field-error">${esc(e.days)}</p>` : ''}
    </div>

    <div class="field">
      <label class="label" for="f-total">Total course fee <span class="req">*</span></label>
      <input class="input ${e.total ? 'invalid' : ''}" id="f-total" type="number" inputmode="numeric" min="0" value="${a.total}">
      <p class="field-hint" id="fee-hint"></p>
      ${e.total ? `<p class="field-error">${esc(e.total)}</p>` : ''}
    </div>

    <div class="inline-fields">
      <div class="field">
        <label class="label" for="f-timing">Class timing <span class="req">*</span></label>
        <input class="input ${e.timing ? 'invalid' : ''}" id="f-timing" type="time" value="${esc(a.timing)}">
        ${e.timing ? `<p class="field-error">${esc(e.timing)}</p>` : ''}
      </div>
      <div class="field">
        <label class="label" for="f-start">Start date <span class="req">*</span></label>
        <input class="input ${e.start ? 'invalid' : ''}" id="f-start" type="date" value="${esc(a.startDate)}">
        ${e.start ? `<p class="field-error">${esc(e.start)}</p>` : ''}
      </div>
    </div>

    <div class="field">
      <label class="label" for="f-instructor">Instructor</label>
      <select class="select" id="f-instructor">${selectOptions(db.school.instructors, a.instructor)}</select>
    </div>

    <div class="field">
      <label class="label" for="f-vehicle">Vehicle</label>
      <select class="select" id="f-vehicle">${selectOptions(db.school.vehicles, a.vehicle)}</select>
    </div>
  </section>`;
}

function admissionStep3(a) {
  const e = a.errors || {};
  const balance = Math.max(0, (Number(a.total) || 0) - (Number(a.paid) || 0));
  return `
  <div class="course-banner">
    <div class="cb-ic">${icon('car')}</div>
    <div>
      <b>${esc(a.type)}</b>
      <p>${a.days} classes · ${fmtClock(a.timing)} daily</p>
    </div>
    <span class="chip">${a.days} classes</span>
  </div>

  <section class="card pad">
    <div class="field">
      <label class="label" for="f-total">Total course fee <span class="req">*</span></label>
      <input class="input ${e.total ? 'invalid' : ''}" id="f-total" type="number" inputmode="numeric" min="0" value="${a.total}">
      ${e.total ? `<p class="field-error">${esc(e.total)}</p>` : (a.type ? `<p class="field-hint">Prefilled from ${esc(a.type)} — ${a.days} classes. Edit if you agreed a different fee.</p>` : '')}
    </div>

    <div class="field">
      <label class="label" for="f-paid">Amount paid now</label>
      <input class="input ${e.paid ? 'invalid' : ''}" id="f-paid" type="number" inputmode="numeric" min="0" value="${a.paid}">
      ${e.paid ? `<p class="field-error">${esc(e.paid)}</p>` : '<p class="field-hint">Leave 0 if the fee is paid later.</p>'}
    </div>

    <div class="review-total" style="margin-top:12px">
      <div class="review-row"><span>Balance due</span><b id="fee-balance">${money(balance)}</b></div>
    </div>

    <div class="field">
      <label class="label">Payment mode</label>
      <div class="chip-row" id="mode-chips">
        ${['Cash', 'UPI', 'Card'].map((m) => `<button class="chip chip-select ${a.mode === m ? 'on' : ''}" type="button" data-mode="${m}">${m}</button>`).join('')}
      </div>
    </div>

    <div class="field" style="margin-top:18px">
      <div class="switch-row">
        <div>
          <b>Learner's licence</b>
          <p>Does the student already have one?</p>
        </div>
        <input class="switch" type="checkbox" id="f-license" ${a.licensePresent ? 'checked' : ''}>
      </div>
    </div>

    <div id="license-fields" ${a.licensePresent ? '' : 'hidden'}>
      <div class="field">
        <label class="label" for="f-license-no">Licence number <span class="req">*</span></label>
        <input class="input ${e.licenseNumber ? 'invalid' : ''}" id="f-license-no" value="${esc(a.licenseNumber)}" placeholder="e.g. MH12 20240001234">
        ${e.licenseNumber ? `<p class="field-error">${esc(e.licenseNumber)}</p>` : ''}
      </div>
      <div class="field">
        <label class="label" for="f-license-exp">Valid till</label>
        <input class="input" id="f-license-exp" type="date" value="${esc(a.licenseExpiry)}">
      </div>
    </div>
  </section>`;
}

function admissionStep4(a) {
  const due = Math.max(0, (Number(a.total) || 0) - (Number(a.paid) || 0));
  return `
  <section class="card pad">
    <h3 style="font-size:14px;font-weight:750;margin-bottom:12px">Review admission</h3>
    <div class="review">
      <div class="review-row"><span>Student</span><b>${esc(a.name)}</b></div>
      <div class="review-row"><span>Mobile</span><b>+91 ${esc(a.phone)}</b></div>
      <div class="review-row"><span>Course</span><b>${esc(a.type)}</b></div>
      <div class="review-row"><span>Schedule</span><b>${a.days} days · ${fmtClock(a.timing)}</b></div>
      <div class="review-row"><span>Instructor</span><b>${esc(a.instructor)}</b></div>
      <div class="review-row"><span>Fee paid</span><b>${money(a.paid)} of ${money(a.total)}</b></div>
    </div>
    <div class="review-total" style="margin-top:12px">
      <div class="review-row"><span>Balance due</span><b>${money(due)}</b></div>
    </div>
  </section>

  <section class="card pad">
    <h3 style="font-size:14px;font-weight:750">Terms &amp; conditions</h3>
    <div class="terms" style="margin-top:10px">
      <h4>${esc(Store.state().school.name)} — Student agreement</h4>
      <ol>
        <li>The student agrees to attend all scheduled training sessions on time.</li>
        <li>The student must carry a valid learner's licence during practical driving sessions.</li>
        <li>Course fees once paid are non-refundable, except where required by applicable law.</li>
        <li>The school may reschedule a session due to weather, vehicle service or instructor unavailability.</li>
        <li>The student will follow all traffic rules and instructor instructions. The school is not liable for violations committed by the student.</li>
        <li>The school may capture the student's photo, signature and attendance records for training and legal proof.</li>
        <li>Personal data is processed only for managing the course and is handled as described in the privacy policy.</li>
        <li>This electronic signature is valid under the Information Technology Act, 2000.</li>
      </ol>
    </div>
    <label class="check" style="margin-top:12px">
      <input type="checkbox" id="f-agree" ${a.agree ? 'checked' : ''}>
      <span>I have read and agree to the terms. I consent to the school storing this student's photo, signature and records digitally.</span>
    </label>
  </section>

  <section class="card pad">
    <h3 style="font-size:14px;font-weight:750">Student signature</h3>
    <p class="muted small" style="margin-top:3px">Stored with a timestamp and device record as proof of acceptance.</p>
    <div class="sig-wrap" style="margin-top:10px">
      <canvas id="adm-sig"></canvas>
      <div class="sig-hint" id="adm-sig-hint">${icon('pen')}<span>Sign here</span></div>
    </div>
    <div class="sig-actions">
      <span class="tiny muted">Use a finger or stylus</span>
      <button class="link" type="button" id="adm-sig-clear">Clear</button>
    </div>
  </section>`;
}

function applyAdmissionCourse(a, course) {
  if (!course) return;
  a.type = course.name;
  if (course.defaultDays >= 1) a.days = course.defaultDays;
  a.total = calculateCourseFee(course, a.days);
}

function gatherStep(step) {
  const a = admission;
  if (!a) return;
  if (step === 1) {
    a.name = val('f-name').trim();
    a.phone = val('f-phone').trim();
    a.address = val('f-address').trim();
  } else if (step === 2) {
    const course = courseByName(val('f-type'));
    a.type = course ? course.name : val('f-type');
    a.days = Number(val('f-days')) || 0;
    a.total = Number(val('f-total')) || 0;
    a.timing = val('f-timing') || '07:00';
    a.startDate = val('f-start');
    a.instructor = val('f-instructor');
    a.vehicle = val('f-vehicle');
  } else if (step === 3) {
    a.total = Number(val('f-total')) || 0;
    a.paid = Number(val('f-paid')) || 0;
    a.licensePresent = checked('f-license');
    a.licenseNumber = val('f-license-no').trim();
    a.licenseExpiry = val('f-license-exp');
  } else if (step === 4) {
    a.agree = checked('f-agree');
  }
}

function validateStep(step) {
  const a = admission;
  const errors = {};
  if (step === 1) {
    if (!a.name) errors.name = 'Enter the student name.';
    if (!/^[6-9]\d{9}$/.test(a.phone)) errors.phone = 'Enter a valid 10-digit mobile number.';
    if (!a.address) errors.address = 'Enter the student address.';
  } else if (step === 2) {
    if (!a.timing) errors.timing = 'Pick a class timing.';
    if (!a.days || a.days < 1 || a.days > 90) errors.days = 'Enter between 1 and 90 classes.';
    if (!a.startDate) errors.start = 'Pick a start date.';
    if (!(a.total > 0)) errors.total = 'Enter the total course fee.';
  } else if (step === 3) {
    if (!(a.total > 0)) errors.total = 'Enter the total course fee.';
    if (a.paid < 0 || a.paid > a.total) errors.paid = 'Paid amount cannot be more than the total.';
    if (a.licensePresent && !a.licenseNumber) errors.licenseNumber = 'Enter the licence number.';
  }
  a.errors = errors;
  return Object.keys(errors).length === 0;
}

function bindAdmission() {
  const a = admission;
  if (!a) return;
  if (a.step !== 4) admPad = null;

  const exit = document.getElementById('adm-exit');
  if (exit) {
    exit.addEventListener('click', async () => {
      const ok = await UI.confirm({
        title: 'Discard admission?',
        message: 'The details and signature entered so far will be lost.',
        confirmText: 'Discard',
        danger: true
      });
      if (!ok) return;
      admission = null;
      admPad = null;
      go('/dashboard');
    });
  }

  const next = document.getElementById('adm-next');
  if (next) {
    next.addEventListener('click', () => {
      gatherStep(a.step);
      if (!validateStep(a.step)) {
        render();
        return;
      }
      a.step = Math.min(4, a.step + 1);
      render();
    });
  }

  const prev = document.getElementById('adm-prev');
  if (prev) {
    prev.addEventListener('click', () => {
      if (a.step === 4) {
        gatherStep(4);
        if (admPad) a.signature = admPad.dataURL();
      } else {
        gatherStep(a.step);
      }
      a.step = Math.max(1, a.step - 1);
      render();
    });
  }

  if (a.step === 1) bindStep1(a);
  if (a.step === 2) bindStep2(a);
  if (a.step === 3) bindStep3(a);
  if (a.step === 4) bindStep4(a);

  const submit = document.getElementById('adm-submit');
  if (submit) submit.addEventListener('click', submitAdmission);
}

function bindStep1(a) {
  const photoBtn = document.getElementById('photo-btn');
  const fileInput = document.getElementById('f-photo');
  if (photoBtn && fileInput) {
    photoBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      try {
        const data = await UI.fileToDataURL(file, 520, 0.8);
        a.photo = data;
        photoBtn.innerHTML = `<img src="${data}" alt="">`;
        UI.toast('Photo added', 'success');
      } catch (err) {
        UI.toast('Could not read that image', 'danger');
      }
    });
  }

  const phone = document.getElementById('f-phone');
  if (phone) {
    phone.addEventListener('input', () => {
      phone.value = phone.value.replace(/\D/g, '').slice(0, 10);
    });
  }
}

function bindStep2(a) {
  const daysInput = document.getElementById('f-days');
  const feeInput = document.getElementById('f-total');
  const chips = $$('#days-chips [data-days]');
  const courseSelect = document.getElementById('f-type');

  const syncChips = () => {
    const current = Number(daysInput ? daysInput.value : 0);
    chips.forEach((btn) => btn.classList.toggle('on', Number(btn.dataset.days) === current));
  };

  const syncHint = () => {
    const course = courseByName(a.type) || courseCatalog()[0];
    if (!course) return;
    const hint = document.getElementById('fee-hint');
    if (!hint) return;
    hint.textContent = `Auto-filled: ${Number(a.days) || 0} classes × ${money(course.pricePerSession)} per class = ${money(calculateCourseFee(course, a.days))}. Edit if you agreed a different fee.`;
  };

  const applyDays = (days) => {
    a.days = days;
    a.total = calculateCourseFee(courseByName(a.type) || {}, days);
    if (feeInput) feeInput.value = a.total;
    syncChips();
    syncHint();
  };

  if (courseSelect) {
    courseSelect.addEventListener('change', () => {
      gatherStep(2);
      const course = courseByName(courseSelect.value);
      a.type = course.name;
      applyAdmissionCourse(a, course);
      if (daysInput) daysInput.value = a.days;
      a.errors = {};
      render();
    });
  }

  chips.forEach((btn) => {
    btn.addEventListener('click', () => {
      applyDays(Number(btn.dataset.days));
    });
  });

  if (daysInput) {
    daysInput.addEventListener('input', () => {
      applyDays(Number(daysInput.value) || 0);
    });
  }

  if (feeInput) {
    feeInput.addEventListener('input', () => {
      a.total = Number(feeInput.value) || 0;
      syncHint();
    });
  }

  syncHint();
}

function bindStep3(a) {
  const total = document.getElementById('f-total');
  const paid = document.getElementById('f-paid');
  const balance = document.getElementById('fee-balance');

  const updateBalance = () => {
    if (!balance) return;
    const t = Number(total ? total.value : 0) || 0;
    const p = Number(paid ? paid.value : 0) || 0;
    balance.textContent = money(Math.max(0, t - p));
  };
  if (total) total.addEventListener('input', updateBalance);
  if (paid) paid.addEventListener('input', updateBalance);

  $$('#mode-chips [data-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      a.mode = btn.dataset.mode;
      $$('#mode-chips [data-mode]').forEach((b) => b.classList.toggle('on', b === btn));
    });
  });

  const license = document.getElementById('f-license');
  const fields = document.getElementById('license-fields');
  if (license && fields) {
    license.addEventListener('change', () => {
      a.licensePresent = license.checked;
      fields.hidden = !license.checked;
    });
  }
}

function bindStep4(a) {
  const canvas = document.getElementById('adm-sig');
  const hint = document.getElementById('adm-sig-hint');
  const agree = document.getElementById('f-agree');
  const submit = document.getElementById('adm-submit');
  if (!canvas) return;

  admPad = UI.signaturePad(canvas);

  const sync = () => {
    const drawn = !admPad.isEmpty();
    if (hint) hint.classList.toggle('hide', drawn);
    a.agree = !!(agree && agree.checked);
    if (submit) submit.disabled = !(a.agree && drawn);
  };

  canvas.addEventListener('sig:change', sync);
  if (agree) agree.addEventListener('change', sync);

  const clear = document.getElementById('adm-sig-clear');
  if (clear) {
    clear.addEventListener('click', () => {
      admPad.clear();
      a.signature = null;
      sync();
    });
  }
  sync();
}

async function submitAdmission() {
  const a = admission;
  if (!a) return;
  gatherStep(4);
  if (!a.agree) {
    UI.toast('Accept the terms and conditions first', 'danger');
    return;
  }
  if (!admPad || admPad.isEmpty()) {
    UI.toast('Student signature is required', 'danger');
    return;
  }
  a.signature = admPad.dataURL();
  const submit = document.getElementById('adm-submit');
  if (submit) {
    submit.disabled = true;
    submit.textContent = window.I18N ? I18N.t('Saving admission...') : 'Saving admission...';
  }
  try {
    const student = await Store.addStudent(a);
    admission = null;
    admPad = null;
    UI.toast('Admission completed - ' + student.id, 'success');
    go('/student/' + encodeURIComponent(student.id));
  } catch (error) {
    UI.toast(error.message || 'Could not save the admission', 'danger');
    if (submit) {
      submit.disabled = false;
      submit.innerHTML = icon('check') + (window.I18N ? ' ' + I18N.t('Complete admission') : ' Complete admission');
    }
  }
}
