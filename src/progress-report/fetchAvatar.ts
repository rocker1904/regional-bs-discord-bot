const ALLOWED_HOST = 'cdn.scoresaber.com';
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const DEFAULT_TIMEOUT_MS = 5000;

export interface FetchAvatarOptions {
    fetchImpl?: typeof fetch;
    maxBytes?: number;
    timeoutMs?: number;
}

/**
 * Fetch a player avatar as a Buffer, hardened against the remote-image attack surface:
 * only https on the single ScoreSaber CDN host, a request timeout, and a hard size cap
 * enforced both via content-length and a streamed byte count (so a missing/lying header
 * can't bypass it). Returns null on any problem; the caller renders a placeholder instead.
 * The caller passes the returned Buffer to canvas — canvas never sees the URL.
 */
export default async function fetchAvatar(url: string, opts: FetchAvatarOptions = {}): Promise<Buffer | null> {
    const fetchImpl = opts.fetchImpl ?? globalThis.fetch;
    const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return null;
    }
    if (parsed.protocol !== 'https:' || parsed.hostname !== ALLOWED_HOST) return null;

    try {
        // redirect: 'manual' so a 30x off the allowlisted host is never followed — the host
        // check above only covers the initial URL. A redirect surfaces as !res.ok → null.
        const res = await fetchImpl(url, {signal: AbortSignal.timeout(timeoutMs), redirect: 'manual'});
        if (!res.ok) return null;

        const declared = Number(res.headers.get('content-length'));
        if (Number.isFinite(declared) && declared > maxBytes) {
            await res.body?.cancel();
            return null;
        }

        if (res.body === null) {
            const buf = Buffer.from(await res.arrayBuffer());
            return buf.length > maxBytes ? null : buf;
        }

        const reader = res.body.getReader();
        const chunks: Uint8Array[] = [];
        let total = 0;
        for (;;) {
            const {done, value} = await reader.read();
            if (done) break;
            total += value.byteLength;
            if (total > maxBytes) {
                await reader.cancel();
                return null;
            }
            chunks.push(value);
        }
        return Buffer.concat(chunks);
    } catch {
        // Any failure (timeout, network, decode) → no avatar; the caller draws a placeholder.
        return null;
    }
}
