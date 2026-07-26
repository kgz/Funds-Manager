/* Funds Manager — shared chrome + sample data */

window.FUNDS = {
  accounts: [
    { id: 'pc-9120', label: "People's Choice 9120" },
    { id: 'pc-savings', label: "People's Choice Savings" },
    { id: 'cba-offset', label: 'CBA Offset 4412' },
  ],
  snapshotPeriods: {
    '1m': 'This month',
    '3m': '3 months',
    '6m': '6 months',
    '1y': '1 year',
  },
  snapshots: [
    {
      id: 'snap-jun-2026',
      name: 'June refinance pack',
      asAt: '2026-06-30',
      period: '3m',
      accountId: 'all',
      savedAt: '2026-07-01T09:14:00+10:00',
      income: 8735,
      repayments: 2692,
      living: 2120.4,
      surplus: 3922.6,
      netWorth: 284500,
      coverage: {
        income: { state: 'ok', detail: '2 streams · 12+ months history' },
        living: { state: 'ok', detail: 'HEM buckets mapped' },
        liabilities: { state: 'warn', detail: 'Car loan ends in 4 months — confirm replacement' },
        assets: { state: 'ok', detail: 'Offset + savings linked' },
      },
      serviceability: {
        incomeRows: [
          { label: 'Salary (Acme Pty Ltd)', sub: 'Fortnightly × 26 / 12', value: 8320 },
          { label: 'Interest & other', sub: 'Savings · offset', value: 415 },
        ],
        repaymentRows: [
          { label: 'Home loan (CBA)', sub: 'P&I · variable', value: 2100 },
          { label: 'Car loan', sub: 'Remaining 28 months', value: 412 },
          { label: 'Credit card minimums', sub: 'Assumed', value: 180 },
        ],
        livingRows: [
          { label: 'Groceries & household', value: 820 },
          { label: 'Transport', value: 380 },
          { label: 'Utilities & telecom', value: 290.4 },
          { label: 'Dining & discretionary', value: 630 },
        ],
      },
    },
    {
      id: 'snap-mar-2026',
      name: 'Broker pre-approval',
      asAt: '2026-03-15',
      period: '6m',
      accountId: 'pc-9120',
      savedAt: '2026-03-16T14:32:00+11:00',
      income: 8520,
      repayments: 2580,
      living: 2284.5,
      surplus: 3655.5,
      netWorth: 271200,
      coverage: {
        income: { state: 'ok', detail: 'Primary salary confirmed' },
        living: { state: 'warn', detail: 'Childcare bucket partially mapped' },
        liabilities: { state: 'ok', detail: 'Facilities up to date' },
        assets: { state: 'warn', detail: 'Super not linked — manual entry only' },
      },
      serviceability: {
        incomeRows: [
          { label: 'Salary (Acme Pty Ltd)', sub: 'Fortnightly × 26 / 12', value: 8120 },
          { label: 'Contracting (Philips Design)', sub: 'Monthly average', value: 400 },
        ],
        repaymentRows: [
          { label: 'Home loan (CBA)', sub: 'P&I · variable', value: 2050 },
          { label: 'Car loan', sub: 'Remaining 31 months', value: 412 },
          { label: 'Credit card minimums', sub: 'Assumed', value: 118 },
        ],
        livingRows: [
          { label: 'Groceries & household', value: 845 },
          { label: 'Transport', value: 410 },
          { label: 'Utilities & telecom', value: 302.5 },
          { label: 'Childcare & education', value: 427 },
          { label: 'Dining & discretionary', value: 300 },
        ],
      },
    },
    {
      id: 'snap-jan-2026',
      name: 'FY25 tax summary',
      asAt: '2026-01-31',
      period: '1y',
      accountId: 'all',
      savedAt: '2026-02-02T11:05:00+11:00',
      income: 9180,
      repayments: 2692,
      living: 2456.8,
      surplus: 4031.2,
      netWorth: 268900,
      coverage: {
        income: { state: 'ok', detail: 'Full tax year captured' },
        living: { state: 'ok', detail: 'All lender buckets covered' },
        liabilities: { state: 'ok', detail: 'Statement period complete' },
        assets: { state: 'ok', detail: 'Property + offset valued' },
      },
      serviceability: {
        incomeRows: [
          { label: 'Salary (Acme Pty Ltd)', sub: 'Annualised package', value: 8680 },
          { label: 'Interest & dividends', sub: 'FY25 average', value: 500 },
        ],
        repaymentRows: [
          { label: 'Home loan (CBA)', sub: 'P&I · variable', value: 2100 },
          { label: 'Car loan', sub: 'FY25 average', value: 412 },
          { label: 'Credit card minimums', sub: 'Assumed', value: 180 },
        ],
        livingRows: [
          { label: 'Groceries & household', value: 890 },
          { label: 'Transport', value: 420 },
          { label: 'Utilities & telecom', value: 316.8 },
          { label: 'Insurance', value: 210 },
          { label: 'Dining & discretionary', value: 620 },
        ],
      },
    },
  ],
  defaultServiceability: {
    incomeRows: [
      { label: 'Salary (Acme Pty Ltd)', sub: 'Fortnightly × 26 / 12', value: 8320 },
      { label: 'Interest & other', sub: 'Savings · offset', value: 415 },
    ],
    repaymentRows: [
      { label: 'Home loan (CBA)', sub: 'P&I · variable', value: 2100 },
      { label: 'Car loan', sub: 'Remaining 28 months', value: 412 },
      { label: 'Credit card minimums', sub: 'Assumed', value: 180 },
    ],
    livingRows: [
      { label: 'Groceries & household', value: 820 },
      { label: 'Transport', value: 380 },
      { label: 'Utilities & telecom', value: 290.4 },
      { label: 'Dining & discretionary', value: 630 },
    ],
  },
  categories: [
    { id: 'groceries', name: 'Groceries', color: '#3d8b6e', parent: null },
    { id: 'groceries-fresh', name: 'Fresh produce', color: '#3d8b6e', parent: 'groceries' },
    { id: 'transport', name: 'Transport', color: '#4a6fa5', parent: null },
    { id: 'transport-fuel', name: 'Fuel', color: '#4a6fa5', parent: 'transport' },
    { id: 'housing', name: 'Housing', color: '#8b6b4a', parent: null },
    { id: 'housing-rent', name: 'Rent / mortgage', color: '#8b6b4a', parent: 'housing' },
    { id: 'utilities', name: 'Utilities', color: '#6b7a8b', parent: null },
    { id: 'dining', name: 'Dining out', color: '#c47a4a', parent: null },
    { id: 'salary', name: 'Salary', color: '#2f7d5a', parent: null },
    { id: 'transfer', name: 'Transfers', color: '#888888', parent: null },
    { id: 'uncat', name: 'Uncategorized', color: '#b0b0b0', parent: null },
  ],
};

