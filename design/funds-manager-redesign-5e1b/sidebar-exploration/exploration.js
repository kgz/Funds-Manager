const icons = {
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6L6 18',
  dash: 'M3 3h7v7H3V3zm11 0h7v5h-7V3zM3 14h7v7H3v-7zm11 3h7v4h-7v-4z',
  chart: 'M4 19V9m6 10V5m6 14v-7',
  future: 'M12 6v6l4 2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  income: 'M12 19V5m0 0l-5 5m5-5l5 5',
  home: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9z',
  calc: 'M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm3 4h6M9 12h6M9 16h3',
  snap: 'M4 7h16v12H4V7zm4-3h8v3H8V4z',
  repeat: 'M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3',
  plan: 'M8 7V3m8 4V3M3 11h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z',
  wallet: 'M3 7h18v12H3V7zm0 4h18M16 14h2',
  asset: 'M12 3l8 4v5c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V7l8-4z',
  liability: 'M12 2v20M6 8h12M6 16h12',
  file: 'M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm7 0v5h5',
  tag: 'M20.6 11.4l-9.2 9.2a2 2 0 0 1-2.8 0L3 15l8.6-8.6a2 2 0 0 1 1.4-.6H19a2 2 0 0 1 2 2v5.2a2 2 0 0 1-.4 1.4zM7.5 8.5h.01',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.7-1L14.5 3h-5L9 6a8 8 0 0 0-1.7 1L5 6 3 9.5 5 11a7 7 0 0 0 0 2l-2 1.5L5 18l2.4-1a8 8 0 0 0 1.7 1l.4 3h5l.4-3a8 8 0 0 0 1.7-1l2.4 1 2-3.5-2-1.5a7 7 0 0 0 .1-1z',
  search: 'M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zm5-2 5 5',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  overview: 'M4 5h16v14H4zM4 10h16',
  cash: 'M4 7h16v12H4zM8 12h8',
  net: 'M4 17l5-5 4 3 7-8',
  setup: 'M5 5h14v14H5zM9 9h6M9 13h6',
  chevron: 'M8 10l4 4 4-4'
};

const groups = [
  {
    id: 'overview',
    label: 'Overview',
    icon: 'overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'dash' },
      { id: 'breakdown', label: 'Breakdown', icon: 'chart' },
      { id: 'future', label: 'Future predictions', icon: 'future' }
    ]
  },
  {
    id: 'cash-flow',
    label: 'Cash flow',
    icon: 'cash',
    items: [
      { id: 'transactions', label: 'Transactions', icon: 'list', badge: '12' },
      { id: 'income', label: 'Income', icon: 'income' },
      { id: 'living', label: 'Living expenses', icon: 'home' },
      { id: 'serviceability', label: 'Serviceability', icon: 'calc' },
      { id: 'snapshots', label: 'Report snapshots', icon: 'snap' },
      { id: 'repeat', label: 'Repeat payments', icon: 'repeat' },
      { id: 'planned', label: 'Planned spending', icon: 'plan', badge: '3' }
    ]
  },
  {
    id: 'net-worth',
    label: 'Net worth',
    icon: 'net',
    items: [
      { id: 'accounts', label: 'Accounts', icon: 'wallet' },
      { id: 'assets', label: 'Assets', icon: 'asset' },
      { id: 'liabilities', label: 'Liabilities', icon: 'liability' }
    ]
  },
  {
    id: 'data-setup',
    label: 'Data & setup',
    icon: 'setup',
    items: [
      { id: 'statements', label: 'Statements', icon: 'file' },
      { id: 'categories', label: 'Categories', icon: 'tag' },
      { id: 'settings', label: 'Settings', icon: 'gear' }
    ]
  }
];

const allItems = groups.flatMap((group) => group.items.map((item) => ({ ...item, group: group.label })));
const commandActions = [
  { id: 'upload-statement', label: 'Upload a statement', detail: 'Import without leaving the dashboard', icon: 'file' },
  { id: 'add-transaction', label: 'Add a transaction', detail: 'Record income or spending', icon: 'income' },
  { id: 'create-snapshot', label: 'Create report snapshot', detail: 'Save the current reporting period', icon: 'snap' },
  { id: 'plan-spending', label: 'Plan spending', detail: 'Add a future expense', icon: 'plan' }
];
let activeId = 'dashboard';

function icon(name, size = 16) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icons[name] || icons.dash}"/></svg>`;
}

function badge(item, subtle = false) {
  if (!item.badge) return '';
  return `<span class="nav-badge${subtle ? ' subtle' : ''}" aria-label="${item.badge} items needing attention">${item.badge}</span>`;
}

