import { getDb, Wallet } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10');
  
  const db = getDb();
  
  try {
    const wallets = db.prepare(`
      SELECT address, score, total_volume, trade_count, win_rate, is_flagged
      FROM wallets
      ORDER BY score DESC
      LIMIT ?
    `).all(limit) as Pick<Wallet, 'address' | 'score' | 'total_volume' | 'trade_count' | 'win_rate' | 'is_flagged'>[];
    
    db.close();
    
    return NextResponse.json(wallets);
  } catch (error) {
    db.close();
    console.error('Leaderboard API error:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
