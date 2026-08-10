import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/website-check", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POST /api/website-check", () => {
  it("returns a verified public result with booking signals", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          '<title>Clinic</title><a href="/appointments">Book appointment</a>',
          {
            status: 200,
            headers: { "content-type": "text/html; charset=utf-8" },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response("<title>Appointments</title>", {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      jsonRequest({ url: "https://clinic.example.com" }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: "verified",
      httpStatus: 200,
      https: true,
      bookingLinks: [
        { url: "https://clinic.example.com/appointments" },
      ],
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects a local target before fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      jsonRequest({ url: "https://127.0.0.1/" }),
    );

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns an actionable result for a non-html response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("PDF", {
          status: 200,
          headers: { "content-type": "application/pdf" },
        }),
      ),
    );

    const response = await POST(
      jsonRequest({ url: "https://clinic.example.com" }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "attention" });
  });

  it("revalidates a redirect before following it", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: "https://localhost/private" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      jsonRequest({ url: "https://clinic.example.com" }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "blocked" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
