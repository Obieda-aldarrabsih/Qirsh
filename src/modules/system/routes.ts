import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import client from 'prom-client';
import { db } from '../../db/index.js';

// Setup Prometheus metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

export const systemRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // Root Developer Portal Landing Page & Full Interactive Interface
  app.get(
    '/',
    {
      schema: {
        tags: ['System'],
        summary: 'API Developer Portal & Complete Web Interface',
      },
    },
    async (request, reply) => {
      const acceptsHtml = request.headers.accept?.includes('text/html');
      if (!acceptsHtml) {
        return reply.send({
          name: 'qirsh',
          nameAr: 'قرش',
          tagline: 'كل فلس بحسابه · محرك إدارة المصاريف والميزانيات المالية',
          version: '1.0.0',
          docs: '/docs',
          health: '/health',
          status: 'online',
          currency: 'JOD',
          minorUnitsExponent: 3,
        });
      }

      const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>قرش · محفظة المصاريف وإدارة الميزانية الذكية</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%230E7055'><circle cx='12' cy='12' r='10'/><text x='12' y='16' font-size='12' fill='white' text-anchor='middle' font-family='sans-serif' font-weight='bold'>Q</text></svg>">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script>
    (function() {
      try {
        var saved = localStorage.getItem('theme');
        var sys = window.matchMedia('(prefers-color-scheme: dark)').matches;
        var theme = (saved === 'dark' || saved === 'light') ? saved : (sys ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', theme);
      } catch (e) {}
    })();
  </script>
  <style>
    :root {
      --bg-page: #F6F8F7;
      --bg-card: #FFFFFF;
      --bg-subtle: #EDF1EF;
      
      --brand-green: #0E7055;
      --brand-dark: #074735;
      --brand-light: #E7F3EF;
      --brand-copper: #C47335;
      --copper-subtle: #FDF3EB;
      
      --ink-primary: #0F1E1B;
      --ink-secondary: #485753;
      --ink-muted: #7A8A85;
      --border-color: #DDE4E1;
      
      --status-success: #15803D;
      --status-success-bg: #ECFDF5;
      --status-warning: #B45309;
      --status-warning-bg: #FFFBEB;
      --status-danger: #B91C1C;
      --status-danger-bg: #FEF2F2;
      --status-info: #2563EB;
      --status-info-bg: #EFF6FF;

      --radius-sm: 8px;
      --radius-md: 12px;
      --radius-lg: 18px;
      --shadow-sm: 0 1px 3px rgba(15, 30, 27, 0.05);
      --shadow-md: 0 4px 16px rgba(15, 30, 27, 0.06);
      --shadow-lg: 0 12px 32px rgba(15, 30, 27, 0.1);
    }

    :root[data-theme="dark"] {
      color-scheme: dark;
      --bg-page: #0B1311;
      --bg-card: #111C19;
      --bg-subtle: #172521;
      
      --brand-green: #3DBE95;
      --brand-dark: #06150F;
      --brand-light: #14302A;
      --brand-copper: #E39A62;
      --copper-subtle: #2A1F18;
      
      --ink-primary: #E4EEEA;
      --ink-secondary: #B2C4BE;
      --ink-muted: #839791;
      --border-color: #253631;
      
      --status-success: #4CC27E;
      --status-success-bg: rgba(76, 194, 126, 0.15);
      --status-warning: #F2B53A;
      --status-warning-bg: rgba(242, 181, 58, 0.15);
      --status-danger: #FF7B72;
      --status-danger-bg: rgba(255, 123, 114, 0.15);
      --status-info: #7AA7FF;
      --status-info-bg: rgba(122, 167, 255, 0.15);

      --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.4);
      --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.5);
      --shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.6);
    }

    @media (prefers-color-scheme: dark) {
      :root:not([data-theme="light"]) {
        color-scheme: dark;
        --bg-page: #0B1311;
        --bg-card: #111C19;
        --bg-subtle: #172521;
        
        --brand-green: #3DBE95;
        --brand-dark: #06150F;
        --brand-light: #14302A;
        --brand-copper: #E39A62;
        --copper-subtle: #2A1F18;
        
        --ink-primary: #E4EEEA;
        --ink-secondary: #B2C4BE;
        --ink-muted: #839791;
        --border-color: #253631;
        
        --status-success: #4CC27E;
        --status-success-bg: rgba(76, 194, 126, 0.15);
        --status-warning: #F2B53A;
        --status-warning-bg: rgba(242, 181, 58, 0.15);
        --status-danger: #FF7B72;
        --status-danger-bg: rgba(255, 123, 114, 0.15);
        --status-info: #7AA7FF;
        --status-info-bg: rgba(122, 167, 255, 0.15);

        --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.4);
        --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.5);
        --shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.6);
      }
    }

    /* Dark mode component styling */
    :root[data-theme="dark"] header {
      background: var(--bg-card) !important;
      border-bottom-color: var(--border-color) !important;
    }
    :root[data-theme="dark"] .stat-card {
      background: var(--bg-card) !important;
      border-color: var(--border-color) !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4) !important;
    }
    :root[data-theme="dark"] .card {
      background: var(--bg-card) !important;
      border-color: var(--border-color) !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4) !important;
    }
    :root[data-theme="dark"] .card-head {
      border-bottom-color: var(--border-color) !important;
    }
    :root[data-theme="dark"] .btn-light {
      background: var(--bg-subtle) !important;
      border-color: var(--border-color) !important;
      color: var(--ink-primary) !important;
    }
    :root[data-theme="dark"] .btn-light:hover {
      background: var(--brand-light) !important;
      border-color: var(--brand-green) !important;
      color: var(--brand-green) !important;
    }
    :root[data-theme="dark"] .modal-window {
      background: var(--bg-card) !important;
      border-color: var(--border-color) !important;
      box-shadow: var(--shadow-lg) !important;
    }
    :root[data-theme="dark"] .modal-header {
      border-bottom-color: var(--border-color) !important;
    }
    :root[data-theme="dark"] .modal-backdrop {
      background: rgba(0, 0, 0, 0.75) !important;
    }
    :root[data-theme="dark"] input,
    :root[data-theme="dark"] select,
    :root[data-theme="dark"] textarea,
    :root[data-theme="dark"] .form-control {
      background: var(--bg-subtle) !important;
      color: var(--ink-primary) !important;
      border-color: var(--border-color) !important;
    }
    :root[data-theme="dark"] input:focus,
    :root[data-theme="dark"] select:focus,
    :root[data-theme="dark"] textarea:focus,
    :root[data-theme="dark"] .form-control:focus {
      border-color: var(--brand-green) !important;
      box-shadow: 0 0 0 3px rgba(61, 190, 149, 0.15) !important;
    }
    :root[data-theme="dark"] .nav-tabs {
      background: #091310 !important;
      border-color: var(--border-color) !important;
    }
    :root[data-theme="dark"] .tab-btn {
      color: var(--ink-secondary) !important;
    }
    :root[data-theme="dark"] .tab-btn:hover {
      color: var(--ink-primary) !important;
      background: rgba(255, 255, 255, 0.04) !important;
    }
    :root[data-theme="dark"] .tab-btn.active {
      background: var(--bg-card) !important;
      color: var(--brand-green) !important;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5) !important;
    }
    :root[data-theme="dark"] table.custom-table th {
      background: var(--bg-subtle) !important;
      color: var(--ink-secondary) !important;
      border-color: var(--border-color) !important;
    }
    :root[data-theme="dark"] table.custom-table td {
      border-color: var(--border-color) !important;
      color: var(--ink-primary) !important;
    }
    :root[data-theme="dark"] tr:hover td {
      background: var(--bg-subtle) !important;
    }
    :root[data-theme="dark"] .cat-pill {
      background: var(--bg-subtle) !important;
      border-color: var(--border-color) !important;
      color: var(--ink-secondary) !important;
    }
    :root[data-theme="dark"] .status-badge {
      border-color: rgba(76, 194, 126, 0.3) !important;
    }
    :root[data-theme="dark"] .digital-card {
      background: linear-gradient(135deg, #071F18, #0E3B2E) !important;
      border: 1px solid #1A4739 !important;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5) !important;
    }
    :root[data-theme="dark"] .theme-toggle-btn {
      background: var(--bg-subtle) !important;
      border-color: var(--border-color) !important;
      color: var(--ink-primary) !important;
    }
    :root[data-theme="dark"] .theme-toggle-btn:hover {
      background: var(--brand-light) !important;
      border-color: var(--brand-green) !important;
      color: var(--brand-green) !important;
    }
    :root[data-theme="dark"] .gauge-bar {
      background: #0E1815 !important;
      border-color: var(--border-color) !important;
    }

    html.theme-switching,
    html.theme-switching * {
      transition: none !important;
    }

    .theme-toggle-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--bg-subtle);
      border: 1px solid var(--border-color);
      color: var(--ink-primary);
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: inherit;
    }
    .theme-toggle-btn:hover {
      border-color: var(--brand-green);
      background: var(--brand-light);
    }
    :root[data-theme="dark"] .theme-toggle-btn .icon-moon { display: none; }
    :root[data-theme="dark"] .theme-toggle-btn .icon-sun { display: inline-flex; color: var(--brand-copper); }
    :root:not([data-theme="dark"]) .theme-toggle-btn .icon-sun { display: none; }
    :root:not([data-theme="dark"]) .theme-toggle-btn .icon-moon { display: inline-flex; }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'IBM Plex Sans Arabic', system-ui, -apple-system, sans-serif;
      background-color: var(--bg-page);
      color: var(--ink-primary);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }

    /* Header */
    header {
      background: var(--bg-card);
      border-bottom: 1px solid var(--border-color);
      position: sticky;
      top: 0;
      z-index: 50;
      box-shadow: var(--shadow-sm);
    }
    .header-inner {
      max-width: 1240px;
      margin: 0 auto;
      padding: 12px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }
    .brand-box {
      display: flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
      color: inherit;
    }
    .brand-coin {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: linear-gradient(135deg, var(--brand-green), var(--brand-dark));
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FFFFFF;
      box-shadow: 0 3px 8px rgba(14, 112, 85, 0.25);
    }
    .brand-title {
      font-size: 20px;
      font-weight: 800;
      color: var(--ink-primary);
      display: flex;
      align-items: baseline;
      gap: 6px;
    }
    .brand-title span {
      font-size: 13px;
      font-weight: 600;
      color: var(--brand-copper);
      font-family: 'JetBrains Mono', monospace;
    }
    .brand-desc {
      font-size: 11.5px;
      color: var(--ink-muted);
      font-weight: 500;
    }

    /* Live Server Badge */
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--status-success-bg);
      border: 1px solid #A7F3D0;
      color: var(--status-success);
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
    }
    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10B981;
      box-shadow: 0 0 6px #10B981;
    }

    /* Main Navigation Tabs */
    .nav-tabs {
      display: flex;
      background: var(--bg-subtle);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 4px;
      gap: 4px;
      overflow-x: auto;
    }
    .tab-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 8px;
      border: none;
      background: transparent;
      color: var(--ink-secondary);
      font-size: 13.5px;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
      font-family: inherit;
    }
    .tab-btn:hover {
      color: var(--ink-primary);
    }
    .tab-btn.active {
      background: var(--bg-card);
      color: var(--brand-green);
      box-shadow: var(--shadow-sm);
    }

    /* Main Container */
    main {
      max-width: 1240px;
      width: 100%;
      margin: 24px auto;
      padding: 0 20px;
      flex: 1;
    }

    /* Views */
    .view-content {
      display: none;
      animation: fadeIn 0.2s ease-out;
    }
    .view-content.active {
      display: block;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Cards */
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-sm);
      margin-bottom: 24px;
      overflow: hidden;
    }
    .card-head {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .card-title {
      font-size: 16px;
      font-weight: 800;
      color: var(--ink-primary);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .card-body {
      padding: 20px;
    }

    /* Top Stats Grid */
    .stats-row {
      display: grid;
      grid-template-columns: 1.4fr repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 20px;
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
    }
    
    /* Digital Banking Card Style */
    .digital-card {
      background: linear-gradient(135deg, #074735, #0E7055);
      color: #FFFFFF;
      border-radius: var(--radius-md);
      padding: 22px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-shadow: 0 8px 24px rgba(14, 112, 85, 0.2);
      position: relative;
      overflow: hidden;
    }
    .digital-card::after {
      content: '';
      position: absolute;
      width: 140px;
      height: 140px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.06);
      bottom: -40px;
      left: -40px;
    }
    .digital-card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .card-chip {
      width: 32px;
      height: 24px;
      background: linear-gradient(135deg, #FDE68A, #D97706);
      border-radius: 4px;
    }
    .card-balance-lbl {
      font-size: 12px;
      color: #A7F3D0;
      font-weight: 600;
    }
    .card-balance-val {
      font-size: 28px;
      font-weight: 800;
      font-family: 'JetBrains Mono', monospace;
      color: #FFFFFF;
      margin: 4px 0;
    }
    .card-fils-val {
      font-size: 11.5px;
      color: #E6FFFA;
      font-family: 'JetBrains Mono', monospace;
    }
    .card-footer-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 18px;
      font-size: 11.5px;
      color: #C8E6C9;
      font-family: 'JetBrains Mono', monospace;
    }

    /* Regular Stat Cards */
    .stat-label {
      font-size: 13px;
      color: var(--ink-secondary);
      font-weight: 600;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .stat-amount {
      font-size: 24px;
      font-weight: 800;
      font-family: 'JetBrains Mono', monospace;
      color: var(--ink-primary);
      margin-bottom: 4px;
    }
    .stat-sub {
      font-size: 11.5px;
      color: var(--ink-muted);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    /* Dashboard 2 Columns */
    .two-cols {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 24px;
    }

    /* Tables */
    .table-wrap {
      overflow-x: auto;
      width: 100%;
    }
    table.custom-table {
      width: 100%;
      border-collapse: collapse;
      text-align: right;
      font-size: 13.5px;
    }
    table.custom-table th {
      background: var(--bg-subtle);
      color: var(--ink-secondary);
      font-weight: 700;
      font-size: 12px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-color);
      white-space: nowrap;
    }
    table.custom-table td {
      padding: 14px 16px;
      border-bottom: 1px solid var(--border-color);
      color: var(--ink-primary);
      vertical-align: middle;
    }
    table.custom-table tr:last-child td { border-bottom: none; }
    table.custom-table tr:hover td { background: var(--bg-subtle); }

    /* Category Pill */
    .cat-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 10px;
      border-radius: 999px;
      background: var(--bg-subtle);
      border: 1px solid var(--border-color);
      font-size: 12px;
      font-weight: 600;
      color: var(--ink-secondary);
    }
    .mono {
      font-family: 'JetBrains Mono', monospace;
      font-variant-numeric: tabular-nums;
    }

    /* Progress Meters */
    .budget-gauge {
      margin-bottom: 16px;
    }
    .gauge-top {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 6px;
    }
    .gauge-bar {
      height: 9px;
      background: var(--bg-subtle);
      border-radius: 999px;
      overflow: hidden;
      border: 1px solid var(--border-color);
    }
    .gauge-fill {
      height: 100%;
      border-radius: 999px;
      transition: width 0.3s ease;
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 40px;
      padding: 0 18px;
      border-radius: var(--radius-sm);
      font-size: 13.5px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: all 0.15s ease;
      font-family: inherit;
      text-decoration: none;
    }
    .btn-main {
      background: var(--brand-green);
      color: #FFFFFF;
      box-shadow: 0 2px 6px rgba(14, 112, 85, 0.2);
    }
    .btn-main:hover {
      background: var(--brand-dark);
      transform: translateY(-1px);
    }
    .btn-light {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      color: var(--ink-primary);
    }
    .btn-light:hover {
      background: var(--bg-subtle);
    }

    /* Form Fields */
    .form-item {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 14px;
    }
    .form-label {
      font-size: 13px;
      font-weight: 700;
      color: var(--ink-secondary);
    }
    .form-control {
      height: 42px;
      padding: 0 14px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-color);
      background: var(--bg-card);
      font-family: inherit;
      font-size: 14px;
      color: var(--ink-primary);
      transition: border-color 0.15s;
    }
    .form-control:focus {
      outline: none;
      border-color: var(--brand-green);
      box-shadow: 0 0 0 3px rgba(14, 112, 85, 0.12);
    }

    /* Modal */
    .modal-backdrop {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(15, 30, 27, 0.5);
      backdrop-filter: blur(4px);
      z-index: 100;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .modal-backdrop.open {
      display: flex;
    }
    .modal-window {
      background: var(--bg-card);
      border-radius: var(--radius-lg);
      max-width: 520px;
      width: 100%;
      border: 1px solid var(--border-color);
      box-shadow: var(--shadow-lg);
      overflow: hidden;
      animation: modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes modalPop {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    .modal-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    /* Code & Terminal Panels */
    .terminal-box {
      background: #0B1412;
      border: 1px solid #1A2E28;
      border-radius: var(--radius-md);
      overflow: hidden;
      margin: 14px 0;
      direction: ltr;
      text-align: left;
    }
    .terminal-bar {
      background: #11201D;
      padding: 8px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #1A2E28;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: #94A3B8;
    }
    .terminal-code {
      padding: 14px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      color: #E2E8F0;
      line-height: 1.6;
      overflow-x: auto;
    }

    /* Toast */
    #toast-banner {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: var(--ink-primary);
      color: #FFFFFF;
      padding: 12px 24px;
      border-radius: 999px;
      font-size: 14px;
      font-weight: 600;
      box-shadow: var(--shadow-lg);
      display: flex;
      align-items: center;
      gap: 10px;
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 200;
    }
    #toast-banner.show {
      transform: translateX(-50%) translateY(0);
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .stats-row { grid-template-columns: 1fr 1fr; }
      .two-cols { grid-template-columns: 1fr; }
    }
    @media (max-width: 768px) {
      .header-inner { flex-direction: column; align-items: stretch; }
      .stats-row { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>

  <!-- Header -->
  <header>
    <div class="header-inner">
      <div style="display: flex; align-items: center; gap: 16px; justify-content: space-between;">
        <a href="/" class="brand-box">
          <div class="brand-coin">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="9"></circle>
              <path d="M12 6v12M8.5 9.5a3.5 3.5 0 0 1 7 0c0 2-2 3-3.5 3.5S8.5 14 8.5 16"></path>
            </svg>
          </div>
          <div>
            <div class="brand-title">
              قرش <span>Qirsh</span>
            </div>
            <div class="brand-desc">
              كل فلس بحسابه · منصة إدارة المصاريف والميزانية المالية
            </div>
          </div>
        </a>

        <div style="display: flex; align-items: center; gap: 10px;">
          <div class="status-badge">
            <span class="status-dot"></span>
            <span>خادم API نشط (3001)</span>
          </div>

          <button id="qirsh-portal-theme-toggle" class="theme-toggle-btn" onclick="toggleQirshTheme()" title="تبديل الوضع الداكن / النهاري">
            <span class="icon-moon">🌙 الوضع الليلي</span>
            <span class="icon-sun">☀️ الوضع النهاري</span>
          </button>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <nav class="nav-tabs" aria-label="أقسام النظام">
        <button class="tab-btn active" onclick="showTab('dashboard')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          لوحة المحفظة
        </button>
        <button class="tab-btn" onclick="showTab('transactions')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          سجل المصروفات
        </button>
        <button class="tab-btn" onclick="showTab('budgets')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
          الميزانيات الشهرية
        </button>
        <button class="tab-btn" onclick="showTab('docs')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
          توثيق المطورين
        </button>
        <button class="tab-btn" onclick="showTab('console')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
          فاحص الـ API الحي
        </button>
        <a href="/docs" target="_blank" class="tab-btn" style="text-decoration: none;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
          وثائق Swagger
        </a>
      </nav>
    </div>
  </header>

  <!-- Main View Area -->
  <main>

    <!-- SECTION 1: DASHBOARD -->
    <section id="pane-dashboard" class="view-content active">
      <!-- Top Action Bar -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div>
          <h1 style="font-size: 22px; font-weight: 800; color: var(--ink-primary);">محفظة الأسرة · عمان، الأردن</h1>
          <p style="font-size: 13px; color: var(--ink-muted);">دورة شهر تشرين الأول 2026 · الحسابات دقيقة بوحدة الفلس الأردني (1 دينار = 1000 فلس)</p>
        </div>

        <button class="btn btn-main" onclick="openModal()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          إضافة مصروف جديد
        </button>
      </div>

      <!-- Financial Statistics Row -->
      <div class="stats-row">
        <!-- Digital Card -->
        <div class="digital-card">
          <div class="digital-card-top">
            <div class="card-chip"></div>
            <span style="font-size: 12px; font-weight: 700; letter-spacing: 0.05em;">QIRSH WALLET</span>
          </div>
          <div>
            <div class="card-balance-lbl">الرصيد المتاح حالياً</div>
            <div class="card-balance-val" id="disp-balance">1,847.250 <span style="font-size: 16px;">د.أ</span></div>
            <div class="card-fils-val">ما يعادل: 1,847,250 فلس</div>
          </div>
          <div class="card-footer-info">
            <span>JO88 CBJO 0000 0000 0123</span>
            <span>CLIQ READY</span>
          </div>
        </div>

        <!-- October Spending Card -->
        <div class="stat-card">
          <div>
            <div class="stat-label">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>
              مصروفات شهر تشرين الأول
            </div>
            <div class="stat-amount" id="disp-spent" style="color: var(--brand-copper);">385.500 <span style="font-size: 14px; font-weight: 600; color: var(--ink-muted);">د.أ</span></div>
          </div>
          <div class="stat-sub">
            <span style="color: var(--status-warning); font-weight: 700;">77.1%</span> من إجمالي الميزانية المحددة
          </div>
        </div>

        <!-- Remaining Budget Card -->
        <div class="stat-card">
          <div>
            <div class="stat-label">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              الميزانية المتبقية
            </div>
            <div class="stat-amount" id="disp-remain" style="color: var(--brand-green);">114.500 <span style="font-size: 14px; font-weight: 600; color: var(--ink-muted);">د.أ</span></div>
          </div>
          <div class="stat-sub">
            متبقي 13 يوماً حتى استلام الراتب الجديد
          </div>
        </div>

        <!-- Monthly Inflow Card -->
        <div class="stat-card">
          <div>
            <div class="stat-label">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
              الدخل والتحويلات للشهر
            </div>
            <div class="stat-amount">2,232.750 <span style="font-size: 14px; font-weight: 600; color: var(--ink-muted);">د.أ</span></div>
          </div>
          <div class="stat-sub" style="color: var(--status-success); font-weight: 600;">
            تم إيداع الراتب والمستحقات بنجاح
          </div>
        </div>
      </div>

      <!-- 2 Columns Layout -->
      <div class="two-cols">
        <!-- Right: Recent Ledger Transactions Table -->
        <div class="card">
          <div class="card-head">
            <div class="card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></file-text></svg>
              أحدث المصروفات والقيود في السجل
            </div>
            <button class="btn btn-light" style="height: 32px; font-size: 12.5px;" onclick="showTab('transactions')">
              عرض كامل السجل &larr;
            </button>
          </div>

          <div class="table-wrap">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>بيان الحركة / المتجر</th>
                  <th>التصنيف</th>
                  <th>التاريخ</th>
                  <th style="text-align: left;">القيمة بالفلس</th>
                  <th style="text-align: left;">المبلغ بالدينار</th>
                </tr>
              </thead>
              <tbody id="dash-tbody">
                <!-- Rendered dynamically -->
              </tbody>
            </table>
          </div>
        </div>

        <!-- Left: Category Budgets Overview -->
        <div class="card">
          <div class="card-head">
            <div class="card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><pie-chart><circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0 1 10 10h-10z"></path></pie-chart></svg>
              متابعة ميزانيات الفئات
            </div>
            <span class="cat-pill mono">تشرين الأول 2026</span>
          </div>

          <div class="card-body">
            <div class="budget-gauge">
              <div class="gauge-top">
                <span>طعام وتموين (كارفور وسوبرماركت)</span>
                <span class="mono">120.000 / 150.000 د.أ</span>
              </div>
              <div class="gauge-bar">
                <div class="gauge-fill" style="width: 80%; background: var(--brand-green);"></div>
              </div>
            </div>

            <div class="budget-gauge">
              <div class="gauge-top">
                <span>سكن وإيجار الشقة</span>
                <span class="mono">180.000 / 180.000 د.أ</span>
              </div>
              <div class="gauge-bar">
                <div class="gauge-fill" style="width: 100%; background: var(--brand-copper);"></div>
              </div>
            </div>

            <div class="budget-gauge">
              <div class="gauge-top">
                <span>وقود ومواصلات</span>
                <span class="mono">45.500 / 70.000 د.أ</span>
              </div>
              <div class="gauge-bar">
                <div class="gauge-fill" style="width: 65%; background: #2563EB;"></div>
              </div>
            </div>

            <div class="budget-gauge">
              <div class="gauge-top">
                <span>مطاعم وقهوة</span>
                <span class="mono">40.000 / 50.000 د.أ</span>
              </div>
              <div class="gauge-bar">
                <div class="gauge-fill" style="width: 80%; background: #D97706;"></div>
              </div>
            </div>

            <div style="margin-top: 18px; padding: 12px; background: var(--bg-subtle); border-radius: var(--radius-sm); font-size: 12.5px; color: var(--ink-secondary); border: 1px solid var(--border-color);">
              <strong>ضمان الحسابات الدقيقة:</strong> تخزن جميع القيم المالية في قاعدة البيانات كأعداد صحيحة بوحدة الفلس لمنع أي أخطاء حسابية ناجمة عن الفواصل العشرية.
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 2: FULL TRANSACTIONS -->
    <section id="pane-transactions" class="view-content">
      <div class="card">
        <div class="card-head">
          <div class="card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><list><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></list></svg>
            سجل المصروفات الكامل والتدقيق المالي
          </div>

          <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            <input type="text" id="tx-search" placeholder="بحث بالبيان أو المتجر..." class="form-control" style="width: 220px; height: 36px; font-size: 13px;" oninput="filterList(this.value)">
            <button class="btn btn-main" style="height: 36px;" onclick="openModal()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              إضافة حركة جديدة
            </button>
          </div>
        </div>

        <div class="table-wrap">
          <table class="custom-table">
            <thead>
              <tr>
                <th>رقم القيد ID</th>
                <th>البيان والتفاصيل</th>
                <th>التصنيف</th>
                <th>تاريخ الحركة</th>
                <th style="text-align: left;">القيمة بالفلس (Minor Units)</th>
                <th style="text-align: left;">المبلغ بالدينار</th>
                <th>ختم التحقق ETag</th>
              </tr>
            </thead>
            <tbody id="full-tbody">
              <!-- Rendered via JS -->
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- SECTION 3: BUDGETS COMPARISON -->
    <section id="pane-budgets" class="view-content">
      <div class="card">
        <div class="card-head">
          <div class="card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><bar-chart><line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line></bar-chart></svg>
            تقرير مقارنة الميزانية المرصودة بالمصروف الفعلي
          </div>
          <span class="cat-pill mono">شهر تشرين الأول 2026</span>
        </div>

        <div class="table-wrap">
          <table class="custom-table">
            <thead>
              <tr>
                <th>تصنيف المصروف</th>
                <th style="text-align: left;">الميزانية المرصودة</th>
                <th style="text-align: left;">المصروف الفعلي</th>
                <th style="text-align: left;">المتبقي (Variance)</th>
                <th style="width: 200px;">نسبة الاستهلاك</th>
                <th>حالة الإنفاق</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>طعام وبقالة وتموين</strong></td>
                <td style="text-align: left;" class="mono">150.000 د.أ</td>
                <td style="text-align: left;" class="mono" style="font-weight: 700;">120.000 د.أ</td>
                <td style="text-align: left; color: var(--status-success);" class="mono">+30.000 د.أ</td>
                <td>
                  <div class="gauge-bar"><div class="gauge-fill" style="width: 80%; background: var(--brand-green);"></div></div>
                </td>
                <td><span class="cat-pill" style="color: var(--status-success); background: var(--status-success-bg);">ضمن الحدود (80%)</span></td>
              </tr>
              <tr>
                <td><strong>السكن وإيجار الشقة</strong></td>
                <td style="text-align: left;" class="mono">180.000 د.أ</td>
                <td style="text-align: left;" class="mono" style="font-weight: 700;">180.000 د.أ</td>
                <td style="text-align: left; color: var(--ink-muted);" class="mono">0.000 د.أ</td>
                <td>
                  <div class="gauge-bar"><div class="gauge-fill" style="width: 100%; background: var(--brand-copper);"></div></div>
                </td>
                <td><span class="cat-pill" style="color: var(--brand-copper); background: var(--copper-subtle);">اكتمل بالكامل (100%)</span></td>
              </tr>
              <tr>
                <td><strong>مواصلات ووقود السيارات</strong></td>
                <td style="text-align: left;" class="mono">70.000 د.أ</td>
                <td style="text-align: left;" class="mono" style="font-weight: 700;">45.500 د.أ</td>
                <td style="text-align: left; color: var(--status-success);" class="mono">+24.500 د.أ</td>
                <td>
                  <div class="gauge-bar"><div class="gauge-fill" style="width: 65%; background: #2563EB;"></div></div>
                </td>
                <td><span class="cat-pill" style="color: var(--status-info); background: var(--status-info-bg);">ممتاز (65%)</span></td>
              </tr>
              <tr>
                <td><strong>مطاعم وقهوة وضيافة</strong></td>
                <td style="text-align: left;" class="mono">50.000 د.أ</td>
                <td style="text-align: left;" class="mono" style="font-weight: 700;">40.000 د.أ</td>
                <td style="text-align: left; color: var(--status-warning);" class="mono">+10.000 د.أ</td>
                <td>
                  <div class="gauge-bar"><div class="gauge-fill" style="width: 80%; background: #D97706;"></div></div>
                </td>
                <td><span class="cat-pill" style="color: var(--status-warning); background: var(--status-warning-bg);">تنبيه اقتراب الحد (80%)</span></td>
              </tr>
              <tr style="background: var(--bg-subtle); font-weight: 800;">
                <td>المجموع الكلي</td>
                <td style="text-align: left;" class="mono">500.000 د.أ</td>
                <td style="text-align: left;" class="mono">385.500 د.أ</td>
                <td style="text-align: left; color: var(--brand-green);" class="mono">+114.500 د.أ</td>
                <td>
                  <div class="gauge-bar"><div class="gauge-fill" style="width: 77.1%; background: var(--brand-green);"></div></div>
                </td>
                <td><span class="cat-pill" style="color: var(--brand-green); font-weight: 800;">77.1% إجمالي الاستهلاك</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- SECTION 4: DEVELOPER DOCUMENTATION -->
    <section id="pane-docs" class="view-content">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
        <!-- Left Column -->
        <div class="card">
          <div class="card-head">
            <div class="card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><file-text><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></file-text></svg>
              المواصفات الهندسية للنظام
            </div>
          </div>
          <div class="card-body">
            <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 6px;">1. الدقة المحاسبية (Integer Minor Units)</h4>
            <p style="font-size: 13px; color: var(--ink-secondary); margin-bottom: 12px;">
              تمنع الأنظمة المصرفية استخدام الأعداد الكسرية العائمة (Float) لتجنب أخطاء التقريب. الدينار الأردني يمتلك 3 خانات عشرية (1 دينار = 1,000 فلس)، لذلك تخزن جميع المبالغ كأعداد صحيحة بالفلس.
            </p>

            <table class="custom-table" style="margin-bottom: 20px;">
              <thead>
                <tr>
                  <th>العملة</th>
                  <th>رمز العملة</th>
                  <th>الخانة الصغرى</th>
                  <th>تمثيل 15.250 د.أ بالـ API</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>دينار أردني</td>
                  <td class="mono">JOD</td>
                  <td>فلس (Fils)</td>
                  <td class="mono" style="font-weight: 700; color: var(--brand-green);">15250</td>
                </tr>
                <tr>
                  <td>دولار أمريكي</td>
                  <td class="mono">USD</td>
                  <td>سنت (Cent)</td>
                  <td class="mono">1525</td>
                </tr>
              </tbody>
            </table>

            <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 6px;">2. معالجة الأخطاء القياسية (RFC 9457 Problem Details)</h4>
            <p style="font-size: 13px; color: var(--ink-secondary); margin-bottom: 8px;">
              تتوافق جميع استجابات الخطأ مع المعيار العالمي RFC 9457:
            </p>
            <div class="terminal-box">
              <div class="terminal-bar">
                <span>RFC 9457 Response Payload</span>
              </div>
              <div class="terminal-code">
{
  "type": "https://qirsh.dev/docs/errors/currency-mismatch",
  "title": "Currency does not match workspace",
  "status": 422,
  "code": "CURRENCY_MISMATCH",
  "detail": "Workspace uses JOD; got USD.",
  "instance": "req_01J9A7X"
}
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: cURL Examples -->
        <div class="card">
          <div class="card-head">
            <div class="card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><terminal><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></terminal></svg>
              أوامر الربط المباشرة عبر cURL
            </div>
            <a href="/docs" target="_blank" class="btn btn-main" style="height: 32px; font-size: 12px;">
              فتح وثائق Swagger التفاعلية &larr;
            </a>
          </div>
          <div class="card-body">
            <div class="terminal-box">
              <div class="terminal-bar">
                <span>1. تسجيل مستخدم جديد (Register User)</span>
              </div>
              <div class="terminal-code">
curl -X POST http://localhost:3001/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"engineer@qirsh.dev","password":"Password123!","name":"Jordan Engineer"}'
              </div>
            </div>

            <div class="terminal-box">
              <div class="terminal-bar">
                <span>2. تسجيل حركة مالية جديدة (Create Transaction)</span>
              </div>
              <div class="terminal-code">
curl -X POST http://localhost:3001/v1/workspaces/ws_01/transactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amountMinor": 15250,
    "currency": "JOD",
    "categoryId": "cat_groceries",
    "occurredOn": "2026-10-18"
  }'
              </div>
            </div>

            <div class="terminal-box">
              <div class="terminal-bar">
                <span>3. استعلام تقرير الميزانية الفعلي (Budget vs Actual)</span>
              </div>
              <div class="terminal-code">
curl -X GET "http://localhost:3001/v1/workspaces/ws_01/reports/budget-vs-actual?month=2026-10" \
  -H "Authorization: Bearer $TOKEN"
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 5: LIVE API CONSOLE -->
    <section id="pane-console" class="view-content">
      <div class="card">
        <div class="card-head">
          <div class="card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><terminal><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></terminal></svg>
            أداة فحص واستدعاء الـ API الحي والمباشر
          </div>
          <span class="cat-pill mono">سيرفر محلي: http://localhost:3001</span>
        </div>

        <div class="card-body">
          <p style="font-size: 13.5px; color: var(--ink-secondary); margin-bottom: 16px;">
            تتيح لك هذه الأداة تنفيذ طلبات HTTP فعلية مباشرة إلى خادم قرش، وفحص كود الاستجابة والزمن المستغرق بالميلي ثانية مع إخراج JSON منسق.
          </p>

          <div style="display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap;">
            <select id="sel-route" class="form-control mono" style="flex: 1; min-width: 260px; direction: ltr;">
              <option value="/health">GET /health (فحص سلامة النظام ونبض الخادم)</option>
              <option value="/health/live">GET /health/live (فحص جاهزية العمليات Liveness)</option>
              <option value="/health/ready">GET /health/ready (فحص اتصال قواعد البيانات وRedis)</option>
              <option value="/metrics">GET /metrics (مقاييس أداء Prometheus)</option>
              <option value="/openapi.json">GET /openapi.json (مواصفات OpenAPI 3.1 الكاملة)</option>
            </select>

            <button class="btn btn-main" onclick="executeProbe()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              إرسال الطلب الآن
            </button>
          </div>

          <div class="terminal-box">
            <div class="terminal-bar">
              <span id="probe-status" style="color: #94A3B8;">الحالة: بانتظار الإرسال</span>
              <span id="probe-time">الزمن: -- ms</span>
              <span id="probe-size">الحجم: -- bytes</span>
            </div>
            <pre class="terminal-code" id="probe-out">اضغط على "إرسال الطلب الآن" لإجراء فحص حي عبر المتصفح...</pre>
          </div>
        </div>
      </div>
    </section>

  </main>

  <!-- New Transaction Modal Window -->
  <div class="modal-backdrop" id="tx-modal">
    <div class="modal-window">
      <div class="modal-header">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--ink-primary);">تسجيل مصروف أو حركة جديدة</h3>
        <button onclick="closeModal()" style="background: none; border: none; cursor: pointer; color: var(--ink-muted);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <div style="padding: 20px;">
        <form id="new-tx-form" onsubmit="submitTransaction(event)">
          <div class="form-item">
            <label class="form-label">بيان المصروف / المتجر</label>
            <input type="text" id="m-desc" class="form-control" placeholder="مثلاً: كارفور، بنزين سيارة، صيدلية..." required>
          </div>

          <div class="form-item">
            <label class="form-label">تصنيف المصروف</label>
            <select id="m-cat" class="form-control">
              <option value="طعام وبقالة">طعام وبقالة (Groceries)</option>
              <option value="سكن وفواتير">سكن وفواتير (Rent & Utilities)</option>
              <option value="مواصلات ووقود">مواصلات ووقود (Transport)</option>
              <option value="مطاعم وقهوة">مطاعم وقهوة (Dining)</option>
              <option value="صحة وعلاج">صحة وعلاج (Health)</option>
              <option value="راتب ودخل">راتب ودخل مالي (Income)</option>
            </select>
          </div>

          <div class="form-item">
            <label class="form-label">المبلغ بالدينار الأردني (JOD)</label>
            <input type="number" step="0.001" id="m-amount" class="form-control mono" placeholder="مثلاً: 12.500" required oninput="calcFilsLive(this.value)">
            <span id="m-fils-hint" style="font-size: 11.5px; color: var(--brand-copper); font-family: 'JetBrains Mono', monospace;">المعادل المحاسبي: 0 فلس</span>
          </div>

          <div class="form-item">
            <label class="form-label">تاريخ الحركة</label>
            <input type="date" id="m-date" class="form-control mono" value="2026-10-18">
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
            <button type="button" class="btn btn-light" onclick="closeModal()">إلغاء</button>
            <button type="submit" class="btn btn-main">حفظ الحركة في المحفظة</button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- Notification Toast Banner -->
  <div id="toast-banner">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34D399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
    <span id="toast-txt">تمت العملية بنجاح</span>
  </div>

  <script>
    // Live in-memory transactions store
    let txStore = [
      { id: 'tx_01J901', desc: 'كارفور سيتي مول - تموين الأسبوع', cat: 'طعام وبقالة', date: '2026-10-18', fils: 54200, jod: '54.200', etag: 'W/"7a8f1"' },
      { id: 'tx_01J902', desc: 'محطة توتال - وقود السيارة بنزين 95', cat: 'مواصلات ووقود', date: '2026-10-17', fils: 25000, jod: '25.000', etag: 'W/"2b4c9"' },
      { id: 'tx_01J903', desc: 'إيجار الشقة الشهري - تحويل CliQ', cat: 'سكن وفواتير', date: '2026-10-01', fils: 180000, jod: '180.000', etag: 'W/"99e01"' },
      { id: 'tx_01J904', desc: 'ديمتريس كوفي - اللويبدة', cat: 'مطاعم وقهوة', date: '2026-10-16', fils: 4500, jod: '4.500', etag: 'W/"10ab7"' },
      { id: 'tx_01J905', desc: 'فاتورة الكهرباء والماء الشهرية', cat: 'سكن وفواتير', date: '2026-10-12', fils: 38250, jod: '38.250', etag: 'W/"55c4d"' }
    ];

    function showNotice(msg) {
      const el = document.getElementById('toast-banner');
      document.getElementById('toast-txt').innerText = msg;
      el.classList.add('show');
      setTimeout(() => el.classList.remove('show'), 3500);
    }

    function showTab(tabId) {
      document.querySelectorAll('.view-content').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

      const target = document.getElementById('pane-' + tabId);
      if (target) target.classList.add('active');

      const btns = document.querySelectorAll('.tab-btn');
      btns.forEach(b => {
        if (b.getAttribute('onclick')?.includes(tabId)) {
          b.classList.add('active');
        }
      });
    }

    function openModal() {
      document.getElementById('tx-modal').classList.add('open');
    }

    function closeModal() {
      document.getElementById('tx-modal').classList.remove('open');
    }

    function calcFilsLive(val) {
      const num = parseFloat(val) || 0;
      const fils = Math.round(num * 1000);
      document.getElementById('m-fils-hint').innerText = 'المعادل المحاسبي: ' + fils.toLocaleString() + ' فلس (دقة 3 خانات)';
    }

    function renderAllTables() {
      const dashBody = document.getElementById('dash-tbody');
      const fullBody = document.getElementById('full-tbody');

      const row = (t) => \`
        <tr>
          <td style="font-weight: 600;">\${t.desc}</td>
          <td><span class="cat-pill">\${t.cat}</span></td>
          <td class="mono" style="font-size: 12.5px; color: var(--ink-secondary);">\${t.date}</td>
          <td class="mono" style="text-align: left; color: var(--brand-copper); font-weight: 600;">\${t.fils.toLocaleString()} فلس</td>
          <td class="mono" style="text-align: left; font-weight: 700; color: var(--ink-primary);">\${t.jod} د.أ</td>
          \${fullBody ? \`<td class="mono" style="color: var(--ink-muted); font-size: 11px;">\${t.etag}</td>\` : ''}
        </tr>
      \`;

      if (dashBody) dashBody.innerHTML = txStore.slice(0, 4).map(row).join('');
      if (fullBody) {
        fullBody.innerHTML = txStore.map(t => \`
          <tr>
            <td class="mono" style="color: var(--ink-muted); font-size: 12px;">\${t.id}</td>
            <td style="font-weight: 600;">\${t.desc}</td>
            <td><span class="cat-pill">\${t.cat}</span></td>
            <td class="mono" style="font-size: 12.5px;">\${t.date}</td>
            <td class="mono" style="text-align: left; color: var(--brand-copper); font-weight: 600;">\${t.fils.toLocaleString()} فلس</td>
            <td class="mono" style="text-align: left; font-weight: 700;">\${t.jod} د.أ</td>
            <td class="mono" style="color: var(--ink-muted); font-size: 11px;">\${t.etag}</td>
          </tr>
        \`).join('');
      }
    }

    function submitTransaction(e) {
      e.preventDefault();
      const desc = document.getElementById('m-desc').value.trim();
      const cat = document.getElementById('m-cat').value;
      const amt = parseFloat(document.getElementById('m-amount').value) || 0;
      const date = document.getElementById('m-date').value || '2026-10-18';

      const fils = Math.round(amt * 1000);
      const newTx = {
        id: 'tx_01J9' + Math.floor(100 + Math.random() * 900),
        desc: desc,
        cat: cat,
        date: date,
        fils: fils,
        jod: amt.toFixed(3),
        etag: 'W/"' + Math.random().toString(36).substring(2, 7) + '"'
      };

      txStore.unshift(newTx);
      renderAllTables();

      // Recalculate spending
      const totalSpent = txStore.reduce((sum, t) => sum + (t.cat !== 'راتب ودخل' ? t.fils : 0), 0) / 1000;
      document.getElementById('disp-spent').innerHTML = totalSpent.toFixed(3) + ' <span style="font-size: 14px; font-weight: 600; color: var(--ink-muted);">د.أ</span>';
      document.getElementById('disp-remain').innerHTML = Math.max(0, 500 - totalSpent).toFixed(3) + ' <span style="font-size: 14px; font-weight: 600; color: var(--ink-muted);">د.أ</span>';

      closeModal();
      document.getElementById('new-tx-form').reset();
      document.getElementById('m-fils-hint').innerText = 'المعادل المحاسبي: 0 فلس';
      showNotice('تمت إضافة المصروف بنجاح وتحديث الرصيد!');
    }

    function filterList(query) {
      const q = (query || '').toLowerCase().trim();
      const filtered = txStore.filter(t => t.desc.toLowerCase().includes(q) || t.cat.toLowerCase().includes(q));
      const fullBody = document.getElementById('full-tbody');
      if (fullBody) {
        fullBody.innerHTML = filtered.map(t => \`
          <tr>
            <td class="mono" style="color: var(--ink-muted); font-size: 12px;">\${t.id}</td>
            <td style="font-weight: 600;">\${t.desc}</td>
            <td><span class="cat-pill">\${t.cat}</span></td>
            <td class="mono" style="font-size: 12.5px;">\${t.date}</td>
            <td class="mono" style="text-align: left; color: var(--brand-copper); font-weight: 600;">\${t.fils.toLocaleString()} فلس</td>
            <td class="mono" style="text-align: left; font-weight: 700;">\${t.jod} د.أ</td>
            <td class="mono" style="color: var(--ink-muted); font-size: 11px;">\${t.etag}</td>
          </tr>
        \`).join('');
      }
    }

    async function executeProbe() {
      const path = document.getElementById('sel-route').value;
      const statusLbl = document.getElementById('probe-status');
      const timeLbl = document.getElementById('probe-time');
      const sizeLbl = document.getElementById('probe-size');
      const out = document.getElementById('probe-out');

      statusLbl.innerText = 'جارٍ إرسال الطلب...';
      statusLbl.style.color = '#FBBF24';
      out.innerText = 'جاري الاتصال بالخادم على المسار ' + path + ' ...';

      const t0 = performance.now();
      try {
        const resp = await fetch(path, { headers: { 'Accept': 'application/json, text/plain' } });
        const latency = (performance.now() - t0).toFixed(1);
        const text = await resp.text();

        statusLbl.innerText = 'استجابة ' + resp.status + ' ' + (resp.ok ? 'ناجحة (OK)' : 'خطأ');
        statusLbl.style.color = resp.ok ? '#34D399' : '#F87171';
        timeLbl.innerText = 'الزمن: ' + latency + ' ms';
        sizeLbl.innerText = 'الحجم: ' + text.length + ' bytes';

        try {
          const parsed = JSON.parse(text);
          out.innerText = JSON.stringify(parsed, null, 2);
        } catch {
          out.innerText = text;
        }
      } catch (err) {
        statusLbl.innerText = 'فشل الاتصال بالشبكة';
        statusLbl.style.color = '#F87171';
        out.innerText = 'خطأ أثناء الاستدعاء: ' + err.message;
      }
    }

    function toggleQirshTheme() {
      document.documentElement.classList.add('theme-switching');
      var cur = document.documentElement.getAttribute('data-theme') || 'light';
      var next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch(e) {}
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document.documentElement.classList.remove('theme-switching');
        });
      });
    }

    document.addEventListener('DOMContentLoaded', () => {
      renderAllTables();
    });
  </script>
</body>
</html>`;

      return reply.type('text/html; charset=utf-8').send(html);
    }
  );

  // Favicon route
  app.get('/brand/favicon.svg', async (request, reply) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#0E7055"><circle cx="12" cy="12" r="10"/><text x="12" y="16" font-size="12" fill="white" text-anchor="middle" font-family="sans-serif" font-weight="bold">Q</text></svg>`;
    return reply.type('image/svg+xml').send(svg);
  });

  // Health Alias
  app.get('/health', async (request, reply) => {
    return reply.send({
      status: 'ok',
      service: 'qirsh',
      serviceAr: 'قرش',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      currency: 'JOD',
      currencyAr: 'دينار أردني',
      minorUnitsExponent: 3,
    });
  });

  // Liveness Probe
  app.get(
    '/health/live',
    {
      schema: {
        tags: ['System'],
        summary: 'Liveness health check',
      },
    },
    async (request, reply) => {
      return reply.send({ status: 'ok', timestamp: new Date().toISOString() });
    }
  );

  // Readiness Probe
  app.get(
    '/health/ready',
    {
      schema: {
        tags: ['System'],
        summary: 'Readiness health check (Postgres & Redis)',
      },
    },
    async (request, reply) => {
      const health = await db.checkHealth();
      const isReady = health.database && health.redis;

      if (!isReady) {
        return reply.code(503).send({
          status: 'unavailable',
          ...health,
        });
      }

      return reply.send({
        status: 'ready',
        ...health,
      });
    }
  );

  // Prometheus Metrics
  app.get(
    '/metrics',
    {
      schema: {
        tags: ['System'],
        summary: 'Prometheus metrics endpoint',
      },
    },
    async (request, reply) => {
      const metrics = await register.metrics();
      return reply.header('Content-Type', register.contentType).send(metrics);
    }
  );
};
