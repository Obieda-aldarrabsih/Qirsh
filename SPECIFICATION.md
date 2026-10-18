# Qirsh - Product Specification

Total pages: 19


--- PAGE 1 ---

BACK-END · NODE.JS · TYPESCRIPT · FASTIFY · POSTGRESQL
Qirsh
Expense & Budget Trcking REST API
Every fils ccounted for.
ﻗﺮش
Product & Design Specifiction · Version 1.0 · October 202
Prepred for Obied Al-Drrbsih · Softwre engineering portfolio project
Scope: portfolio / demonstrtion build, not  production service



--- PAGE 2 ---

00 Contents
Qirsh is  REST API for trcking expenses nd budgets, built with Node.js, TypeScript, Fstify nd
PostgreSQL. It hs no user interfce of its own on purpose: it is  bck-end portfolio piece whose
"product" is  clen, documented, tested nd rte-limited API tht ny web or mobile client could
use.
01 Overview
02 API Consumers & Roles
0 Core Workflows
0 Feture Scope
05 Brnd Identity & Logo
0 Design System Docs & DX
07 API Style Guide
08 Docs Portl Mockup
0 Architecture & Stck
10 Dt Model
11 Endpoint Reference
12 The Hrd Problems
1 Security
1 Testing Strtegy
15 Observbility
1 DevOps & Repository
17 Build Pln
18 README, Limittions & CV
1 Interview Preprtion
01 Overview
Product Qirsh · ﻗﺮش — expense & budget REST API
Ctegory Bck-end Node.js  TypeScript), OpenAPI-first
Tgline Every fils ccounted for.
Build trget docker compose up  API, PostgreSQL, Redis, interctive docs
Users crete  workspce ( household,  smll tem,  freelncer's business), record expenses
nd income in ctegories, set monthly budgets, nd pull reports: monthly totls, spending by
ctegory, budget versus ctul, nd trends. Expenses cn be imported in bulk from CSV, scheduled
s recurring, nd exported. Access is by user tokens or by scoped API keys for scripts.
Why this project
A bck-end developer is judged by wht the API gurntees: correct money rithmetic, predictble errors, sfe
retries, fir rte limits, honest documenttion nd tests tht prove it. Qirsh is intentionlly nrrow in domin so
tht ech of those gurntees is visible nd testble.
Proves #1 · Money done right
Integer minor units, per-currency
exponents JOD  , deterministic
rounding, month boundries in the
workspce's time zone.
Proves #2 · API crft
OpenAPI generted from the sme
schems tht vlidte requests,
RFC 57 errors, cursor
pgintion, idempotency keys,
versioning.
Proves # · Operbility
Redis-bcked rte limits,
structured logs with request IDs,
metrics, helth checks, integrtion
tests on rel Postgres.
Qirsh · Product & Design Specification Page 1 of 18



--- PAGE 3 ---

SCOPE HONESTY
No bnk connections, no rel finncil dt, no currency conversion. Seed dt is fictionl. The README
must list these limits.
02 API Consumers & Roles
Consumer / role Typicl use Permissions
Owner Cretes the workspce nd
invites others.
Everything, incl. delete workspce, mnge members nd
API keys.
Member Fmily member or temmte
logging expenses.
Crete/edit own expenses, red ll expenses nd reports,
mnge budgets if llowed by owner.
Viewer Accountnt or prtner who
reviews.
Red-only: expenses, reports, exports.
API key A script, spredsheet or bot tht
dds expenses.
Scoped: expenses:write , reports:read , etc. Never
mnges members or keys.
Client pp (future) A web/mobile front-end built lter. Uses user tokens; the API is designed so no extr endpoints
re needed.
Qirsh · Product & Design Specification Page 2 of 18



--- PAGE 4 ---

0 Core Workflows
A. Record n expense
B. Budget nd report
C. Bulk import from CSV
D. Recurring expenses
A rule (e.g. rent, monthly on dy 1 is stored with 
simple schedule. A dily job cretes due trnsctions
with  deterministic key (rule_id,
occurrence_date) , so  job tht runs twice cnnot
crete the rent twice.
0 Feture Scope
Feture Description Relese
Auth Register, login, ccess + refresh tokens with rottion, logout. MVP
Workspces & members Crete, invite (token link), roles owner/member/viewer. MVP
Ctegories Defult seeded set Groceries, Rent, Trnsport …), custom ctegories,
rchive.
MVP
Trnsctions CRUD, filters (dte rnge, ctegory, mount rnge, text), cursor
pgintion, soft delete.
MVP
Budgets Monthly limit per ctegory; copy lst month's budgets. MVP
Reports Monthly summry, by ctegory, budget vs ctul, 12-month trend. MVP
OpenAPI docs Generted spec + interctive docs t /docs . MVP
Rte limiting Per user / per API key / per IP, Redis-bcked. MVP
POST /v1/workspaces/:id/transactions with
mount (minor units), currency, ctegory, dte,
note.
1
Schem vlidtion (Zod)  00 with field-level
problems if invlid.
2
Business rules: currency must equl the
workspce currency; ctegory must belong to
the workspce; dte not more thn 1 dy in the
future.

Insert + udit row in one trnsction; respond
201 with the resource nd Location heder.

Owner sets PUT /budgets/2026-
10/categories/:categoryId with  limit.
1
Client sks for GET /reports/budget-vs-actual?
month=2026-10 .
2
Server computes the month rnge in the
workspce time zone Asi/Ammn by defult),
sums by ctegory with one SQL query, nd
returns spent, remining nd percent used.

