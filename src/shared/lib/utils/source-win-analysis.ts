import { normalizeSourceForAnalytics } from './source-normalizer';

export interface SourceWinLeadInput {
  source: string;
  status: string;
  callAttempts: number;
  lead_category?: string | null;
  assignedToId?: string | null;
  agentName?: string | null;
}

export interface SourceAgentBreakdown {
  agentId: string;
  agentName: string;
  totalLeads: number;
  won: number;
  lost: number;
  closedDeals: number;
  winRatio: number | null;
}

export interface SourceWinAnalysisRow {
  source: string;
  totalLeads: number;
  won: number;
  lost: number;
  unqualified: number;
  unreach: number;
  newLeads: number;
  followup: number;
  otherStatus: number;
  closedDeals: number;
  winRatio: number | null;
  conversionRate: number;
  avgCallAttempts: number;
  inboundCount: number;
  outboundCount: number;
  volumeShare: number;
  confidence: 'high' | 'low';
  agents: SourceAgentBreakdown[];
}

export interface SourceWinAnalysisSummary {
  overallWinRatio: number | null;
  overallConversionRate: number;
  totalLeads: number;
  totalWon: number;
  totalLost: number;
  bestWinRatio: { source: string; winRatio: number; closedDeals: number } | null;
  highestVolume: { source: string; totalLeads: number } | null;
}

export interface SourceWinAnalysisResult {
  sources: SourceWinAnalysisRow[];
  summary: SourceWinAnalysisSummary;
}

interface MutableSourceBucket {
  source: string;
  totalLeads: number;
  won: number;
  lost: number;
  unqualified: number;
  unreach: number;
  newLeads: number;
  followup: number;
  otherStatus: number;
  callAttemptsSum: number;
  inboundCount: number;
  outboundCount: number;
  agents: Map<
    string,
    {
      agentId: string;
      agentName: string;
      totalLeads: number;
      won: number;
      lost: number;
    }
  >;
}

const MIN_CLOSED_DEALS_FOR_HIGH_CONFIDENCE = 5;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function computeWinRatio(won: number, lost: number): number | null {
  const closedDeals = won + lost;
  if (closedDeals === 0) return null;
  return round2((won / closedDeals) * 100);
}

function incrementStatus(bucket: MutableSourceBucket, status: string): void {
  switch (status) {
    case 'won':
      bucket.won += 1;
      break;
    case 'lost':
      bucket.lost += 1;
      break;
    case 'unqualified':
      bucket.unqualified += 1;
      break;
    case 'unreach':
      bucket.unreach += 1;
      break;
    case 'new':
      bucket.newLeads += 1;
      break;
    case 'followup':
      bucket.followup += 1;
      break;
    default:
      bucket.otherStatus += 1;
      break;
  }
}

function finalizeAgentBreakdown(
  agents: Map<
    string,
    {
      agentId: string;
      agentName: string;
      totalLeads: number;
      won: number;
      lost: number;
    }
  >
): SourceAgentBreakdown[] {
  return Array.from(agents.values())
    .map((agent) => {
      const closedDeals = agent.won + agent.lost;
      return {
        agentId: agent.agentId,
        agentName: agent.agentName,
        totalLeads: agent.totalLeads,
        won: agent.won,
        lost: agent.lost,
        closedDeals,
        winRatio: computeWinRatio(agent.won, agent.lost),
      };
    })
    .sort((a, b) => b.totalLeads - a.totalLeads);
}

/**
 * Aggregate per-source win ratio metrics from lead snapshots.
 * Uses current lead status within the filtered cohort (created/updated date).
 */
