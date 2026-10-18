import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from './index.js';

export async function seedDatabase(): Promise<void> {
  const existing = await db.findUserByEmail('demo@qirsh.dev');
  if (existing) {
    return; // Already seeded
  }

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Create Users
  const owner = await db.createUser({
    email: 'demo@qirsh.dev',
    password_hash: passwordHash,
    name: 'Obieda Al-Darrabsih',
  });

  const member = await db.createUser({
    email: 'member@qirsh.dev',
    password_hash: passwordHash,
    name: 'Sarah Member',
  });

  const viewer = await db.createUser({
    email: 'viewer@qirsh.dev',
    password_hash: passwordHash,
    name: 'Accountant Viewer',
  });

  // 2. Create Workspace
  const ws = await db.createWorkspace({
    name: 'Amman Household',
    currency: 'JOD',
    timezone: 'Asia/Amman',
    created_by: owner.id,
  });

  // 3. Add Memberships
  await db.addMembership({
    workspace_id: ws.id,
    user_id: member.id,
    role: 'member',
  });

  await db.addMembership({
    workspace_id: ws.id,
    user_id: viewer.id,
    role: 'viewer',
  });

  // 4. Fetch default categories
  const categories = await db.listCategories(ws.id);
  const catMap = new Map(categories.map((c) => [c.name, c]));

  const groceries = catMap.get('Groceries')!;
  const rent = catMap.get('Rent')!;
  const transport = catMap.get('Transport')!;
  const dining = catMap.get('Dining Out')!;
  const salary = catMap.get('Salary')!;

  // 5. Seed Budgets for 2026-10
  if (groceries) await db.setBudget(ws.id, groceries.id, '2026-10-01', 180000n); // 180 JOD
  if (rent) await db.setBudget(ws.id, rent.id, '2026-10-01', 450000n); // 450 JOD
  if (transport) await db.setBudget(ws.id, transport.id, '2026-10-01', 60000n); // 60 JOD
  if (dining) await db.setBudget(ws.id, dining.id, '2026-10-01', 80000n); // 80 JOD

  // 6. Seed Transactions (October 2026)
  // Matching Fig. 1 in spec: Groceries spent = 152,750 fils
  if (groceries) {
    await db.createTransaction({
      workspace_id: ws.id,
      category_id: groceries.id,
      kind: 'EXPENSE',
      amount_minor: 92750n, // 92.750 JOD
      currency: 'JOD',
      occurred_on: '2026-10-05',
      note: 'Weekly supermarket groceries (Carrefour)',
      created_by: owner.id,
    });
    await db.createTransaction({
      workspace_id: ws.id,
      category_id: groceries.id,
      kind: 'EXPENSE',
      amount_minor: 60000n, // 60.000 JOD (total: 152.750 JOD)
      currency: 'JOD',
      occurred_on: '2026-10-18',
      note: 'Fresh produce & bakery',
      created_by: member.id,
    });
  }

  if (rent) {
    await db.createTransaction({
      workspace_id: ws.id,
      category_id: rent.id,
      kind: 'EXPENSE',
      amount_minor: 450000n, // 450.000 JOD
      currency: 'JOD',
      occurred_on: '2026-10-01',
      note: 'Apartment monthly rent payment',
      created_by: owner.id,
    });
  }

  if (transport) {
    await db.createTransaction({
      workspace_id: ws.id,
      category_id: transport.id,
      kind: 'EXPENSE',
      amount_minor: 35000n, // 35.000 JOD
      currency: 'JOD',
      occurred_on: '2026-10-12',
      note: 'Fuel refill (Total Energies)',
      created_by: owner.id,
    });
  }

  if (salary) {
    await db.createTransaction({
      workspace_id: ws.id,
      category_id: salary.id,
      kind: 'INCOME',
      amount_minor: 1500000n, // 1,500.000 JOD
      currency: 'JOD',
      occurred_on: '2026-10-01',
      note: 'Monthly engineering salary',
      created_by: owner.id,
    });
  }

  // 7. Seed Demo API Key
  const demoKey = 'qirsh_live_demo1234567890abcdef12345678';
  const prefix = demoKey.substring(0, 19);
  const keyHash = crypto.createHash('sha256').update(demoKey).digest('hex');

  await db.createApiKey({
    workspace_id: ws.id,
    name: 'Home Automation Bot',
    prefix,
    key_hash: keyHash,
    scopes: ['transactions:read', 'transactions:write', 'reports:read'],
    last_used_at: null,
    revoked_at: null,
  });

  console.log('Seeded demo workspace "Amman Household" with initial data.');
}

if (process.argv[1]?.endsWith('seed.ts')) {
  seedDatabase().then(() => process.exit(0));
}