Client uplods CSV to POST /imports with n
Idempotency-Key .
1
Server strems nd vlidtes ech row; returns
202 with n import id.
2
Worker inserts vlid rows in btches; invlid
rows re reported with line numbers.

GET /imports/:id shows progress, inserted
count nd row errors.

Re-sending the sme request with the sme key
returns the sme import, never duplictes.
5
Qirsh · Product & Design Specification Page 3 of 18



--- PAGE 5 ---

API keys Scoped keys, shown once, hshed t rest, lst-used trcking. Stretch
CSV import / export Async import with row errors; stremed export. Stretch
Recurring rules Monthly / weekly rules with n idempotent job. Stretch
Bnk sync, OCR receipts,
multi-currency conversion
Lrge fetures with externl dependencies. Out of
scope
Qirsh · Product & Design Specification Page 4 of 18



--- PAGE 6 ---

05 Brnd Identity & Logo
Qirsh (ﻗﺮش) is the everydy Levntine word for  smll coin, s in every qirsh counts. It suits n API
whose whole job is to mke sure no mount is ever lost to rounding. The mrk is  coin whose fce
is  pir of curly brces, the universl sign of JSON nd code, with  copper dot t the centre:
money, s dt. Becuse this is  bck-end product, the identity lives in the API documenttion
portl, the README, error pges nd terminl output rther thn n pp.
Construction
   grid. Coin rdius 27; inner