function money(n, opts) {
  const sign = opts && opts.signed;
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
  });
  if (!sign) return n < 0 ? '−' + formatted : formatted;
  if (n < 0) return '−' + formatted;
  if (n > 0) return '+' + formatted;
  return formatted;
}

function icon(name) {
  const svgOpen =
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
  const svgClose = '</svg>';

  if (name === 'income') {
    return `${svgOpen}<rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>${svgClose}`;
  }

  const paths = {
    dash: 'M3 3h7v7H3V3zm11 0h7v5h-7V3zM3 14h7v7H3v-7zm11 3h7v4h-7v-4z',
    chart: 'M4 19V9m6 10V5m6 14v-7',
    future: 'M12 6v6l4 2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
    list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
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
    gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  };
  const d = paths[name] || paths.dash;
  return `${svgOpen}<path d="${d}"/>${svgClose}`;
}

function renderSidebar(active) {
  const groups = [
    {
      label: 'Overview',
      items: [
        { id: 'dashboard', href: 'funds-dashboard.html', label: 'Dashboard', icon: 'dash' },
        { id: 'breakdown', href: 'funds-breakdown.html', label: 'Breakdown', icon: 'chart' },
        { id: 'future', href: 'funds-predictions.html', label: 'Future predictions', icon: 'future' },
      ],
    },
    {
      label: 'Cash flow',
      items: [
        { id: 'transactions', href: 'funds-transactions.html', label: 'Transactions', icon: 'list', badge: 12 },
        { id: 'income', href: 'funds-income.html', label: 'Income', icon: 'income' },
        { id: 'living', href: 'funds-living-expenses.html', label: 'Living expenses', icon: 'home' },
        { id: 'serviceability', href: 'funds-serviceability.html', label: 'Serviceability', icon: 'calc' },
        { id: 'snapshots', href: 'funds-report-snapshots.html', label: 'Report snapshots', icon: 'snap' },
        { id: 'repeat', href: '#', label: 'Repeat payments', icon: 'repeat', stub: true },
        { id: 'planned', href: '#', label: 'Planned spending', icon: 'plan', badge: 3, stub: true },
      ],
    },
    {
      label: 'Net worth',
      items: [
        { id: 'accounts', href: '#', label: 'Accounts', icon: 'wallet', stub: true },
        { id: 'assets', href: '#', label: 'Assets', icon: 'asset', stub: true },
        { id: 'liabilities', href: '#', label: 'Liabilities', icon: 'liability', stub: true },
      ],
    },
    {
      label: 'Data & setup',
      items: [
        { id: 'statements', href: 'funds-statements.html', label: 'Statements', icon: 'file' },
        { id: 'categories', href: 'funds-categories.html', label: 'Categories', icon: 'tag' },
        { id: 'settings', href: 'index.html#settings', label: 'Settings', icon: 'gear' },
      ],
    },
  ];

  let html = `
    <div class="brand" data-od-id="sidebar-brand" data-tour="welcome">
      <div class="brand-mark">F</div>
      <div class="brand-name">Funds</div>
    </div>`;

  for (const g of groups) {
    html += `<div class="nav-group" data-od-id="nav-${g.label.toLowerCase().replace(/\s+/g, '-')}">
      <span class="nav-label">${g.label}</span>`;
    for (const item of g.items) {
      const isActive = item.id === active;
      const cls = 'nav-link' + (isActive ? ' is-active' : '');
      const badge = item.badge
        ? `<span class="nav-badge" aria-label="${item.badge} items needing attention">${item.badge}</span>`
        : '';
      const title = item.stub ? ' title="Prototype stub — not in priority set"' : '';
      html += `<a class="${cls}" href="${item.href}" data-od-id="nav-${item.id}"${title}>${icon(item.icon)}<span>${item.label}</span>${badge}</a>`;
    }
    html += `</div>`;
  }

  html += `<div class="sidebar-foot" data-od-id="sidebar-foot">Self-hosted · AUD</div>`;

  const el = document.getElementById('sidebar');
  if (el) el.innerHTML = html;
}