export function calculateSourceWinAnalysis(leads: SourceWinLeadInput[]): SourceWinAnalysisResult {
  const buckets = new Map<string, MutableSourceBucket>();
  const totalLeads = leads.length;

  for (const lead of leads) {
    const source = normalizeSourceForAnalytics(lead.source);
    let bucket = buckets.get(source);

    if (!bucket) {
      bucket = {
        source,
        totalLeads: 0,
        won: 0,
        lost: 0,
        unqualified: 0,
        unreach: 0,
        newLeads: 0,
        followup: 0,
        otherStatus: 0,
        callAttemptsSum: 0,
        inboundCount: 0,
        outboundCount: 0,
        agents: new Map(),
      };
      buckets.set(source, bucket);
    }

    bucket.totalLeads += 1;
    bucket.callAttemptsSum += lead.callAttempts || 0;
    incrementStatus(bucket, lead.status);

    const category = lead.lead_category?.toUpperCase();
    if (category === 'INBOUND') {
      bucket.inboundCount += 1;
    } else if (category === 'OUTBOUND') {
      bucket.outboundCount += 1;
    }

    const agentId = lead.assignedToId || 'unassigned';
    const agentName = lead.agentName || 'Unassigned';
    let agentBucket = bucket.agents.get(agentId);

    if (!agentBucket) {
      agentBucket = {
        agentId,
        agentName,
        totalLeads: 0,
        won: 0,
        lost: 0,
      };
      bucket.agents.set(agentId, agentBucket);
    }

    agentBucket.totalLeads += 1;
    if (lead.status === 'won') agentBucket.won += 1;
    if (lead.status === 'lost') agentBucket.lost += 1;
  }

  const sources: SourceWinAnalysisRow[] = Array.from(buckets.values())
    .map((bucket) => {
      const closedDeals = bucket.won + bucket.lost;
      const winRatio = computeWinRatio(bucket.won, bucket.lost);
      const conversionRate =
        bucket.totalLeads > 0 ? round2((bucket.won / bucket.totalLeads) * 100) : 0;
      const volumeShare =
        totalLeads > 0 ? round2((bucket.totalLeads / totalLeads) * 100) : 0;
      const avgCallAttempts =
        bucket.totalLeads > 0
          ? round2(bucket.callAttemptsSum / bucket.totalLeads)
          : 0;

      return {
        source: bucket.source,
        totalLeads: bucket.totalLeads,
        won: bucket.won,
        lost: bucket.lost,
        unqualified: bucket.unqualified,
        unreach: bucket.unreach,
        newLeads: bucket.newLeads,
        followup: bucket.followup,
        otherStatus: bucket.otherStatus,
        closedDeals,
        winRatio,
        conversionRate,
        avgCallAttempts,
        inboundCount: bucket.inboundCount,
        outboundCount: bucket.outboundCount,
        volumeShare,
        confidence: closedDeals >= MIN_CLOSED_DEALS_FOR_HIGH_CONFIDENCE ? 'high' : 'low',
        agents: finalizeAgentBreakdown(bucket.agents),
      };
    })
    .sort((a, b) => b.totalLeads - a.totalLeads);

  const totalWon = sources.reduce((sum, row) => sum + row.won, 0);
  const totalLost = sources.reduce((sum, row) => sum + row.lost, 0);
  const overallWinRatio = computeWinRatio(totalWon, totalLost);
  const overallConversionRate =
    totalLeads > 0 ? round2((totalWon / totalLeads) * 100) : 0;

  const rankedByWinRatio = sources
    .filter((row) => row.closedDeals >= MIN_CLOSED_DEALS_FOR_HIGH_CONFIDENCE && row.winRatio !== null)
    .sort((a, b) => (b.winRatio ?? 0) - (a.winRatio ?? 0));

  const bestWinRatio = rankedByWinRatio[0]
    ? {
        source: rankedByWinRatio[0].source,
        winRatio: rankedByWinRatio[0].winRatio as number,
        closedDeals: rankedByWinRatio[0].closedDeals,
      }
    : null;

  const highestVolume = sources[0]
    ? { source: sources[0].source, totalLeads: sources[0].totalLeads }
    : null;

  return {
    sources,
    summary: {
      overallWinRatio,
      overallConversionRate,
      totalLeads,
      totalWon,
      totalLost,
      bestWinRatio,
      highestVolume,
    },
  };
}
