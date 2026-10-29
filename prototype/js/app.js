/* DriveDesk prototype — core: routing, login, dashboard */
'use strict';

const { icon, esc, money, fmtTime, fmtDate, fmtDateShort, dayLabel, avatar } = UI;

const view = document.getElementById('view');
const tabbar = document.getElementById('tabbar');
const app = document.getElementById('app');

let admission = null;
let admPad = null;
let studentFilter = 'all';
let studentQuery = '';
let sessionTab = 'today';

const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
const val = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
const checked = (id) => { const el = document.getElementById(id); return !!(el && el.checked); };

const stepTitles = {
  1: 'Student details',
  2: 'Course & schedule',
  3: 'Fees & documents',
  4: 'Agreement & signature'
};
const stepSubs = {
  1: 'Start with the basics. You can add more later from the profile.',
  2: 'Pick a course, then set the class count, daily time and assigned instructor. Fee comes from the per-class rate.',
  3: 'Record what was collected now. The balance stays visible on the dashboard.',
  4: 'Review the details, capture the student signature and finish the admission.'
};
const courseTypes = ['Car — Manual', 'Car — Automatic', 'Two-wheeler', 'Commercial (Truck/Bus)'];

function pad2(n) { return String(n).padStart(2, '0'); }

function fmtClock(hhmm) {
  if (!hhmm) return '—';
  const parts = String(hhmm).split(':');
  const h = Number(parts[0]) || 0;
  const m = Number(parts[1]) || 0;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
}

function emptyState(ic, title, text) {
  return `<div class="empty">
    <div class="empty-ic">${icon(ic)}</div>
    <b>${esc(title)}</b>
    <p>${esc(text)}</p>
  </div>`;
}

function selectOptions(list, selected) {
  return list.map((item) => `<option value="${esc(item)}" ${item === selected ? 'selected' : ''}>${esc(item)}</option>`).join('');
}

function courseCatalog() {
  const school = (Store.state() && Store.state().school) || {};
  const source = Array.isArray(school.courses) && school.courses.length
    ? school.courses
    : Store.defaultCourses();
  const courses = source.map((course) => {
    const name = String((course && course.name) || '').trim();
    const pricePerSession = Number(course && course.pricePerSession);
    const defaultDays = Number(course && course.defaultDays);
    if (!name || !Number.isInteger(pricePerSession) || pricePerSession < 1 || !Number.isInteger(defaultDays) || defaultDays < 1) return null;
    return { name, pricePerSession, defaultDays };
  }).filter(Boolean);
  return courses.length ? courses : Store.defaultCourses();
}

function courseByName(name) {
  const catalog = courseCatalog();
  return catalog.find((course) => course.name === name) || catalog[0];
}

function calculateCourseFee(course, days) {
  const c = course || {};
  const sessions = Number(days) || 0;
  const rate = Number(c.pricePerSession) || 0;
  return Math.max(0, sessions * rate);
}

/* ------------------------------ routing ------------------------------ */

