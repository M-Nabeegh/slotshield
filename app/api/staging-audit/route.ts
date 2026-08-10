import { validatePublicUrl } from "../../lib/websiteAudit";
import {
  isScenarioId,
  normalizeStagingManifest,
  normalizeStagingResult,
  type ScenarioId,
} from "../../lib/stagingContract";

const REQUEST_TIMEOUT_MS = 5_000;
const MAX_RESPONSE_BYTES = 128 * 1024;
const MAX_REDIRECTS = 2;

type JsonResponse = {
  response: Response;
  data: unknown;
};

export async function POST(request: Request): Promise<Response> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { status: "attention", message: "Send the staging URL, token, and scenarios as JSON." },
      { status: 400 },
    );
  }

  const input = readInput(payload);
  if (!input) {
    return Response.json(
      {
        status: "attention",
        message: "Add a staging HTTPS URL and a temporary test token.",
      },
      { status: 400 },
    );
  }

  const validation = validatePublicUrl(input.baseUrl);
  if (!validation.ok) {
    return Response.json(
      { status: "attention", message: validation.message },
      { status: 400 },
    );
  }

  try {
    const origin = new URL(validation.url).origin;
    const manifest = await fetchJson(
      adapterEndpoint(validation.url, "slotshield-test.json"),
      input.token,
      origin,
    );
    const normalizedManifest = normalizeStagingManifest(manifest.data);

    if (!normalizedManifest) {
      return Response.json({
        ...normalizeStagingResult({}, input.scenarios),
        message: "The staging system must provide a version-one test-only manifest.",
      });
    }

    const supportedScenarios = input.scenarios.filter((id) =>
      normalizedManifest.supports.includes(id),
    );

    if (supportedScenarios.length === 0) {
      return Response.json({
        ...normalizeStagingResult({}, input.scenarios),
        message: "The staging adapter does not support any selected SlotShield scenarios.",
      });
    }

    const run = await fetchJson(
      adapterEndpoint(validation.url, "slotshield-test/run"),
      input.token,
      origin,
      {
        method: "POST",
        body: JSON.stringify({
          mode: "synthetic",
          scenarios: supportedScenarios,
          testNamespace: `slotshield-${crypto.randomUUID()}`,
        }),
      },
    );

    return Response.json({
      ...normalizeStagingResult(run.data, input.scenarios),
      message: "Staging adapter completed with synthetic test data.",
    });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "The staging adapter could not be reached safely.";
    return Response.json({
      ...normalizeStagingResult({}, input.scenarios),
      message: message || "The staging adapter could not be reached safely.",
    });
  }
}

function readInput(value: unknown): {
  baseUrl: string;
  token: string;
  scenarios: ScenarioId[];
} | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const candidate = value as {
    baseUrl?: unknown;
    token?: unknown;
    scenarios?: unknown;
  };
  if (
    typeof candidate.baseUrl !== "string" ||
    typeof candidate.token !== "string" ||
    !candidate.token.trim() ||
    candidate.token.length > 256 ||
    /[\r\n]/.test(candidate.token) ||
    !Array.isArray(candidate.scenarios)
  ) {
    return null;
  }

  const scenarios = candidate.scenarios.filter(isScenarioId).filter(
    (id, index, all) => all.indexOf(id) === index,
  );
  return scenarios.length > 0
    ? { baseUrl: candidate.baseUrl, token: candidate.token, scenarios }
    : null;
}

async function fetchJson(
  targetUrl: string,
  token: string,
  origin: string,
  init: RequestInit = {},
  redirects = 0,
): Promise<JsonResponse> {
  const validation = validatePublicUrl(targetUrl);
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const targetOrigin = new URL(validation.url).origin;
  if (targetOrigin !== origin) {
    throw new Error("The staging adapter redirected to a different host.");
  }

  if (redirects > MAX_REDIRECTS) {
    throw new Error("The staging adapter redirected too many times.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(validation.url, {
      ...init,
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        ...(init.headers ?? {}),
      },
      redirect: "manual",
      signal: controller.signal,
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new Error("The staging adapter returned a redirect without a destination.");
      }
      return fetchJson(
        new URL(location, validation.url).toString(),
        token,
        origin,
        init,
        redirects + 1,
      );
    }

    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
      throw new Error("The staging adapter response is too large to inspect safely.");
    }

    const body = await response.text();
    if (body.length > MAX_RESPONSE_BYTES) {
      throw new Error("The staging adapter response is too large to inspect safely.");
    }

    let data: unknown;
    try {
      data = JSON.parse(body);
    } catch {
      throw new Error("The staging adapter did not return JSON.");
    }

    if (!response.ok) {
      throw new Error(`The staging adapter returned HTTP ${response.status}.`);
    }

    return { response, data };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("The staging adapter took too long to respond.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function adapterEndpoint(baseUrl: string, path: string): string {
  const url = new URL(baseUrl);
  url.pathname = `/.well-known/${path}`;
  url.search = "";
  url.hash = "";
  return url.toString();
}