function navLink(item, subtleBadge = false) {
  return `<button class="nav-link${item.id === activeId ? ' is-active' : ''}" type="button" data-nav-id="${item.id}" data-od-id="nav-${item.id}">${icon(item.icon)}<span>${item.label}</span>${badge(item, subtleBadge)}</button>`;
}

function brand() {
  return `<div class="brand" data-od-id="sidebar-brand"><span class="brand-mark">F</span><span class="brand-name">Funds</span><button class="brand-action close-nav" type="button" aria-label="Close navigation">${icon('close')}</button></div>`;
}

function groupBlock(group, collapsed = false, subtleBadges = false, excludeIds = []) {
  const items = group.items.filter((item) => !excludeIds.includes(item.id));
  return `<section class="nav-group${collapsed ? ' is-collapsed' : ''}" data-group="${group.id}" data-od-id="nav-group-${group.id}">
    <button class="nav-label group-toggle" type="button" aria-expanded="${collapsed ? 'false' : 'true'}">
      <span>${group.label}</span>${icon('chevron', 14).replace('<svg', '<svg class="chevron"')}
    </button>
    <div class="nav-list"><div class="nav-list-inner">${items.map((item) => navLink(item, subtleBadges)).join('')}</div></div>
  </section>`;
}

const PRIORITY_DESTINATION_IDS = ['dashboard', 'transactions', 'accounts'];

function progressiveSidebar() {
  const quick = PRIORITY_DESTINATION_IDS.map((id) => navLink(allItems.find((item) => item.id === id))).join('');
  return `${brand()}<div class="quick-nav" aria-label="Primary destinations">${quick}</div>
    <div class="nav-groups">${groups.map((group) => groupBlock(group, group.id !== 'overview', false, PRIORITY_DESTINATION_IDS)).join('')}</div>
    <div class="sidebar-foot">Self-hosted · AUD</div>`;
}

function railSidebar() {
  return `<div class="major-rail" aria-label="Major areas">
    <span class="brand-mark">F</span>
    ${groups.map((group, index) => `<button class="rail-btn${index === 0 ? ' is-active' : ''}" type="button" data-rail-group="${group.id}" aria-pressed="${index === 0 ? 'true' : 'false'}">${icon(group.icon)}<span>${group.label.replace(' & setup', '')}</span></button>`).join('')}
    <button class="rail-btn rail-bottom close-nav" type="button">${icon('close')}<span>Close</span></button>
  </div>
  <div class="context-panel" data-od-id="contextual-navigation">
    <h2 class="context-title" id="context-title">Overview</h2>
    <div id="context-links">${groups[0].items.map((item) => navLink(item)).join('')}</div>
    <div class="sidebar-foot">Self-hosted · AUD</div>
  </div>`;
}

function commandSidebar() {
  const favourites = ['dashboard', 'transactions', 'planned', 'accounts', 'statements']
    .map((id) => navLink(allItems.find((item) => item.id === id), true)).join('');
  return `${brand()}
    <button class="search-launcher" type="button" data-command-open data-od-id="all-features-launcher">${icon('search')}<span>All features</span><kbd>⌘ K</kbd></button>
    <p class="nav-label favourite-label">Favourites</p>
    <div>${favourites}</div>
    <div class="sidebar-foot">16 destinations searchable<br>Self-hosted · AUD</div>`;
}

function collapsibleSidebar() {
  const priorityIds = ['dashboard', 'transactions', 'planned'];
  const priority = priorityIds.map((id) => navLink(allItems.find((item) => item.id === id), true)).join('');
  return `${brand()}<div class="priority" aria-label="Top tasks">${priority}</div>
    <div class="nav-groups">${groups.map((group, index) => groupBlock(group, index > 0, true, priorityIds)).join('')}</div>
    <div class="sidebar-foot">Self-hosted · AUD</div>`;
}

function progressiveCommandSidebar() {
  return `${brand()}
    <button class="search-launcher action-launcher" type="button" data-command-open data-od-id="command-action-launcher">${icon('search')}<span>Find or do anything</span><kbd>⌘ K</kbd></button>
    <div class="nav-groups">${groups.map((group) => groupBlock(group, false, true)).join('')}</div>
    <div class="sidebar-foot">Browse all 16 · act without leaving<br>Self-hosted · AUD</div>`;
}

