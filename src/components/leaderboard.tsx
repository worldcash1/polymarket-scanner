'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Flag } from 'lucide-react';
import { truncateAddress, formatCurrency } from '@/lib/formatters';
import Link from 'next/link';

interface LeaderboardWallet {
  address: string;
  score: number;
  total_volume: number;
  trade_count: number;
  win_rate: number;
  is_flagged: number;
}

export function Leaderboard() {
  const [wallets, setWallets] = useState<LeaderboardWallet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch('/api/leaderboard?limit=10');
        if (res.ok) {
          const data = await res.json();
          setWallets(data);
        }
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#ef4444';
    if (score >= 60) return '#f97316';
    if (score >= 40) return '#eab308';
    return '#22c55e';
  };

  return (
    <Card className="bg-[#12121a] border-[#27272a] flex-1">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-[#e4e4e7] flex items-center gap-2">
          <Trophy className="w-5 h-5 text-[#eab308]" />
          Top Suspicious
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#6366f1]"></div>
          </div>
        ) : wallets.length === 0 ? (
          <div className="text-center py-8 text-[#71717a]">
            <Trophy className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No wallets tracked yet</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-[#27272a] hover:bg-transparent">
                <TableHead className="text-[#71717a]">Score</TableHead>
                <TableHead className="text-[#71717a]">Address</TableHead>
                <TableHead className="text-[#71717a] text-right">Volume</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wallets.map((wallet, index) => (
                <TableRow key={wallet.address} className="border-[#27272a] hover:bg-[#1a1a2e]">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span 
                        className="font-mono font-bold"
                        style={{ color: getScoreColor(wallet.score) }}
                      >
                        {wallet.score}
                      </span>
                      {wallet.is_flagged === 1 && (
                        <Flag className="w-3 h-3 text-[#ef4444]" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link 
                      href={`/wallet/${wallet.address}`}
                      className="font-mono text-sm text-[#6366f1] hover:underline"
                    >
                      {truncateAddress(wallet.address)}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-[#e4e4e7]">
                    {formatCurrency(wallet.total_volume)}
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
