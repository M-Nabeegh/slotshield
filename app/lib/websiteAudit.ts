export type WebsiteCheckErrorCode =
  | "invalid-url"
  | "unsupported-scheme"
  | "unsafe-url";

export type WebsiteFindingStatus = "passed" | "attention" | "not-checked";

export interface WebsiteFinding {
  id: "reachability" | "https" | "response-time" | "content" | "booking-surface";
  label: string;
  status: WebsiteFindingStatus;
  detail: string;
}

export interface BookingLink {
  label: string;
  url: string;
}

export interface PageSignals {
  title: string | null;
  bookingLinks: BookingLink[];
}

export interface WebsiteCheckResult {
  status: "verified" | "attention" | "blocked";
  requestedUrl: string;
  finalUrl: string | null;
  httpStatus: number | null;
  responseTimeMs: number | null;
  https: boolean;
  pageTitle: string | null;
  contentType: string | null;
  bookingLinks: BookingLink[];
  findings: WebsiteFinding[];
  message: string;
}

export type PublicUrlValidation =
  | { ok: true; url: string }
  | { ok: false; code: WebsiteCheckErrorCode; message: string };

const BOOKING_WORDS = /\b(book|appointment|schedule|reserve|contact)\b/i;
const LOCAL_HOST_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".home.arpa",
  ".test",
  ".invalid",
  ".example",
  ".onion",
];
const LOCAL_HOSTNAMES = new Set(["localhost", "local", "internal"]);

export function validatePublicUrl(value: string): PublicUrlValidation {
  if (!value.trim()) {
    return {
      ok: false,
      code: "invalid-url",
      message: "Enter the public HTTPS address for your website.",
    };
  }

  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return {
      ok: false,
      code: "invalid-url",
      message: "That does not look like a complete website address.",
    };
  }

  if (url.protocol !== "https:") {
    return {
      ok: false,
      code: "unsupported-scheme",
      message: "Use an HTTPS website address so the check stays private in transit.",
    };
  }

  if (url.username || url.password) {
    return {
      ok: false,
      code: "unsafe-url",
      message: "Remove the username or password from the website address.",
    };
  }

  if (url.port && url.port !== "443") {
    return {
      ok: false,
      code: "unsafe-url",
      message: "Use the website's standard HTTPS address without a custom port.",
    };
  }

  if (!isSafePublicHostname(url.hostname)) {
    return {
      ok: false,
      code: "unsafe-url",
      message: "That address points to a local or restricted network target.",
    };
  }

  url.hash = "";
  if (!url.pathname) {
    url.pathname = "/";
  }

  return { ok: true, url: url.toString() };
}

export function isSafePublicUrl(value: string): boolean {
  return validatePublicUrl(value).ok;
}

export function extractPageSignals(html: string, baseUrl: string): PageSignals {
  const boundedHtml = html.slice(0, 131_072);
  const titleMatch = boundedHtml.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i);
  const title = titleMatch ? cleanText(titleMatch[1]) || null : null;
  const bookingLinks: BookingLink[] = [];
  const seenUrls = new Set<string>();
  const anchorPattern = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a\s*>/gi;

  for (const match of boundedHtml.matchAll(anchorPattern)) {
    if (bookingLinks.length >= 3) {
      break;
    }

    const rawHref = match[1]?.trim();
    if (!rawHref || rawHref.startsWith("#")) {
      continue;
    }

    let linkUrl: URL;
    let originUrl: URL;
    try {
      linkUrl = new URL(rawHref, baseUrl);
      originUrl = new URL(baseUrl);
    } catch {
      continue;
    }

    if (
      linkUrl.protocol !== "https:" ||
      linkUrl.origin !== originUrl.origin ||
      linkUrl.username ||
      linkUrl.password
    ) {
      continue;
    }

    const label = cleanText(stripTags(match[2] ?? ""));
    const signal = `${label} ${linkUrl.pathname}`;
    if (!BOOKING_WORDS.test(signal)) {
      continue;
    }

    linkUrl.hash = "";
    const normalizedUrl = linkUrl.toString();
    if (seenUrls.has(normalizedUrl)) {
      continue;
    }

    seenUrls.add(normalizedUrl);
    bookingLinks.push({
      label: label || linkUrl.pathname,
      url: normalizedUrl,
    });
  }

  return { title, bookingLinks };
}

export function makeWebsiteFindings(
  result: Pick<WebsiteCheckResult, "httpStatus" | "responseTimeMs" | "https" | "contentType" | "bookingLinks">,
): WebsiteFinding[] {
  const isHtml = result.contentType?.toLowerCase().includes("text/html") ?? false;
  const reachable = result.httpStatus !== null && result.httpStatus >= 200 && result.httpStatus < 400;
  const responseFast = result.responseTimeMs !== null && result.responseTimeMs <= 2_000;

  return [
    {
      id: "reachability",
      label: "Website reachable",
      status: reachable ? "passed" : "attention",
      detail: reachable
        ? `HTTP ${result.httpStatus}`
        : "The website did not return a successful page response.",
    },
    {
      id: "https",
      label: "HTTPS active",
      status: result.https ? "passed" : "attention",
      detail: result.https
        ? "The public check stays encrypted in transit."
        : "Use an HTTPS address before sharing booking links.",
    },
    {
      id: "response-time",
      label: "Response time",
      status: responseFast ? "passed" : "attention",
      detail:
        result.responseTimeMs === null
          ? "Response time was not available."
          : `${result.responseTimeMs} ms to first response.`,
    },
    {
      id: "content",
      label: "Readable booking page",
      status: isHtml ? "passed" : "attention",
      detail: isHtml
        ? "The response contains an HTML page SlotShield can inspect."
        : "The response is not an HTML page.",
    },
    {
      id: "booking-surface",
      label: "Booking surface found",
      status: result.bookingLinks.length > 0 ? "passed" : "not-checked",
      detail:
        result.bookingLinks.length > 0
          ? `${result.bookingLinks.length} booking-related page${result.bookingLinks.length === 1 ? "" : "s"} found.`
          : "No obvious booking link was found on the inspected page.",
    },
  ];
}

function isSafePublicHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    LOCAL_HOSTNAMES.has(normalized) ||
    LOCAL_HOST_SUFFIXES.some((suffix) => normalized.endsWith(suffix)) ||
    normalized.includes(":")
  ) {
    return false;
  }

  const octets = normalized.split(".");
  if (octets.length !== 4 || octets.some((octet) => !/^\d+$/.test(octet))) {
    return true;
  }

  const numbers = octets.map(Number);
  if (numbers.some((octet) => octet < 0 || octet > 255)) {
    return false;
  }

  const [first, second] = numbers;
  return !(
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19 || second === 51)) ||
    (first === 203 && second === 0 && numbers[2] === 113) ||
    first >= 224
  );
}

function stripTags(value: string): string {
  return value.replace(/<[^>]*>/g, " ");
}

function cleanText(value: string): string {
  return decodeEntities(value).replace(/\s+/g, " ").trim().slice(0, 160);
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}
