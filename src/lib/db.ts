import Database from 'better-sqlite3';
import { homedir } from 'os';
import { join } from 'path';

const DB_PATH = join(homedir(), 'clawd/data/polymarket.db');

export function getDb() {
  return new Database(DB_PATH, { readonly: true });
}

export interface Trade {
  id: number;
  tx_hash: string;
  wallet: string;
  side: string;
  asset: string;
  condition_id: string | null;
  size: number;
  price: number;
  timestamp: number;
  title: string | null;
  slug: string | null;
  outcome: string | null;
  created_at: number;
}

export interface Wallet {
  address: string;
  first_seen: number | null;
  last_seen: number | null;
  trade_count: number;
  total_volume: number;
  win_count: number;
  loss_count: number;
  win_rate: number;
  pnl: number;
  score: number;
  is_flagged: number;
  funding_sources: string | null;
  is_cex_funded: number;
  cluster_id: string | null;
  updated_at: number;
}

export interface Alert {
  id: number;
  type: string;
  wallet: string | null;
  cluster_id: string | null;
  market: string | null;
  details: string | null;
  severity: string;
  created_at: number;
  dismissed: number;
}

export interface Cluster {
  id: string;
  funding_source: string;
  wallet_count: number;
  total_volume: number;
  coordinated_bets: number;
  created_at: number;
  updated_at: number;
}
