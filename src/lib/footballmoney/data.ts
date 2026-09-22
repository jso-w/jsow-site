/**
 * Loads the prepared JSON files and derives everything the charts need.
 *
 * The heavy lifting (raw Transfermarkt exports -> these six files) happens
 * outside this repo; see the project README. Everything below is the last-mile
 * reshaping that used to live in the Quarto document's pandas blocks.
 */
import clubsRaw from '../../data/footballmoney/clubs_by_season.json';
import flowsRaw from '../../data/footballmoney/transfer_flows.json';
import recordsRaw from '../../data/footballmoney/record_transfers.json';
import topPlayersRaw from '../../data/footballmoney/top_players_by_league.json';
import standingsRaw from '../../data/footballmoney/standings.json';
import kpisRaw from '../../data/footballmoney/kpis.json';

import { SEASONS, TOP5, type League } from './config';

// ── row shapes ────────────────────────────────────────────────────────────
export interface ClubSeason {
  season: number;
  competition_id: League;
  club_id: number;
  name: string;
  total_market_value: number | null;
  net_transfer_record: number | null;
}
export interface Flow {
  season: number;
  from_league: League;
  to_league: League;
  fee_eur: number;
  n_transfers: number;
}
export interface RecordTransfer {
  transfer_season: string;
  season: number;
  player_name: string;
  from_club_name: string;
  to_club_name: string;
  from_league: string | null;
  to_league: string | null;
  transfer_fee: number;
}
export interface TopPlayerCount {
  season: number;
  competition_id: League;
  top_n: number;
  count: number;
}
export interface Standing {
  competition_id: League;
  season: number;
  club_id: number;
  club_name: string;
  pts: number;
  rank: number;
}
export interface Kpis {
  season_min: number;
  season_max: number;
  n_seasons: number;
  n_clubs: number;
  n_transfers_with_fee: number;
  total_fee_eur: number;
  cross_league_transfers: number;
  cross_league_fee_eur: number;
}

/** The pipeline wraps most files as { meta, data }; kpis is a bare object. */
function unwrap<T>(raw: unknown): T {
  const r = raw as { data?: unknown };
  return (r && typeof r === 'object' && 'data' in r ? r.data : raw) as T;
}

export const clubs = unwrap<ClubSeason[]>(clubsRaw);
export const flows = unwrap<Flow[]>(flowsRaw);
export const records = unwrap<RecordTransfer[]>(recordsRaw);
export const topPlayers = unwrap<TopPlayerCount[]>(topPlayersRaw);
export const standings = unwrap<Standing[]>(standingsRaw);
export const kpis = unwrap<Kpis>(kpisRaw);

// ── small helpers ─────────────────────────────────────────────────────────
const key = (lg: string, season: number) => `${lg}|${season}`;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

function groupBy<T, K extends string>(rows: T[], by: (r: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const r of rows) {
    const k = by(r);
    const bucket = m.get(k);
    if (bucket) bucket.push(r);
    else m.set(k, [r]);
  }
  return m;
}

/**
 * Pearson product-moment correlation. Returns null for degenerate input
 * (fewer than two points, or zero variance in either series).
 */
export function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 2 || ys.length !== n) return null;
  const mx = sum(xs) / n;
  const my = sum(ys) / n;
  let cov = 0;
  let vx = 0;
  let vy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i]! - mx;
    const dy = ys[i]! - my;
    cov += dx * dy;
    vx += dx * dx;
    vy += dy * dy;
  }
  if (vx === 0 || vy === 0) return null;
  return cov / Math.sqrt(vx * vy);
}

// ── squad market value per league per season, in € billions ───────────────
const mvByLeagueSeason = new Map<string, number>();
for (const r of clubs) {
  const k = key(r.competition_id, r.season);
  mvByLeagueSeason.set(k, (mvByLeagueSeason.get(k) ?? 0) + (r.total_market_value ?? 0));
}

/** mvBn[league][season] — squad market value in € bn. */
export const mvBn: Record<League, Record<number, number>> = Object.fromEntries(
  TOP5.map((lg) => [
    lg,
    Object.fromEntries(SEASONS.map((s) => [s, (mvByLeagueSeason.get(key(lg, s)) ?? 0) / 1e9])),
  ]),
) as Record<League, Record<number, number>>;

// ── cumulative net transfer balance per league, in € millions ─────────────
export const netCumulativeM: Record<League, number[]> = Object.fromEntries(
  TOP5.map((lg) => {
    let running = 0;
    const series = SEASONS.map((s) => {
      const seasonNet = sum(
        clubs
          .filter((r) => r.competition_id === lg && r.season === s)
          .map((r) => r.net_transfer_record ?? 0),
      );
      // round each season to 0.1M first, matching how the figures used to be built
      running += Math.round((seasonNet / 1e6) * 10) / 10;
      return Math.round(running * 10) / 10;
    });
    return [lg, series];
  }),
) as Record<League, number[]>;

