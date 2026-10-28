/* DriveDesk prototype — global event wiring and start-up */
(function () {
  'use strict';

  const viewEl = document.getElementById('view');
  const tabbarEl = document.getElementById('tabbar');
  const modalRootEl = document.getElementById('modal-root');

  const onScreenClick = (event) => {
    const mark = event.target.closest('[data-mark]');
    if (mark) {
      event.preventDefault();
      event.stopPropagation();
      openAttendance(mark.dataset.mark);
      return;
    }

    const goEl = event.target.closest('[data-go]');
    if (goEl) {
      event.preventDefault();
      go(goEl.dataset.go);
      return;
    }

    const toastEl = event.target.closest('[data-toast]');
    if (toastEl) {
      event.preventDefault();
      UI.toast(toastEl.dataset.toast, 'info');
    }
  };

  viewEl.addEventListener('click', onScreenClick);
  if (modalRootEl) modalRootEl.addEventListener('click', onScreenClick);

  tabbarEl.addEventListener('click', (event) => {
    const goEl = event.target.closest('[data-go]');
    if (!goEl) return;
    event.preventDefault();
    go(goEl.dataset.go);
  });

  window.addEventListener('hashchange', () => {
    UI.closeAllModals();
    render();
  });

  viewEl.innerHTML = '<div class="empty" style="padding-top:80px"><b>Loading DriveDesk…</b><p>Connecting to your school.</p></div>';

  Store.init()
    .then(() => render())
    .catch((err) => {
      console.warn('DriveDesk: start-up failed', err);
      render();
    });
})();
