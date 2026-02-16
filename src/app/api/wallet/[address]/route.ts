import { getDb, Wallet, Trade } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  const { searchParams } = new URL(request.url);
  const tradeLimit = parseInt(searchParams.get('tradeLimit') || '100');
  
  const db = getDb();
  
  try {
    // Get wallet info
    const wallet = db.prepare(`
      SELECT *
      FROM wallets
      WHERE address = ?
    `).get(address) as Wallet | undefined;
    
    if (!wallet) {
      db.close();
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }
    
    // Get trades for this wallet
    const trades = db.prepare(`
      SELECT *
      FROM trades
      WHERE wallet = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(address, tradeLimit) as Trade[];
    
    // Calculate score breakdown (simulated based on available data)
    // In a real scenario, these would be computed by the scanner
    const scoreBreakdown = calculateScoreBreakdown(wallet, trades);
    
    // Get volume over time for sparkline (last 30 days, grouped by day)
    const volumeHistory = db.prepare(`
      SELECT 
        DATE(timestamp, 'unixepoch') as date,
        SUM(size * price) as volume
      FROM trades
      WHERE wallet = ?
      GROUP BY DATE(timestamp, 'unixepoch')
      ORDER BY date ASC
      LIMIT 30
    `).all(address) as { date: string; volume: number }[];
    
    // Get flags
    const flags = generateFlags(wallet, trades);
    
    db.close();
    
    return NextResponse.json({
      wallet,
      trades,
      scoreBreakdown,
      volumeHistory,
      flags,
    });
  } catch (error) {
    db.close();
    console.error('Wallet API error:', error);
    return NextResponse.json({ error: 'Failed to fetch wallet' }, { status: 500 });
  }
}

function calculateScoreBreakdown(wallet: Wallet, trades: Trade[]) {
  // Simulate score breakdown based on wallet stats
  // These would typically be pre-computed by the scanner
  const baseScore = wallet.score;
  
  // Account age component (newer = more suspicious)
  const accountAgeScore = wallet.first_seen 
    ? Math.min(20, Math.max(0, 20 - (Date.now()/1000 - wallet.first_seen) / (86400 * 30)))
    : 10;
  
  // Bet concentration (how concentrated are bets in few markets)
  const uniqueMarkets = new Set(trades.map(t => t.condition_id)).size;
  const betConcentrationScore = trades.length > 0 
    ? Math.min(20, (trades.length / Math.max(uniqueMarkets, 1)) * 2)
    : 0;
  
  // Size anomaly (large bets relative to average)
  const avgSize = trades.reduce((sum, t) => sum + t.size * t.price, 0) / Math.max(trades.length, 1);
  const sizeAnomalyScore = Math.min(20, avgSize / 1000);
  
  // Win rate component
  const winRateScore = wallet.win_rate > 0.6 ? (wallet.win_rate - 0.5) * 40 : 0;
  
  // Timing component (how often trades happen at suspicious times)
  const timingScore = Math.min(20, trades.length > 10 ? 10 : 5);
  
  // Funding component
  const fundingScore = wallet.is_cex_funded ? 5 : (wallet.funding_sources ? 15 : 10);
  
  return {
    accountAge: { score: Math.round(accountAgeScore), max: 20 },
    betConcentration: { score: Math.round(betConcentrationScore), max: 20 },
    sizeAnomaly: { score: Math.round(sizeAnomalyScore), max: 20 },
    winRate: { score: Math.round(winRateScore), max: 20 },
    timing: { score: Math.round(timingScore), max: 20 },
    funding: { score: Math.round(fundingScore), max: 20 },
  };
}

function generateFlags(wallet: Wallet, trades: Trade[]): string[] {
  const flags: string[] = [];
  
  if (wallet.is_flagged) {
    flags.push('Flagged');
  }
  
  if (wallet.win_rate > 0.7) {
    flags.push('High Win Rate');
  }
  
  if (wallet.is_cex_funded) {
    flags.push('CEX Funded');
  }
  
  if (wallet.cluster_id) {
    flags.push('Part of Cluster');
  }
  
  if (wallet.total_volume > 100000) {
    flags.push('High Volume');
  }
  
  if (wallet.trade_count > 0 && wallet.first_seen) {
    const daysSinceFirst = (Date.now()/1000 - wallet.first_seen) / 86400;
    if (daysSinceFirst < 7 && wallet.trade_count > 50) {
      flags.push('Rapid Trader');
    }
  }
  
  // Check for large single trades
  const largeTrades = trades.filter(t => t.size * t.price > 10000);
  if (largeTrades.length > 0) {
    flags.push('Large Positions');
  }
  
  return flags;
}
