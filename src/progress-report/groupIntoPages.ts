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
        current.push({player, color: tier.color});

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