rim rdius 21.5 t 5% opcity.
Brces drwn with  . stroke,
round joins, 11 units prt. Copper
dot rdius ., exct centre.
Where it ppers
Docs portl heder, Swgger UI
fvicon, README bnner 1280 
20, socil preview imge,
terminl bnner on server strt
ASCII-sfe text version: { qirsh
} ).
Don'ts
Do not dd  currency symbol
inside the coin (the API is
currency-gnostic), do not use
copper for smll text on white, nd
do not nimte the brces.
Repo files: docs/brand/qirsh-mark.svg , qirsh-lockup.svg , qirsh-lockup-dark.svg , favicon.svg , readme-
banner.png , social-preview.png 1280  0.
Color Plette
Contrst rtios re clculted ginst white (#FFFFFF nd the brnd ink (#101820. WCAG AA needs .51 for body text nd
1 for lrge text nd UI prts.
Ledger Green
#12715A · Primry
Logo, links, primry buttons
in the docs portl, '2xx'
bdges.
on white 5.9:1 · on ink
3.0:1
Vult Blck
#0E1A17 · Drk
Docs sidebr, code pnels,
drk logo tile.
on white 17.8:1 · on ink
1.0:1
Copper
#C47335 · Accent
Coin dot in logo,
'deprected' tg, chrt
highlight. Lrge text only on
white.
on white 3.6:1 · on ink
5.0:1
Pper
#F7F7F3 · Bckground
Docs portl bckground.
on white 1.1:1 · on ink
16.7:1
Pure White
#FFFFFF · Surfce
Crds, request/response
pnels.
on white 1.0:1 · on ink
17.9:1
Ink
#101820 · Text
Body text.
on white 17.9:1 · on ink
1.0:1
Slte
#56606A · Muted text
Prmeter descriptions,
cptions.
on white 6.4:1 · on ink
2.8:1
GET Blue
#2459B8 · Method: GET
HTTP method bdge.
on white 6.6:1 · on ink
2.7:1
Qirsh
ﻗﺮش
PRIMARY LOCKUP · LIGHT
 Qirsh
ﻗﺮش
REVERSED · DARK
APP ICON / FAVICON
Qirsh · Product & Design Specification Page 5 of 18



--- PAGE 7 ---

POST Green
#1D7D46 · Method: POST
HTTP method bdge,
success.
on white 5.2:1 · on ink
3.5:1
PATCH Amber
#9A6400 · Method: PATCH
HTTP method bdge,
wrnings.
on white 5.0:1 · on ink
3.6:1
DELETE Red
#C0362C · Method: DELETE
HTTP method bdge,
errors, xx/5xx.
on white 5.5:1 · on ink
3.2:1
Mint Wsh
#E8F3EF · Tint
Cllouts, selected endpoint.
on white 1.1:1 · on ink
15.8:1
Qirsh · Product & Design Specification Page 6 of 18



--- PAGE 8 ---

0 Design System (Docs & Developer Experience)
For n API, design mens: how the docs look, how errors red, nd how the terminl feels. Mood:
 clen ledger book. Pper bckground, ink text, green for "money in order", copper for emphsis.
Code pnels re drk so exmples stnd out.
Typogrphy
Docs heding Budget vs ctul Inter 800 · 28/34
Body Compres ech ctegory's budget with spending. Inter 400 · 15/24
Endpoint GET /v1/reports/budget-vs-actual JetBrains Mono 500 · 14/20
Code smple "spentMinor": 152750 JetBrains Mono 400 · 13/20
Method bdge GET  POST  PATCH  DELETE Mono 700 · 11 · caps
Docs portl components
Endpoint pge
Left: summry, uth scope, prmeters tble, response
codes. Right (sticky): request exmple (curl / fetch tbs)
nd response exmple. Built with Sclr or Redoc
themed vi CSS vribles, served t /docs .
Guides
Quick strt, Money & currencies, Errors, Pgintion,
Idempotency, Rte limits. Ech guide ends with 
runnble exmple ginst the locl Docker stck.
Error pge formt
Every error code hs  docs pge
(/docs/errors/budget-exceeded ) nd the Problem
Detils type URL points to it.
Terminl & logs
On strt: one-line bnner { qirsh } v1 ·
http://localhost:3000 · docs /docs . Logs re
JSON in production, pretty-printed in dev (pino-pretty)
with green 2xx, mber xx, red 5xx.
07 API Style Guide
Topic Convention
URLs Plurl nouns, kebb-cse: /v1/workspaces/:workspaceId/transactions . Version in the
pth (/v1 ). Mx two levels of nesting.
JSON cmelCse keys; UTF8; dtes ISO 801 with offset (2026-10-18T09:30:00+03:00 );
clendr dtes s YYYY-MM-DD ; months s YYYY-MM .
Money amountMinor (integer) + currency ISO 217. Never flots, never strings with symbols.
Optionl amountFormatted for disply only.
Pgintion Cursor-bsed: ?limit=50&cursor=… →
{ "data": [...], "nextCursor": "…" | null } . Cursor encodes
(occurred_on, id) ; stble under inserts.
Qirsh · Product & Design Specification Page 7 of 18



--- PAGE 9 ---

Filtering & sorting from , to , categoryId , minAmount , maxAmount , q ; sort=-occurredOn (prefix - for
descending).
Errors RFC 57 Problem Detils, content type application/problem+json , with n extr code
nd, for vlidtion, n errors[] list of { path, message } .
Sttus codes 200 red/updte · 201 crete (+ Location ) · 202 ccepted (sync) · 20 delete · 00
vlidtion · 01 · 0 · 0 · 0 conflict · 12 stle If-Match · 22 business rule · 2 rte
limited.
Concurrency Resources return n ETag ; PATCH ccepts If-Match to prevent lost updtes.
Idempotency Idempotency-Key heder ccepted on ll POST s, required on /imports ; stored 2 h.
HTTP/1.1 422 Unprocessable Content
Content-Type: application/problem+json
{ "type": "https://qirsh.dev/docs/errors/currency-mismatch",
  "title": "Currency does not match workspace",
  "status": 422, "code": "CURRENCY_MISMATCH",
  "detail": "Workspace uses JOD; got USD.", "instance": "req_01J9…" }
Qirsh · Product & Design Specification Page 8 of 18



--- PAGE 10 ---

08 Docs Portl Mockup
qirsh.locl/docs/reference/reports
Fig. 1  Reference pge for  report endpoint: drk nvigtion, prmeters nd responses on the left, copy-redy request nd response
on the right.
Docs pge Content
Home Wht Qirsh is, -step quick strt, links to guides nd reference.
Quick strt Run with Docker, register, crete workspce, dd expense, get report — ll with curl.
Money & currencies Minor units tble JOD , USD 2, JPY 0, rounding rule, exmples.
Errors Problem Detils formt nd the full list of code vlues with fixes.
Rte limits Limits per pln, heders, how to bck off on 2.
Reference Generted from the OpenAPI spec; one pge per tg.
Chngelog Versioned list of API chnges; deprections mrked with the copper tg.
{ qirsh }
Quick strt
Money & currencies
Errors
Rte limits
Expenses
Budgets
Reports
Ctegories
API keys
Reports
Budget vs ctul
GET  /v1/reports/budget-vs-
actual
Budget vs spending per ctegory
for one month.
Query prmeters
month string · required · YYYYMM
categoryId uuid · optionl
Responses
200 OK · 00 invlid month · 2
rte limited
curl -H "Authorization: Bearer $TO
KEN" \
  "$API/v1/reports/budget-vs-actua
l?month=2026-10"
200 OK
{ "month": "2026-10", "currency": 
"JOD",
  "items": [{
    "category": "Groceries",
    "budgetMinor": 180000,
    "spentMinor": 152750,
    "remainingMinor": 27250,
    "usedPercent": 84.86
  }] }
GUIDES
REFERENCE
Qirsh · Product & Design Specification Page 9 of 18



--- PAGE 11 ---

0 Architecture & Tech Stck
Clients
curl · scripts · pps
Fstify API Node.js)
Plugins: uth · rte-limit · request-id
Routes Zod schems  OpenAPI
Services (pure domin logic)
Repositories Drizzle  SQL
PostgreSQL 1
dt + job queue
Redis 7
rte-limit counters
+ worker process (sme code)
Lyer Choice Why
Runtime Node.js (current LTS  TypeScript
strict
Typed end to end; ESM.
HTTP Fstify Fst, schem-first, plugin system with clen encpsultion;
inject() for tests without  port.
Schems Zod +
fastify-type-provider-zod
One schem gives vlidtion, TypeScript types nd the
OpenAPI spec.
Docs @fastify/swagger  Sclr /
Redoc
Spec t /openapi.json , themed portl t /docs .
Dtbse PostgreSQL 1  Drizzle ORM 
drizzle-kit migrtions
SQL-like, typed queries; esy to drop to rw SQL for
reports.
Jobs pg-boss (queue in Postgres) No extr infrstructure; retries nd scheduling built in.
Rte limiting @fastify/rate-limit with Redis
store
Shred counters cross instnces.
Auth @fastify/jwt , Argon2id
(@node-rs/argon2 )
Short-lived ccess tokens; rotting refresh tokens stored
hshed.
Logging / metrics pino, prom-client Structured JSON logs with request IDs; Prometheus metrics
t /metrics .
Tests Vitest, Testcontiners, k See §1.
Qirsh · Product & Design Specification Page 10 of 18



--- PAGE 12 ---

10 Dt Model
Tble Key columns Constrints & notes
users id, emil, pssword_hsh, nme, creted_t emil unique (citext).
refresh_tokens id, user_id, token_hsh, fmily_id, expires_t, revoked_t Reuse of  revoked token revokes the
whole fmily.
workspces id, nme, currency, timezone, creted_by currency CHAR; timezone IANA,
defult Asia/Amman .
memberships workspce_id, user_id, role PK (workspce_id, user_id); role
enum.
ctegories id, workspce_id, nme, kind EXPENSE/INCOME,
color, rchived_t
unique (workspce_id, lower(nme)).
trnsctions id, workspce_id, ctegory_id, kind, mount_minor
BIGINT, currency, occurred_on DATE, note, creted_by,
version, deleted_t
CHECK mount_minor  0; index
(workspce_id, occurred_on DESC,
id); version for ETg.
budgets workspce_id, ctegory_id, month DATE (first dy),
limit_minor
PK (workspce_id, ctegory_id,
month).
recurring_rules id, workspce_id, templte (jsonb), frequency, dy,
next_run_on, ctive
Generted rows crry
(rule_id, occurrence_on)
unique.
imports id, workspce_id, sttus, totl_rows, inserted, filed,
errors jsonb
Sttus: QUEUED  RUNNING 
DONE / FAILED.
pi_keys id, workspce_id, nme, prefix, key_hsh, scopes text[],
lst_used_t, revoked_t
Shown once; SHA25 hsh stored;
prefix for lookup.
idempotency_keys principl_id, key, request_hsh, sttus, response jsonb,
creted_t
PK (principl_id, key); purged fter 2
h.
udit_log id, workspce_id, ctor, ction, entity, entity_id, diff
jsonb, t
Append-only.
Why DATE for occurred_on ? An expense belongs to  clendr dy in the workspce's time zone, not to n instnt. Storing
 timestmp would move lte-night expenses into the wrong dy (or month) when converted to UTC.
11 Endpoint Reference
All pths re prefixed with /v1 . Workspce routes re under /workspaces/:wid (shortened s … below) nd require
membership.
Method Pth Purpose Scope / role
POST /auth/register , /auth/login Crete ccount / get tokens public
POST /auth/refresh , /auth/logout Rotte / revoke refresh token user
GET/POST /workspaces List mine / crete user
POST …/invites , /invites/:token/accept Invite member / ccept owner / user
Qirsh · Product & Design Specification Page 11 of 18



--- PAGE 13 ---

GET/POST …/categories List / crete ctegory member
GET/POST …/transactions Filtered list (cursor) / crete viewer /
member
GET/PATCH/DELETE …/transactions/:id Red / updte If-Mtch) / soft
delete
member (own)
GET/PUT …/budgets/:month All budgets for  month / set
mny
viewer / owner
POST …/budgets/:month/copy-from/:prev Copy lst month's limits owner
GET …/reports/summary?month= Income, expenses, net viewer
GET …/reports/by-category?from=&to= Totls nd shre per ctegory viewer
GET …/reports/budget-vs-actual?month= Budget, spent, remining, % used viewer
GET …/reports/trend?months=12 Monthly totls series viewer
POST/GET …/imports , …/imports/:id Strt CSV import / sttus member
GET …/exports/transactions.csv Stremed export viewer
GET/POST/DELETE …/api-keys Mnge scoped keys owner
GET /health/live , /health/ready ,
/metrics
Liveness, rediness DB  Redis),
Prometheus
public / internl
Qirsh · Product & Design Specification Page 12 of 18



