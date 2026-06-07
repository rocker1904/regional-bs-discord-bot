import type {PlayerListing} from 'scoresaber.js';

/** A rank-group tier: players with countryRank up to `rank` belong here; `color` is its role colour. */
export interface RankTier {
    rank: number;
    color: string;
}

export interface PlayerRow {
    player: PlayerListing;
    color: string;
}

export type PlayerPage = PlayerRow[];

const MIN_PER_PAGE = 10;
const MAX_PER_PAGE = 25;

// Players ranked beyond every rank-group hold no region rank role, so they get this neutral
// name colour rather than borrowing the last tier's role colour.
export const DEFAULT_TIER_COLOR = '#ffffff';

/** First tier whose threshold covers `rank` (selectRankGroup semantics), else the neutral default. */
function colorForRank(rank: number, tiers: RankTier[]): string {
    for (const tier of tiers) if (tier.rank >= rank) return tier.color;
    return DEFAULT_TIER_COLOR;
}

/**
 * Group players (pre-sorted ascending by countryRank) into pages, starting a new page when
 * the player's countryRank crosses the current tier boundary (if the page already has at
 * least MIN_PER_PAGE), or when the page reaches MAX_PER_PAGE. Each row is coloured by the
 * tier it falls in. The final partial page is always kept.
 *
 * Ports community PR #3's tiering, fixing two latent bugs: it indexed past the last tier
 * (crash on more players than tiers) and dropped the final partial page.
 */
export default function groupIntoPages(players: PlayerListing[], tiers: RankTier[]): PlayerPage[] {
    if (tiers.length === 0) return [];
    const pages: PlayerPage[] = [];
    let current: PlayerPage = [];
    let tierIndex = 0;

    for (const player of players) {
        const tier = tiers[tierIndex];
        // Colour by the tier that actually covers this rank (independent of the page-split
        // cursor below, which assumes dense ranks); out-of-bracket players get the default.
        current.push({player, color: colorForRank(player.stats.countryRank, tiers)});

        let pageReady = false;
        if (player.stats.countryRank >= tier.rank && tierIndex < tiers.length - 1) {
            tierIndex += 1;
            if (current.length >= MIN_PER_PAGE) pageReady = true;
        } else if (current.length >= MAX_PER_PAGE) {
            pageReady = true;
        }

        if (pageReady) {
            pages.push(current);
            current = [];
        }
    }
    if (current.length > 0) pages.push(current);
    return pages;
}
