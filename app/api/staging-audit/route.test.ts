import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/staging-audit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POST /api/staging-audit", () => {
  it("runs supported scenarios against a test-only adapter", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            contractVersion: 1,
            supports: ["race", "timezone"],
            testOnly: true,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: "verified",
            scenarios: [
              { id: "race", status: "passed", evidence: "Conflict returned." },
            ],
            secret: "must not escape",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      jsonRequest({
        baseUrl: "https://staging.example.com",
        token: "temporary-token",
        scenarios: ["race", "timezone", "unknown"],
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: "verified",
      scenarios: [
        { id: "race", status: "passed", evidence: "Conflict returned." },
        { id: "timezone", status: "not-tested", evidence: "No result returned." },
      ],
    });

    const [, runInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(runInit.headers).toEqual({
      accept: "application/json",
      authorization: "Bearer temporary-token",
      "content-type": "application/json",
    });
    expect(JSON.parse(String(runInit.body))).toMatchObject({
      mode: "synthetic",
      scenarios: ["race", "timezone"],
    });
    expect(String(runInit.body)).not.toContain("temporary-token");
  });

  it("rejects a local staging target before fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      jsonRequest({
        baseUrl: "https://127.0.0.1",
        token: "temporary-token",
        scenarios: ["race"],
      }),
    );

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("stops when the manifest is not explicitly test-only", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            contractVersion: 1,
            supports: ["race"],
            testOnly: false,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const response = await POST(
      jsonRequest({
        baseUrl: "https://staging.example.com",
        token: "temporary-token",
        scenarios: ["race"],
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: "attention",
      message: /test-only manifest/i,
    });
  });

  it("turns an adapter timeout into a safe attention result", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const response = await POST(
      jsonRequest({
        baseUrl: "https://staging.example.com",
        token: "temporary-token",
        scenarios: ["race"],
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: "attention",
      scenarios: [
        { id: "race", status: "not-tested" },
      ],
    });
  });
});
