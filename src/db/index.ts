import { v4 as uuidv4 } from 'uuid';
import {
  User,
  RefreshToken,
  Workspace,
  Membership,
  Category,
  Transaction,
  Budget,
  RecurringRule,
  ImportJob,
  ApiKey,
  IdempotencyRecord,
  AuditLogEntry,
  InviteToken,
  Role,
} from './types.js';

export class DatabaseStore {
  public users: Map<string, User> = new Map();
  public refreshTokens: Map<string, RefreshToken> = new Map();
  public workspaces: Map<string, Workspace> = new Map();
  public memberships: Map<string, Membership> = new Map(); // key: `${workspace_id}:${user_id}`
  public categories: Map<string, Category> = new Map();
  public transactions: Map<string, Transaction> = new Map();
  public budgets: Map<string, Budget> = new Map(); // key: `${workspace_id}:${category_id}:${month}`
  public recurringRules: Map<string, RecurringRule> = new Map();
  public imports: Map<string, ImportJob> = new Map();
  public apiKeys: Map<string, ApiKey> = new Map();
  public idempotencyKeys: Map<string, IdempotencyRecord> = new Map(); // key: `${principal_id}:${key}`
  public auditLogs: AuditLogEntry[] = [];
  public invites: Map<string, InviteToken> = new Map();

  public reset(): void {
    this.users.clear();
    this.refreshTokens.clear();
    this.workspaces.clear();
    this.memberships.clear();
    this.categories.clear();
    this.transactions.clear();
    this.budgets.clear();
    this.recurringRules.clear();
    this.imports.clear();
    this.apiKeys.clear();
    this.idempotencyKeys.clear();
    this.auditLogs = [];
    this.invites.clear();
  }

