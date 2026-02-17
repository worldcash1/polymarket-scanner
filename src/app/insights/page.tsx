'use client';

import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Header } from '@/components/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Brain, 
  Fish, 
  Target, 
  BarChart3, 
  DollarSign, 
  Users, 
  AlertTriangle,
  Clock,
  ExternalLink
} from 'lucide-react';
import { formatCurrency, formatNumber, truncateAddress } from '@/lib/formatters';
import Link from 'next/link';

export default function InsightsPage() {
  const insights = useQuery(api.queries.getInsights);
  
  const loading = insights === undefined;

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (hours > 0) return `${hours}h ago`;
    return `${minutes}m ago`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getBiasColor = (bias: number) => {
    if (bias > 60) return '#22c55e'; // Green for YES bias
    if (bias < 40) return '#ef4444'; // Red for NO bias
    return '#71717a'; // Gray for neutral
  };

  const getMomentumColor = (momentum: number) => {
    if (momentum > 5) return '#22c55e';
    if (momentum > 2) return '#eab308';
    return '#71717a';
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Header />
      
      <main className="p-6">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#e4e4e7] mb-2">Market Insights</h1>
          <p className="text-[#71717a]">
            AI-interpreted patterns and narratives from trading activity
            {insights && (
              <span className="ml-2 text-sm">
                • Updated {formatTimeAgo(insights.lastUpdated)}
              </span>
            )}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6366f1]"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Daily Stats Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-[#12121a] border-[#27272a]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#71717a]">Trades Today</p>
                      <p className="text-2xl font-bold text-[#e4e4e7]">
                        {formatNumber(insights?.dailyStats.tradesCount || 0)}
                      </p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-[#6366f1]" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#12121a] border-[#27272a]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#71717a]">Volume Today</p>
                      <p className="text-2xl font-bold text-[#e4e4e7]">
                        {formatCurrency(insights?.dailyStats.volume || 0)}
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-[#22c55e]" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#12121a] border-[#27272a]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#71717a]">Active Wallets</p>
                      <p className="text-2xl font-bold text-[#e4e4e7]">
                        {formatNumber(insights?.dailyStats.uniqueWallets || 0)}
                      </p>
                    </div>
                    <Users className="w-8 h-8 text-[#6366f1]" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#12121a] border-[#27272a]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#71717a]">Alerts Today</p>
                      <p className="text-2xl font-bold text-[#e4e4e7]">
                        {formatNumber(insights?.dailyStats.alertsCount || 0)}
                      </p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-[#f97316]" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Two-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Market Momentum */}
              <Card className="bg-[#12121a] border-[#27272a]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold text-[#e4e4e7] flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#6366f1]" />
                    Market Momentum
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!insights?.marketMomentum?.length ? (
                    <p className="text-center text-[#71717a] py-8">No momentum data available</p>
                  ) : (
                    <div className="space-y-3">
                      {insights.marketMomentum.slice(0, 8).map((market, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-[#1a1a2e] border border-[#27272a]">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-[#e4e4e7] text-sm leading-tight">
                              {market.name.length > 50 ? market.name.substring(0, 50) + '...' : market.name}
                            </h4>
                            <Badge 
                              className="text-xs ml-2 shrink-0" 
                              style={{ 
                                backgroundColor: getMomentumColor(market.momentum) + '20',
                                color: getMomentumColor(market.momentum)
                              }}
                            >
                              {market.momentum.toFixed(1)}x
                            </Badge>
                          </div>
                          <div className="flex justify-between text-xs text-[#71717a]">
                            <span>1h: {formatCurrency(market.volume1h)}</span>
                            <span 
                              style={{ color: getBiasColor(market.yesBias) }}
                            >
                              {formatPercentage(market.yesBias)} YES
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Smart Money Flow */}
              <Card className="bg-[#12121a] border-[#27272a]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold text-[#e4e4e7] flex items-center gap-2">
                    <Brain className="w-5 h-5 text-[#6366f1]" />
                    Smart Money Flow
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!insights?.smartMoney?.length ? (
                    <p className="text-center text-[#71717a] py-8">No smart money data available</p>
                  ) : (
                    <div className="space-y-3">
                      {insights.smartMoney.slice(0, 8).map((flow, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-[#1a1a2e] border border-[#27272a]">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-[#e4e4e7] text-sm leading-tight">
                              {flow.name.length > 50 ? flow.name.substring(0, 50) + '...' : flow.name}
                            </h4>
                            <Badge 
                              className="text-xs ml-2 shrink-0"
                              style={{ 
                                backgroundColor: '#eab308' + '20',
                                color: '#eab308'
                              }}
                            >
                              {formatPercentage(flow.smartRatio)}
                            </Badge>
                          </div>
                          <div className="flex justify-between text-xs text-[#71717a]">
                            <span>{formatCurrency(flow.smartVolume)} smart</span>
                            <span 
                              style={{ color: getBiasColor(flow.smartYesBias) }}
                            >
                              {formatPercentage(flow.smartYesBias)} YES
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Whale Moves Timeline */}
            <Card className="bg-[#12121a] border-[#27272a]">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-[#e4e4e7] flex items-center gap-2">
                  <Fish className="w-5 h-5 text-[#6366f1]" />
                  Whale Moves Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!insights?.whaleMoves?.length ? (
                  <p className="text-center text-[#71717a] py-8">No whale moves detected</p>
                ) : (
                  <div className="space-y-4">
                    {insights.whaleMoves.slice(0, 15).map((move, idx) => (
                      <div key={idx} className="flex items-start gap-4 p-3 rounded-lg bg-[#1a1a2e] border border-[#27272a]">
                        <div className="flex-shrink-0">
                          <div className="w-3 h-3 bg-[#6366f1] rounded-full mt-2"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-[#71717a]">
                                {formatTimeAgo(move.timestamp)}
                              </span>
                              <Link 
                                href={`/wallet/${move.wallet}`}
                                className="font-mono text-sm text-[#6366f1] hover:underline"
                              >
                                {truncateAddress(move.wallet)}
                              </Link>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                className="text-xs"
                                style={{ 
                                  backgroundColor: move.side === 'YES' ? '#22c55e20' : '#ef444420',
                                  color: move.side === 'YES' ? '#22c55e' : '#ef4444'
                                }}
                              >
                                {move.side}
                              </Badge>
                              <span className="font-mono text-sm font-bold text-[#e4e4e7]">
                                {formatCurrency(move.size)}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-[#e4e4e7] mb-1">
                            {move.market.length > 80 ? move.market.substring(0, 80) + '...' : move.market}
                          </p>
                          <div className="text-xs text-[#71717a]">
                            Price: {formatPercentage(move.price * 100)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Market Consensus */}
            <Card className="bg-[#12121a] border-[#27272a]">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-[#e4e4e7] flex items-center gap-2">
                  <Target className="w-5 h-5 text-[#6366f1]" />
                  Market Consensus vs Smart Money
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!insights?.marketConsensus?.length ? (
                  <p className="text-center text-[#71717a] py-8">Insufficient data for consensus analysis</p>
                ) : (
                  <div className="space-y-3">
                    {insights.marketConsensus.map((consensus, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-[#1a1a2e] border border-[#27272a]">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-[#e4e4e7] text-sm leading-tight flex-1">
                            {consensus.name.length > 60 ? consensus.name.substring(0, 60) + '...' : consensus.name}
                          </h4>
                          <Badge 
                            className="text-xs ml-2 shrink-0"
                            style={{ 
                              backgroundColor: consensus.divergence > 10 ? '#ef444420' : '#22c55e20',
                              color: consensus.divergence > 10 ? '#ef4444' : '#22c55e'
                            }}
                          >
                            {formatPercentage(consensus.divergence)} diff
                          </Badge>
                        </div>
                        <div className="flex justify-between text-xs text-[#71717a]">
                          <span>Market: {formatPercentage(consensus.marketProbability)}</span>
                          <span>Smart: {formatPercentage(consensus.smartProbability)}</span>
                          <span>{formatCurrency(consensus.volume)} vol</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}