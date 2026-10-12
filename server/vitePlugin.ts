import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { handleStagingAudit } from "./stagingAudit";
import { handleWebsiteCheck } from "./websiteCheck";

const routes: Record<string, (request: Request) => Promise<Response>> = {
  "/api/website-check": handleWebsiteCheck,
  "/api/staging-audit": handleStagingAudit,
};

const MAX_BODY_BYTES = 16 * 1024;

/** Serves the two bounded API routes from the Vite dev and preview servers. */
export function slotshieldApi(): Plugin {
  const middleware = async (
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void,
  ) => {
    const path = req.url?.split("?")[0] ?? "";
    const handler = routes[path];
    if (!handler) {
      next();
      return;
    }

    if (req.method !== "POST") {
      res.statusCode = 405;
      res.setHeader("allow", "POST");
      res.end();
      return;
    }

    try {
      const body = await readBody(req);
      const request = new Request(`http://localhost${req.url}`, {
        method: "POST",
        headers: { "content-type": req.headers["content-type"] ?? "application/json" },
        body,
      });
      const response = await handler(request);
      res.statusCode = response.status;
      response.headers.forEach((value, key) => res.setHeader(key, value));
      res.setHeader("cache-control", "no-store");
      res.end(await response.text());
    } catch {
      res.statusCode = 413;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ status: "blocked", message: "The request body is too large." }));
    }
  };

  return {
    name: "slotshield-api",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.byteLength;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}
