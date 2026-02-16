import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  trades: defineTable({
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
    .index("by_wallet", ["wallet"])
    .index("by_timestamp", ["timestamp"])
    .index("by_txHash", ["txHash"]),

  wallets: defineTable({
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
    .index("by_address", ["address"])
    .index("by_score", ["score"]),

  alerts: defineTable({
    type: v.string(),
    wallet: v.optional(v.string()),
    clusterId: v.optional(v.string()),
    market: v.optional(v.string()),
    details: v.optional(v.string()),
    severity: v.string(),
    dismissed: v.boolean(),
  })
    .index("by_severity", ["severity"])
    .index("by_type", ["type"])
    .index("by_dismissed", ["dismissed"]),

  clusters: defineTable({
    clusterId: v.string(),
    fundingSource: v.string(),
    walletCount: v.number(),
    totalVolume: v.number(),
    coordinatedBets: v.number(),
  })
    .index("by_clusterId", ["clusterId"]),
});