function hybridSidebar() {
  const core = ['dashboard', 'transactions', 'accounts'].map((id) => navLink(allItems.find((item) => item.id === id), true)).join('');
  return `${brand()}<div class="core-nav">${core}</div>
    <div class="more-button"><button class="nav-link" type="button" data-more-open aria-expanded="false">${icon('more')}<span>More</span><span class="nav-badge subtle">13</span></button></div>
    <div class="sidebar-foot">Self-hosted · AUD</div>`;
}

function dashboard() {
  const heights = [[72, 58], [76, 60], [71, 64], [82, 61], [74, 69], [78, 59]];
  return `<main class="product-main" data-od-id="dashboard-shell">
    <header class="page-header" data-od-id="page-header">
      <div class="title-wrap">
        <button class="icon-btn mobile-menu" type="button" aria-label="Open navigation">${icon('menu', 19)}</button>
        <div><h1 class="page-title">Spending &amp; Income Overview</h1><p class="page-sub">People's Choice 9120 · last 6 months of activity</p></div>
      </div>
      <div class="page-actions">
        <select class="select" aria-label="Account filter"><option>People's Choice 9120</option><option>All accounts</option></select>
        <div class="segmented" role="group" aria-label="Period"><button type="button">1 month</button><button type="button">3 months</button><button type="button" class="is-on" aria-pressed="true">6 months</button><button type="button">1 year</button></div>
      </div>
    </header>
    <div class="page-body">
      <section class="kpi-grid" aria-label="Key figures">
        <article class="kpi"><p class="kpi-label">Current Balance</p><p class="kpi-value">$15,284.62</p><p class="kpi-delta">▲ $1,240.18 vs prior</p></article>
        <article class="kpi"><p class="kpi-label">Spending</p><p class="kpi-value">$43,186.40</p><p class="kpi-delta down">▼ $2,104.00 vs prior</p></article>
        <article class="kpi"><p class="kpi-label">Income</p><p class="kpi-value">$52,410.00</p><p class="kpi-delta">▲ $890.00 vs prior</p></article>
        <article class="kpi"><p class="kpi-label">Net</p><p class="kpi-value">$9,223.60</p><p class="kpi-delta">▲ $2,994.18 vs prior</p></article>
      </section>
      <section class="panel"><div class="panel-head"><h2 class="panel-title">Receiving vs Spending</h2><p class="panel-hint">Monthly totals · AUD</p></div>
        <div class="chart" role="img" aria-label="Monthly receiving versus spending bar chart">${heights.map((values, index) => `<div class="month"><i class="bar" style="height:${values[0]}%"></i><i class="bar out" style="height:${values[1]}%"></i><span>${['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'][index]}</span></div>`).join('')}</div>
      </section>
    </div>
  </main>`;
}

function commandDialog(actionAware = false) {
  return `<div class="command-dialog" role="dialog" aria-modal="true" aria-label="${actionAware ? 'Find or do anything' : 'All features'}" data-command-dialog data-action-aware="${actionAware ? 'true' : 'false'}">
    <div class="command-box">
      <div class="command-input-wrap" data-od-id="command-input-bar">
        ${icon('search', 18)}
        <input class="command-input" type="search" enterkeyhint="go" autocomplete="off" spellcheck="false" placeholder="${actionAware ? 'Find a page or run an action…' : 'Search all features…'}" aria-label="${actionAware ? 'Find a page or run an action' : 'Search all features'}">
        <kbd>Esc</kbd>
        <button class="icon-btn command-close" type="button" aria-label="Close search">${icon('close')}</button>
      </div>
      <div class="command-results"></div>
    </div>
  </div>`;
}

function actionDialog() {
  return `<div class="action-dialog" role="dialog" aria-modal="true" aria-labelledby="action-title" data-action-dialog>
    <div class="action-box">
      <div class="action-head"><div><p class="card-kicker">Quick action</p><h2 id="action-title">Upload a statement</h2></div><button class="icon-btn action-close" type="button" aria-label="Close action">${icon('close')}</button></div>
      <div class="upload-step" data-upload-step>
        <label class="drop-zone" data-od-id="statement-file-picker">${icon('file', 24)}<strong>Choose a statement file</strong><span>CSV, OFX or QIF · processed on this server</span><input type="file" accept=".csv,.ofx,.qif" data-statement-file></label>
        <div class="action-row"><span class="action-privacy">${icon('asset', 15)} Your financial data stays self-hosted.</span><button class="board-btn primary upload-continue" type="button" disabled>Review import</button></div>
      </div>
    </div>
  </div>`;
}

