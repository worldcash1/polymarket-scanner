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

export const getInsights = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const sixHours = 6 * oneHour;
    const oneDayAgo = 24 * oneHour;
    
    // Get recent trades (last 2000 to avoid limits)
    const recentTrades = await ctx.db.query("trades").order("desc").take(2000);
    
    // Get high-score wallets for smart money analysis
    const smartWallets = await ctx.db
      .query("wallets")
      .withIndex("by_score")
      .order("desc")
      .filter((q) => q.gt(q.field("score"), 40))
      .take(500);
    
    const smartWalletAddresses = new Set(smartWallets.map(w => w.address));
    
    // Get today's data for daily stats
    const todayStart = now - oneDayAgo;
    const todayTrades = recentTrades.filter(t => t.timestamp >= todayStart);
    
    // Get alerts from today
    const todayAlerts = await ctx.db
      .query("alerts")
      .filter((q) => q.gte(q.field("_creationTime"), todayStart))
      .collect();
    
    // 1. Market Momentum Analysis
    const marketVolume = new Map<string, {
      name: string;
      conditionId: string | null;
      volume1h: number;
      volume6h: number;
      volume24h: number;
      yesVolume24h: number;
      noVolume24h: number;
      tradeCount: number;
    }>();
    
    for (const trade of recentTrades) {
      const key = trade.conditionId || trade.title || "Unknown";
      const name = trade.title || key;
      const tradeValue = trade.size * trade.price;
      const age = now - trade.timestamp;
      
      if (!marketVolume.has(key)) {
        marketVolume.set(key, {
          name,
          conditionId: trade.conditionId || null,
          volume1h: 0,
          volume6h: 0,
          volume24h: 0,
          yesVolume24h: 0,
          noVolume24h: 0,
          tradeCount: 0,
        });
      }
      
      const market = marketVolume.get(key)!;
      market.tradeCount += 1;
      
      if (age <= oneHour) market.volume1h += tradeValue;
      if (age <= sixHours) market.volume6h += tradeValue;
      if (age <= oneDayAgo) {
        market.volume24h += tradeValue;
        if (trade.side === "YES" || trade.outcome === "YES") {
          market.yesVolume24h += tradeValue;
        } else {
          market.noVolume24h += tradeValue;
        }
      }
    }
    
    const marketMomentum = Array.from(marketVolume.values())
      .filter(m => m.volume24h > 0)
      .map(m => ({
        ...m,
        yesBias: m.volume24h > 0 ? (m.yesVolume24h / m.volume24h) * 100 : 50,
        momentum: m.volume1h > 0 ? (m.volume1h / (m.volume24h / 24)) : 0,
      }))
      .sort((a, b) => b.volume1h - a.volume1h)
      .slice(0, 10);
    
    // 2. Smart Money Flow
    const smartMoneyFlow = new Map<string, {
      name: string;
      smartVolume: number;
      smartTradeCount: number;
      totalVolume: number;
      yesSmartVolume: number;
      noSmartVolume: number;
    }>();
    
    for (const trade of recentTrades.filter(t => t.timestamp >= todayStart)) {
      const key = trade.conditionId || trade.title || "Unknown";
      const name = trade.title || key;
      const tradeValue = trade.size * trade.price;
      const isSmart = smartWalletAddresses.has(trade.wallet);
      
      if (!smartMoneyFlow.has(key)) {
        smartMoneyFlow.set(key, {
          name,
          smartVolume: 0,
          smartTradeCount: 0,
          totalVolume: 0,
          yesSmartVolume: 0,
          noSmartVolume: 0,
        });
      }
      
      const flow = smartMoneyFlow.get(key)!;
      flow.totalVolume += tradeValue;
      
      if (isSmart) {
        flow.smartVolume += tradeValue;
        flow.smartTradeCount += 1;
        if (trade.side === "YES" || trade.outcome === "YES") {
          flow.yesSmartVolume += tradeValue;
        } else {
          flow.noSmartVolume += tradeValue;
        }
      }
    }
    
    const smartMoney = Array.from(smartMoneyFlow.values())
      .filter(f => f.smartVolume > 0)
      .map(f => ({
        ...f,
        smartRatio: f.totalVolume > 0 ? (f.smartVolume / f.totalVolume) * 100 : 0,
        smartYesBias: f.smartVolume > 0 ? (f.yesSmartVolume / f.smartVolume) * 100 : 50,
      }))
      .sort((a, b) => b.smartVolume - a.smartVolume)
      .slice(0, 10);
    
    // 3. Whale Moves (trades $1K+)
    const whaleThreshold = 1000;
    const whaleMoves = recentTrades
      .filter(t => t.size * t.price >= whaleThreshold)
      .slice(0, 50)
      .map(t => ({
        timestamp: t.timestamp,
        wallet: t.wallet,
        market: t.title || t.conditionId || "Unknown",
        side: t.side,
        size: t.size * t.price,
        price: t.price,
        txHash: t.txHash,
      }))
      .sort((a, b) => b.timestamp - a.timestamp);
    
    // 4. Market Consensus Analysis
    const consensusMarkets = Array.from(marketVolume.values())
      .filter(m => m.volume24h > 100) // Only markets with decent volume
      .slice(0, 20);
    
    const marketConsensus = await Promise.all(
      consensusMarkets.map(async (market) => {
        const marketTrades = recentTrades.filter(t => 
          (t.conditionId === market.conditionId || t.title === market.name) &&
          t.timestamp >= todayStart
        );
        
        const smartMarketTrades = marketTrades.filter(t => smartWalletAddresses.has(t.wallet));
        
        // Calculate implied probabilities from recent trade prices
        const allPrices = marketTrades.map(t => t.price);
        const smartPrices = smartMarketTrades.map(t => t.price);
        
        const avgPrice = allPrices.length > 0 ? allPrices.reduce((a, b) => a + b, 0) / allPrices.length : 0;
        const smartAvgPrice = smartPrices.length > 0 ? smartPrices.reduce((a, b) => a + b, 0) / smartPrices.length : 0;
        
        return {
          name: market.name,
          conditionId: market.conditionId,
          marketProbability: avgPrice * 100,
          smartProbability: smartAvgPrice * 100,
          divergence: Math.abs(avgPrice - smartAvgPrice) * 100,
          volume: market.volume24h,
          smartTradeCount: smartMarketTrades.length,
        };
      })
    );
    
    const topDivergence = marketConsensus
      .filter(m => m.smartTradeCount >= 3) // Need meaningful smart money activity
      .sort((a, b) => b.divergence - a.divergence)
      .slice(0, 10);
    
    // 5. Daily Stats Summary
    const uniqueTodayWallets = new Set(todayTrades.map(t => t.wallet)).size;
    const todayVolume = todayTrades.reduce((sum, t) => sum + (t.size * t.price), 0);
    
    const dailyStats = {
      tradesCount: todayTrades.length,
      volume: todayVolume,
      uniqueWallets: uniqueTodayWallets,
      alertsCount: todayAlerts.length,
    };
    
    return {
      marketMomentum,
      smartMoney,
      whaleMoves,
      marketConsensus: topDivergence,
      dailyStats,
      lastUpdated: now,
    };
  },
});
