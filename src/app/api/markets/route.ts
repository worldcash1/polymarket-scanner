import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10');
  
  const db = getDb();
  
  try {
    const markets = db.prepare(`
      SELECT 
        COALESCE(title, condition_id) as name,
        condition_id,
        COUNT(DISTINCT wallet) as unique_wallets,
        SUM(size * price) as total_volume,
        COUNT(*) as trade_count
      FROM trades
      WHERE title IS NOT NULL OR condition_id IS NOT NULL
      GROUP BY COALESCE(title, condition_id)
      ORDER BY total_volume DESC
      LIMIT ?
    `).all(limit) as {
      name: string;
      condition_id: string | null;
      unique_wallets: number;
      total_volume: number;
      trade_count: number;
    }[];
    
    db.close();
    
    return NextResponse.json(markets);
  } catch (error) {
    db.close();
    console.error('Markets API error:', error);
    return NextResponse.json({ error: 'Failed to fetch markets' }, { status: 500 });
  }
}
