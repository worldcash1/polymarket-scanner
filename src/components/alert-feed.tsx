'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, Circle, ExternalLink, TrendingUp, Clock, Users, Wallet, BarChart3 } from 'lucide-react';
import { truncateAddress, formatRelativeTime, getSeverityColor, formatAlertSummary, parseAlertDetails, formatCurrency } from '@/lib/formatters';
import Link from 'next/link';

interface ContextPill {
  icon?: React.ReactNode;
  label: string;
  value: string;
}

function ContextPill({ icon, label, value }: ContextPill) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#0a0a0f] text-xs">
      {icon && <span className="text-[#71717a]">{icon}</span>}
      <span className="text-[#71717a]">{label}:</span>
      <span className="text-[#e4e4e7] font-mono">{value}</span>
    </div>
  );
}

function renderContextGrid(type: string, details: Record<string, unknown> | null) {
  if (!details) return null;

  const pills: ContextPill[] = [];

  switch (type) {
    case 'fresh_wallet_large_bet': {
      const marketName = (details.marketName as string) || (details.title as string);
      if (marketName) {
        pills.push({ label: 'Market', value: marketName.length > 25 ? marketName.slice(0, 22) + '...' : marketName });
      }
      const direction = details.direction as string;
      const entryPrice = details.entryPrice as number;
      if (direction && entryPrice) {
        const multiplier = entryPrice > 0 ? (1 / entryPrice).toFixed(1) : '?';
        pills.push({ 
          icon: <TrendingUp className="w-3 h-3" />,
          label: direction, 
          value: `$${entryPrice.toFixed(2)} (${multiplier}x)` 
        });
      }
      const history = details.walletHistory as { totalBets?: number } | undefined;
      if (history) {
        pills.push({ 
          icon: <Wallet className="w-3 h-3" />,
          label: 'Wallet', 
          value: `${history.totalBets || 0} prior bets` 
        });
      }
      const volShare = details.marketVolumeShare as string;
      if (volShare) {
        pills.push({ 
          icon: <BarChart3 className="w-3 h-3" />,
          label: 'Vol', 
          value: volShare 
        });
      }
      break;
    }

    case 'whale_bet': {
      const marketName = (details.marketName as string) || (details.title as string);
      if (marketName) {
        pills.push({ label: 'Market', value: marketName.length > 25 ? marketName.slice(0, 22) + '...' : marketName });
      }
      const direction = details.direction as string;
      const entryPrice = details.entryPrice as number;
      if (direction && entryPrice) {
        const multiplier = entryPrice > 0 ? (1 / entryPrice).toFixed(1) : '?';
        pills.push({ 
          icon: <TrendingUp className="w-3 h-3" />,
          label: direction, 
          value: `$${entryPrice.toFixed(2)} (${multiplier}x)` 
        });
      }
      const score = details.walletScore as number;
      if (score !== undefined) {
        pills.push({ label: 'Score', value: `${score}/100` });
      }
      const flagged = details.otherFlaggedOnSameSide as { count?: number } | undefined;
      if (flagged && flagged.count && flagged.count > 0) {
        pills.push({ 
          icon: <Users className="w-3 h-3" />,
          label: 'Flagged', 
          value: `${flagged.count} on same side` 
        });
      }
      break;
    }

    case 'high_score_wallet': {
      const latestBet = details.latestBet as { market?: string; size?: number; direction?: string } | undefined;
      if (latestBet && latestBet.market) {
        const size = latestBet.size ? formatCurrency(latestBet.size) : '';
        const marketShort = latestBet.market.length > 15 ? latestBet.market.slice(0, 12) + '...' : latestBet.market;
        pills.push({ label: 'Latest', value: `${size} on ${marketShort}` });
      }
      const history = details.walletHistory as { totalBets?: number; wins?: number; totalVolume?: number } | undefined;
      if (history) {
        pills.push({ label: 'Record', value: `${history.totalBets || 0} bets, ${history.wins || 0} wins` });
        if (history.totalVolume) {
          pills.push({ label: 'Total', value: formatCurrency(history.totalVolume) });
        }
      }
      const flagged = details.otherFlaggedOnSameSide as { count?: number } | undefined;
      if (flagged && flagged.count && flagged.count > 0) {
        pills.push({ 
          icon: <Users className="w-3 h-3" />,
          label: 'Flagged', 
          value: `${flagged.count} on same side` 
        });
      }
      break;
    }

    case 'cluster_coordinated': {
      const targetMarket = details.targetMarket as string;
      if (targetMarket && targetMarket !== 'Unknown') {
        pills.push({ label: 'Market', value: targetMarket.length > 20 ? targetMarket.slice(0, 17) + '...' : targetMarket });
      }
      const direction = details.direction as string;
      const avgPrice = details.avgEntryPrice as number;
      if (direction && avgPrice) {
        pills.push({ 
          icon: <TrendingUp className="w-3 h-3" />,
          label: `All ${direction}`, 
          value: `@ avg $${avgPrice.toFixed(2)}` 
        });
      }
      const timeWindow = details.timeWindow as string;
      if (timeWindow) {
        pills.push({ 
          icon: <Clock className="w-3 h-3" />,
          label: 'Window', 
          value: timeWindow.replace('all bought ', '') 
        });
      }
      const totalVolume = details.totalVolume as number;
      if (totalVolume) {
        pills.push({ label: 'Total', value: formatCurrency(totalVolume) });
      }
      break;
    }

    case 'sharp_bettor': {
      const winRate = (details.value as number) || 0;
      const resolved = (details.resolvedBets as number) || 0;
      const wins = (details.wins as number) || 0;
      const losses = (details.losses as number) || 0;
      pills.push({ 
        icon: <TrendingUp className="w-3 h-3" />,
        label: 'Win Rate', 
        value: `${winRate.toFixed(1)}% (${wins}W/${losses}L)` 
      });
      pills.push({ label: 'Resolved', value: `${resolved} bets` });
      
      const totalVolume = details.totalVolume as number;
      if (totalVolume) {
        pills.push({ label: 'Volume', value: formatCurrency(totalVolume) });
      }
      
      const profitEstimate = details.profitEstimate as number;
      if (profitEstimate) {
        pills.push({ 
          label: 'Profit', 
          value: `${profitEstimate >= 0 ? '+' : ''}${formatCurrency(profitEstimate)}` 
        });
      }
      
      // Active bets - THE ALPHA
      const activeBets = (details.activeBets as Array<{ market: string; outcome: string; price: number; size: number }>) || [];
      if (activeBets.length > 0) {
        for (const bet of activeBets.slice(0, 3)) {
          const marketShort = bet.market.length > 25 ? bet.market.slice(0, 22) + '...' : bet.market;
          const pct = (bet.price * 100).toFixed(0);
          pills.push({
            icon: <BarChart3 className="w-3 h-3" />,
            label: bet.outcome,
            value: `${marketShort} @ ${pct}%`
          });
        }
        if (activeBets.length > 3) {
          pills.push({ label: 'More', value: `+${activeBets.length - 3} positions` });
        }
      }
      
      // Stock crossover signals - THE META PLAY
      const stockCrossovers = (details.stockCrossovers as Array<{ market: string; direction: string; tickers: string[]; thesis: string }>) || [];
      if (stockCrossovers.length > 0) {
        const uniqueTickers = [...new Set(stockCrossovers.flatMap(s => s.tickers))].slice(0, 5);
        pills.push({
          icon: <TrendingUp className="w-3 h-3 text-[#22c55e]" />,
          label: '📈 Stock Play',
          value: uniqueTickers.join(', ')
        });
        // Show thesis for first crossover
        if (stockCrossovers[0].thesis) {
          pills.push({
            label: 'Thesis',
            value: stockCrossovers[0].thesis
          });
        }
      }
      break;
    }
  }

  if (pills.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {pills.map((pill, i) => (
        <ContextPill key={i} {...pill} />
      ))}
    </div>
  );
}

