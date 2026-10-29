/* DriveDesk prototype — shared UI helpers */
(function () {
  'use strict';

  const UI = {};

  UI.icon = (name, cls) => `<svg class="icon ${cls || ''}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;

  UI.esc = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));

  UI.initials = (name) => String(name || '?')
    .trim().split(/\s+/).filter(Boolean).slice(0, 2)
    .map((w) => w[0].toUpperCase()).join('') || '?';

  UI.money = (n) => {
    const num = Number(n) || 0;
    return '₹' + num.toLocaleString('en-IN');
  };

  UI.fmtTime = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
  };

  UI.fmtDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  UI.fmtDateShort = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  UI.sameDay = (a, b) => {
    const x = new Date(a), y = new Date(b);
    return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
  };

  UI.dayLabel = (iso) => {
    const d = new Date(iso);
    const now = new Date();
    if (UI.sameDay(d, now)) return 'Today';
    if (UI.sameDay(d, Store.addDays(now, 1))) return 'Tomorrow';
    return d.toLocaleDateString('en-IN', { weekday: 'short' });
  };

  UI.timeOfDay = () => {
    const h = new Date().getHours();
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
  };

  UI.avatar = (student, cls) => {
    const size = cls || '';
    if (student && student.photo) {
      return `<img class="avatar ${size}" src="${UI.esc(student.photo)}" alt="">`;
    }
    return `<div class="avatar avatar-text ${size}">${UI.esc(UI.initials(student && student.name))}</div>`;
  };

  UI.toast = (message, type) => {
    const root = document.getElementById('toast-root');
    if (!root) return;
    const el = document.createElement('div');
    el.className = 'toast toast-' + (type || 'info');
    el.textContent = window.I18N ? I18N.t(message) : message;
    root.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 240);
    }, 2700);
  };

  const modalRoot = () => document.getElementById('modal-root');

  UI.closeOverlay = (overlay) => {
    if (!overlay || !overlay.parentNode) return;
    overlay.dispatchEvent(new CustomEvent('overlay:close'));
    overlay.remove();
    const root = modalRoot();
    if (root && !root.querySelector('.overlay')) document.body.classList.remove('no-scroll');
  };

  UI.closeModal = () => {
    const root = modalRoot();
    if (!root) return;
    const overlays = root.querySelectorAll('.overlay');
    if (overlays.length) UI.closeOverlay(overlays[overlays.length - 1]);
  };

  UI.closeAllModals = () => {
    const root = modalRoot();
    if (!root) return;
    root.dispatchEvent(new CustomEvent('overlays:clear'));
    root.innerHTML = '';
    document.body.classList.remove('no-scroll');
  };

  UI.openModal = (html, opts) => {
    opts = opts || {};
    const root = modalRoot();
    if (!root) return null;
    const overlay = document.createElement('div');
    overlay.className = 'overlay' + (opts.center ? ' center' : '');
    overlay.setAttribute('role', 'presentation');
    overlay.innerHTML = `<div class="sheet ${opts.center ? 'rounded' : ''}" role="dialog" aria-modal="true">${html}</div>`;
    if (window.I18N) I18N.apply(overlay);
    root.appendChild(overlay);
    document.body.classList.add('no-scroll');

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        UI.closeOverlay(overlay);
        return;
      }
      const closer = event.target.closest && event.target.closest('[data-close]');
      if (closer && overlay.contains(closer)) UI.closeOverlay(overlay);
    });

    return overlay;
  };

  UI.confirm = (opts) => {
    const options = opts || {};
    return new Promise((resolve) => {
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        UI.closeOverlay(overlay);
        resolve(value);
      };

      const overlay = UI.openModal(`
        <div class="sheet-head">
          <h3>${UI.esc(options.title || 'Are you sure?')}</h3>
          <button class="icon-btn" type="button" data-close aria-label="Close">${UI.icon('x')}</button>
        </div>
        <p class="modal-text">${UI.esc(options.message || '')}</p>
        <div class="modal-actions">
          <button class="btn btn-ghost" type="button" data-close>Cancel</button>
          <button class="btn ${options.danger ? 'btn-danger' : 'btn-primary'}" type="button" id="modal-confirm">
            ${UI.esc(options.confirmText || 'Confirm')}
          </button>
        </div>`, { center: true });

      overlay.addEventListener('overlay:close', () => finish(false));

      const confirmBtn = overlay.querySelector('#modal-confirm');
      if (confirmBtn) confirmBtn.addEventListener('click', () => finish(true));
    });
  };

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') UI.closeModal();
  });

  /* Canvas signature pad with pointer events. Returns API used by the screens. */
  UI.signaturePad = (canvas) => {
    const ctx = canvas.getContext('2d');
    let dirty = false;
    let drawing = false;
    let last = null;

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height || 150);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0F172A';

    const point = (event) => {
      const r = canvas.getBoundingClientRect();
      return { x: event.clientX - r.left, y: event.clientY - r.top };
    };

    const begin = (event) => {
      event.preventDefault();
      drawing = true;
      if (canvas.setPointerCapture) {
        try { canvas.setPointerCapture(event.pointerId); } catch (err) { /* ignore */ }
      }
      last = point(event);
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(last.x + 0.1, last.y + 0.1);
      ctx.stroke();
      dirty = true;
      canvas.dispatchEvent(new CustomEvent('sig:change', { bubbles: true }));
    };

    const move = (event) => {
      if (!drawing) return;
      event.preventDefault();
      const p = point(event);
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      last = p;
    };

    const end = () => {
      if (!drawing) return;
      drawing = false;
      canvas.dispatchEvent(new CustomEvent('sig:change', { bubbles: true }));
    };

    canvas.addEventListener('pointerdown', begin);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('pointerleave', end);

    return {
      isEmpty: () => !dirty,
      clear: () => {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
        dirty = false;
        canvas.dispatchEvent(new CustomEvent('sig:change', { bubbles: true }));
      },
      dataURL: () => (dirty ? canvas.toDataURL('image/png') : null)
    };
  };

  /* Read a photo, downscale it and return a compact JPEG data URL. */
  UI.fileToDataURL = (file, maxSize, quality) => new Promise((resolve, reject) => {
    const max = maxSize || 520;
    const q = quality || 0.8;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        const scale = Math.min(1, max / Math.max(w, h));
        w = Math.max(1, Math.round(w * scale));
        h = Math.max(1, Math.round(h * scale));
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const cctx = c.getContext('2d');
        cctx.fillStyle = '#ffffff';
        cctx.fillRect(0, 0, w, h);
        cctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', q));
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image'));
    };
    img.src = url;
  });

  window.UI = UI;
})();