--- PAGE 14 ---

12 The Hrd Problems
12.1 Money without rounding bugs
Floting point cnnot represent 0.1 exctly, so sums drift. Qirsh stores amount_minor s  -bit integer nd
keeps  smll tble of currency exponents JOD , USD 2, JPY 0. Prsing "15.25" in JOD yields 15250 ;
"15.2505" is rejected (too mny decimls) rther thn silently rounded. When  vlue must be split (for
exmple  yerly budget into 12 months), the reminder is distributed one minor unit t  time to the first
months, so the prts lwys dd up to the totl. Percentges in reports re computed t the end nd rounded
once to two decimls.
12.2 Which month is "October"?
For  workspce in Asi/Ammn UTC, n expense entered t 010 on 1 November locl time is still 1
October in UTC. Becuse occurred_on is  DATE chosen in the workspce's zone, month reports re simple
rnge queries (occurred_on >= '2026-10-01' AND occurred_on < '2026-11-01' ) with no conversion, nd 
test covers the boundry.
12. Fir rte limiting cross instnces
Counters live in Redis, so two API instnces shre one limit. Keys re chosen by principl: API key id, else user
id, else client IP. Defults: 00 requests/min per user, 0/min per API key, 20/min per IP on /auth/* .
Responses crry x-ratelimit-limit , x-ratelimit-remaining , x-ratelimit-reset , nd  2 includes
Retry-After . If Redis is down, the limiter fils open for reds nd closed for /auth (documented trde-off).
12. Sfe retries nd duplicte-free jobs
// Idempotency, simplified
const saved = await idem.begin(principal, key, hash(req.body));   // INSERT … ON CONFLICT DO NOTHING
if (saved.replay)   return reply.code(saved.status).send(saved.body);
if (saved.mismatch) throw problem(422, 'IDEMPOTENCY_KEY_REUSED');
const result = await imports.start(...);
await idem.finish(principal, key, 202, result);
Recurring genertion relies on  unique constrint insted of creful timing: inserting (rule_id,
occurrence_on) twice fils hrmlessly, so the job cn be retried or run on two workers.
12.5 Lost updtes
Two members editing the sme trnsction: ech GET returns ETag: "v7" . A PATCH with If-Match: "v7"
updtes WHERE id = $1 AND version = 7 ; if someone else sved first, 0 rows chnge nd the API nswers
412 Precondition Failed .
1 Security
Are Mesure
Authentiction Argon2id; ccess token 15 min; refresh token 0 dys, rotted on every use, stored
hshed; reuse detection revokes the fmily.
Authoriztion Membership + role checked in  Fstify preHandler ; every repository query filters by
workspace_id ; tests try to red other workspces' IDs nd expect 0.
Qirsh · Product & Design Specification Page 13 of 18



--- PAGE 15 ---

API keys Rndom 2 bytes, shown once, SHA25 stored, scopes enforced per route, revocble,
last_used_at trcked.
Input Zod on body, query, prms nd heders; body size limit 1 MB 10 MB for imports); CSV
prsed s dt, formuls in exported cells escped CSV injection).
Trnsport & heders @fastify/helmet , strict CORS llow-list, HTTPS ssumed behind  proxy (trustProxy
configured).
Secrets & logs .env gitignored; .env.example committed. pino redcts authorization , password ,
token fields.
Qirsh · Product & Design Specification Page 14 of 18



--- PAGE 16 ---

1 Testing Strtegy
Level Wht Tools
Unit Money prsing nd splitting (property-bsed: prts lwys sum to the
totl), month rnges, CSV row vlidtion, ETg logic.
Vitest + fst-check
Integrtion Ech route through app.inject() ginst rel PostgreSQL nd Redis
in continers; migrtions pplied fresh per run.
Vitest  Testcontiners
Authoriztion
mtrix
Tble-driven test: every route × every role (owner, member, viewer, API
key with/without scope, strnger) → expected sttus.
Vitest
Contrct Generted OpenAPI is vlid; responses in tests re vlidted ginst it;
the spec is snpshot-tested so breking chnges show up in review.
openpi vlidtor
Concurrency Two PATCHes with the sme ETg → one 200, one 12. Sme import
key twice in prllel → one import.
Vitest
Lod / limits k script proves 2s strt t the configured limit nd recover fter
reset.
k
HEADLINE TEST
authz.matrix.test.ts — bout 100 generted cses in one redble tble. It is the clerest proof tht
tennts re isolted, nd it is esy to show in n interview.
15 Observbility
Request IDs: ccepted from x-request-id or generted; returned in responses nd in Problem Detils
instance .
Logs: one JSON line per request (method, route, sttus, durtion, principl type), never bodies of uth
routes.
Metrics: request durtion histogrm by route nd sttus, rte-limit rejections, job queue depth, DB pool
usge.
Helth: /health/live (process up) nd /health/ready DB nd Redis rechble) for continer
orchestrtion.
Qirsh · Product & Design Specification Page 15 of 18



--- PAGE 17 ---

1 DevOps & Repository
qirsh/
├─ src/
│  ├─ app.ts            # buildApp() for server + tests
│  ├─ plugins/          # auth, rate-limit, errors, docs
│  ├─ modules/
│  │  ├─ transactions/  # routes, schemas, service, repo
│  │  ├─ budgets/  reports/  imports/
│  │  └─ auth/  workspaces/  api-keys/
│  ├─ lib/money.ts  months.ts  problem.ts
│  └─ db/schema.ts  migrations/  seed.ts
├─ worker/              # pg-boss jobs
├─ test/ unit/ integration/ load/
├─ docs/ guides/*.md  brand/  decisions/
├─ docker-compose.yml   # api, worker, db, redis
├─ Dockerfile · .env.example · LICENSE
└─ .github/workflows/ci.yml
Commnds
docker compose up --build  API 000, docs
000/docs, seeded demo workspce.
npm test , npm run test:load , npm run
db:migrate .
CI
Typecheck, lint, unit, integrtion (service
continers), OpenAPI vlidtion, spec diff
comment on PRs.
Build nd push Docker imge tgged with the
commit SHA GitHub Continer Registry).
Docs hosting
Export the OpenAPI spec nd guides to  sttic site on
GitHub Pges so reviewers cn red the docs without
running nything.
Qirsh · Product & Design Specification Page 16 of 18



--- PAGE 18 ---

17 Build Pln (≈ – weeks, prt-time)
PHASE 1 · DAYS 1–
Skeleton
Fstify  TS, Zod provider, error plugin
Problem Detils)
Drizzle schem, migrtions, Docker Compose,
CI
Done when: /health/ready is green in Docker nd CI.
PHASE 2 · DAYS –
Auth & workspces
Register/login/refresh rottion, memberships,
roles
Done when: refresh-token reuse revokes the fmily (test).
PHASE  · DAYS 7–10
Trnsctions
Money lib, CRUD, filters, cursor pgintion,
ETgs
Done when: property tests on money pss; 12 test psses.
PHASE  · DAYS 11–1
Budgets & reports
Monthly budgets, four reports, time-zone
boundry tests
Done when: 1 Oct 20 Ammn counts in October.
PHASE 5 · DAYS 1–1
Docs & limits
OpenAPI  themed portl, guides, Redis rte
limits
Done when: k shows 2 t the limit with heders.
PHASE  · DAYS 17–21
Stretch
API keys, CSV import/export, recurring rules
Done when: duplicte import key returns the sme import.
PHASE 7 · DAYS 22–25
Story
Authz mtrix test, README, docs site, ADRs,
demo video
Done when: fresh clone → running in one commnd.
Qirsh · Product & Design Specification Page 17 of 18



--- PAGE 19 ---

18 README, Limittions & CV
README outline
 Bnner, pitch, CI bdge, link to hosted docs
 Quick strt with curl wlkthrough
 Design decisions: money, months, idempotency,
limits
 Tests nd how to run them (link the uthz mtrix)
 Architecture, API style guide link
 Limittions, license
Limittions
Single currency per workspce; no conversion.
No bnk connections or receipt scnning.
Not deployed s  public service; runs loclly vi
Docker.
CV entry
Qirsh  Expense & budget REST API · Node.js,
TypeScript, Fstify, PostgreSQL, Redis
Designed n OpenAPI-first REST API with Zod
schems driving vlidtion, types nd docs.
Implemented integer minor-unit money
hndling nd time-zone-correct monthly
reports.
Added Redis-bcked rte limiting,
idempotency keys, ETg concurrency control
nd RFC 57 errors.
Covered every route × role in n uthoriztion
test mtrix running on rel Postgres vi
Testcontiners.
1 Interview Preprtion
Why not store money s DECIMAL?
NUMERIC is exct in Postgres nd is  vlid choice. Integers were chosen so JvScript never sees  flot:
BIGINT mps to bigint /sfe integers, nd the exponent rule lives in one module. Be redy to defend either.
Why cursor pgintion insted of pge numbers?
Offset pges shift when new rows re inserted, cusing duplictes or gps, nd get slower with lrge
offsets. A cursor on (occurred_on, id) uses the index nd is stble.
Wht hppens if Redis goes down?
Rediness turns red so new trffic cn move elsewhere; the limiter fils open for norml routes (vilbility)
nd closed for uth routes (brute-force protection). It's  documented trde-off.
How do you void breking clients?
Additive chnges only within /v1 , the OpenAPI spec is snpshot-tested so diffs re reviewed, deprections
go in the chngelog, breking chnges would men /v2 .
How is tennt isoltion gurnteed?
Workspce id comes from the route nd is checked ginst membership before ny hndler runs, every
query filters by it, nd the uthz mtrix test proves strngers get 0 on every route.
Qirsh · Product & Design Specification Page 18 of 18


