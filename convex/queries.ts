import { query } from "./_generated/server";
import { v } from "convex/values";

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    // Get recent trade count (just take up to 1000 to avoid limits)
    const recentTrades = await ctx.db.query("trades").take(1000);
    const tradeCount = recentTrades.length;

    const [wallets, clusters, alerts] = await Promise.all([
      ctx.db.query("wallets").collect(),
      ctx.db.query("clusters").collect(),
      ctx.db.query("alerts").filter((q) => q.eq(q.field("dismissed"), false)).collect(),
    ]);

    const alertsBySeverity = {
      critical: alerts.filter((a) => a.severity === "critical").length,
      high: alerts.filter((a) => a.severity === "high").length,
      medium: alerts.filter((a) => a.severity === "medium").length,
      low: alerts.filter((a) => a.severity === "low").length,
    };

    const highestSeverity =
      alertsBySeverity.critical > 0
        ? "critical"
        : alertsBySeverity.high > 0
          ? "high"
          : alertsBySeverity.medium > 0
            ? "medium"
            : alertsBySeverity.low > 0
              ? "low"
              : "none";

    return {
      trades: tradeCount,
      wallets: wallets.length,
      clusters: clusters.length,
      alerts: {
        total: alerts.length,
        ...alertsBySeverity,
        highestSeverity,
      },
    };
  },
});

export const getAlerts = query({
  args: {
    severity: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let alertsQuery = ctx.db.query("alerts");
    
    const alerts = await alertsQuery.order("desc").collect();
    
    let filtered = alerts.filter((a) => !a.dismissed);
    
    if (args.severity && args.severity !== "all") {
      filtered = filtered.filter((a) => a.severity === args.severity);
    }
    
    const limited = filtered.slice(0, args.limit ?? 50);
    
    // Get wallet scores for alerts with wallets
    const alertsWithScores = await Promise.all(
      limited.map(async (alert) => {
        let score = null;
        if (alert.wallet) {
          const wallet = await ctx.db
            .query("wallets")
            .withIndex("by_address", (q) => q.eq("address", alert.wallet!))
            .first();
          score = wallet?.score ?? null;
        }
        return {
          id: alert._id,
          type: alert.type,
          wallet: alert.wallet,
          cluster_id: alert.clusterId,
          market: alert.market,
          details: alert.details,
          severity: alert.severity,
          created_at: alert._creationTime,
          score,
        };
      })
    );
    
    return alertsWithScores;
  },
});

export const getLeaderboard = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const wallets = await ctx.db
      .query("wallets")
      .withIndex("by_score")
      .order("desc")
      .take(args.limit ?? 10);

    return wallets.map((w) => ({
      address: w.address,
      score: w.score,
      total_volume: w.totalVolume,
      trade_count: w.tradeCount,
      win_rate: w.winRate,
      is_flagged: w.isFlagged ? 1 : 0,
    }));
  },
});

export const getHotMarkets = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Only look at recent trades (last 1000) to avoid hitting read limits
    const trades = await ctx.db.query("trades").order("desc").take(1000);

    // Aggregate by market (title or conditionId)
    const marketMap = new Map<
      string,
      {
        name: string;
        condition_id: string | null;
        unique_wallets: Set<string>;
        total_volume: number;
        trade_count: number;
      }
    >();

    for (const trade of trades) {
      const key = trade.conditionId || trade.title || "Unknown";
      const name = trade.title || key;

      if (!marketMap.has(key)) {
        marketMap.set(key, {
          name,
          condition_id: trade.conditionId || null,
          unique_wallets: new Set(),
          total_volume: 0,
          trade_count: 0,
        });
      }

      const market = marketMap.get(key)!;
      market.unique_wallets.add(trade.wallet);
      market.total_volume += trade.size * trade.price;
      market.trade_count += 1;
    }

    const markets = Array.from(marketMap.values())
      .map((m) => ({
        name: m.name,
        condition_id: m.condition_id,
        unique_wallets: m.unique_wallets.size,
        total_volume: m.total_volume,
        trade_count: m.trade_count,
      }))
      .sort((a, b) => b.total_volume - a.total_volume)
      .slice(0, args.limit ?? 10);

    return markets;
  },
});

export const getWallet = query({
  args: {
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const wallet = await ctx.db
      .query("wallets")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();

    if (!wallet) {
      return null;
    }

    const trades = await ctx.db
      .query("trades")
      .withIndex("by_wallet", (q) => q.eq("wallet", args.address))
      .order("desc")
      .take(200);

    // Parse score breakdown
    let scoreBreakdown = {
      accountAge: { score: 0, max: 15 },
      betConcentration: { score: 0, max: 20 },
      sizeAnomaly: { score: 0, max: 15 },
      winRate: { score: 0, max: 20 },
      timing: { score: 0, max: 15 },
      funding: { score: 0, max: 15 },
    };

    if (wallet.scoreBreakdown) {
      try {
        scoreBreakdown = JSON.parse(wallet.scoreBreakdown);
      } catch {
        // use defaults
      }
    }

    // Parse flags
    let flags: string[] = [];
    if (wallet.flags) {
      try {
        flags = JSON.parse(wallet.flags);
      } catch {
        // use empty array
      }
    }

    // Build volume history from trades
    const volumeByDate = new Map<string, number>();
    for (const trade of trades) {
      const date = new Date(trade.timestamp).toISOString().split("T")[0];
      const volume = volumeByDate.get(date) || 0;
      volumeByDate.set(date, volume + trade.size * trade.price);
    }

    const volumeHistory = Array.from(volumeByDate.entries())
      .map(([date, volume]) => ({ date, volume }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);

    return {
      wallet: {
        address: wallet.address,
        first_seen: wallet.firstSeen ?? null,
        last_seen: wallet.lastSeen ?? null,
        trade_count: wallet.tradeCount,
        total_volume: wallet.totalVolume,
        win_count: wallet.winCount,
        loss_count: wallet.lossCount,
        win_rate: wallet.winRate,
        pnl: wallet.pnl,
        score: wallet.score,
        is_flagged: wallet.isFlagged ? 1 : 0,
        funding_sources: wallet.fundingSources ?? null,
        is_cex_funded: wallet.isCexFunded ? 1 : 0,
        cluster_id: wallet.clusterId ?? null,
      },
      trades: trades.map((t) => ({
        id: t._id,
        tx_hash: t.txHash,
        wallet: t.wallet,
        side: t.side,
        asset: t.asset,
        condition_id: t.conditionId ?? null,
        size: t.size,
        price: t.price,
        timestamp: t.timestamp,
        title: t.title ?? null,
        slug: t.slug ?? null,
        outcome: t.outcome ?? null,
      })),
      scoreBreakdown,
      volumeHistory,
      flags,
    };
  },
});
