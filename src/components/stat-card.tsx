'use client';

import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color?: string;
  subtitle?: string;
}

export function StatCard({ title, value, icon: Icon, color = '#6366f1', subtitle }: StatCardProps) {
  return (
    <Card className="bg-[#12121a] border-[#27272a]">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-[#71717a] mb-1">{title}</p>
            <p 
              className="text-2xl font-bold font-mono"
              style={{ color }}
            >
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-[#71717a] mt-1">{subtitle}</p>
            )}
          </div>
          <div 
            className="p-2 rounded-lg"
            style={{ backgroundColor: `${color}20` }}
          >
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