function currentRoute() {
  const raw = (location.hash || '').replace(/^#/, '') || '/dashboard';
  const parts = raw.split('/').filter(Boolean);
  return { name: parts[0] || 'dashboard', params: parts.slice(1) };
}

function go(path) {
  const target = '#' + (path.charAt(0) === '/' ? path : '/' + path);
  if (location.hash === target) render();
  else location.hash = target;
}

function render() {
  const route = currentRoute();
  const name = route.name;
  const params = route.params;
  const authed = Store.isAuthed();

  if (!authed && name !== 'login') {
    location.replace('#/login');
    return;
  }
  if (authed && name === 'login') {
    location.replace('#/dashboard');
    return;
  }

  const hideTabs = name === 'login' || name === 'admission';
  app.classList.toggle('has-tabbar', !hideTabs);
  tabbar.hidden = hideTabs;

  let html = '';
  switch (name) {
    case 'login': html = renderLogin(); break;
    case 'dashboard': html = renderDashboard(); break;
    case 'admission': html = renderAdmission(); break;
    case 'students': html = renderStudents(); break;
    case 'student': html = renderStudent(params[0]); break;
    case 'sessions': html = renderSessions(); break;
    case 'reports': html = renderReports(); break;
    case 'more': html = renderMore(); break;
    default: html = renderDashboard();
  }

  view.innerHTML = `<div class="screen ${name}">${html}</div>`;
  if (!hideTabs) tabbar.innerHTML = renderTabbar(name);
  bindScreen(name, params);
  if (window.I18N) {
    I18N.apply(view);
    I18N.apply(tabbar);
  }
  window.scrollTo(0, 0);
}

function renderTabbar(name) {
  const active = name === 'student' ? 'students' : (name === 'reports' ? 'more' : name);
  const tabs = [
    { key: 'dashboard', ic: 'home', label: 'Home' },
    { key: 'students', ic: 'users', label: 'Students' },
    null,
    { key: 'sessions', ic: 'calendar', label: 'Classes' },
    { key: 'more', ic: 'dots', label: 'More' }
  ];
  return tabs.map((t) => {
    if (!t) return `<button class="fab" type="button" data-go="/admission" aria-label="New admission">${icon('plus')}</button>`;
    return `<a class="tab ${active === t.key ? 'active' : ''}" href="#/${t.key}">${icon(t.ic)}<span>${t.label}</span></a>`;
  }).join('');
}

function bindScreen(name, params) {
  switch (name) {
    case 'login': bindLogin(); break;
    case 'dashboard': bindDashboard(); break;
    case 'admission': bindAdmission(); break;
    case 'students': bindStudents(); break;
    case 'student': bindStudent(params[0]); break;
    case 'sessions': bindSessions(); break;
    case 'reports': bindReports(); break;
    case 'more': bindMore(); break;
  }
}

/* ------------------------------ login ------------------------------ */

function renderLogin() {
  return `
  <div class="login-wrap">
    <div class="login-hero">
      <div class="brand-mark">${icon('car')}</div>
      <h1>DriveDesk</h1>
      <p>Run your driving school from your pocket.</p>
    </div>
    <div class="login-card">
      <h2>Welcome back</h2>
      <p class="muted">Sign in to manage students, classes and fees.</p>
      <form id="login-form" novalidate>
        <div class="field">
          <label class="label" for="login-id">Mobile or email</label>
          <input class="input" id="login-id" inputmode="email" autocomplete="username" placeholder="owner@school.in" value="owner@sunrise.in">
        </div>
        <div class="field">
          <label class="label" for="login-pass">Password</label>
          <div class="input-wrap">
            <input class="input" id="login-pass" type="password" autocomplete="current-password" placeholder="Enter password" value="demo1234">
            <button class="input-eye" id="toggle-pass" type="button" aria-label="Show password">${icon('eye')}</button>
          </div>
        </div>
        <div class="row-between" style="margin-top:12px">
          <label class="check inline"><input type="checkbox" checked> <span>Remember me</span></label>
          <button class="link" type="button" id="forgot">Forgot password?</button>
        </div>
        <div class="form-error" id="login-error" hidden></div>
        <button class="btn btn-primary btn-block" type="submit" style="margin-top:16px">Sign in ${icon('arrow-right')}</button>
      </form>
      <div class="divider"><span>or</span></div>
      <button class="btn btn-ghost btn-block" type="button" id="demo-login">${icon('sparkles')} Explore demo school</button>
      <p class="demo-hint">${Store.apiAvailable()
        ? 'Sign in with your school account. <b>Explore demo school</b> opens sample data saved on this device.'
        : 'Demo login is prefilled. Any password with 4+ characters works, or tap <b>Explore demo school</b>.'}</p>
    </div>
    <button class="link lang-link" type="button" id="lang-btn">${window.I18N && I18N.current() === 'mr' ? 'English' : 'मराठी'}</button>
    <p class="login-foot">New school? <button class="link" type="button" id="contact-link">Talk to us</button></p>
  </div>`;
}

function bindLogin() {
  const pass = document.getElementById('login-pass');
  const toggle = document.getElementById('toggle-pass');
  if (toggle && pass) {
    toggle.addEventListener('click', () => {
      const show = pass.type === 'password';
      pass.type = show ? 'text' : 'password';
      toggle.innerHTML = icon(show ? 'eye-off' : 'eye');
    });
  }

  const form = document.getElementById('login-form');
  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const id = val('login-id').trim();
      const p = val('login-pass');
      const err = document.getElementById('login-error');
      const submit = form.querySelector('button[type="submit"]');
      if (!id || p.length < 4) {
        if (err) {
          err.textContent = !id
            ? (window.I18N ? I18N.t('Enter your mobile number or email.') : 'Enter your mobile number or email.')
            : (window.I18N ? I18N.t('Password must be at least 4 characters.') : 'Password must be at least 4 characters.');
          err.hidden = false;
        }
        return;
      }
      if (err) err.hidden = true;
      if (submit) submit.disabled = true;
      try {
        const user = await Store.login(id, p);
        const first = user.name.split(' ')[0];
        UI.toast('Welcome back, ' + first, 'success');
        go('/dashboard');
      } catch (error) {
        if (err) {
          err.textContent = window.I18N ? I18N.t(error.message || 'Could not sign in. Try again.') : (error.message || 'Could not sign in. Try again.');
          err.hidden = false;
        }
      } finally {
        if (submit) submit.disabled = false;
      }
    });
  }

  const demo = document.getElementById('demo-login');
  if (demo) {
    demo.addEventListener('click', () => {
      Store.demoLogin();
      go('/dashboard');
      setTimeout(() => UI.toast('Demo school loaded', 'success'), 140);
    });
  }

  const langBtn = document.getElementById('lang-btn');
  if (langBtn) {
    langBtn.addEventListener('click', () => {
      const next = window.I18N && I18N.current() === 'mr' ? 'en' : 'mr';
      if (window.I18N) I18N.set(next);
      render();
      UI.toast(next === 'mr' ? 'भाषा: मराठी' : 'Language: English', 'success');
    });
  }

  const forgot = document.getElementById('forgot');
  if (forgot) forgot.addEventListener('click', () => UI.toast('Password reset will be available soon', 'info'));

  const contact = document.getElementById('contact-link');
  if (contact) contact.addEventListener('click', () => UI.toast('Support: hello@drivedesk.in', 'info'));
}