function morePopover() {
  const hiddenCore = allItems.filter((item) => !['dashboard', 'transactions', 'accounts'].includes(item.id));
  return `<div class="more-popover" data-more-popover data-od-id="more-destinations">
    ${groups.map((group) => {
      const items = hiddenCore.filter((item) => item.group === group.label);
      if (!items.length) return '';
      return `<span class="nav-label">${group.label}</span>${items.map((item) => navLink(item, true)).join('')}`;
    }).join('')}
  </div>`;
}

function renderApp() {
  const shell = document.querySelector('[data-app-option]');
  if (!shell) return;
  const option = shell.dataset.appOption;
  const renderers = {
    progressive: progressiveSidebar,
    rail: railSidebar,
    command: commandSidebar,
    collapsible: collapsibleSidebar,
    'progressive-command': progressiveCommandSidebar,
    hybrid: hybridSidebar
  };
  shell.classList.add(`option-${option}`);
  const hasCommand = option === 'command' || option === 'progressive-command';
  shell.innerHTML = `<aside class="sidebar" aria-label="Primary navigation" data-od-id="sidebar">${renderers[option]()}</aside>${dashboard()}<button class="mobile-scrim" type="button" aria-label="Close navigation"></button><div class="toast" role="status" aria-live="polite"></div>${hasCommand ? commandDialog(option === 'progressive-command') : ''}${option === 'progressive-command' ? actionDialog() : ''}${option === 'hybrid' ? morePopover() : ''}`;
  wireApp(shell, option);
}

function setActive(shell, id) {
  activeId = id;
  shell.querySelectorAll('[data-nav-id]').forEach((element) => element.classList.toggle('is-active', element.dataset.navId === id));
  const item = allItems.find((candidate) => candidate.id === id);
  const toast = shell.querySelector('.toast');
  toast.textContent = `${item.label} selected · destination preserved in prototype`;
  toast.classList.add('is-visible');
  window.setTimeout(() => toast.classList.remove('is-visible'), 1600);
}

function wireApp(shell, option) {
  const hasCommand = option === 'command' || option === 'progressive-command';
  shell.addEventListener('click', (event) => {
    const nav = event.target.closest('[data-nav-id]');
    if (nav) {
      setActive(shell, nav.dataset.navId);
      shell.classList.remove('nav-open');
      if (hasCommand) closeCommand(shell);
      if (option === 'hybrid') toggleMore(shell, false);
      return;
    }
    const action = event.target.closest('[data-command-action]');
    if (action) {
      runCommandAction(shell, action.dataset.commandAction);
      return;
    }
    const toggle = event.target.closest('.group-toggle');
    if (toggle) {
      const group = toggle.closest('.nav-group');
      const collapsed = group.classList.toggle('is-collapsed');
      toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      return;
    }
    if (event.target.closest('.mobile-menu')) shell.classList.add('nav-open');
    if (event.target.closest('.close-nav, .mobile-scrim')) shell.classList.remove('nav-open');
    if (event.target.closest('[data-command-open]')) openCommand(shell);
    if (event.target.closest('.command-close') || (event.target.matches('[data-command-dialog]'))) closeCommand(shell);
    if (event.target.closest('.action-close') || event.target.matches('[data-action-dialog]')) closeAction(shell);
    if (event.target.closest('.upload-continue')) completeUpload(shell);
    if (event.target.closest('[data-more-open]')) toggleMore(shell);
    const rail = event.target.closest('[data-rail-group]');
    if (rail) showRailGroup(shell, rail.dataset.railGroup);
    const period = event.target.closest('.segmented button');
    if (period) {
      period.parentElement.querySelectorAll('button').forEach((button) => {
        button.classList.toggle('is-on', button === period);
        button.setAttribute('aria-pressed', button === period ? 'true' : 'false');
      });
    }
  });

  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && hasCommand) {
      event.preventDefault();
      openCommand(shell);
    }
    if (event.key === 'Escape') {
      shell.classList.remove('nav-open');
      if (hasCommand) closeCommand(shell);
      if (option === 'progressive-command') closeAction(shell);
      if (option === 'hybrid') toggleMore(shell, false);
    }
  });

  const fileInput = shell.querySelector('[data-statement-file]');
  if (fileInput) {
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      const zone = shell.querySelector('.drop-zone');
      const button = shell.querySelector('.upload-continue');
      zone.classList.toggle('has-file', Boolean(file));
      zone.querySelector('strong').textContent = file ? file.name : 'Choose a statement file';
      zone.querySelector('span').textContent = file ? 'Ready to review before import' : 'CSV, OFX or QIF · processed on this server';
      button.disabled = !file;
    });
  }
}