// ── share of a league's squad value held by its four richest clubs ────────
export const top4Share: Record<League, (number | null)[]> = Object.fromEntries(
  TOP5.map((lg) => [
    lg,
    SEASONS.map((s) => {
      const vals = clubs
        .filter((r) => r.competition_id === lg && r.season === s)
        .map((r) => r.total_market_value ?? 0);
      const total = sum(vals);
      if (!total) return null;
      const top4 = sum([...vals].sort((a, b) => b - a).slice(0, 4));
      return (top4 / total) * 100;
    }),
  ]),
) as Record<League, (number | null)[]>;

// ── final table position joined with squad value ──────────────────────────
export interface ScatterRow extends Standing {
  total_market_value: number;
  mv_m: number;
}
const mvByClubSeason = new Map<string, number>();
for (const r of clubs) {
  mvByClubSeason.set(`${r.club_id}|${r.season}|${r.competition_id}`, r.total_market_value ?? 0);
}
export const scatter: ScatterRow[] = standings.flatMap((s) => {
  const mv = mvByClubSeason.get(`${s.club_id}|${s.season}|${s.competition_id}`);
  if (mv === undefined || mv <= 0) return [];
  return [{ ...s, total_market_value: mv, mv_m: mv / 1e6 }];
});

/**
 * Correlation between squad value and final position, per league per season.
 * Rank is negated so that a positive r means "more valuable squads finish
 * higher". Seasons with fewer than five clubs are skipped.
 */
export const correlation: Record<League, (number | null)[]> = Object.fromEntries(
  TOP5.map((lg) => {
    const bySeason = groupBy(
      scatter.filter((r) => r.competition_id === lg),
      (r) => String(r.season),
    );
    return [
      lg,
      SEASONS.map((s) => {
        const rows = bySeason.get(String(s)) ?? [];
        if (rows.length < 5) return null;
        const r = pearson(
          rows.map((x) => x.mv_m),
          rows.map((x) => -x.rank),
        );
        return r === null ? null : Math.round(r * 1000) / 1000;
      }),
    ];
  }),
) as Record<League, (number | null)[]>;

// ── treemap source: clubs per league per season, richest first ────────────
export const clubsBySeason: Map<number, Map<League, ClubSeason[]>> = (() => {
  const out = new Map<number, Map<League, ClubSeason[]>>();
  for (const s of SEASONS) {
    const perLeague = new Map<League, ClubSeason[]>();
    for (const lg of TOP5) {
      perLeague.set(
        lg,
        clubs
          .filter((r) => r.season === s && r.competition_id === lg)
          .sort((a, b) => (b.total_market_value ?? 0) - (a.total_market_value ?? 0)),
      );
    }
    out.set(s, perLeague);
  }
  return out;
})();

// ── sankey source: fee in € millions for every (seller, buyer) pair ───────
export const PAIRS: [League, League][] = TOP5.flatMap((s) =>
  TOP5.filter((t) => t !== s).map((t) => [s, t] as [League, League]),
);

const flowIndex = new Map<string, number>();
for (const f of flows) {
  const k = `${f.season}|${f.from_league}|${f.to_league}`;
  flowIndex.set(k, (flowIndex.get(k) ?? 0) + f.fee_eur);
}

/** Fee in € millions for one pair, for a single season or all of them. */
export function flowM(from: League, to: League, season?: number): number {
  const seasons = season === undefined ? SEASONS : [season];
  const total = sum(seasons.map((s) => flowIndex.get(`${s}|${from}|${to}`) ?? 0));
  return Math.round((total / 1e6) * 10) / 10;
}

// ── Premier League trade balance, used in the section III highlight ───────
export const plInflowBn: [League, number][] = TOP5.filter((lg) => lg !== 'GB1')
  .map((lg) => [lg, flowM(lg, 'GB1') / 1000] as [League, number])
  .sort((a, b) => b[1] - a[1]);
export const plInTotalBn = sum(plInflowBn.map(([, v]) => v));
export const plOutBn = sum(TOP5.filter((lg) => lg !== 'GB1').map((lg) => flowM('GB1', lg))) / 1000;
export const plNetBn = plInTotalBn - plOutBn;

// ── top-N player counts, indexed for the slider ───────────────────────────
const topPlayerIndex = new Map<string, number>();
for (const r of topPlayers) {
  topPlayerIndex.set(`${r.top_n}|${r.season}|${r.competition_id}`, r.count);
}
export function topNCounts(n: number, lg: League): number[] {
  return SEASONS.map((s) => topPlayerIndex.get(`${n}|${s}|${lg}`) ?? 0);
}

// ── record transfers, oldest first ────────────────────────────────────────
export const recordTransfers: RecordTransfer[] = [...records].sort((a, b) => a.season - b.season);