/* ------------------------------ dashboard ------------------------------ */

function classRow(item, isNext) {
  const s = item.student;
  const done = !!item.session;
  const present = done && item.session.status === 'present';
  const label = done ? (present ? 'Present' : 'Absent') : 'Upcoming';
  const chipClass = done ? (present ? 'chip-success' : 'chip-danger') : 'chip-brand';
  const nextChip = isNext && !done ? ' <span class="chip chip-brand chip-next">Next</span>' : '';
  return `<div class="class-row" data-go="/student/${encodeURIComponent(s.id)}">
    <div class="time-col"><b>${fmtTime(item.at)}</b><span>${dayLabel(item.at)}</span></div>
    ${avatar(s)}
    <div class="row-main">
      <p class="row-title">${esc(s.name)}${nextChip}</p>
      <p class="row-sub">${done ? 'Session ' + (item.session.sessionNo || 1) + ' · ' : ''}${esc(s.package.type)} · ${esc(s.package.instructor)}</p>
    </div>
    ${done
      ? `<span class="chip ${chipClass}">${label}</span>`
      : `<button class="btn-tiny" type="button" data-mark="${esc(s.id)}">Mark</button>`}
  </div>`;
}

function renderDashboard() {
  const db = Store.state();
  const st = Store.stats();
  const schedule = Store.todaySchedule();
  const pendingList = db.students
    .filter((s) => s.fees.total > s.fees.paid)
    .sort((a, b) => (b.fees.total - b.fees.paid) - (a.fees.total - a.fees.paid))
    .slice(0, 3);
  const first = db.user.name.split(' ')[0];
  const trialDays = Math.max(0, Math.ceil((new Date(db.subscription.endsAt) - new Date()) / 86400000));
  const firstPending = schedule.findIndex((item) => !item.session);

  const pendingMarkup = pendingList.length ? `
    <div class="card">
      <div class="fee-banner">
        <div class="fee-ic">${icon('rupee')}</div>
        <div style="flex:1">
          <p class="fee-amount">${money(st.pending)}</p>
          <p class="fee-people">${st.pendingCount} student${st.pendingCount === 1 ? '' : 's'} with a balance</p>
        </div>
        ${icon('chevron-right', 'chev')}
      </div>
      <div class="list" style="border-top:1px solid var(--line)">
        ${pendingList.map((s) => `
          <div class="class-row" data-go="/student/${encodeURIComponent(s.id)}">
            ${avatar(s)}
            <div class="row-main">
              <p class="row-title">${esc(s.name)}</p>
              <p class="row-sub">${esc(s.package.type)}</p>
            </div>
            <b style="font-size:12.5px;color:var(--warning)">${money(s.fees.total - s.fees.paid)}</b>
          </div>`).join('')}
      </div>
    </div>` : `<div class="card">${emptyState('check-circle', 'All fees cleared', 'Every student has paid in full.')}</div>`;

  return `
  <header class="hero">
    <div class="hero-top">
      <div class="hero-user">
        <div class="avatar avatar-text avatar-light">${esc(UI.initials(db.user.name))}</div>
        <div style="min-width:0">
          <p class="hero-hello">Good ${UI.timeOfDay()}, ${esc(first)}</p>
          <p class="hero-school">${esc(db.school.name)}</p>
        </div>
      </div>
      <button class="icon-btn ghost-light" id="notif-btn" type="button" aria-label="Notifications">
        ${icon('bell')}<span class="dot"></span>
      </button>
    </div>
    <div class="hero-pill">${icon('star')} ${esc(db.subscription.plan)} · ${trialDays} days left</div>
    <div class="hero-stats">
      <div><b>${st.active}</b><span>Active students</span></div>
      <div><b>${st.today}</b><span>Classes today</span></div>
      <div><b>${st.present}/${st.today}</b><span>Present today</span></div>
    </div>
    <div class="hero-search">
      ${icon('search')}
      <input id="hero-search" type="search" placeholder="Search student or trainer..." autocomplete="off">
    </div>
  </header>
  <section id="search-results" hidden></section>
  <main class="page">
    <section class="quick-grid two">
      <button class="quick" type="button" data-go="/sessions">
        <span class="q-ic">${icon('check-circle')}</span><span>Mark attendance</span>
      </button>
      <button class="quick" type="button" id="collect-pay">
        <span class="q-ic">${icon('rupee')}</span><span>Collect payment</span>
      </button>
    </section>

    <section class="section">
      <div class="section-head">
        <h2>Today's classes</h2>
        <button class="link" type="button" data-go="/sessions">View all</button>
      </div>
      <div class="card list">
        ${schedule.length
          ? schedule.slice(0, 5).map((item, index) => classRow(item, index === firstPending)).join('')
          : emptyState('calendar', 'No classes today', 'Scheduled classes will appear here automatically.')}
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2>Fees pending</h2>
        <button class="link" type="button" data-filter-pending>View students</button>
      </div>
      ${pendingMarkup}
    </section>
  </main>`;
}

