'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, Circle, ExternalLink } from 'lucide-react';
import { truncateAddress, formatRelativeTime, getSeverityColor } from '@/lib/formatters';
import Link from 'next/link';

interface Alert {
  id: number;
  type: string;
  wallet: string | null;
  cluster_id: string | null;
  market: string | null;
  details: string | null;
  severity: string;
  created_at: number;
  score: number | null;
}

export function AlertFeed() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [severity, setSeverity] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const params = new URLSearchParams();
        if (severity !== 'all') params.set('severity', severity);
        params.set('limit', '50');
        
        const res = await fetch(`/api/alerts?${params}`);
        if (res.ok) {
          const data = await res.json();
          setAlerts(data);
        }
      } catch (error) {
        console.error('Failed to fetch alerts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, [severity]);

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
        ) : alerts.length === 0 ? (
          <div className="text-center py-8 text-[#71717a]">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No alerts found</p>
          </div>
        ) : (
          alerts.map((alert) => (
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
                    {alert.details && (
                      <p className="text-sm text-[#e4e4e7] mb-2 line-clamp-2">
                        {alert.details}
                      </p>
                    )}
                    <div className="flex items-center gap-3">
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
          ))
        )}
      </CardContent>
    </Card>
  );
}