function showRailGroup(shell, id) {
  const group = groups.find((candidate) => candidate.id === id);
  shell.querySelectorAll('[data-rail-group]').forEach((button) => {
    const selected = button.dataset.railGroup === id;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-pressed', selected ? 'true' : 'false');
  });
  shell.querySelector('#context-title').textContent = group.label;
  shell.querySelector('#context-links').innerHTML = group.items.map((item) => navLink(item)).join('');
}

function renderCommandResults(shell, query = '') {
  const normalized = query.trim().toLowerCase();
  const results = allItems.filter((item) => `${item.label} ${item.group}`.toLowerCase().includes(normalized));
  const dialog = shell.querySelector('[data-command-dialog]');
  const actionAware = dialog.dataset.actionAware === 'true';
  const actions = actionAware
    ? commandActions.filter((action) => `${action.label} ${action.detail}`.toLowerCase().includes(normalized))
    : [];
  const actionResults = actions.length
    ? `<p class="command-section-label">Actions · stay on this page</p>${actions.map((action, index) => `<button class="command-result command-action${index === 0 ? ' is-selected' : ''}" type="button" data-command-action="${action.id}">${icon(action.icon)}<span><strong>${action.label}</strong><small>${action.detail}</small></span><span class="command-kind">Run</span></button>`).join('')}`
    : '';
  const destinationResults = results.length
    ? `<p class="command-section-label">Destinations</p>${results.map((item, index) => `<button class="command-result${!actions.length && index === 0 ? ' is-selected' : ''}" type="button" data-nav-id="${item.id}">${icon(item.icon)}<span>${item.label}</span><small>${item.group}</small>${badge(item, true)}</button>`).join('')}`
    : '';
  shell.querySelector('.command-results').innerHTML = actionResults || destinationResults
    ? `${actionResults}${destinationResults}`
    : '<div class="command-empty">No matching action or destination.</div>';
}

function openCommand(shell) {
  const dialog = shell.querySelector('[data-command-dialog]');
  dialog.classList.add('is-open');
  renderCommandResults(shell);
  const input = dialog.querySelector('.command-input');
  input.value = '';
  input.focus();
  input.oninput = () => renderCommandResults(shell, input.value);
}

function closeCommand(shell) {
  const dialog = shell.querySelector('[data-command-dialog]');
  if (dialog) dialog.classList.remove('is-open');
}

function runCommandAction(shell, id) {
  closeCommand(shell);
  if (id === 'upload-statement') {
    shell.querySelector('[data-action-dialog]').classList.add('is-open');
    shell.querySelector('[data-statement-file]').focus();
    return;
  }
  const action = commandActions.find((candidate) => candidate.id === id);
  const toast = shell.querySelector('.toast');
  toast.textContent = `${action.label} · in-place action opened`;
  toast.classList.add('is-visible');
  window.setTimeout(() => toast.classList.remove('is-visible'), 1800);
}

function closeAction(shell) {
  const dialog = shell.querySelector('[data-action-dialog]');
  if (dialog) dialog.classList.remove('is-open');
}

function completeUpload(shell) {
  const input = shell.querySelector('[data-statement-file]');
  if (!input || !input.files[0]) return;
  closeAction(shell);
  const toast = shell.querySelector('.toast');
  toast.textContent = `${input.files[0].name} ready for review · no page change`;
  toast.classList.add('is-visible');
  window.setTimeout(() => toast.classList.remove('is-visible'), 2200);
}

function toggleMore(shell, force) {
  const popover = shell.querySelector('[data-more-popover]');
  const button = shell.querySelector('[data-more-open]');
  const open = typeof force === 'boolean' ? force : !popover.classList.contains('is-open');
  popover.classList.toggle('is-open', open);
  button.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function initBoard() {
  const frame = document.querySelector('[data-preview-frame]');
  if (!frame) return;
  const cards = [...document.querySelectorAll('[data-option-card]')];
  const title = document.querySelector('[data-preview-title]');
  const description = document.querySelector('[data-preview-description]');
  const open = document.querySelector('[data-preview-open]');
  const select = (card) => {
    cards.forEach((candidate) => {
      const selected = candidate === card;
      candidate.classList.toggle('is-active', selected);
      candidate.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
    frame.src = card.dataset.href;
    title.textContent = card.dataset.title;
    description.textContent = card.dataset.summary;
    open.href = card.dataset.href;
  };
  cards.forEach((card) => card.addEventListener('click', () => select(card)));
}

renderApp();
initBoard();