function bindDashboard() {
  const notif = document.getElementById('notif-btn');
  if (notif) notif.addEventListener('click', () => UI.toast('No new notifications', 'info'));

  const collect = document.getElementById('collect-pay');
  if (collect) collect.addEventListener('click', () => openCollectPayment());

  const pending = document.querySelector('[data-filter-pending]');
  if (pending) {
    pending.addEventListener('click', () => {
      studentFilter = 'pending';
      go('/students');
    });
  }

  const search = document.getElementById('hero-search');
  const drop = document.getElementById('search-results');
  if (search && drop) {
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      if (!q) {
        drop.hidden = true;
        drop.innerHTML = '';
        return;
      }
      drop.innerHTML = dashboardSearch(q);
      if (window.I18N) I18N.apply(drop);
      drop.hidden = false;
    });
    drop.addEventListener('click', (event) => {
      const trainer = event.target.closest('[data-trainer]');
      if (!trainer) return;
      event.preventDefault();
      openTrainer(trainer.dataset.trainer);
    });
  }
}

function dashboardSearch(q) {
  const db = Store.state();
  const schedule = Store.todaySchedule();
  const digits = q.replace(/\D/g, '');
  const students = db.students
    .filter((s) => s.name.toLowerCase().includes(q) || (digits && (s.phone || '').includes(digits)))
    .slice(0, 6);
  const trainers = (db.school.instructors || [])
    .filter((name) => name.toLowerCase().includes(q))
    .map((name) => ({
      name,
      today: schedule.filter((row) => row.student.package.instructor === name).length,
      students: db.students.filter((s) => s.status === 'active' && s.package.instructor === name).length
    }))
    .slice(0, 3);

  return `<div class="card list">
    ${students.length ? `<p class="list-label">Students</p>${students.map((s) => `
      <div class="class-row" data-go="/student/${encodeURIComponent(s.id)}">
        ${avatar(s)}
        <div class="row-main">
          <p class="row-title">${esc(s.name)}</p>
          <p class="row-sub">+91 ${esc(s.phone)} · ${esc(s.package.type)}</p>
        </div>
        ${icon('chevron-right', 'chev')}
      </div>`).join('')}` : ''}
    ${trainers.length ? `<p class="list-label">Trainers</p>${trainers.map((t) => `
      <div class="class-row" data-trainer="${esc(t.name)}">
        <span class="sr-ic">${icon('user')}</span>
        <div class="row-main">
          <p class="row-title">${esc(t.name)}</p>
          <p class="row-sub">${t.today} class${t.today === 1 ? '' : 'es'} today · ${t.students} active student${t.students === 1 ? '' : 's'}</p>
        </div>
        ${icon('chevron-right', 'chev')}
      </div>`).join('')}` : ''}
    ${!students.length && !trainers.length
      ? `${emptyState('search', 'No matches found', 'Check the spelling, or start a new admission.')}
    <div class="search-cta"><button class="btn btn-ghost btn-sm" type="button" data-go="/admission">${icon('plus')} New admission</button></div>` : ''}
  </div>`;
}

