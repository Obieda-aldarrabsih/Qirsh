export type Role = 'owner' | 'member' | 'viewer';
export type TransactionKind = 'EXPENSE' | 'INCOME';
export type ImportStatus = 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED';
export type Frequency = 'MONTHLY' | 'WEEKLY';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  created_at: string;
}

export interface RefreshToken {
  id: string;
  user_id: string;
  token_hash: string;
  family_id: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  created_by: string;
  created_at: string;
}

export interface Membership {
  workspace_id: string;
  user_id: string;
  role: Role;
  created_at: string;
}

export interface Category {
  id: string;
  workspace_id: string;
  name: string;
  kind: TransactionKind;
  color: string;
  archived_at: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  workspace_id: string;
  category_id: string;
  kind: TransactionKind;
  amount_minor: bigint;
  currency: string;
  occurred_on: string; // YYYY-MM-DD
  note: string | null;
  created_by: string;
  version: number;
  deleted_at: string | null;
  created_at: string;
}

export interface Budget {
  workspace_id: string;
  category_id: string;
  month: string; // YYYY-MM-01
  limit_minor: bigint;
  created_at: string;
}

export interface RecurringRule {
  id: string;
  workspace_id: string;
  template: {
    category_id: string;
    kind: TransactionKind;
    amount_minor: string;
    currency: string;
    note?: string;
  };
  frequency: Frequency;
  day: number;
  next_run_on: string;
  active: boolean;
  created_at: string;
}

export interface ImportJob {
  id: string;
  workspace_id: string;
  status: ImportStatus;
  total_rows: number;
  inserted: number;
  failed: number;
  errors: Array<{ line: number; error: string; raw?: string }>;
  created_at: string;
}

export interface ApiKey {
  id: string;
  workspace_id: string;
  name: string;
  prefix: string;
  key_hash: string;
  scopes: string[];
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface IdempotencyRecord {
  principal_id: string;
  key: string;
  request_hash: string;
  status: number;
  response: any;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  workspace_id: string;
  actor: string;
  action: string;
  entity: string;
  entity_id: string;
  diff: any;
  created_at: string;
}

export interface InviteToken {
  token: string;
  workspace_id: string;
  role: Role;
  expires_at: string;
  created_by: string;
  created_at: string;
}
