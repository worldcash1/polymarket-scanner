import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const upsertTrade = mutation({
  args: {
    txHash: v.string(),
    wallet: v.string(),
    side: v.string(),
    asset: v.string(),
    conditionId: v.optional(v.string()),
    size: v.number(),
    price: v.number(),
    timestamp: v.number(),
    title: v.optional(v.string()),
    slug: v.optional(v.string()),
    outcome: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if trade already exists by txHash
    const existing = await ctx.db
      .query("trades")
      .withIndex("by_txHash", (q) => q.eq("txHash", args.txHash))
      .first();

    if (existing) {
      // Skip - already exists
      return { inserted: false, id: existing._id };
    }

    const id = await ctx.db.insert("trades", args);
    return { inserted: true, id };
  },
});

export const upsertWallet = mutation({
  args: {
    address: v.string(),
    firstSeen: v.optional(v.number()),
    lastSeen: v.optional(v.number()),
    tradeCount: v.number(),
    totalVolume: v.number(),
    winCount: v.number(),
    lossCount: v.number(),
    winRate: v.number(),
    pnl: v.number(),
    score: v.number(),
    isFlagged: v.boolean(),
    fundingSources: v.optional(v.string()),
    isCexFunded: v.boolean(),
    clusterId: v.optional(v.string()),
    scoreBreakdown: v.optional(v.string()),
    flags: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("wallets")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();

    if (existing) {
      // Update existing wallet
      await ctx.db.patch(existing._id, args);
      return { inserted: false, id: existing._id };
    }

    const id = await ctx.db.insert("wallets", args);
    return { inserted: true, id };
  },
});

export const upsertAlert = mutation({
  args: {
    type: v.string(),
    wallet: v.optional(v.string()),
    clusterId: v.optional(v.string()),
    market: v.optional(v.string()),
    details: v.optional(v.string()),
    severity: v.string(),
    dismissed: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Alerts are append-only, but we'll check for duplicates based on type+wallet+market
    const existingAlerts = await ctx.db.query("alerts").collect();
    
    const duplicate = existingAlerts.find(
      (a) =>
        a.type === args.type &&
        a.wallet === args.wallet &&
        a.market === args.market &&
        a.details === args.details
    );

    if (duplicate) {
      return { inserted: false, id: duplicate._id };
    }

    const id = await ctx.db.insert("alerts", args);
    return { inserted: true, id };
  },
});

export const upsertCluster = mutation({
  args: {
    clusterId: v.string(),
    fundingSource: v.string(),
    walletCount: v.number(),
    totalVolume: v.number(),
    coordinatedBets: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("clusters")
      .withIndex("by_clusterId", (q) => q.eq("clusterId", args.clusterId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      return { inserted: false, id: existing._id };
    }

    const id = await ctx.db.insert("clusters", args);
    return { inserted: true, id };
  },
});

// Batch mutations for efficiency
export const batchUpsertTrades = mutation({
  args: {
    trades: v.array(
      v.object({
        txHash: v.string(),
        wallet: v.string(),
        side: v.string(),
        asset: v.string(),
        conditionId: v.optional(v.string()),
        size: v.number(),
        price: v.number(),
        timestamp: v.number(),
        title: v.optional(v.string()),
        slug: v.optional(v.string()),
        outcome: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    let inserted = 0;
    let skipped = 0;

    for (const trade of args.trades) {
      const existing = await ctx.db
        .query("trades")
        .withIndex("by_txHash", (q) => q.eq("txHash", trade.txHash))
        .first();

      if (existing) {
        skipped++;
      } else {
        await ctx.db.insert("trades", trade);
        inserted++;
      }
    }

    return { inserted, skipped };
  },
});

export const batchUpsertWallets = mutation({
  args: {
    wallets: v.array(
      v.object({
        address: v.string(),
        firstSeen: v.optional(v.number()),
        lastSeen: v.optional(v.number()),
        tradeCount: v.number(),
        totalVolume: v.number(),
        winCount: v.number(),
        lossCount: v.number(),
        winRate: v.number(),
        pnl: v.number(),
        score: v.number(),
        isFlagged: v.boolean(),
        fundingSources: v.optional(v.string()),
        isCexFunded: v.boolean(),
        clusterId: v.optional(v.string()),
        scoreBreakdown: v.optional(v.string()),
        flags: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    let inserted = 0;
    let updated = 0;

    for (const wallet of args.wallets) {
      const existing = await ctx.db
        .query("wallets")
        .withIndex("by_address", (q) => q.eq("address", wallet.address))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, wallet);
        updated++;
      } else {
        await ctx.db.insert("wallets", wallet);
        inserted++;
      }
    }

    return { inserted, updated };
  },
});