function openTrainer(name) {
  const db = Store.state();
  const schedule = Store.todaySchedule().filter((row) => row.student.package.instructor === name);
  const students = db.students.filter((s) => s.status === 'active' && s.package.instructor === name);
  UI.openModal(`
    <div class="sheet-head">
      <div>
        <h3>${esc(name)}</h3>
        <p class="muted small">${schedule.length} class${schedule.length === 1 ? '' : 'es'} today · ${students.length} active student${students.length === 1 ? '' : 's'}</p>
      </div>
      <button class="icon-btn" type="button" data-close>${icon('x')}</button>
    </div>
    <div class="list card">
      ${schedule.length
        ? schedule.map((row) => classRow(row)).join('')
        : emptyState('calendar', 'No classes today', 'This trainer has nothing scheduled for today.')}
    </div>
    ${students.length ? `
    <p class="section-label" style="margin:14px 0 8px">Active students</p>
    <div class="list card">
      ${students.slice(0, 5).map((s) => `
        <div class="class-row" data-go="/student/${encodeURIComponent(s.id)}">
          ${avatar(s)}
          <div class="row-main">
            <p class="row-title">${esc(s.name)}</p>
            <p class="row-sub">${esc(s.package.type)}</p>
          </div>
        </div>`).join('')}
      ${students.length > 5 ? `<div class="search-cta"><button class="btn btn-ghost btn-sm" type="button" data-go="/students">${icon('users')} See all students</button></div>` : ''}
    </div>` : ''}`);
}
