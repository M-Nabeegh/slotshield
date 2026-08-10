import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import Home from "./page";
import { PUBLIC_PREVIEW_URL } from "./lib/publicPreview";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SlotShield dashboard", () => {
  it("updates the briefing when a visitor selects the expired hold scenario", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(
      screen.getByRole("button", { name: /expired payment hold/i }),
    );

    expect(
      screen.getByRole("heading", { name: "Expired payment hold" }),
    ).toBeVisible();
  });

  it("reveals a reliability report when a visitor runs a simulation", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: /try this scenario/i }));

    expect(
      screen.getByRole("heading", { name: "Reliability report" }),
    ).toBeVisible();
    expect(screen.getByText(/one patient holds the slot/i)).toBeVisible();
  });

  it("shows an account-free, read-only public preview", () => {
    render(<Home />);

    expect(screen.getByText(/public preview/i)).toBeVisible();
    expect(screen.getByText(PUBLIC_PREVIEW_URL)).toBeVisible();
    expect(screen.getByText(/no sign-in needed/i)).toBeVisible();
    expect(screen.getByText(/read-only check/i)).toBeVisible();
    expect(screen.getByText("Synthetic data", { exact: true })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /share link/i }),
    ).not.toBeInTheDocument();
  });

  it("presents the slot rail and a clear first-run scenario action", () => {
    render(<Home />);

    expect(screen.getByText("10:15", { exact: true })).toBeVisible();
    expect(
      screen.getByRole("button", { name: /try this scenario/i }),
    ).toBeVisible();
    expect(screen.getByText("Synthetic data", { exact: true })).toBeVisible();
  });

  it("keeps all four scenario modes selectable", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(
      screen.getByRole("button", { name: /time-zone mismatch/i }),
    );

    expect(
      screen.getByRole("heading", { name: "Time-zone mismatch" }),
    ).toBeVisible();
    expect(screen.getAllByRole("button", { pressed: true })).toHaveLength(1);
  });

  it("shows the deterministic trace and operational report after a run", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: /try this scenario/i }));

    expect(screen.getByRole("heading", { name: /simulation complete/i })).toBeVisible();
    expect(screen.getByText("TRACE / RACE")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Reliability report" })).toBeVisible();
    expect(
      screen.getByText(/enforce a unique active-slot constraint/i),
    ).toBeVisible();
  });

  it("keeps the rehearsal workbench named and focus-stable after a run", async () => {
    const user = userEvent.setup();
    render(<Home />);

    const runButton = screen.getByRole("button", { name: /run scenario/i });
    await user.click(runButton);

    expect(
      screen.getByRole("heading", {
        name: "Selected risk → event trace → protection → final state.",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("region", {
        name: "Selected risk → event trace → protection → final state.",
      }),
    ).toBeVisible();
    expect(runButton).toHaveFocus();
  });

  it("shows the public website check entry point", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: /find the booking failures/i }),
    ).toBeVisible();
    expect(
      screen.getByRole("textbox", { name: /public appointment url/i }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: /check site/i }),
    ).toBeVisible();
  });

  it("shows a verified public result and staging handoff", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: "verified",
            requestedUrl: "https://clinic.example.com/",
            finalUrl: "https://clinic.example.com/",
            httpStatus: 200,
            responseTimeMs: 220,
            https: true,
            pageTitle: "Clinic",
            contentType: "text/html",
            bookingLinks: [
              {
                label: "Book appointment",
                url: "https://clinic.example.com/appointments",
              },
            ],
            findings: [],
            message: "Public surface verified.",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const user = userEvent.setup();
    render(<Home />);
    await user.type(
      screen.getByRole("textbox", { name: /public appointment url/i }),
      "https://clinic.example.com",
    );
    await user.click(screen.getByRole("button", { name: /check site/i }));

    expect(
      await screen.findByRole("heading", { name: "Public surface verified" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: /audit a staging flow/i }),
    ).toBeVisible();
  });

  it("preserves focus while announcing a public result", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({
          status: "verified",
          requestedUrl: "https://clinic.example.com/",
          finalUrl: "https://clinic.example.com/",
          httpStatus: 200,
          responseTimeMs: 184,
          https: true,
          pageTitle: "Clinic",
          contentType: "text/html",
          bookingLinks: [],
          findings: [],
          message: "Public surface verified.",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
      ),
    );

    const user = userEvent.setup();
    render(<Home />);
    const input = screen.getByRole("textbox", { name: /public appointment url/i });
    const checkButton = screen.getByRole("button", { name: /check site/i });
    await user.type(input, "https://clinic.example.com");
    await user.click(checkButton);

    expect(
      await screen.findByRole("heading", { name: "Public surface verified" }),
    ).toBeVisible();
    expect(checkButton).toHaveFocus();
    expect(document.querySelector("#public-check-result")).toHaveAttribute(
      "aria-live",
      "polite",
    );
  });

  it("keeps a blocked URL actionable without exposing implementation details", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: "blocked",
            message: "Use an HTTPS website address.",
          }),
          { status: 400, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const user = userEvent.setup();
    render(<Home />);
    const input = screen.getByRole("textbox", { name: /public appointment url/i });
    await user.type(input, "http://clinic.example.com");
    await user.click(screen.getByRole("button", { name: /check site/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Use an HTTPS website address.");
    expect(input).toHaveValue("http://clinic.example.com");
    expect(alert).not.toHaveTextContent(/stack|trace|undefined/i);
  });

  it("explains a public check failure instead of hiding it", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const user = userEvent.setup();
    render(<Home />);
    await user.type(
      screen.getByRole("textbox", { name: /public appointment url/i }),
      "https://clinic.example.com",
    );
    await user.click(screen.getByRole("button", { name: /check site/i }));

    expect(await screen.findByText(/could not verify/i)).toBeVisible();
  });

  it("opens the staging-only setup and preserves the fake fallback", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(
      screen.getByRole("button", { name: /audit a staging flow/i }),
    );

    expect(
      screen.getByRole("textbox", { name: /staging url/i }),
    ).toBeVisible();
    expect(screen.getByLabelText(/temporary test token/i)).toBeVisible();
    expect(
      screen.getByRole("button", { name: /try a fake scenario/i }),
    ).toBeVisible();
  });

  it("clears a staging token after a synthetic audit without rendering it", async () => {
    const token = "temporary-slotshield-token";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: "verified",
            message: "Staging adapter completed with synthetic test data.",
            scenarios: [
              {
                id: "race",
                status: "passed",
                evidence: "One claim accepted; the competing claim was rejected.",
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const user = userEvent.setup();
    render(<Home />);
    await user.click(screen.getByRole("button", { name: /audit a staging flow/i }));
    await user.type(
      screen.getByRole("textbox", { name: /staging url/i }),
      "https://staging.clinic.example.com",
    );
    const tokenInput = screen.getByLabelText(/temporary test token/i);
    await user.type(tokenInput, token);
    await user.click(screen.getByRole("button", { name: /run staging audit/i }));

    expect(await screen.findByText(/staging audit complete/i)).toBeVisible();
    expect(tokenInput).toHaveValue("");
    expect(document.body.textContent).not.toContain(token);
  });

  it("explains the product and puts the public check first", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        name: "Find the booking failures customers never see.",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("textbox", { name: /public appointment url/i }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: /check site/i })).toBeVisible();
    expect(
      screen.getByText(/no sign-in\. public https pages only/i),
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: /how it works/i })).toBeVisible();
    expect(screen.getByText(/add your public link/i)).toBeVisible();
    expect(screen.getByText(/review what was observed/i)).toBeVisible();
    expect(screen.getByText(/test staging safely/i)).toBeVisible();
  });

  it("credits the product without competing with the main action", () => {
    render(<Home />);

    expect(
      screen.getByText("Designed and engineered by Muhammad Nabeegh"),
    ).toBeVisible();
    expect(document.querySelector("ol.how-it-works-list")).not.toBeNull();
    expect(
      screen.getByRole("textbox", { name: "Public appointment URL" }),
    ).toHaveAccessibleName("Public appointment URL");
  });

  it("separates observed evidence from behavior the public check cannot prove", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({
          status: "verified",
          requestedUrl: "https://clinic.example.com/",
          finalUrl: "https://clinic.example.com/",
          httpStatus: 200,
          responseTimeMs: 184,
          https: true,
          pageTitle: "Clinic",
          contentType: "text/html",
          bookingLinks: [],
          findings: [],
          message: "Public surface verified.",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    ),
    );

    const user = userEvent.setup();
    render(<Home />);
    await user.type(
      screen.getByRole("textbox", { name: /public appointment url/i }),
      "https://clinic.example.com",
    );
    await user.click(screen.getByRole("button", { name: /check site/i }));

    expect(
      await screen.findByRole("heading", { name: "Public surface verified" }),
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: /what we observed/i })).toBeVisible();
    expect(screen.getByText(/private booking behavior was not tested/i)).toBeVisible();
    expect(screen.getByRole("heading", { name: /next action/i })).toBeVisible();
  });

  it("frames fictional modes as reliability rehearsals", async () => {
    const user = userEvent.setup();
    render(<Home />);

    expect(screen.getByRole("heading", { name: /rehearse a failure/i })).toBeVisible();
    expect(screen.getByText(/run deterministic failure scenarios locally/i)).toBeVisible();
    expect(screen.getByText("Selected risk")).toBeVisible();
    expect(screen.getByText("Trigger")).toBeVisible();
    expect(screen.getByText("Expected protection")).toBeVisible();

    await user.click(screen.getByRole("button", { name: /try this scenario/i }));

    expect(screen.getByText("Final state")).toBeVisible();
  });
});
