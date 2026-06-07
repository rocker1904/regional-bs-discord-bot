import {createCanvas, loadImage, GlobalFonts, type Image, type SKRSContext2D} from '@napi-rs/canvas';
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import type {PlayerPage} from './groupIntoPages';

// Bundled font for deterministic rendering on the Linux host. Guarded so a missing asset
// degrades to the canvas default rather than crashing at module load. Copied into build/
// by the `build` script (tsc doesn't copy non-.ts assets).
const FONT_PATH = join(__dirname, 'assets', 'DejaVuSans.ttf');
const FONT = existsSync(FONT_PATH) && GlobalFonts.registerFromPath(FONT_PATH, 'ProgressFont') ? 'ProgressFont' : 'sans-serif';

const SIZE = 700;
const PADDING = 10;

function formatPp(pp: number): string {
    return pp.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + 'pp';
}

/** Truncate `text` with an ellipsis so it fits within `maxWidth` for the current ctx font. */
function truncateToWidth(ctx: SKRSContext2D, text: string, maxWidth: number): string {
    if (maxWidth <= 0 || ctx.measureText(text).width <= maxWidth) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1);
    return t + '…';
}

/**
 * Render one page (a tier's slice) to a PNG Buffer. `avatars[i]` is the already-fetched,
 * size-bounded image bytes for row `i` (or null to draw a placeholder circle). Decoding
 * happens here via loadImage(Buffer) — no network I/O.
 */
export default async function renderPage(page: PlayerPage, avatars: (Buffer | null)[]): Promise<Buffer> {
    const rowHeight = (SIZE - PADDING * 2) / page.length;
    const fontSize = Math.max(20, Math.min(40, rowHeight / 2));

    const canvas = createCanvas(SIZE, SIZE);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#2b2d31';
    ctx.fillRect(0, 0, SIZE, SIZE);

    for (let i = 0; i < page.length; i++) {
        const {player, color} = page[i];
        const y = PADDING + rowHeight * i;
        const textY = y + rowHeight / 2;

        if (player.stats.countryRank % 2 === 0) {
            ctx.fillStyle = '#00000022';
            ctx.fillRect(PADDING, y, SIZE - PADDING * 2, rowHeight);
        }

        ctx.font = `bold ${fontSize}px ${FONT}`;
        ctx.textBaseline = 'middle';

        // Country rank (right-aligned within a fixed gutter)
        ctx.textAlign = 'right';
        ctx.fillStyle = 'white';
        const rankX = PADDING + ctx.measureText('999').width;
        ctx.fillText(String(player.stats.countryRank), rankX, textY);

        // Avatar (circular) or placeholder
        const avatarX = rankX + PADDING * 2;
        const avatarD = rowHeight;
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarX + avatarD / 2, y + avatarD / 2, avatarD / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        const bytes = avatars[i];
        let img: Image | undefined;
        if (bytes) {
            try {
                img = await loadImage(bytes);
            } catch {
                img = undefined;
            }
        }
        if (img) {
            ctx.drawImage(img, avatarX, y, avatarD, avatarD);
        } else {
            ctx.fillStyle = '#4e5058';
            ctx.fillRect(avatarX, y, avatarD, avatarD);
        }
        ctx.restore();

        // PP (right-aligned) — measured first so the name can be clipped to avoid overlap.
        const ppText = formatPp(player.stats.totalPP);
        const ppLeft = SIZE - PADDING - ctx.measureText(ppText).width;

        // Name (role colour), truncated so it never runs into the PP column.
        const nameX = avatarX + avatarD + PADDING * 2;
        ctx.textAlign = 'start';
        ctx.fillStyle = color;
        ctx.fillText(truncateToWidth(ctx, player.name, ppLeft - PADDING - nameX), nameX, textY);

        ctx.textAlign = 'right';
        ctx.fillStyle = 'white';
        ctx.fillText(ppText, SIZE - PADDING, textY);
    }

    return canvas.encode('png');
}