function wireSegmented(root, onChange) {
  const el = typeof root === 'string' ? document.querySelector(root) : root;
  if (!el) return;
  el.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn || !el.contains(btn)) return;
    el.querySelectorAll('button').forEach((b) => {
      b.classList.toggle('is-on', b === btn);
      b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
    });
    if (onChange) onChange(btn.dataset.value || btn.textContent.trim());
  });
}

function wireSwitch(el) {
  if (!el) return;
  el.addEventListener('click', () => {
    const on = el.classList.toggle('is-on');
    el.setAttribute('aria-checked', on ? 'true' : 'false');
  });
}

function formatDate(iso, style) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  if (style === 'long') {
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  if (style === 'datetime') {
    return d.toLocaleString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function accountLabel(id) {
  if (id === 'all') return 'All accounts';
  const acct = FUNDS.accounts.find((a) => a.id === id);
  return acct ? acct.label : id;
}

function getSnapshot(id) {
  return FUNDS.snapshots.find((s) => s.id === id) || null;
}

function coverageForDraft(period, accountId) {
  const base = {
    income: { state: 'ok', detail: '2 streams · salary history sufficient' },
    living: { state: 'ok', detail: 'HEM buckets mapped for period' },
    liabilities: { state: 'ok', detail: 'Facilities reconciled' },
    assets: { state: 'ok', detail: 'Accounts linked' },
  };

  if (period === '1m') {
    base.income = { state: 'warn', detail: 'Only 19 days of credits in range' };
  }
  if (period === '1y' && accountId !== 'all') {
    base.assets = { state: 'warn', detail: 'Single account — offset balance excluded' };
  }
  if (accountId === 'pc-savings') {
    base.liabilities = { state: 'warn', detail: 'No loan facilities on this account' };
  }
  if (period === '6m' || period === '1y') {
    base.living = { state: 'ok', detail: '6+ months of categorised spend' };
  }

  return base;
}

window.FUNDS.money = money;
window.FUNDS.formatDate = formatDate;
window.FUNDS.accountLabel = accountLabel;
window.FUNDS.getSnapshot = getSnapshot;
window.FUNDS.coverageForDraft = coverageForDraft;
window.FUNDS.renderSidebar = renderSidebar;
window.FUNDS.wireSegmented = wireSegmented;
window.FUNDS.wireSwitch = wireSwitch;
window.FUNDS.icon = icon;
