export function truncateAddress(address: string): string {
  if (!address || address.length < 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatRelativeTime(timestamp: number): string {
  // Handle both seconds and milliseconds
  const tsMs = timestamp > 1e12 ? timestamp : timestamp * 1000;
  const diff = (Date.now() - tsMs) / 1000;
  
  if (diff < 0) return 'just now';
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 604800)}w ago`;
}

export function parseAlertDetails(details: string | null): Record<string, unknown> | null {
  if (!details) return null;
  try {
    return JSON.parse(details);
  } catch {
    return { message: details } as Record<string, unknown>;
  }
}

export function formatAlertSummary(type: string, details: string | null): string {
  const parsed = parseAlertDetails(details);
  if (!parsed) return type.replace(/_/g, ' ');

  switch (type) {
    case 'fresh_wallet_large_bet': {
      const age = parsed.accountAgeDays as number | undefined;
      const ageStr = age !== undefined
        ? age < 1 ? 'less than a day' : `${Math.ceil(age)} days`
        : 'new';
      const val = parsed.value ? formatCurrency(parsed.value as number) : '';
      return `Fresh wallet (${ageStr} old) dropped ${val} on a single bet`;
    }
    case 'whale_bet': {
      const val = parsed.value ? formatCurrency(parsed.value as number) : 'large';
      const market = (parsed.title as string) || 'unknown market';
      return `Whale bet: ${val} on "${market}"`;
    }
    case 'high_score_wallet': {
      const score = (parsed.value as number) || 0;
      const flags = (parsed.flags as string[]) || [];
      const flagSummary = flags.slice(0, 3).map((f: string) => {
        if (f.includes('account_age')) return 'new account';
        if (f.includes('win_rate')) return 'high win rate';
        if (f.includes('concentration')) return 'concentrated bets';
        if (f.includes('rapid_trading')) return 'rapid trading';
        if (f.includes('clustered_timing')) return 'suspicious timing';
        if (f.includes('non_cex_funding')) return 'non-exchange funding';
        if (f.includes('first_trade')) return 'large first trade';
        return f.replace(/_/g, ' ');
      }).join(', ');
      return `Suspicion score ${score}/100 — ${flagSummary}`;
    }
    case 'cluster_coordinated': {
      const wallets = parsed.wallets as string[] | undefined;
      const walletCount = wallets?.length || 0;
      const vol = parsed.totalVolume ? formatCurrency(parsed.totalVolume as number) : '';
      return `${walletCount} linked wallets betting together${vol ? ` (${vol} total)` : ''}`;
    }
    case 'win_streak': {
      return (parsed.message as string) || 'Unusual win streak detected';
    }
    case 'rapid_trading': {
      return (parsed.message as string) || 'Rapid-fire trading pattern detected';
    }
    case 'sharp_bettor': {
      const winRate = ((parsed.value as number) || 0).toFixed(1);
      const resolved = (parsed.resolvedBets as number) || 0;
      const activeBets = (parsed.activeBets as unknown[]) || [];
      const activeCount = activeBets.length;
      return `Sharp bettor: ${winRate}% win rate over ${resolved} bets — ${activeCount} active position${activeCount !== 1 ? 's' : ''} right now`;
    }
    default:
      return (parsed.message as string) || type.replace(/_/g, ' ');
  }
}

export function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  } else {
    return `$${value.toFixed(2)}`;
  }
}

export function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  } else {
    return value.toString();
  }
}

export function getSeverityColor(severity: string): string {
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
      return '#71717a';
  }
}

export function getScoreColor(score: number, max: number): string {
  const ratio = score / max;
  if (ratio >= 0.75) return '#ef4444';
  if (ratio >= 0.5) return '#f97316';
  if (ratio >= 0.25) return '#eab308';
  return '#22c55e';
}
