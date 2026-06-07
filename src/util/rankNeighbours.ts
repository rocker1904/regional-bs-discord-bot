import scoreSaber from './scoreSaber';
import type {PlayerListing, PlayerCollection, PlayersListQuery} from 'scoresaber.js';

/** The slice of the players API that rankNeighbours needs — injectable so tests can fake it. */
export type PlayerLookup = {
    listPage(opts: PlayersListQuery): Promise<PlayerCollection>;
    atRank(rank: number, opts: Omit<PlayersListQuery, 'page' | 'limit'>): Promise<PlayerListing>;
};

/**
 * Fetches the players ranked immediately above and below a given rank.
 *
 * The pair almost always lives on the same page as the target, so this does a
 * single page request and reads the neighbours out of it — only falling back to
 * an extra `atRank` call when the target sits on a page boundary. `rank` is the
 * global rank for an unfiltered list, or the position within the filtered list
 * when `countries` is supplied (which equals the country rank for a single
 * country).
 */
export default async function rankNeighbours(
    rank: number,
    opts: {countries?: string} = {},
    players: PlayerLookup = scoreSaber.players,
): Promise<{above?: PlayerListing; below?: PlayerListing}> {
    const limit = 50;
    const page = Math.ceil(rank / limit);
    const sortedOpts = {...opts, sort: 'rank', sortDirection: 'asc'} as const;
    const env = await players.listPage({...sortedOpts, page, limit});
    const idx = (rank - 1) % limit;

    const above: PlayerListing | undefined =
        idx > 0 ? env.data[idx - 1] : rank > 1 ? await players.atRank(rank - 1, sortedOpts) : undefined;

    const below: PlayerListing | undefined = env.data[idx + 1] ?? (await players.atRank(rank + 1, sortedOpts).catch(() => undefined));

    return {above, below};
}
