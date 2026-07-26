/* FUNDS first-run walkthrough — data-driven, page-navigating tour */

(function () {
  const STORAGE_KEY = 'funds.walkthrough.done';
  const TRANSIT_KEY = 'funds.walkthrough.transit';
  const PAD = 8;

  const STEPS = [
    {
      id: 'welcome',
      page: 'funds-dashboard.html',
      selector: '[data-tour="welcome"]',
      title: 'Welcome to FUNDS',
      body: 'Self-hosted personal finance for Australia — import statements, categorise spending, and see where your money goes.',
    },
    {
      id: 'statements',
      page: 'funds-statements.html',
      selector: '[data-tour="statements-upload"]',
      title: 'Upload statements',
      body: 'Drop bank or credit-card PDF exports here. FUNDS parses transactions so you never re-type them.',
    },
    {
      id: 'transactions',
      page: 'funds-transactions.html',
      selector: '[data-tour="transactions-tools"]',
      title: 'Tidy transactions',
      body: 'Search, filter, and pick categories. Use bulk actions and suggestions to clear uncategorized rows fast.',
    },
    {
      id: 'categories',
      page: 'funds-categories.html',
      selector: '[data-tour="categories-tree"]',
      title: 'Shape your categories',
      body: 'Build a hierarchy, set colours, merge duplicates, and reorder — reports roll up from this tree.',
    },
    {
      id: 'dashboard',
      page: 'funds-dashboard.html',
      selector: '[data-tour="dashboard-overview"]',
      title: 'Read the overview',
      body: 'Use the period filter in the header, then scan KPIs and charts. Click a donut slice to drill into matching transactions.',
    },
    {
      id: 'breakdown',
      page: 'funds-breakdown.html',
      selector: '[data-tour="breakdown-recurring"]',
      title: 'Breakdown & recurring',
      body: 'Optional deeper views: spend composition and repeat payments. Open anytime from Overview.',
      optional: true,
    },
  ];

  function pageName() {
    const parts = location.pathname.split('/');
    return parts[parts.length - 1] || 'index.html';
  }

  function params() {
    return new URLSearchParams(location.search);
  }

  function isDone() {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }

  function setDone(done) {
    try {
      if (done) localStorage.setItem(STORAGE_KEY, '1');
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore quota / private mode */
    }
  }

  function consumeTransit() {
    try {
      const raw = sessionStorage.getItem(TRANSIT_KEY);
      sessionStorage.removeItem(TRANSIT_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function markTransit(fromIndex, toIndex) {
    try {
      const card = state.root && state.root.querySelector('.funds-tour-card');
      const rect = card ? card.getBoundingClientRect() : null;
      sessionStorage.setItem(
        TRANSIT_KEY,
        JSON.stringify({
          from: fromIndex,
          to: toIndex,
          fromPage: pageName(),
          toPage: STEPS[toIndex].page,
          cardRect: rect
            ? {
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
              }
            : null,
        })
      );
    } catch {
      /* ignore */
    }
  }

  function narrow() {
    return window.matchMedia('(max-width: 900px)').matches;
  }

  let state = {
    active: false,
    index: 0,
    root: null,
    lastFocus: null,
    trapHandler: null,
    navigating: false,
    arriving: false,
    transit: null,
  };

  function stepUrl(index) {
    const step = STEPS[index];
    return step.page + '?tour=1&step=' + index;
  }

  function navigateToStep(index) {
    if (state.navigating) return;
    state.navigating = true;
    markTransit(state.index, index);
    if (state.root) state.root.classList.add('is-page-handoff');
    window.setTimeout(function () {
      location.href = stepUrl(index);
    }, 140);
  }

  function goToStep(index) {
    if (index < 0 || index >= STEPS.length) return;
    if (state.navigating) return;
    const step = STEPS[index];
    const current = pageName();
    if (step.page !== current) {
      navigateToStep(index);
      return;
    }
    state.index = index;
    render();
  }

  function finish(markDone) {
    if (markDone) setDone(true);
    teardown();
    const q = params();
    if (q.get('tour') === '1') {
      q.delete('tour');
      q.delete('step');
      const next = q.toString();
      const clean = location.pathname + (next ? '?' + next : '') + location.hash;
      history.replaceState(null, '', clean);
    }
  }

  function teardown() {
    document.body.classList.remove('funds-tour-open');
    if (state.trapHandler) {
      document.removeEventListener('keydown', state.trapHandler, true);
      state.trapHandler = null;
    }
    if (state.root) {
      state.root.remove();
      state.root = null;
    }
    document.querySelectorAll('.funds-tour-target-pulse').forEach((el) => {
      el.classList.remove('funds-tour-target-pulse');
    });
    state.active = false;
    if (state.lastFocus && typeof state.lastFocus.focus === 'function') {
      try {
        state.lastFocus.focus();
      } catch {
        /* ignore */
      }
    }
    state.lastFocus = null;
  }

  function focusables(root) {
    return Array.from(
      root.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => el.offsetParent !== null || el === document.activeElement);
  }

  function installTrap(card) {
    if (state.trapHandler) {
      document.removeEventListener('keydown', state.trapHandler, true);
    }
    state.trapHandler = function (e) {
      if (!state.active) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        finish(true);
        return;
      }
      if (e.key !== 'Tab') return;
      const list = focusables(card);
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', state.trapHandler, true);
  }

  function placeCard(card, targetRect) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cardW = card.offsetWidth;
    const cardH = card.offsetHeight;
    const gap = 14;

    if (narrow()) {
      card.style.left = '';
      card.style.top = '';
      return;
    }

    let left = targetRect.left;
    let top = targetRect.bottom + gap;

    if (state.index === 0) {
      left = targetRect.right + gap;
      top = targetRect.top;
    }

    if (left + cardW > vw - 16) left = vw - cardW - 16;
    if (left < 16) left = 16;

    if (top + cardH > vh - 16) {
      top = targetRect.top - cardH - gap;
    }
    if (top < 16) top = Math.max(16, (vh - cardH) / 2);

    card.style.left = Math.round(left) + 'px';
    card.style.top = Math.round(top) + 'px';
  }

  function placeSpotlight(spot, target) {
    if (narrow() || !target) {
      spot.hidden = true;
      return;
    }
    spot.hidden = false;
    const r = target.getBoundingClientRect();
    spot.style.top = Math.round(r.top - PAD) + 'px';
    spot.style.left = Math.round(r.left - PAD) + 'px';
    spot.style.width = Math.round(r.width + PAD * 2) + 'px';
    spot.style.height = Math.round(r.height + PAD * 2) + 'px';
  }

  function ensureRoot() {
    if (state.root) return state.root;
    const root = document.createElement('div');
    root.className = 'funds-tour-root is-active';
    root.setAttribute('data-od-id', 'walkthrough-root');
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'funds-tour-title');
    root.innerHTML = `
      <div class="funds-tour-scrim" data-od-id="walkthrough-scrim" aria-hidden="true"></div>
      <div class="funds-tour-spotlight" data-od-id="walkthrough-spotlight" hidden></div>
      <div class="funds-tour-sidebar-spotlight" data-od-id="walkthrough-sidebar-spotlight" hidden></div>
      <div class="funds-tour-card" tabindex="-1" data-od-id="walkthrough-card">
        <div class="funds-tour-progress">
          <span class="funds-tour-step" id="funds-tour-progress" data-od-id="walkthrough-progress"></span>
          <div class="funds-tour-dots" id="funds-tour-dots" aria-hidden="true"></div>
        </div>
        <h2 class="funds-tour-title" id="funds-tour-title" data-od-id="walkthrough-title"></h2>
        <p class="funds-tour-body" id="funds-tour-body" data-od-id="walkthrough-body"></p>
        <div class="funds-tour-actions">
          <button type="button" class="funds-tour-skip" data-action="skip" data-od-id="walkthrough-skip">Skip tutorial</button>
          <button type="button" class="btn" data-action="back" data-od-id="walkthrough-back">Back</button>
          <button type="button" class="btn btn-primary" data-action="next" data-od-id="walkthrough-next">Next</button>
        </div>
      </div>`;
    document.body.appendChild(root);
    state.root = root;

    root.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn || !root.contains(btn)) return;
      if (state.navigating) return;
      const action = btn.getAttribute('data-action');
      if (action === 'skip') finish(true);
      else if (action === 'back') goToStep(state.index - 1);
      else if (action === 'next') {
        if (state.index >= STEPS.length - 1) finish(true);
        else goToStep(state.index + 1);
      }
    });

    return root;
  }

  function sidebarTarget(step) {
    const id = step.id === 'welcome' ? 'dashboard' : step.id;
    return document.querySelector('[data-od-id="nav-' + id + '"]');
  }

  function placeSidebarSpotlight(spot, target) {
    if (narrow() || !target) {
      spot.hidden = true;
      spot.innerHTML = '';
      return;
    }
    const r = target.getBoundingClientRect();
    spot.hidden = false;
    spot.innerHTML = target.innerHTML;
    spot.style.top = Math.round(r.top - 3) + 'px';
    spot.style.left = Math.round(r.left - 3) + 'px';
    spot.style.width = Math.round(r.width + 6) + 'px';
    spot.style.height = Math.round(r.height + 6) + 'px';
  }

  function render() {
    const step = STEPS[state.index];
    if (!step) {
      finish(true);
      return;
    }

    document.body.classList.add('funds-tour-open');
    const root = ensureRoot();
    root.classList.remove('is-page-handoff');

    const card = root.querySelector('.funds-tour-card');
    const spot = root.querySelector('.funds-tour-spotlight');
    const sidebarSpot = root.querySelector('.funds-tour-sidebar-spotlight');
    const title = root.querySelector('#funds-tour-title');
    const body = root.querySelector('#funds-tour-body');
    const progress = root.querySelector('#funds-tour-progress');
    const dots = root.querySelector('#funds-tour-dots');
    const nextBtn = root.querySelector('[data-action="next"]');
    const backBtn = root.querySelector('[data-action="back"]');

    title.textContent = step.title;
    body.textContent = step.body;
    progress.textContent = 'Step ' + (state.index + 1) + ' of ' + STEPS.length;
    if (step.optional) progress.textContent += ' · optional';

    dots.innerHTML = STEPS.map((_, i) =>
      '<span class="funds-tour-dot' + (i === state.index ? ' is-on' : '') + '"></span>'
    ).join('');

    backBtn.disabled = state.index === 0 || state.navigating;
    backBtn.style.visibility = state.index === 0 ? 'hidden' : 'visible';
    backBtn.textContent = 'Back';

    nextBtn.disabled = state.navigating;
    if (state.index >= STEPS.length - 1) {
      nextBtn.textContent = 'Got it';
    } else {
      nextBtn.textContent = 'Next';
    }

    document.querySelectorAll('.funds-tour-target-pulse').forEach((el) => {
      el.classList.remove('funds-tour-target-pulse');
    });

    let target = document.querySelector(step.selector);
    if (!target) target = document.querySelector('[data-od-id="page-header"]') || document.querySelector('.main');
    const navTarget = sidebarTarget(step);

    if (target) target.classList.add('funds-tour-target-pulse');

    const layout = function () {
      const scrim = root.querySelector('.funds-tour-scrim');
      placeSidebarSpotlight(sidebarSpot, navTarget);
      if (target && !narrow()) {
        placeSpotlight(spot, target);
        if (scrim) scrim.style.opacity = '0';
        placeCard(card, target.getBoundingClientRect());
      } else {
        spot.hidden = true;
        if (scrim) scrim.style.opacity = '1';
        if (!narrow()) {
          card.style.left = '50%';
          card.style.top = '28%';
          card.style.transform = 'translateX(-50%)';
        } else {
          placeCard(card, target ? target.getBoundingClientRect() : { top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 });
        }
      }
    };

    card.style.transform = '';
    if (state.arriving && state.transit && state.transit.cardRect && !narrow()) {
      const oldRect = state.transit.cardRect;
      card.classList.add('is-morphing');
      card.style.left = Math.round(oldRect.left) + 'px';
      card.style.top = Math.round(oldRect.top) + 'px';
      card.style.width = Math.round(oldRect.width) + 'px';
      card.style.height = Math.round(oldRect.height) + 'px';
      card.getBoundingClientRect();
      requestAnimationFrame(function () {
        card.style.width = '';
        card.style.height = '';
        layout();
        window.setTimeout(function () {
          card.classList.remove('is-morphing');
          state.arriving = false;
          state.transit = null;
          card.focus({ preventScroll: true });
        }, 360);
      });
    } else {
      layout();
      requestAnimationFrame(layout);
      card.focus({ preventScroll: true });
    }

    installTrap(card);
    state.active = true;
  }

  function start(atIndex, opts) {
    const idx = typeof atIndex === 'number' ? atIndex : 0;
    const options = opts || {};
    state.lastFocus = document.activeElement;
    const step = STEPS[Math.max(0, Math.min(idx, STEPS.length - 1))];
    const current = pageName();
    if (step.page !== current) {
      if (options.fromTransit) {
        navigateToStep(idx);
      } else {
        markTransit(-1, idx);
        location.href = stepUrl(idx);
      }
      return;
    }
    state.index = idx;
    state.arriving = Boolean(options.arriving);
    state.transit = options.transit || null;
    render();
  }

  function resetAndStart() {
    setDone(false);
    start(0);
  }

  function shouldAutoStart() {
    const q = params();
    if (q.get('tour') === '1') return true;
    if (isDone()) return false;
    const page = pageName();
    return page === 'index.html' || page === '' || page === 'funds-dashboard.html';
  }

  function boot() {
    const transit = consumeTransit();
    const q = params();
    if (q.get('tour') === '1') {
      const raw = parseInt(q.get('step') || '0', 10);
      const idx = Number.isFinite(raw) ? Math.max(0, Math.min(raw, STEPS.length - 1)) : 0;
      const arriving = Boolean(transit && transit.to === idx && transit.fromPage !== pageName());
      start(idx, { arriving: arriving, transit: transit });
      return;
    }
    if (shouldAutoStart() && !isDone()) {
      const page = pageName();
      if (page === 'index.html' || page === '') {
        /* stay on index — show launcher CTA only; auto-route from dashboard */
        return;
      }
      start(0);
    }
  }

  window.addEventListener('resize', () => {
    if (state.active) render();
  });

  window.FUNDS_WALKTHROUGH = {
    STEPS,
    STORAGE_KEY,
    start,
    resetAndStart,
    finish: function () {
      finish(true);
    },
    isDone,
    setDone,
    clearDone: function () {
      setDone(false);
    },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    setTimeout(boot, 0);
  }
})();