  // --- Users ---
  async createUser(data: Omit<User, 'id' | 'created_at'>): Promise<User> {
    const emailNorm = data.email.toLowerCase().trim();
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === emailNorm) {
        throw new Error('USER_ALREADY_EXISTS');
      }
    }
    const user: User = {
      id: uuidv4(),
      email: emailNorm,
      password_hash: data.password_hash,
      name: data.name,
      created_at: new Date().toISOString(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const emailNorm = email.toLowerCase().trim();
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === emailNorm) return u;
    }
    return null;
  }

  async findUserById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  // --- Refresh Tokens ---
  async saveRefreshToken(token: Omit<RefreshToken, 'id' | 'created_at'>): Promise<RefreshToken> {
    const record: RefreshToken = {
      id: uuidv4(),
      ...token,
      created_at: new Date().toISOString(),
    };
    this.refreshTokens.set(record.id, record);
    return record;
  }

  async findRefreshTokenByHash(tokenHash: string): Promise<RefreshToken | null> {
    for (const t of this.refreshTokens.values()) {
      if (t.token_hash === tokenHash) return t;
    }
    return null;
  }

  async revokeFamily(familyId: string): Promise<void> {
    const now = new Date().toISOString();
    for (const t of this.refreshTokens.values()) {
      if (t.family_id === familyId) {
        t.revoked_at = now;
      }
    }
  }

  async revokeToken(id: string): Promise<void> {
    const token = this.refreshTokens.get(id);
    if (token) {
      token.revoked_at = new Date().toISOString();
    }
  }

  // --- Workspaces ---
  async createWorkspace(data: Omit<Workspace, 'id' | 'created_at'>): Promise<Workspace> {
    const ws: Workspace = {
      id: uuidv4(),
      ...data,
      created_at: new Date().toISOString(),
    };
    this.workspaces.set(ws.id, ws);

    // Creator is automatically owner
    await this.addMembership({
      workspace_id: ws.id,
      user_id: data.created_by,
      role: 'owner',
    });

    // Seed default categories for workspace
    const defaults = [
      { name: 'Groceries', kind: 'EXPENSE' as const, color: '#12715A' },
      { name: 'Rent', kind: 'EXPENSE' as const, color: '#0E1A17' },
      { name: 'Transport', kind: 'EXPENSE' as const, color: '#2459B8' },
      { name: 'Utilities', kind: 'EXPENSE' as const, color: '#9A6400' },
      { name: 'Dining Out', kind: 'EXPENSE' as const, color: '#C47335' },
      { name: 'Healthcare', kind: 'EXPENSE' as const, color: '#C0362C' },
      { name: 'Salary', kind: 'INCOME' as const, color: '#1D7D46' },
      { name: 'Freelance', kind: 'INCOME' as const, color: '#20B286' },
    ];
    for (const cat of defaults) {
      await this.createCategory({
        workspace_id: ws.id,
        ...cat,
        archived_at: null,
      });
    }

    return ws;
  }

  async findWorkspaceById(id: string): Promise<Workspace | null> {
    return this.workspaces.get(id) || null;
  }

  async listWorkspacesForUser(userId: string): Promise<Array<Workspace & { role: Role }>> {
    const result: Array<Workspace & { role: Role }> = [];
    for (const m of this.memberships.values()) {
      if (m.user_id === userId) {
        const ws = this.workspaces.get(m.workspace_id);
        if (ws) {
          result.push({ ...ws, role: m.role });
        }
      }
    }
    return result;
  }

  // --- Memberships ---
  async addMembership(data: Omit<Membership, 'created_at'>): Promise<Membership> {
    const key = `${data.workspace_id}:${data.user_id}`;
    const m: Membership = {
      ...data,
      created_at: new Date().toISOString(),
    };
    this.memberships.set(key, m);
    return m;
  }

  async getMembership(workspaceId: string, userId: string): Promise<Membership | null> {
    return this.memberships.get(`${workspaceId}:${userId}`) || null;
  }

  async listMembers(workspaceId: string): Promise<Array<Membership & { name: string; email: string }>> {
    const list: Array<Membership & { name: string; email: string }> = [];
    for (const m of this.memberships.values()) {
      if (m.workspace_id === workspaceId) {
        const u = this.users.get(m.user_id);
        list.push({
          ...m,
          name: u?.name || 'Unknown',
          email: u?.email || '',
        });
      }
    }
    return list;
  }

  // --- Invites ---
  async createInvite(workspaceId: string, role: Role, createdBy: string): Promise<InviteToken> {
    const token = `inv_${uuidv4().replace(/-/g, '')}`;
    const invite: InviteToken = {
      token,
      workspace_id: workspaceId,
      role,
      expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      created_by: createdBy,
      created_at: new Date().toISOString(),
    };
    this.invites.set(token, invite);
    return invite;
  }

  async findInvite(token: string): Promise<InviteToken | null> {
    const inv = this.invites.get(token);
    if (!inv) return null;
    if (new Date(inv.expires_at) < new Date()) {
      this.invites.delete(token);
      return null;
    }
    return inv;
  }

  async deleteInvite(token: string): Promise<void> {
    this.invites.delete(token);
  }

  // --- Categories ---
  async createCategory(data: Omit<Category, 'id' | 'created_at'>): Promise<Category> {
    const nameNorm = data.name.toLowerCase().trim();
    for (const c of this.categories.values()) {
      if (c.workspace_id === data.workspace_id && c.name.toLowerCase().trim() === nameNorm && !c.archived_at) {
        throw new Error('CATEGORY_ALREADY_EXISTS');
      }
    }
    const cat: Category = {
      id: uuidv4(),
      ...data,
      created_at: new Date().toISOString(),
    };
    this.categories.set(cat.id, cat);
    return cat;
  }

  async updateCategory(id: string, workspaceId: string, updates: Partial<Category>): Promise<Category | null> {
    const cat = this.categories.get(id);
    if (!cat || cat.workspace_id !== workspaceId) return null;

    if (updates.name && updates.name.toLowerCase().trim() !== cat.name.toLowerCase().trim()) {
      const nameNorm = updates.name.toLowerCase().trim();
      for (const c of this.categories.values()) {
        if (c.id !== id && c.workspace_id === workspaceId && c.name.toLowerCase().trim() === nameNorm && !c.archived_at) {
          throw new Error('CATEGORY_ALREADY_EXISTS');
        }
      }
    }

    Object.assign(cat, updates);
    return cat;
  }

  async findCategoryById(id: string, workspaceId: string): Promise<Category | null> {
    const c = this.categories.get(id);
    return c && c.workspace_id === workspaceId ? c : null;
  }

  async listCategories(workspaceId: string, includeArchived: boolean = false): Promise<Category[]> {
    const list: Category[] = [];
    for (const c of this.categories.values()) {
      if (c.workspace_id === workspaceId) {
        if (includeArchived || !c.archived_at) {
          list.push(c);
        }
      }
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }

  // --- Transactions ---
  async createTransaction(data: Omit<Transaction, 'id' | 'version' | 'deleted_at' | 'created_at'>): Promise<Transaction> {
    const tx: Transaction = {
      id: uuidv4(),
      ...data,
      version: 1,
      deleted_at: null,
      created_at: new Date().toISOString(),
    };
    this.transactions.set(tx.id, tx);
    return tx;
  }

  async getTransactionById(id: string, workspaceId: string): Promise<Transaction | null> {
    const tx = this.transactions.get(id);
    if (!tx || tx.workspace_id !== workspaceId || tx.deleted_at !== null) return null;
    return tx;
  }

  async updateTransaction(
    id: string,
    workspaceId: string,
    expectedVersion: number | null,
    updates: Partial<Omit<Transaction, 'id' | 'workspace_id' | 'version' | 'created_at'>>
  ): Promise<{ transaction: Transaction | null; versionMismatch: boolean }> {
    const tx = this.transactions.get(id);
    if (!tx || tx.workspace_id !== workspaceId || tx.deleted_at !== null) {
      return { transaction: null, versionMismatch: false };
    }

    if (expectedVersion !== null && tx.version !== expectedVersion) {
      return { transaction: tx, versionMismatch: true };
    }

    Object.assign(tx, updates);
    tx.version += 1;
    return { transaction: tx, versionMismatch: false };
  }

  async softDeleteTransaction(id: string, workspaceId: string): Promise<boolean> {
    const tx = this.transactions.get(id);
    if (!tx || tx.workspace_id !== workspaceId || tx.deleted_at !== null) return false;
    tx.deleted_at = new Date().toISOString();
    tx.version += 1;
    return true;
  }

  async listTransactions(params: {
    workspaceId: string;
    from?: string;
    to?: string;
    categoryId?: string;
    minAmount?: bigint;
    maxAmount?: bigint;
    q?: string;
    cursor?: { occurredOn: string; id: string } | null;
    limit: number;
    kind?: 'EXPENSE' | 'INCOME';
  }): Promise<{ data: Transaction[]; nextCursor: string | null }> {
    const matches: Transaction[] = [];

    for (const tx of this.transactions.values()) {
      if (tx.workspace_id !== params.workspaceId) continue;
      if (tx.deleted_at !== null) continue;
      if (params.from && tx.occurred_on < params.from) continue;
      if (params.to && tx.occurred_on > params.to) continue;
      if (params.categoryId && tx.category_id !== params.categoryId) continue;
      if (params.kind && tx.kind !== params.kind) continue;
      if (params.minAmount !== undefined && tx.amount_minor < params.minAmount) continue;
      if (params.maxAmount !== undefined && tx.amount_minor > params.maxAmount) continue;
      if (params.q) {
        const query = params.q.toLowerCase();
        const noteMatch = tx.note?.toLowerCase().includes(query);
        const cat = this.categories.get(tx.category_id);
        const catMatch = cat?.name.toLowerCase().includes(query);
        if (!noteMatch && !catMatch) continue;
      }
      matches.push(tx);
    }

    // Stable sort by occurred_on DESC, then id DESC
    matches.sort((a, b) => {
      if (a.occurred_on !== b.occurred_on) {
        return b.occurred_on.localeCompare(a.occurred_on);
      }
      return b.id.localeCompare(a.id);
    });

    // Apply cursor filter if present
    let startIndex = 0;
    if (params.cursor) {
      startIndex = matches.findIndex((tx) => {
        if (tx.occurred_on < params.cursor!.occurredOn) return true;
        if (tx.occurred_on === params.cursor!.occurredOn && tx.id < params.cursor!.id) return true;
        return false;
      });
      if (startIndex === -1) startIndex = matches.length;
    }

    const page = matches.slice(startIndex, startIndex + params.limit);
    let nextCursor: string | null = null;
    if (startIndex + params.limit < matches.length) {
      const last = page[page.length - 1];
      if (last) {
        const { encodeCursor } = await import('../lib/cursor.js');
        nextCursor = encodeCursor(last.occurred_on, last.id);
      }
    }

    return { data: page, nextCursor };
  }

  // --- Budgets ---
  async getBudget(workspaceId: string, categoryId: string, month: string): Promise<Budget | null> {
    const key = `${workspaceId}:${categoryId}:${month}`;
    return this.budgets.get(key) || null;
  }

  async setBudget(workspaceId: string, categoryId: string, month: string, limitMinor: bigint): Promise<Budget> {
    const key = `${workspaceId}:${categoryId}:${month}`;
    const budget: Budget = {
      workspace_id: workspaceId,
      category_id: categoryId,
      month,
      limit_minor: limitMinor,
      created_at: new Date().toISOString(),
    };
    this.budgets.set(key, budget);
    return budget;
  }

  async listBudgetsForMonth(workspaceId: string, month: string): Promise<Budget[]> {
    const list: Budget[] = [];
    for (const b of this.budgets.values()) {
      if (b.workspace_id === workspaceId && b.month === month) {
        list.push(b);
      }
    }
    return list;
  }

  async copyBudgets(workspaceId: string, fromMonth: string, toMonth: string): Promise<Budget[]> {
    const prev = await this.listBudgetsForMonth(workspaceId, fromMonth);
    const copied: Budget[] = [];
    for (const b of prev) {
      const newB = await this.setBudget(workspaceId, b.category_id, toMonth, b.limit_minor);
      copied.push(newB);
    }
    return copied;
  }

  // --- API Keys ---
  async createApiKey(data: Omit<ApiKey, 'id' | 'created_at'>): Promise<ApiKey> {
    const key: ApiKey = {
      id: uuidv4(),
      ...data,
      created_at: new Date().toISOString(),
    };
    this.apiKeys.set(key.id, key);
    return key;
  }

  async findApiKeyByPrefix(prefix: string): Promise<ApiKey | null> {
    for (const k of this.apiKeys.values()) {
      if (k.prefix === prefix && !k.revoked_at) return k;
    }
    return null;
  }

  async revokeApiKey(id: string, workspaceId: string): Promise<boolean> {
    const k = this.apiKeys.get(id);
    if (!k || k.workspace_id !== workspaceId) return false;
    k.revoked_at = new Date().toISOString();
    return true;
  }

  async listApiKeys(workspaceId: string): Promise<ApiKey[]> {
    const list: ApiKey[] = [];
    for (const k of this.apiKeys.values()) {
      if (k.workspace_id === workspaceId && !k.revoked_at) {
        list.push(k);
      }
    }
    return list;
  }

  // --- Idempotency ---
  async getIdempotency(principalId: string, key: string): Promise<IdempotencyRecord | null> {
    return this.idempotencyKeys.get(`${principalId}:${key}`) || null;
  }

  async saveIdempotency(record: IdempotencyRecord): Promise<void> {
    this.idempotencyKeys.set(`${record.principal_id}:${record.key}`, record);
  }

  // --- Imports ---
  async createImportJob(workspaceId: string): Promise<ImportJob> {
    const job: ImportJob = {
      id: uuidv4(),
      workspace_id: workspaceId,
      status: 'QUEUED',
      total_rows: 0,
      inserted: 0,
      failed: 0,
      errors: [],
      created_at: new Date().toISOString(),
    };
    this.imports.set(job.id, job);
    return job;
  }

  async getImportJob(id: string, workspaceId: string): Promise<ImportJob | null> {
    const j = this.imports.get(id);
    return j && j.workspace_id === workspaceId ? j : null;
  }

  async updateImportJob(id: string, updates: Partial<ImportJob>): Promise<void> {
    const j = this.imports.get(id);
    if (j) {
      Object.assign(j, updates);
    }
  }

  // --- Recurring Rules ---
  async createRecurringRule(data: Omit<RecurringRule, 'id' | 'created_at'>): Promise<RecurringRule> {
    const rule: RecurringRule = {
      id: uuidv4(),
      ...data,
      created_at: new Date().toISOString(),
    };
    this.recurringRules.set(rule.id, rule);
    return rule;
  }

  async listRecurringRules(workspaceId: string): Promise<RecurringRule[]> {
    const list: RecurringRule[] = [];
    for (const r of this.recurringRules.values()) {
      if (r.workspace_id === workspaceId) {
        list.push(r);
      }
    }
    return list;
  }

  // --- Audit Log ---
  async logAudit(entry: Omit<AuditLogEntry, 'id' | 'created_at'>): Promise<void> {
    this.auditLogs.push({
      id: uuidv4(),
      ...entry,
      created_at: new Date().toISOString(),
    });
  }

  // --- Health Check ---
  async checkHealth(): Promise<{ database: boolean; redis: boolean }> {
    return { database: true, redis: true };
  }
}

// Global default singleton store for local dev & testing
export const db = new DatabaseStore();
