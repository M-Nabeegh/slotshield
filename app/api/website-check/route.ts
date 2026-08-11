import {
  extractPageSignals,
  makeWebsiteFindings,
  validatePublicUrl,
  type BookingLink,
  type WebsiteCheckResult,
} from "../../lib/websiteAudit";

const MAX_REDIRECTS = 2;
const MAX_DISCOVERY_PAGES = 3;
const MAX_RESPONSE_BYTES = 128 * 1024;
const REQUEST_TIMEOUT_MS = 5_000;

type PageResponse = {
  response: Response;
  finalUrl: string;
  body: string;
};

class BlockedPageError extends Error {}

export async function POST(request: Request): Promise<Response> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "Send a JSON object with a website URL.");
  }

  const requestedUrl =
    typeof payload === "object" && payload !== null && "url" in payload
      ? (payload as { url?: unknown }).url
      : undefined;

  if (typeof requestedUrl !== "string") {
    return jsonError(400, "Add the public HTTPS address for your website.");
  }

  const validation = validatePublicUrl(requestedUrl);
  if (!validation.ok) {
    return Response.json(
      {
        status: "blocked",
        code: validation.code,
        message: validation.message,
      },
      { status: 400 },
    );
  }

  const startedAt = Date.now();
  const visited = new Set<string>();

  try {
    const firstPage = await fetchPublicPage(validation.url, visited, 0);
    const firstContentType = firstPage.response.headers.get("content-type");
    const firstIsHtml = isHtml(firstContentType);
    const firstSignals = firstIsHtml
      ? extractPageSignals(firstPage.body, firstPage.finalUrl)
      : { title: null, bookingLinks: [] as BookingLink[] };
    const bookingLinks = [...firstSignals.bookingLinks];

    for (const bookingLink of firstSignals.bookingLinks) {
      if (visited.size >= MAX_DISCOVERY_PAGES) {
        break;
      }

      try {
        const linkedPage = await fetchPublicPage(bookingLink.url, visited, 0);
        if (!isHtml(linkedPage.response.headers.get("content-type"))) {
          continue;
        }

        const linkedSignals = extractPageSignals(
          linkedPage.body,
          linkedPage.finalUrl,
        );
        for (const discoveredLink of linkedSignals.bookingLinks) {
          if (
            !bookingLinks.some((existingLink) => existingLink.url === discoveredLink.url) &&
            bookingLinks.length < 3
          ) {
            bookingLinks.push(discoveredLink);
          }
        }
      } catch {
        // The homepage result remains useful when an optional linked page is unavailable.
      }
    }

    const responseTimeMs = Date.now() - startedAt;
    const finalUrl = firstPage.finalUrl;
    const result: WebsiteCheckResult = {
      status:
        firstPage.response.status >= 200 &&
        firstPage.response.status < 400 &&
        firstIsHtml
          ? "verified"
          : "attention",
      requestedUrl: validation.url,
      finalUrl,
      httpStatus: firstPage.response.status,
      responseTimeMs,
      https: finalUrl.startsWith("https://"),
      pageTitle: firstSignals.title,
      contentType: firstContentType,
      bookingLinks,
      findings: makeWebsiteFindings({
        httpStatus: firstPage.response.status,
        responseTimeMs,
        https: finalUrl.startsWith("https://"),
        contentType: firstContentType,
        bookingLinks,
      }),
      message: firstIsHtml
        ? bookingLinks.length > 0
          ? "Public surface verified. A booking-related page was found."
          : "Public surface verified. No obvious booking link was found on the inspected page.":
        "The address responded, but it did not return an HTML page SlotShield can inspect.",
    };

    return Response.json(result);
  } catch (error) {
    const message =
      error instanceof BlockedPageError
        ? error.message
        : "SlotShield could not safely inspect that website right now.";
    return Response.json(
      blockedResult(validation.url, message, Date.now() - startedAt),
    );
  }
}

async function fetchPublicPage(
  targetUrl: string,
  visited: Set<string>,
  redirects: number,
): Promise<PageResponse> {
  const validation = validatePublicUrl(targetUrl);
  if (!validation.ok) {
    throw new BlockedPageError(validation.message);
  }

  if (visited.has(validation.url)) {
    throw new BlockedPageError("The website points back to a page already inspected.");
  }

  if (redirects > MAX_REDIRECTS) {
    throw new BlockedPageError("The website redirected too many times to inspect safely.");
  }

  visited.add(validation.url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(validation.url, {
      headers: {
        accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
      },
      redirect: "manual",
      signal: controller.signal,
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new BlockedPageError("The website returned a redirect without a destination.");
      }

      const redirectUrl = new URL(location, validation.url).toString();
      return fetchPublicPage(redirectUrl, visited, redirects + 1);
    }

    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
      throw new BlockedPageError("The page is larger than SlotShield can inspect safely.");
    }

    const body = await readBoundedText(response);
    return { response, finalUrl: validation.url, body };
  } catch (error) {
    if (error instanceof BlockedPageError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new BlockedPageError("The website took too long to respond.");
    }

    throw new BlockedPageError("The website could not be reached from the public checker.");
  } finally {
    clearTimeout(timeout);
  }
}

async function readBoundedText(response: Response): Promise<string> {
  if (!response.body) {
    return (await response.text()).slice(0, MAX_RESPONSE_BYTES);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (totalBytes < MAX_RESPONSE_BYTES) {
    const { done, value } = await reader.read();
    if (done || !value) {
      break;
    }

    const remaining = MAX_RESPONSE_BYTES - totalBytes;
    const chunk = value.byteLength > remaining ? value.slice(0, remaining) : value;
    chunks.push(chunk);
    totalBytes += chunk.byteLength;

    if (chunk.byteLength < value.byteLength) {
      await reader.cancel();
      break;
    }
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(bytes);
}

function isHtml(contentType: string | null): boolean {
  return contentType?.toLowerCase().includes("text/html") ?? false;
}

function blockedResult(
  requestedUrl: string,
  message: string,
  responseTimeMs: number,
): WebsiteCheckResult {
  return {
    status: "blocked",
    requestedUrl,
    finalUrl: null,
    httpStatus: null,
    responseTimeMs,
    https: true,
    pageTitle: null,
    contentType: null,
    bookingLinks: [],
    findings: makeWebsiteFindings({
      httpStatus: null,
      responseTimeMs,
      https: true,
      contentType: null,
      bookingLinks: [],
    }),
    message,
  };
}

function jsonError(status: number, message: string): Response {
  return Response.json(
    { status: "blocked", message },
    { status },
  );
}
