# Qirsh Quick Start Guide

Welcome to **Qirsh (قرش)** — the precision expense and budget tracking REST API.

## 1. Start the Server
```bash
# Using Docker Compose:
docker compose up -d

# Or locally with Node.js:
npm install
npm run dev
```

The interactive documentation portal is available at:
👉 **[http://localhost:3000/docs](http://localhost:3000/docs)**
Raw OpenAPI 3.1 specification:
👉 **[http://localhost:3000/openapi.json](http://localhost:3000/openapi.json)**

---

## 2. Authentication Walkthrough (via curl)

### A. Register an Account
```bash
curl -X POST http://localhost:3000/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "StrongPassword123!",
    "name": "Sami Jordan"
  }'
```
Response:
```json
{
  "user": {
    "id": "18f9d02e-...",
    "email": "user@example.com",
    "name": "Sami Jordan"
  },
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "rt_..."
}
```

Save the access token to an environment variable:
```bash
export TOKEN="eyJhbGciOi..."
```

---

## 3. Create a Workspace
```bash
curl -X POST http://localhost:3000/v1/workspaces \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Household",
    "currency": "JOD",
    "timezone": "Asia/Amman"
  }'
```
Response:
```json
{
  "id": "7a3e8b01-...",
  "name": "My Household",
  "currency": "JOD",
  "timezone": "Asia/Amman"
}
```
```bash
export WID="7a3e8b01-..."
```

---

## 4. Log an Expense
```bash
# Get category ID for "Groceries"
curl -s http://localhost:3000/v1/workspaces/$WID/categories \
  -H "Authorization: Bearer $TOKEN"

# Record 15.250 JOD expense (15250 fils)
curl -X POST http://localhost:3000/v1/workspaces/$WID/transactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amountMinor": 15250,
    "currency": "JOD",
    "categoryId": "<CATEGORY_ID>",
    "occurredOn": "2026-10-18",
    "note": "Carrefour Amman groceries"
  }'
```

---

## 5. Query Budget vs Actual Report
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/v1/workspaces/$WID/reports/budget-vs-actual?month=2026-10"
```
Response:
```json
{
  "month": "2026-10",
  "currency": "JOD",
  "items": [
    {
      "category": "Groceries",
      "budgetMinor": "180000",
      "spentMinor": "15250",
      "remainingMinor": "164750",
      "usedPercent": 8.47
    }
  ]
}
```
