import { getDb, Alert } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const severity = searchParams.get('severity');
  const limit = parseInt(searchParams.get('limit') || '50');
  
  const db = getDb();
  
  try {
    let query = `
      SELECT id, type, wallet, cluster_id, market, details, severity, created_at, dismissed
      FROM alerts
      WHERE dismissed = 0
    `;
    
    const params: (string | number)[] = [];
    
    if (severity && severity !== 'all') {
      query += ' AND severity = ?';
      params.push(severity);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);
    
    const alerts = db.prepare(query).all(...params) as Alert[];
    
    // Get wallet scores for each alert
    const alertsWithScores = alerts.map(alert => {
      if (alert.wallet) {
        const wallet = db.prepare('SELECT score FROM wallets WHERE address = ?').get(alert.wallet) as { score: number } | undefined;
        return { ...alert, score: wallet?.score ?? null };
      }
      return { ...alert, score: null };
    });
    
    db.close();
    
    return NextResponse.json(alertsWithScores);
  } catch (error) {
    db.close();
    console.error('Alerts API error:', error);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}
