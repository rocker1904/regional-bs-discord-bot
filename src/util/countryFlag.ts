/** Turns a 2-letter ISO country code into its flag emoji (e.g. "GB" -> 🇬🇧). Empty string for anything else. */
export default function countryFlag(code: string): string {
    if (!/^[a-zA-Z]{2}$/.test(code)) return '';
    return code.toUpperCase().replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}
