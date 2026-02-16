import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = getDb();
  
  try {
    const trades = db.prepare('SELECT COUNT(*) as count FROM trades').get() as { count: number };
    const wallets = db.prepare('SELECT COUNT(*) as count FROM wallets').get() as { count: number };
    const clusters = db.prepare('SELECT COUNT(*) as count FROM clusters').get() as { count: number };
    
    const alerts = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical,
        SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) as high,
        SUM(CASE WHEN severity = 'medium' THEN 1 ELSE 0 END) as medium,
        SUM(CASE WHEN severity = 'low' THEN 1 ELSE 0 END) as low
      FROM alerts 
      WHERE dismissed = 0
    `).get() as { total: number; critical: number; high: number; medium: number; low: number };
    
    // Determine highest severity for active alerts
    let highestSeverity = 'none';
    if (alerts.critical > 0) highestSeverity = 'critical';
    else if (alerts.high > 0) highestSeverity = 'high';
    else if (alerts.medium > 0) highestSeverity = 'medium';
    else if (alerts.low > 0) highestSeverity = 'low';
    
    db.close();
    
    return NextResponse.json({
      trades: trades.count,
      wallets: wallets.count,
      clusters: clusters.count,
      alerts: {
        total: alerts.total,
        critical: alerts.critical || 0,
        high: alerts.high || 0,
        medium: alerts.medium || 0,
        low: alerts.low || 0,
        highestSeverity,
      },
    });
  } catch (error) {
    db.close();
    console.error('Stats API error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
