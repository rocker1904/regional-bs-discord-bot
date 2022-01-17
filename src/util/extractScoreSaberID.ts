/**
 * @param {string} scoreSaber A ScoreSaber ID or profile link
 * @return {string | null} The ScoreSaber ID or null if not given a valid ID/profile
 */
export default function extractScoreSaberID(scoreSaber: string): string | null {
    // Test if given an ID
    if (isValidScoreSaberID(scoreSaber)) {
        return scoreSaber;
    }

    // If not, see if argument is of form */u/ID*
    const startOfID = scoreSaber.indexOf('/u/');
    if (startOfID !== -1) {
        scoreSaber = scoreSaber.slice(startOfID + 3);
    } else {
        return null;
    }

    // The ID will be followed by either ?, &, or / (or nothing)
    // Slice to the index of the first character found (or leave the string as it is)
    const endOfID = scoreSaber.search(/[?&/]/);
    if (endOfID !== -1) {
        scoreSaber = scoreSaber.slice(0, endOfID);
    }

    // Slice to the first ? or & if one was found
    if (endOfID !== -1) {
        scoreSaber = scoreSaber.slice(0, endOfID);
    }

    return isValidScoreSaberID(scoreSaber) ? scoreSaber : null;
}

function isValidScoreSaberID(ID: string): boolean {
    return !(isNaN(parseInt(ID)) || ID.length < 15 || ID.length > 17);
}
