'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, Users } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/formatters';

interface HotMarket {
  name: string;
  condition_id: string | null;
  unique_wallets: number;
  total_volume: number;
  trade_count: number;
}

export function HotMarkets() {
  const [markets, setMarkets] = useState<HotMarket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const res = await fetch('/api/markets?limit=10');
        if (res.ok) {
          const data = await res.json();
          setMarkets(data);
        }
      } catch (error) {
        console.error('Failed to fetch markets:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMarkets();
  }, []);

  const truncateMarketName = (name: string, maxLength: number = 40) => {
    if (name.length <= maxLength) return name;
    return name.slice(0, maxLength) + '...';
  };

  return (
    <Card className="bg-[#12121a] border-[#27272a] flex-1">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-[#e4e4e7] flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#22c55e]" />
          Hot Markets
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#6366f1]"></div>
          </div>
        ) : markets.length === 0 ? (
          <div className="text-center py-8 text-[#71717a]">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No market activity yet</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-[#27272a] hover:bg-transparent">
                <TableHead className="text-[#71717a]">Market</TableHead>
                <TableHead className="text-[#71717a] text-right">Volume</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {markets.map((market, index) => (
                <TableRow key={market.condition_id || index} className="border-[#27272a] hover:bg-[#1a1a2e]">
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-[#e4e4e7]">
                        {truncateMarketName(market.name)}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-[#71717a]">
                        <Users className="w-3 h-3" />
                        <span>{market.unique_wallets} wallets</span>
                        <span className="font-mono">{formatNumber(market.trade_count)} trades</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-[#e4e4e7]">
                    {formatCurrency(market.total_volume)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
