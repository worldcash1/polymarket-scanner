'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Clock, 
  Target, 
  TrendingUp,
  Wallet as WalletIcon,
  AlertTriangle,
  Link as LinkIcon,
  DollarSign,
  Activity
} from 'lucide-react';
import { formatRelativeTime, formatCurrency, getScoreColor } from '@/lib/formatters';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface WalletData {
  wallet: {
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
  };
  trades: Array<{
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
  }>;
  scoreBreakdown: {
    accountAge: { score: number; max: number };
    betConcentration: { score: number; max: number };
    sizeAnomaly: { score: number; max: number };
    winRate: { score: number; max: number };
    timing: { score: number; max: number };
    funding: { score: number; max: number };
  };
  volumeHistory: Array<{ date: string; volume: number }>;
  flags: string[];
}

const scoreLabels: Record<string, string> = {
  accountAge: 'Account Age',
  betConcentration: 'Bet Concentration',
  sizeAnomaly: 'Size Anomaly',
  winRate: 'Win Rate',
  timing: 'Timing',
  funding: 'Funding Source',
};

export default function WalletProfile({ params }: { params: Promise<{ address: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const res = await fetch(`/api/wallet/${resolvedParams.address}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('Wallet not found');
          } else {
            setError('Failed to load wallet data');
          }
          return;
        }
        const walletData = await res.json();
        setData(walletData);
      } catch (err) {
        console.error('Failed to fetch wallet:', err);
        setError('Failed to load wallet data');
      } finally {
        setLoading(false);
      }
    };

    fetchWallet();
  }, [resolvedParams.address]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6366f1]"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center gap-4">
        <AlertTriangle className="w-12 h-12 text-[#ef4444]" />
        <p className="text-[#e4e4e7] text-lg">{error || 'Wallet not found'}</p>
        <Button 
          variant="outline" 
          className="border-[#27272a] text-[#e4e4e7] hover:bg-[#1a1a2e]"
          onClick={() => router.push('/')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const { wallet, trades, scoreBreakdown, volumeHistory, flags } = data;

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <header className="flex items-center gap-4 px-6 py-4 border-b border-[#27272a] bg-[#12121a]">
        <Button 
          variant="ghost" 
          size="icon"
          className="text-[#71717a] hover:text-[#e4e4e7] hover:bg-[#1a1a2e]"
          onClick={() => router.push('/')}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="font-mono text-lg text-[#e4e4e7]">{wallet.address}</h1>
          <p className="text-sm text-[#71717a]">Wallet Profile</p>
        </div>
        {/* Score Bar */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#71717a]">Risk Score</span>
          <div className="w-32 h-3 bg-[#1a1a2e] rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all"
              style={{ 
                width: `${wallet.score}%`,
                backgroundColor: getScoreColor(wallet.score, 100)
              }}
            />
          </div>
          <span 
            className="font-mono font-bold text-lg"
            style={{ color: getScoreColor(wallet.score, 100) }}
          >
            {wallet.score}
          </span>
        </div>
      </header>

      <main className="p-6">
        {/* Top Row: Score Breakdown + Flags */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Score Breakdown */}
          <Card className="bg-[#12121a] border-[#27272a] lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-[#e4e4e7] flex items-center gap-2">
                <Target className="w-5 h-5 text-[#6366f1]" />
                Score Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(scoreBreakdown).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#71717a]">{scoreLabels[key] || key}</span>
                    <span className="font-mono text-[#e4e4e7]">{value.score}/{value.max}</span>
                  </div>
                  <div className="w-full h-2 bg-[#1a1a2e] rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all"
                      style={{ 
                        width: `${(value.score / value.max) * 100}%`,
                        backgroundColor: getScoreColor(value.score, value.max)
                      }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Flags + Funding Info */}
          <div className="space-y-4">
            {/* Flags */}
            <Card className="bg-[#12121a] border-[#27272a]">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-[#e4e4e7] flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-[#f97316]" />
                  Flags
                </CardTitle>
              </CardHeader>
              <CardContent>
                {flags.length === 0 ? (
                  <p className="text-sm text-[#71717a]">No flags detected</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {flags.map((flag, index) => (
                      <Badge 
                        key={index}
                        variant="outline"
                        className="border-[#27272a] bg-[#1a1a2e] text-[#e4e4e7]"
                      >
                        {flag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Funding Info */}
            <Card className="bg-[#12121a] border-[#27272a]">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-[#e4e4e7] flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-[#22c55e]" />
                  Funding
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#71717a]">Source</span>
                  {wallet.funding_sources ? (
                    <span className="font-mono text-xs text-[#6366f1]">
                      {wallet.funding_sources.slice(0, 10)}...
                    </span>
                  ) : (
                    <span className="text-sm text-[#71717a]">Unknown</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#71717a]">Type</span>
                  <Badge 
                    variant="outline"
                    className={`border-[#27272a] ${wallet.is_cex_funded ? 'text-[#22c55e]' : 'text-[#f97316]'}`}
                  >
                    {wallet.is_cex_funded ? 'CEX' : 'Non-CEX'}
                  </Badge>
                </div>
                {wallet.cluster_id && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#71717a]">Cluster</span>
                    <span className="font-mono text-xs text-[#6366f1] flex items-center gap-1">
                      <LinkIcon className="w-3 h-3" />
                      {wallet.cluster_id.slice(0, 8)}...
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Card className="bg-[#12121a] border-[#27272a]">
            <CardContent className="p-4">
              <p className="text-sm text-[#71717a]">Total Volume</p>
              <p className="text-xl font-mono font-bold text-[#e4e4e7]">
                {formatCurrency(wallet.total_volume)}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-[#12121a] border-[#27272a]">
            <CardContent className="p-4">
              <p className="text-sm text-[#71717a]">Trade Count</p>
              <p className="text-xl font-mono font-bold text-[#e4e4e7]">
                {wallet.trade_count}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-[#12121a] border-[#27272a]">
            <CardContent className="p-4">
              <p className="text-sm text-[#71717a]">Win Rate</p>
              <p className="text-xl font-mono font-bold text-[#e4e4e7]">
                {(wallet.win_rate * 100).toFixed(1)}%
              </p>
            </CardContent>
          </Card>
          <Card className="bg-[#12121a] border-[#27272a]">
            <CardContent className="p-4">
              <p className="text-sm text-[#71717a]">PnL</p>
              <p className={`text-xl font-mono font-bold ${wallet.pnl >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                {wallet.pnl >= 0 ? '+' : ''}{formatCurrency(wallet.pnl)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Trade History */}
        <Card className="bg-[#12121a] border-[#27272a] mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-[#e4e4e7] flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#6366f1]" />
              Trade History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trades.length === 0 ? (
              <div className="text-center py-8 text-[#71717a]">
                <WalletIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No trades recorded</p>
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#27272a] hover:bg-transparent">
                      <TableHead className="text-[#71717a]">Time</TableHead>
                      <TableHead className="text-[#71717a]">Market</TableHead>
                      <TableHead className="text-[#71717a]">Side</TableHead>
                      <TableHead className="text-[#71717a] text-right">Size</TableHead>
                      <TableHead className="text-[#71717a] text-right">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trades.map((trade) => (
                      <TableRow key={trade.id} className="border-[#27272a] hover:bg-[#1a1a2e]">
                        <TableCell className="font-mono text-sm text-[#71717a]">
                          {formatRelativeTime(trade.timestamp)}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm text-[#e4e4e7]">
                          {trade.title || trade.condition_id?.slice(0, 12) + '...' || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline"
                            className={`border-[#27272a] ${trade.side === 'BUY' ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}
                          >
                            {trade.side}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-[#e4e4e7]">
                          {formatCurrency(trade.size * trade.price)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-[#71717a]">
                          {trade.price.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Sparkline */}
        {volumeHistory.length > 0 && (
          <Card className="bg-[#12121a] border-[#27272a]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-[#e4e4e7] flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#6366f1]" />
                Activity Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={volumeHistory}>
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: '#71717a', fontSize: 10 }}
                      axisLine={{ stroke: '#27272a' }}
                      tickLine={{ stroke: '#27272a' }}
                    />
                    <YAxis 
                      tick={{ fill: '#71717a', fontSize: 10 }}
                      axisLine={{ stroke: '#27272a' }}
                      tickLine={{ stroke: '#27272a' }}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1a1a2e', 
                        border: '1px solid #27272a',
                        borderRadius: '6px',
                        color: '#e4e4e7'
                      }}
                      labelStyle={{ color: '#71717a' }}
                      formatter={(value) => [formatCurrency(value as number), 'Volume']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="volume" 
                      stroke="#6366f1" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
