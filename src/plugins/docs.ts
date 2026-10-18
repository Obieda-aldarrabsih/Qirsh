import path from 'node:path';
import { FastifyInstance } from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fastifyStatic from '@fastify/static';

export async function registerDocsPlugin(app: FastifyInstance): Promise<void> {
  // Serve the docs assets at /docs/assets/
  await app.register(fastifyStatic, {
    root: path.resolve(process.cwd(), 'docs'),
    prefix: '/docs/assets/',
    decorateReply: false,
    maxAge: 86400000,
  });
  await app.register(fastifySwagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Qirsh REST API · ﻗﺮش',
        description: `
**Every fils accounted for.**

Qirsh is an OpenAPI-first REST API for tracking expenses and budgets, designed with integer minor units (e.g. JOD = 3 decimals / fils), RFC 9457 Problem Details error handling, stable cursor pagination, idempotency keys, and tenant workspace isolation.

### Brand Guidelines
- **Ledger Green** \`#12715A\` · Balance & reliability
- **Copper** \`#C47335\` · Small coins & accents
- **Vault Black** \`#0E1A17\` · Code & durability
- **Paper** \`#F7F7F3\` · Clean ledger background

### Key Guides
- **Quick start**: Register at \`/v1/auth/register\`, create a workspace, log expenses, and query reports.
- **Precision**: Amounts are strictly integer minor units (\`amountMinor\`). Never floating point.
- **Errors**: RFC 9457 format with specific error codes.
- **Idempotency**: Pass \`Idempotency-Key\` header on \`POST /v1/workspaces/:wid/imports\` and mutations.
        `,
        version: '1.0.0',
        contact: {
          name: 'Obieda Al-Darrabsih',
          email: 'mailobieda@gmail.com',
          url: 'https://github.com/Obieda-aldarrabsih/Qirsh',
        },
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Local Development Server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT or API Key',
            description: 'Enter your JWT access token or scoped API key (prefixed with qirsh_live_)',
          },
        },
      },
      security: [{ bearerAuth: [] }],
      tags: [
        { name: 'Auth', description: 'Authentication, registration, JWT & token family rotation' },
        { name: 'Workspaces', description: 'Multi-tenant workspaces and member invitations' },
        { name: 'Categories', description: 'Custom categories & default seeded ledger buckets' },
        { name: 'Transactions', description: 'Expenses & Income with cursor pagination, soft-delete and ETags' },
        { name: 'Budgets', description: 'Monthly category limits and previous month copying' },
        { name: 'Reports', description: 'Summary, category breakdown, budget vs actual, 12-month trend' },
        { name: 'Imports & Exports', description: 'Bulk CSV streaming with formula injection protection' },
        { name: 'Recurring', description: 'Deterministic recurring expense rules' },
        { name: 'API Keys', description: 'Scoped automation keys' },
        { name: 'System', description: 'Health checks and Prometheus metrics' },
      ],
    },
  });

  // Custom themed CSS matching Section 05 & 06 with Dark Mode support
  const customCss = `
    :root {
      --bg: #F7F7F3;
      --surface: #FFFFFF;
      --text: #101820;
      --line: #E2ECE8;
      --primary: #12715A;
    }
    :root[data-theme="dark"] {
      --bg: #0B1311;
      --surface: #111C19;
      --surface-2: #172521;
      --code-bg: #08100E;
      --line: #253631;
      --border-strong: #5A7069;
      --text: #E4EEEA;
      --muted: #9AAEA7;
      --primary: #3DBE95;
      --on-primary: #06150F;
      --primary-text: #56CDA6;
      --accent: #E39A62;
      --get: #7AA7FF;
      --post: #4CC27E;
      --patch: #E3B341;
      --delete: #FF7B72;
      --tint: #14302A;
      --focus: #7FE0BF;
    }
    @media (prefers-color-scheme: dark) {
      :root:not([data-theme="light"]) {
        --bg: #0B1311;
        --surface: #111C19;
        --surface-2: #172521;
        --code-bg: #08100E;
        --line: #253631;
        --border-strong: #5A7069;
        --text: #E4EEEA;
        --muted: #9AAEA7;
        --primary: #3DBE95;
        --on-primary: #06150F;
        --primary-text: #56CDA6;
        --accent: #E39A62;
        --get: #7AA7FF;
        --post: #4CC27E;
        --patch: #E3B341;
        --delete: #FF7B72;
        --tint: #14302A;
        --focus: #7FE0BF;
      }
    }

    body {
      background-color: var(--bg) !important;
      color: var(--text) !important;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
    }
    .swagger-ui .topbar {
      background-color: #0E1A17 !important;
      border-bottom: 2px solid #12715A !important;
      padding: 12px 0 !important;
    }
    .swagger-ui .topbar a {
      color: #FFFFFF !important;
      font-weight: 700 !important;
    }
    .swagger-ui .info .title {
      color: #0E1A17 !important;
      font-weight: 800 !important;
    }
    :root[data-theme="dark"] .swagger-ui .info .title,
    :root[data-theme="dark"] .swagger-ui .info h1,
    :root[data-theme="dark"] .swagger-ui .info h2,
    :root[data-theme="dark"] .swagger-ui .info h3,
    :root[data-theme="dark"] .swagger-ui .info p,
    :root[data-theme="dark"] .swagger-ui .info li {
      color: var(--text) !important;
    }
    :root[data-theme="dark"] .swagger-ui {
      color: var(--text) !important;
    }
    :root[data-theme="dark"] .swagger-ui .scheme-container,
    :root[data-theme="dark"] .swagger-ui section.models {
      background: var(--surface) !important;
      border-color: var(--line) !important;
    }
    :root[data-theme="dark"] .swagger-ui .opblock {
      background: var(--surface) !important;
    }
    :root[data-theme="dark"] .swagger-ui .opblock .opblock-summary {
      border-color: var(--line) !important;
    }
    :root[data-theme="dark"] .swagger-ui .opblock-description-wrapper p,
    :root[data-theme="dark"] .swagger-ui .opblock-external-docs-wrapper p,
    :root[data-theme="dark"] .swagger-ui .opblock-title_normal p {
      color: var(--text) !important;
    }
    :root[data-theme="dark"] .swagger-ui table thead tr td,
    :root[data-theme="dark"] .swagger-ui table thead tr th {
      color: var(--text) !important;
      border-color: var(--line) !important;
    }
    :root[data-theme="dark"] .swagger-ui select,
    :root[data-theme="dark"] .swagger-ui input[type=text] {
      background: var(--surface-2) !important;
      color: var(--text) !important;
      border-color: var(--line) !important;
    }
    .swagger-ui .opblock.opblock-get {
      background: #FFFFFF !important;
      border-color: #2459B8 !important;
    }
    :root[data-theme="dark"] .swagger-ui .opblock.opblock-get {
      background: var(--surface) !important;
      border-color: #7AA7FF !important;
    }
    .swagger-ui .opblock.opblock-get .opblock-summary-method {
      background: #2459B8 !important;
    }
    .swagger-ui .opblock.opblock-post {
      background: #FFFFFF !important;
      border-color: #1D7D46 !important;
    }
    :root[data-theme="dark"] .swagger-ui .opblock.opblock-post {
      background: var(--surface) !important;
      border-color: #4CC27E !important;
    }
    .swagger-ui .opblock.opblock-post .opblock-summary-method {
      background: #1D7D46 !important;
    }
    .swagger-ui .opblock.opblock-patch {
      background: #FFFFFF !important;
      border-color: #9A6400 !important;
    }
    :root[data-theme="dark"] .swagger-ui .opblock.opblock-patch {
      background: var(--surface) !important;
      border-color: #E3B341 !important;
    }
    .swagger-ui .opblock.opblock-patch .opblock-summary-method {
      background: #9A6400 !important;
    }
    .swagger-ui .opblock.opblock-delete {
      background: #FFFFFF !important;
      border-color: #C0362C !important;
    }
    :root[data-theme="dark"] .swagger-ui .opblock.opblock-delete {
      background: var(--surface) !important;
      border-color: #FF7B72 !important;
    }
    .swagger-ui .opblock.opblock-delete .opblock-summary-method {
      background: #C0362C !important;
    }
    .swagger-ui .btn.authorize {
      background-color: #12715A !important;
      border-color: #12715A !important;
      color: #FFFFFF !important;
    }
    .swagger-ui .btn.authorize svg {
      fill: #FFFFFF !important;
    }
    .qirsh-theme-toggle {
      position: fixed;
      top: 10px;
      right: 20px;
      z-index: 999999;
      background: #12715A;
      color: #FFFFFF !important;
      border: 2px solid #3DBE95;
      padding: 8px 18px;
      border-radius: 999px;
      cursor: pointer;
      font-family: inherit;
      font-size: 13px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
      transition: all 0.2s ease;
    }
    :root[data-theme="dark"] .qirsh-theme-toggle {
      background: #172521;
      color: #56CDA6 !important;
      border-color: #3DBE95;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
    }
    .qirsh-theme-toggle:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
    }
  `;

  const customJs = `
    (function() {
      function getTheme() {
        try {
          var saved = localStorage.getItem('theme');
          if (saved === 'dark' || saved === 'light') return saved;
          return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        } catch(e) { return 'light'; }
      }
      function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        try { localStorage.setItem('theme', theme); } catch(e) {}
        var btn = document.getElementById('qirshThemeToggle');
        if (btn) {
          btn.innerHTML = theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
        }
      }

      applyTheme(getTheme());

      function initToggle() {
        if (document.getElementById('qirshThemeToggle')) return;
        var btn = document.createElement('button');
        btn.id = 'qirshThemeToggle';
        btn.className = 'qirsh-theme-toggle';
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Toggle Dark / Light Mode');
        var cur = document.documentElement.getAttribute('data-theme') || 'light';
        btn.innerHTML = cur === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
        btn.onclick = function() {
          var now = document.documentElement.getAttribute('data-theme') || 'light';
          var next = now === 'dark' ? 'light' : 'dark';
          applyTheme(next);
        };
        document.body.appendChild(btn);
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initToggle);
      } else {
        initToggle();
      }
      setTimeout(initToggle, 50);
      setTimeout(initToggle, 300);
      setTimeout(initToggle, 1000);
      window.addEventListener('load', initToggle);
    })();
  `;

  await app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      displayRequestDuration: true,
    },
    theme: {
      css: [{ filename: 'theme.css', content: customCss }],
      js: [{ filename: 'theme.js', content: customJs }],
      title: 'Qirsh API Documentation · Every fils accounted for',
      favicon: [{ filename: 'favicon.svg', rel: 'icon', sizes: 'any', type: 'image/svg+xml', content: '' }],
    },
  });

  // Also expose raw OpenAPI JSON at /openapi.json
  app.get('/openapi.json', async (req, reply) => {
    reply.header('Content-Type', 'application/json').send(app.swagger());
  });
}
