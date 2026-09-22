import * as assert from "node:assert";
import { test } from "node:test";

import { serviceRequest } from "../../src/common/httpClient";

type HeaderMap = Record<string, string> | undefined;

test("serviceRequest passes explicit headers through unchanged", async () => {
    const originalFetch = globalThis.fetch;

    let capturedHeaders: HeaderMap;
    globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
        capturedHeaders = init?.headers as HeaderMap;
        return new Response(null, { status: 200 });
    }) as typeof fetch;

    try {
        await serviceRequest("http://example.com/internal", {
            headers: {
                Authorization: "Bearer caller-token",
            },
        });
    } finally {
        globalThis.fetch = originalFetch;
    }

    assert.ok(capturedHeaders);
    assert.equal(capturedHeaders.Authorization, "Bearer caller-token");
});

test("serviceRequest omits headers when none are provided", async () => {
    const originalFetch = globalThis.fetch;

    let capturedHeaders: HeaderMap;
    globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
        capturedHeaders = init?.headers as HeaderMap;
        return new Response(null, { status: 200 });
    }) as typeof fetch;

    try {
        await serviceRequest("http://example.com/public");
    } finally {
        globalThis.fetch = originalFetch;
    }

    assert.equal(capturedHeaders, undefined);
});