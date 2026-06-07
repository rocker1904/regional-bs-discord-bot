/**
 * The first rank group whose threshold covers `rank`, or `undefined` if the rank
 * is beyond every bracket. Assumes `rankGroups` is sorted ascending by `rank`
 * (RoleUpdater sorts them once on construction).
 */
export default function selectRankGroup(rank: number, rankGroups: RankGroup[]): RankGroup | undefined {
    for (const rankGroup of rankGroups) {
        if (rankGroup.rank >= rank) return rankGroup;
    }
    return undefined;
}
