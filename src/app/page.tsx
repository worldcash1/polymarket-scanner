'use client';

import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Header } from '@/components/header';
import { StatCard } from '@/components/stat-card';
import { AlertFeed } from '@/components/alert-feed';
import { Leaderboard } from '@/components/leaderboard';
import { HotMarkets } from '@/components/hot-markets';
import { Bell, Network, Wallet, AlertTriangle } from 'lucide-react';

export default function CommandCenter() {
  const stats = useQuery(api.queries.getStats);

  const loading = stats === undefined;

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
