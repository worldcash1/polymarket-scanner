'use client';

import { Activity } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Header() {
  const pathname = usePathname();

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-[#27272a] bg-[#12121a]">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-[#6366f1]" />
          <h1 className="text-xl font-semibold tracking-tight text-[#e4e4e7]">
            POLYMARKET SCANNER
          </h1>
        </div>
        
        <nav className="flex items-center gap-6">
          <Link 
            href="/"
            className={`text-sm font-medium transition-colors hover:text-[#6366f1] ${
              pathname === '/' ? 'text-[#6366f1]' : 'text-[#71717a]'
            }`}
          >
            Command Center
          </Link>
          <Link 
            href="/insights"
            className={`text-sm font-medium transition-colors hover:text-[#6366f1] ${
              pathname === '/insights' ? 'text-[#6366f1]' : 'text-[#71717a]'
            }`}
          >
            Insights
          </Link>
        </nav>
      </div>
      
      <div className="flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-[#22c55e]"></span>
        </span>
        <span className="text-sm font-medium text-[#22c55e]">Live</span>
      </div>
    </header>
  );
}
