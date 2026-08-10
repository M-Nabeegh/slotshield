import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the SlotShield SaaS observatory", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>SlotShield \| Booking Reliability Simulator<\/title>/i);
  assert.match(html, /Find the booking failures customers never see\./i);
  assert.match(html, /PUBLIC PREVIEW/i);
  assert.match(html, /No sign-in needed/i);
  assert.match(html, /Copy share link/i);
  assert.match(html, /How it works/i);
  assert.match(html, /Add your public link/i);
  assert.match(html, /Reliability lab \/ Booking flows/i);
  assert.match(html, /10:15/i);
  assert.match(html, /Double-booking race/i);
  assert.match(html, /Try this scenario/i);
  assert.match(html, /Public appointment URL/i);
  assert.match(html, /Check site/i);
  assert.match(html, /No sign-in\. Public HTTPS pages only/i);
  assert.match(html, /Designed and engineered by Muhammad Nabeegh/i);
  assert.doesNotMatch(html, /Your site is taking shape/i);
  assert.doesNotMatch(html, /codex-preview/i);
});