export function AlertFeed() {
  const [severity, setSeverity] = useState('all');
  
  const alerts = useQuery(api.queries.getAlerts, {
    severity: severity === 'all' ? undefined : severity,
    limit: 50,
  });

  const loading = alerts === undefined;

  const formatAlertType = (type: string) => {
    return type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <Card className="bg-[#12121a] border-[#27272a] flex-1">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-[#e4e4e7] flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[#f97316]" />
            Live Alert Feed
          </CardTitle>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger className="w-32 bg-[#1a1a2e] border-[#27272a] text-[#e4e4e7]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a2e] border-[#27272a]">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#6366f1]"></div>
          </div>
        ) : !alerts || alerts.length === 0 ? (
          <div className="text-center py-8 text-[#71717a]">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No alerts found</p>
          </div>
        ) : (
          alerts.map((alert) => {
            const parsedDetails = parseAlertDetails(alert.details ?? null);
            return (
              <div
                key={alert.id}
                className="p-3 rounded-lg bg-[#1a1a2e] border border-[#27272a] hover:border-[#3f3f46] transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <Circle
                      className="w-3 h-3 mt-1.5 flex-shrink-0"
                      style={{ color: getSeverityColor(alert.severity), fill: getSeverityColor(alert.severity) }}
                    />
                    <div className="flex-1 min-w-0">
                      {/* Line 1: Header */}
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          variant="outline" 
                          className="text-xs border-[#27272a]"
                          style={{ color: getSeverityColor(alert.severity) }}
                        >
                          {formatAlertType(alert.type)}
                        </Badge>
                        <span className="text-xs text-[#71717a]">
                          {formatRelativeTime(alert.created_at)}
                        </span>
                      </div>
                      {/* Line 2: Main message */}
                      <p className="text-sm text-[#e4e4e7] line-clamp-2">
                        {formatAlertSummary(alert.type, alert.details ?? null)}
                      </p>
                      {/* Line 3: Context grid */}
                      {renderContextGrid(alert.type, parsedDetails)}
                      {/* Line 4: Wallet link */}
                      <div className="flex items-center gap-3 mt-2">
                        {alert.wallet && (
                          <Link 
                            href={`/wallet/${alert.wallet}`}
                            className="flex items-center gap-1 text-xs font-mono text-[#6366f1] hover:underline"
                          >
                            {truncateAddress(alert.wallet)}
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                        {alert.score !== null && (
                          <span className="text-xs text-[#71717a]">
                            Score: <span className="font-mono text-[#e4e4e7]">{alert.score}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
