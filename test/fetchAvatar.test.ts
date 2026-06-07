import {test} from 'node:test';
import assert from 'node:assert/strict';
import fetchAvatar from '../src/progress-report/fetchAvatar';

const OK_URL = 'https://cdn.scoresaber.com/avatars/123.jpg';

test('rejects a non-allowlisted host without fetching', async () => {
    let called = false;
    const fetchImpl = (async () => {
        called = true;
        return new Response(new Uint8Array(4));
    }) as unknown as typeof fetch;
    const out = await fetchAvatar('https://evil.example.com/a.jpg', {fetchImpl});
    assert.equal(out, null);
    assert.equal(called, false);
});

test('rejects a non-https url', async () => {
    const out = await fetchAvatar('http://cdn.scoresaber.com/a.jpg', {
        fetchImpl: (async () => new Response(new Uint8Array(4))) as unknown as typeof fetch,
    });
    assert.equal(out, null);
});

test('returns a Buffer for an allowlisted host', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    const fetchImpl = (async () => new Response(bytes)) as unknown as typeof fetch;
    const out = await fetchAvatar(OK_URL, {fetchImpl});
    assert.ok(Buffer.isBuffer(out));
    assert.equal(out?.length, 5);
});

test('rejects via content-length over the cap', async () => {
    const fetchImpl = (async () =>
        new Response(new Uint8Array(10), {headers: {'content-length': String(10_000_000)}})) as unknown as typeof fetch;
    const out = await fetchAvatar(OK_URL, {fetchImpl, maxBytes: 1000});
    assert.equal(out, null);
});

test('rejects when the streamed body exceeds the cap even if content-length is absent', async () => {
    const fetchImpl = (async () => new Response(new Uint8Array(5000))) as unknown as typeof fetch;
    const out = await fetchAvatar(OK_URL, {fetchImpl, maxBytes: 1000});
    assert.equal(out, null);
});

test('asks fetch not to follow redirects (redirect: manual)', async () => {
    let opts: RequestInit | undefined;
    const fetchImpl = (async (_url: string, o: RequestInit) => {
        opts = o;
        return new Response(new Uint8Array([1, 2, 3]));
    }) as unknown as typeof fetch;
    await fetchAvatar(OK_URL, {fetchImpl});
    assert.equal(opts?.redirect, 'manual');
});

test('returns null on a redirect response instead of following it off-host', async () => {
    const fetchImpl = (async () =>
        new Response('moved', {status: 302, headers: {location: 'https://evil.example.com/x'}})) as unknown as typeof fetch;
    const out = await fetchAvatar(OK_URL, {fetchImpl});
    assert.equal(out, null);
});

test('returns null on fetch error', async () => {
    const fetchImpl = (async () => {
        throw new Error('boom');
    }) as unknown as typeof fetch;
    const out = await fetchAvatar(OK_URL, {fetchImpl});
    assert.equal(out, null);
});
