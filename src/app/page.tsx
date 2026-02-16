'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { StatCard } from '@/components/stat-card';
import { AlertFeed } from '@/components/alert-feed';
import { Leaderboard } from '@/components/leaderboard';
import { HotMarkets } from '@/components/hot-markets';
import { Bell, Network, Wallet, AlertTriangle } from 'lucide-react';

interface Stats {
  trades: number;
  wallets: number;
  clusters: number;
  alerts: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    highestSeverity: string;
  };
}

export default function CommandCenter() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '#ef4444';
      case 'high':
        return '#f97316';
      case 'medium':
        return '#eab308';
      case 'low':
        return '#22c55e';
      default:
        return '#6366f1';
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Header />
      
      <main className="p-6">
        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Active Alerts"
            value={loading ? '...' : stats?.alerts.total ?? 0}
            icon={Bell}
            color={stats ? getSeverityColor(stats.alerts.highestSeverity) : '#6366f1'}
            subtitle={stats?.alerts.highestSeverity !== 'none' ? `Highest: ${stats?.alerts.highestSeverity}` : undefined}
          />
          <StatCard
            title="Clusters Detected"
            value={loading ? '...' : stats?.clusters ?? 0}
            icon={Network}
            color="#6366f1"
          />
          <StatCard
            title="Wallets Tracked"
            value={loading ? '...' : stats?.wallets ?? 0}
            icon={Wallet}
            color="#6366f1"
          />
          <StatCard
            title="Critical Alerts"
            value={loading ? '...' : stats?.alerts.critical ?? 0}
            icon={AlertTriangle}
            color="#ef4444"
          />
        </div>

        {/* Alert Feed */}
        <div className="mb-6">
          <AlertFeed />
        </div>

        {/* Bottom Split Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Leaderboard />
          <HotMarkets />
        </div>
      </main>
    </div>
  );
}
