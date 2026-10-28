/* DriveDesk data layer — local demo store or live Flask API. */
(function () {
  'use strict';

  const KEY = 'drivedesk.v1';
  const AUTH_KEY = 'drivedesk.auth';
  const TOKEN_KEY = 'drivedesk.token';

  const pad = (n, len = 2) => String(n).padStart(len, '0');
  const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const addDays = (date, n) => { const d = new Date(date); d.setDate(d.getDate() + n); return d; };
  const atTime = (date, hhmm) => {
    const d = new Date(date);
    const [h, m] = String(hhmm || '07:00').split(':').map(Number);
    d.setHours(h || 0, m || 0, 0, 0);
    return d;
  };

  function defaultCourses() {
    return [
      { name: 'Car \u2014 Manual', pricePerSession: 400, defaultDays: 20 },
      { name: 'Car \u2014 Automatic', pricePerSession: 500, defaultDays: 20 },
      { name: 'Two-wheeler', pricePerSession: 400, defaultDays: 20 },
      { name: 'Commercial (Truck/Bus)', pricePerSession: 900, defaultDays: 30 }
    ];
  }

  function normalizeCourses(value) {
    const courses = (Array.isArray(value) ? value : []).map((course) => {
      const name = String((course && course.name) || '').trim();
      const pricePerSession = Number(course && (course.pricePerSession !== undefined ? course.pricePerSession : course.price_per_session));
      const defaultDays = Number(course && (course.defaultDays !== undefined ? course.defaultDays : course.days || course.default_days));
      if (!name || !Number.isInteger(pricePerSession) || pricePerSession < 1 || !Number.isInteger(defaultDays) || defaultDays < 1) {
        return null;
      }
      return {
        name,
        pricePerSession,
        defaultDays
      };
    }).filter(Boolean);
    return courses.length ? courses : defaultCourses();
  }

  function normalizeDemoData(data) {
    if (!data || !Array.isArray(data.students)) return data;
    data.students.forEach((student) => {
      const ordered = (student.sessions || [])
        .slice()
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      const counts = {};
      ordered.forEach((session) => {
        const day = keyOf(new Date(session.date));
        counts[day] = (counts[day] || 0) + 1;
        session.sessionNo = counts[day];
        if (!session.vehicle) session.vehicle = (student.package && student.package.vehicle) || '';
      });
      if (!Array.isArray(student.payments)) {
        student.payments = [];
        if (student.fees && student.fees.paid > 0) {
          student.payments.push({
            id: `PAY-${student.id}-seed`,
            amount: student.fees.paid,
            mode: student.fees.mode || 'Cash',
            note: 'Admission payment',
            paidAt: student.createdAt || new Date().toISOString()
          });
        }
      }
    });
    if (!data.school) data.school = {};
    data.school.courses = normalizeCourses(data.school.courses);
    if (Array.isArray(data.schools) && data.schools.length) data.schools[0] = data.school;
    return data;
  }

  function seed() {
    const now = new Date();
    const year = now.getFullYear();

    const isoAt = (daysBack, time) => atTime(addDays(now, -daysBack), time).toISOString();
    const isoIn = (daysAhead, time) => atTime(addDays(now, daysAhead), time).toISOString();
    const day = (daysAhead) => keyOf(addDays(now, daysAhead));

    const past = (prefix, count, mostRecentDaysAgo, time) => {
      const out = [];
      for (let i = 0; i < count; i++) {
        const back = mostRecentDaysAgo + (count - 1 - i);
        out.push({
          id: `${prefix}-s${i + 1}`,
          date: isoAt(back, time),
          status: 'present',
          signed: true,
          signature: null,
          notes: ''
        });
      }
      return out;
    };

    const todaySession = (prefix, time) => ({
      id: `${prefix}-today`,
      date: isoAt(0, time),
      status: 'present',
      signed: true,
      signature: null,
      notes: ''
    });

    const schools = [{
      id: 'sch-1',
      name: 'Sunrise Driving School',
      owner: 'Aakash Salunke',
      phone: '9822001100',
      email: 'owner@sunrise.in',
      address: 'FC Road, Pune, Maharashtra',
      instructors: ['Ramesh Patil', 'Suresh Jadhav', 'Meera Shinde', 'Anil Kumar'],
      vehicles: ['MH12 AB 1234 · Swift', 'MH12 CD 5678 · i20', 'MH12 EF 9012 · WagonR', 'Activa 6G · MH12 GH 3456'],
      courses: defaultCourses()
    }];

    const students = [
      {
        id: `STU-${year}-001`,
        schoolId: 'sch-1',
        name: 'Rahul Sharma',
        phone: '9822011234',
        address: '12, Shivaji Nagar, Pune',
        photo: null,
        package: { type: 'Car — Manual', days: 20, timing: '07:00', instructor: 'Ramesh Patil', vehicle: 'MH12 AB 1234 · Swift' },
        fees: { total: 9000, paid: 5000, mode: 'UPI' },
        license: { present: true, number: 'MH12 20240001234', expiry: '2027-05-14' },
        agreement: { signed: true, signedAt: isoAt(20, '07:05'), signature: null, version: 'v1' },
        startDate: day(-20),
        createdAt: isoAt(20, '06:50'),
        status: 'active',
        nextClass: isoIn(1, '07:00'),
        sessions: [...past('rahul', 10, 11, '07:00'), todaySession('rahul', '07:00')]
      },
      {
        id: `STU-${year}-002`,
        schoolId: 'sch-1',
        name: 'Priya Patil',
        phone: '9876543210',
        address: '45, Kothrud, Pune',
        photo: null,
        package: { type: 'Car — Automatic', days: 15, timing: '08:30', instructor: 'Meera Shinde', vehicle: 'MH12 CD 5678 · i20' },
        fees: { total: 8000, paid: 8000, mode: 'Cash' },
        license: { present: true, number: 'MH12 20240005678', expiry: '2026-12-02' },
        agreement: { signed: true, signedAt: isoAt(14, '08:20'), signature: null, version: 'v1' },
        startDate: day(-14),
        createdAt: isoAt(14, '08:10'),
        status: 'active',
        nextClass: isoIn(1, '08:30'),
        sessions: [...past('priya', 6, 6, '08:30'), todaySession('priya', '08:30')]
      },
      {
        id: `STU-${year}-003`,
        schoolId: 'sch-1',
        name: 'Aman Verma',
        phone: '9765432109',
        address: '7, Baner, Pune',
        photo: null,
        package: { type: 'Car — Manual', days: 20, timing: '10:00', instructor: 'Ramesh Patil', vehicle: 'MH12 AB 1234 · Swift' },
        fees: { total: 8000, paid: 4000, mode: 'UPI' },
        license: { present: true, number: 'MH12 20240009999', expiry: '2028-01-19' },
        agreement: { signed: true, signedAt: isoAt(9, '09:50'), signature: null, version: 'v1' },
        startDate: day(-9),
        createdAt: isoAt(9, '09:40'),
        status: 'active',
        nextClass: isoAt(0, '10:00'),
        sessions: past('aman', 4, 5, '10:00')
      },
      {
        id: `STU-${year}-004`,
        schoolId: 'sch-1',
        name: 'Sneha Joshi',
        phone: '9700112233',
        address: '301, Grand View, Aundh, Pune',
        photo: null,
        package: { type: 'Car — Automatic', days: 30, timing: '11:30', instructor: 'Meera Shinde', vehicle: 'MH12 CD 5678 · i20' },
        fees: { total: 15000, paid: 12000, mode: 'UPI' },
        license: { present: true, number: 'MH12 20230002222', expiry: '2029-03-08' },
        agreement: { signed: true, signedAt: isoAt(16, '11:20'), signature: null, version: 'v1' },
        startDate: day(-16),
        createdAt: isoAt(16, '11:10'),
        status: 'active',
        nextClass: isoAt(0, '11:30'),
        sessions: past('sneha', 12, 4, '11:30')
      },
      {
        id: `STU-${year}-005`,
        schoolId: 'sch-1',
        name: 'Vikram Singh',
        phone: '9988776655',
        address: '88, Hadapsar, Pune',
        photo: null,
        package: { type: 'Two-wheeler', days: 15, timing: '16:00', instructor: 'Anil Kumar', vehicle: 'Activa 6G · MH12 GH 3456' },
        fees: { total: 7000, paid: 3000, mode: 'Cash' },
        license: { present: false, number: '', expiry: '' },
        agreement: { signed: true, signedAt: isoAt(6, '15:50'), signature: null, version: 'v1' },
        startDate: day(-6),
        createdAt: isoAt(6, '15:40'),
        status: 'active',
        nextClass: isoAt(0, '16:00'),
        sessions: past('vikram', 3, 3, '16:00')
      },
      {
        id: `STU-${year}-006`,
        schoolId: 'sch-1',
        name: 'Neha Deshmukh',
        phone: '9822334455',
        address: '9, Viman Nagar, Pune',
        photo: null,
        package: { type: 'Car — Manual', days: 10, timing: '07:30', instructor: 'Suresh Jadhav', vehicle: 'MH12 EF 9012 · WagonR' },
        fees: { total: 5000, paid: 5000, mode: 'UPI' },
        license: { present: true, number: 'MH12 20240007777', expiry: '2028-08-21' },
        agreement: { signed: true, signedAt: isoAt(5, '07:20'), signature: null, version: 'v1' },
        startDate: day(-5),
        createdAt: isoAt(5, '07:10'),
        status: 'active',
        nextClass: isoIn(1, '07:30'),
        sessions: past('neha', 5, 1, '07:30')
      },
      {
        id: `STU-${year}-007`,
        schoolId: 'sch-1',
        name: 'Arjun Nair',
        phone: '9811223344',
        address: '22, Camp, Pune',
        photo: null,
        package: { type: 'Car — Manual', days: 20, timing: '09:00', instructor: 'Ramesh Patil', vehicle: 'MH12 AB 1234 · Swift' },
        fees: { total: 9000, paid: 9000, mode: 'Card' },
        license: { present: true, number: 'MH12 20230003333', expiry: '2027-10-11' },
        agreement: { signed: true, signedAt: isoAt(40, '08:50'), signature: null, version: 'v1' },
        startDate: day(-40),
        createdAt: isoAt(40, '08:40'),
        status: 'completed',
        nextClass: null,
        sessions: past('arjun', 20, 20, '09:00')
      },
      {
        id: `STU-${year}-008`,
        schoolId: 'sch-1',
        name: 'Pooja Kulkarni',
        phone: '9899887766',
        address: '5, Deccan Gymkhana, Pune',
        photo: null,
        package: { type: 'Car — Automatic', days: 20, timing: '09:00', instructor: 'Suresh Jadhav', vehicle: 'MH12 CD 5678 · i20' },
        fees: { total: 9000, paid: 6000, mode: 'UPI' },
        license: { present: true, number: 'MH12 20240004444', expiry: '2029-07-30' },
        agreement: { signed: true, signedAt: isoAt(8, '08:50'), signature: null, version: 'v1' },
        startDate: day(-8),
        createdAt: isoAt(8, '08:40'),
        status: 'active',
        nextClass: isoIn(2, '09:00'),
        sessions: past('pooja', 8, 2, '09:00')
      }
    ];

    students.forEach((student) => {
      (student.sessions || []).forEach((session) => {
        if (!session.instructor) session.instructor = student.package.instructor || '';
      });
    });

    const data = {
      version: 1,
      createdAt: now.toISOString(),
      seq: students.length,
      school: schools[0],
      schools,
      user: {
        id: 'usr-1',
        schoolId: 'sch-1',
        name: 'Aakash Salunke',
        phone: '9822001100',
        email: 'owner@sunrise.in',
        role: 'Owner'
      },
      subscription: {
        plan: 'Premium trial',
        status: 'trialing',
        endsAt: isoIn(12, '23:59'),
        price: 199,
        upiId: 'drivedesk@upi'
      },
      renewals: [],
      students
    };
    normalizeDemoData(data);
    return data;
  }

  let mem = null;
  let mode = 'demo';
  let dbMode = 'demo';
  let apiAvailable = false;
  let apiBase = '';

  function readDemo() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.students) return normalizeDemoData(parsed);
      }
    } catch (err) {
      console.warn('DriveDesk: could not read local data', err);
    }
    return seed();
  }

  let db = readDemo();

  function persistDemo() {
    if (dbMode !== 'demo') return;
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch (err) {
      console.warn('DriveDesk: could not save local data', err);
      mem = db;
    }
  }

  function flagOn() {
    try { return localStorage.getItem(AUTH_KEY) === '1'; } catch (err) { return false; }
  }

  function setFlag(on) {
    try {
      if (on) localStorage.setItem(AUTH_KEY, '1');
      else localStorage.removeItem(AUTH_KEY);
    } catch (err) { /* ignore */ }
  }

  function readToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (err) { return ''; }
  }

  function setToken(value) {
    try {
      if (value) localStorage.setItem(TOKEN_KEY, value);
      else localStorage.removeItem(TOKEN_KEY);
    } catch (err) { /* ignore */ }
  }

  async function apiFetch(path, options) {
    const opts = options || {};
    const headers = Object.assign({ Accept: 'application/json' }, opts.headers || {});
    const init = { method: opts.method || 'GET', headers };
    if (opts.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(opts.body);
    }
    if (opts.auth !== false && readToken()) headers.Authorization = 'Bearer ' + readToken();

    const response = await fetch(apiBase + path, init);
    const raw = await response.text();
    let data = null;
    if (raw) {
      try { data = JSON.parse(raw); } catch (err) { data = null; }
    }
    if (!response.ok) {
      const info = (data && data.error) || {};
      const error = new Error(info.message || 'Request failed. Check your connection and try again.');
      error.status = response.status;
      error.code = info.code || 'request_failed';
      error.fields = info.fields || {};
      if (response.status === 401 && opts.auth !== false) setToken('');
      throw error;
    }
    return data;
  }

  function applyApi(data) {
    const school = Object.assign({}, data.school);
    school.courses = normalizeCourses(school.courses);
    db = {
      version: 1,
      mode: 'api',
      school,
      schools: [school],
      user: data.user,
      subscription: data.subscription,
      students: data.students || [],
      serverTime: data.serverTime
    };
    dbMode = 'api';
  }

  async function probe() {
    if (!/^https?:$/.test(location.protocol)) return false;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2500);
      const response = await fetch(apiBase + '/api/health', {
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timer);
      if (!response.ok) return false;
      const data = await response.json();
      return !!(data && data.status === 'ok');
    } catch (err) {
      return false;
    }
  }

  async function init() {
    if (typeof window.DRIVEDESK_API === 'string') {
      apiBase = window.DRIVEDESK_API.replace(/\/$/, '');
      apiAvailable = true;
      mode = 'api';
    } else if (/^https?:$/.test(location.protocol)) {
      apiBase = '';
      apiAvailable = await probe();
      mode = apiAvailable ? 'api' : 'demo';
    } else {
      mode = 'demo';
    }

    if (mode === 'api' && readToken()) {
      try {
        await refresh();
      } catch (err) {
        console.warn('DriveDesk: session restore failed', err.message);
        setToken('');
        db = readDemo();
        dbMode = 'demo';
      }
    }
    return mode;
  }

  async function refresh() {
    if (mode !== 'api' || !readToken()) throw new Error('Not signed in.');
    applyApi(await apiFetch('/api/bootstrap'));
    return db;
  }

  function state() {
    return db;
  }

  function reset() {
    db = seed();
    dbMode = 'demo';
    persistDemo();
    return db;
  }

  function getStudent(id) {
    return db.students.find((s) => s.id === id) || null;
  }

  function replaceStudent(student) {
    const index = db.students.findIndex((s) => s.id === student.id);
    if (index >= 0) db.students[index] = student;
    else db.students.unshift(student);
  }

  function progress(s) {
    if (!s) return 0;
    return (s.sessions || []).filter((x) => x.status === 'present').length;
  }

  function allSessions() {
    const rows = [];
    db.students.forEach((s) => {
      (s.sessions || []).forEach((x) => rows.push({ ...x, studentId: s.id, student: s }));
    });
    return rows.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  function todaySchedule() {
    const today = keyOf(new Date());
    const rows = [];

    allSessions().forEach((x) => {
      if (keyOf(new Date(x.date)) === today) {
        rows.push({ at: x.date, session: x, student: x.student, done: true });
      }
    });

    db.students.forEach((s) => {
      if (s.status !== 'active' || !s.nextClass) return;
      if (keyOf(new Date(s.nextClass)) !== today) return;
      rows.push({ at: s.nextClass, session: null, student: s, done: false });
    });

    return rows.sort((a, b) => new Date(a.at) - new Date(b.at));
  }

  function upcomingSchedule() {
    const start = new Date();
    start.setHours(23, 59, 59, 999);
    const end = addDays(start, 8);
    return db.students
      .filter((s) => s.status === 'active' && s.nextClass && new Date(s.nextClass) > start && new Date(s.nextClass) <= end)
      .map((s) => ({ at: s.nextClass, student: s }))
      .sort((a, b) => new Date(a.at) - new Date(b.at));
  }

  function stats() {
    const active = db.students.filter((s) => s.status === 'active');
    const schedule = todaySchedule();
    const present = schedule.filter((x) => x.session && x.session.status === 'present').length;
    const pending = db.students.reduce((sum, s) => sum + Math.max(0, (s.fees.total || 0) - (s.fees.paid || 0)), 0);
    const pendingCount = db.students.filter((s) => s.fees.total > s.fees.paid).length;
    return {
      active: active.length,
      total: db.students.length,
      completed: db.students.filter((s) => s.status === 'completed').length,
      today: schedule.length,
      present,
      absent: Math.max(0, schedule.length - present),
      pending,
      pendingCount
    };
  }

  function nextId() {
    db.seq = (db.seq || 0) + 1;
    return `STU-${new Date().getFullYear()}-${pad(db.seq, 3)}`;
  }

  async function addStudent(input) {
    if (mode === 'api') {
      const result = await apiFetch('/api/students', { method: 'POST', body: input });
      replaceStudent(result.student);
      return result.student;
    }

    const start = input.startDate ? new Date(`${input.startDate}T00:00:00`) : new Date();
    const nextClass = atTime(start, input.timing || '07:00');
    const student = {
      id: nextId(),
      schoolId: (db.school && db.school.id) || 'sch-1',
      name: String(input.name || '').trim(),
      phone: String(input.phone || '').trim(),
      address: String(input.address || '').trim(),
      photo: input.photo || null,
      package: {
        type: input.type || 'Car — Manual',
        days: Number(input.days) || 0,
        timing: input.timing || '07:00',
        instructor: input.instructor || '',
        vehicle: input.vehicle || ''
      },
      fees: {
        total: Number(input.total) || 0,
        paid: Number(input.paid) || 0,
        mode: input.mode || 'Cash'
      },
      license: {
        present: !!input.licensePresent,
        number: input.licenseNumber || '',
        expiry: input.licenseExpiry || ''
      },
      agreement: {
        signed: true,
        signedAt: new Date().toISOString(),
        signature: input.signature || null,
        version: 'v1'
      },
      startDate: input.startDate || keyOf(new Date()),
      createdAt: new Date().toISOString(),
      status: 'active',
      nextClass: nextClass.toISOString(),
      sessions: [],
      payments: []
    };
    if (student.fees.paid > 0) {
      student.payments.push({
        id: `PAY-${Date.now()}`,
        amount: student.fees.paid,
        mode: student.fees.mode,
        note: 'Admission payment',
        paidAt: student.createdAt
      });
    }
    db.students.unshift(student);
    persistDemo();
    return student;
  }

  async function markAttendance(studentId, opts) {
    opts = opts || {};
    if (mode === 'api') {
      const result = await apiFetch(`/api/students/${encodeURIComponent(studentId)}/sessions`, {
        method: 'POST',
        body: {
          absent: !!opts.absent,
          count: Number(opts.count) || 1,
          instructor: opts.instructor || '',
          signature: opts.signature,
          notes: opts.notes || '',
          location: !!opts.location
        }
      });
      replaceStudent(result.student);
      return result.student;
    }

    const s = getStudent(studentId);
    if (!s) return null;
    const now = new Date();
    const today = keyOf(now);
    s.sessions = s.sessions || [];
    const sameDay = s.sessions.filter((x) => keyOf(new Date(x.date)) === today);
    const sessionNo = sameDay.reduce((max, x) => Math.max(max, Number(x.sessionNo) || 0), 0) + 1;
    const presentToday = sameDay.some((x) => x.status === 'present');
    const count = opts.absent ? 1 : Math.max(1, Math.min(90, Math.floor(Number(opts.count) || 1)));

    if (!opts.absent) {
      if (s.status === 'completed') throw new Error('This student has already completed the course.');
      const remaining = Math.max(0, s.package.days - progress(s));
      if (count > remaining) throw new Error(`Only ${remaining} classes are left in this course.`);
    }

    const batch = [];
    for (let offset = 0; offset < count; offset++) {
      batch.push({
        id: `S${Date.now()}-${offset}`,
        date: now.toISOString(),
        status: opts.absent ? 'absent' : 'present',
        sessionNo: sessionNo + offset,
        instructor: opts.absent ? '' : (opts.instructor || ''),
        vehicle: (s.package && s.package.vehicle) || '',
        signed: !opts.absent && !!opts.signature,
        signature: opts.signature || null,
        notes: opts.notes || '',
        location: !!opts.location
      });
    }
    s.sessions = batch.reverse().concat(s.sessions);

    if (!opts.absent) {
      if (!presentToday) {
        const base = s.nextClass ? new Date(s.nextClass) : now;
        base.setDate(base.getDate() + 1);
        s.nextClass = base.toISOString();
      }
      if (progress(s) >= s.package.days) {
        s.status = 'completed';
        s.nextClass = null;
      }
    }
    persistDemo();
    return s;
  }

  async function addPayment(studentId, data) {
    const payload = data || {};
    if (mode === 'api') {
      const result = await apiFetch(`/api/students/${encodeURIComponent(studentId)}/payments`, {
        method: 'POST',
        body: {
          amount: Number(payload.amount) || 0,
          mode: payload.mode || 'Cash',
          note: payload.note || ''
        }
      });
      replaceStudent(result.student);
      return result.payment;
    }

    const s = getStudent(studentId);
    if (!s) return null;
    const amount = Number(payload.amount) || 0;
    const payment = {
      id: `P${Date.now()}`,
      amount,
      mode: payload.mode || 'Cash',
      note: payload.note || '',
      paidAt: new Date().toISOString()
    };
    s.payments = s.payments || [];
    s.payments.unshift(payment);
    s.fees.paid = (s.fees.paid || 0) + amount;
    s.fees.balance = Math.max(0, (s.fees.total || 0) - s.fees.paid);
    s.fees.mode = payment.mode;
    persistDemo();
    return payment;
  }

  async function updateStudent(id, patch) {
    if (mode === 'api') {
      const result = await apiFetch(`/api/students/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: patch || {}
      });
      replaceStudent(result.student);
      return result.student;
    }

    const s = getStudent(id);
    if (!s) return null;
    const data = patch || {};

    if ('name' in data) s.name = String(data.name || '').trim();
    if ('phone' in data) s.phone = String(data.phone || '').replace(/\D/g, '').slice(0, 10);
    if ('address' in data) s.address = String(data.address || '').trim();
    if ('type' in data) s.package.type = String(data.type || '').trim();
    if ('timing' in data) s.package.timing = data.timing || '07:00';
    if ('instructor' in data) s.package.instructor = data.instructor || '';
    if ('vehicle' in data) s.package.vehicle = data.vehicle || '';
    if ('startDate' in data) s.startDate = data.startDate;

    if ('total' in data) {
      const total = Number(data.total);
      if (!Number.isFinite(total) || total < 1) throw new Error('Enter a valid total course fee.');
      if (total < s.fees.paid) throw new Error('Total fee cannot be less than the amount already paid.');
      s.fees.total = Math.round(total);
    }
    if ('mode' in data) s.fees.mode = data.mode || 'Cash';

    if ('licensePresent' in data) {
      s.license.present = !!data.licensePresent;
      s.license.number = s.license.present ? String(data.licenseNumber || '').trim() : '';
      s.license.expiry = s.license.present ? (data.licenseExpiry || '') : '';
    }

    if ('days' in data) {
      const days = Number(data.days);
      if (!Number.isInteger(days) || days < 1 || days > 90) throw new Error('Course length must be between 1 and 90 classes.');
      if (days < progress(s)) throw new Error('Course length cannot be less than the classes already completed.');
      s.package.days = days;
      if (progress(s) >= days) {
        s.status = 'completed';
        s.nextClass = null;
      } else if (s.status === 'completed') {
        s.status = 'active';
        s.nextClass = atTime(addDays(new Date(), 1), s.package.timing).toISOString();
      }
    }

    if (data.photo) s.photo = data.photo;

    persistDemo();
    return s;
  }

  async function updateSchool(patch) {
    if (mode === 'api') {
      const result = await apiFetch('/api/school', {
        method: 'PATCH',
        body: patch || {}
      });
      db.school = result.school;
      if (Array.isArray(db.schools) && db.schools.length) db.schools[0] = result.school;
      return result.school;
    }

    const update = Object.assign({}, patch || {});
    if ('courses' in update) update.courses = normalizeCourses(update.courses);
    db.school = Object.assign({}, db.school, update);
    if (Array.isArray(db.schools) && db.schools.length) db.schools[0] = db.school;
    persistDemo();
    return db.school;
  }

  async function submitRenewal(utr, note) {
    if (mode === 'api') {
      const result = await apiFetch('/api/subscription/renewals', {
        method: 'POST',
        body: { utr: String(utr || '').replace(/\s+/g, ''), note: note || '' }
      });
      db.subscription = result.subscription;
      return result.renewal;
    }

    const renewal = {
      id: 'demo-' + Date.now(),
      utr: String(utr || '').replace(/\s+/g, ''),
      amount: db.subscription.price,
      months: 1,
      status: 'pending',
      note: note || '',
      submittedAt: new Date().toISOString(),
      reviewedAt: null
    };
    db.renewals = db.renewals || [];
    db.renewals.unshift(renewal);
    persistDemo();
    return renewal;
  }

  async function renewals() {
    if (mode === 'api') {
      const result = await apiFetch('/api/subscription/renewals');
      db.subscription = result.subscription;
      return result.renewals || [];
    }
    return db.renewals || [];
  }

  function isAuthed() {
    if (mode === 'api') return !!readToken() && dbMode === 'api';
    return flagOn();
  }

  async function login(identifier, password) {
    if (mode === 'api') {
      const result = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: { identifier, password },
        auth: false
      });
      setToken(result.token);
      await refresh();
      return db.user;
    }
    setFlag(true);
    dbMode = 'demo';
    return db.user;
  }

  function demoLogin() {
    mode = 'demo';
    if (dbMode !== 'demo') {
      db = readDemo();
      dbMode = 'demo';
    }
    setFlag(true);
    return db.user;
  }

  async function logout() {
    const hadToken = !!readToken();
    setToken('');
    setFlag(false);
    if (hadToken) {
      apiFetch('/api/auth/logout', { method: 'POST', auth: false }).catch(() => {});
    }
    mode = apiAvailable ? 'api' : 'demo';
    dbMode = 'demo';
    db = readDemo();
    return true;
  }

  window.Store = {
    init, refresh, state, reset, stats, getStudent, progress,
    todaySchedule, upcomingSchedule, allSessions,
    addStudent, markAttendance, addPayment, updateStudent,
    submitRenewal, renewals,
    isAuthed, login, demoLogin, logout,
    updateSchool, defaultCourses,
    mode: () => mode,
    apiAvailable: () => apiAvailable,
    keyOf, addDays, atTime
  };
})();
