import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Lab } from "./Lab";

function jumpToEnd() {
  const slider = screen.getByRole("slider", { name: "Replay position" });
  fireEvent.change(slider, { target: { value: slider.getAttribute("max") } });
}

describe("Lab", () => {
  it("starts with an empty schedule and an explanation", () => {
    render(<Lab />);
    expect(screen.getByRole("heading", { name: "Opening-minute race" })).toBeInTheDocument();
    expect(screen.getByText("Not run yet")).toBeInTheDocument();
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
  });

  it("runs the race and reports the double booking", async () => {
    const user = userEvent.setup();
    render(<Lab />);
    await user.click(screen.getByRole("button", { name: /^Run/ }));
    jumpToEnd();

    expect(screen.getByText("of 5 patients affected")).toBeInTheDocument();
    expect(screen.getByText(/10:00 is now double-booked/)).toBeInTheDocument();
    const schedule = screen.getByRole("table", { name: /Appointments/ });
    expect(within(schedule).getAllByText(/double-booked/)).toHaveLength(2);
  });

  it("turns on the suggested guardrail and runs again", async () => {
    const user = userEvent.setup();
    render(<Lab />);
    await user.click(screen.getByRole("button", { name: /^Run/ }));
    jumpToEnd();
    await user.click(screen.getByRole("button", { name: "Turn on and run again" }));
    jumpToEnd();

    expect(screen.getByRole("switch", { name: "Unique slot constraint" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("of 5 patients handled cleanly")).toBeInTheDocument();
    const history = screen.getByRole("region", { name: "Runs this session" });
    expect(within(history).getByText("Clean")).toBeInTheDocument();
    expect(within(history).getByText("2 affected")).toBeInTheDocument();
  });

  it("flags a result as stale when guardrails change after a run", async () => {
    const user = userEvent.setup();
    render(<Lab />);
    await user.click(screen.getByRole("button", { name: /^Run/ }));
    await user.click(screen.getByRole("switch", { name: "Idempotent webhooks" }));

    expect(screen.getByText(/Guardrails changed since this run/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Run with new settings" }));
    expect(screen.queryByText(/Guardrails changed since this run/)).not.toBeInTheDocument();
  });

  it("offers seeded traffic for the Monday rush", async () => {
    const user = userEvent.setup();
    render(<Lab />);
    await user.click(screen.getByRole("radio", { name: /Monday rush/ }));
    expect(screen.getByText("Traffic #8")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Generate different traffic" }));
    expect(screen.queryByText("Traffic #8")).not.toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Replay position" })).toBeInTheDocument();
  });

  it("runs with the R shortcut and steps with the arrow keys", async () => {
    const user = userEvent.setup();
    render(<Lab />);
    await user.keyboard("r");
    const slider = screen.getByRole("slider", { name: "Replay position" });
    fireEvent.change(slider, { target: { value: "0" } });
    document.body.focus();
    await user.keyboard("{ArrowRight}");
    expect(slider).toHaveValue("1");
    await user.keyboard("{ArrowLeft}");
    expect(slider).toHaveValue("0");
  });

  it("jumps to an event from the log", async () => {
    const user = userEvent.setup();
    render(<Lab />);
    await user.click(screen.getByRole("button", { name: /^Run/ }));
    await user.click(screen.getByRole("button", { name: /Writes Ayesha R\. into 10:00/ }));
    expect(screen.getByRole("slider", { name: "Replay position" })).toHaveValue("6");
  });
});

describe("Lab from a shared link", () => {
  it("opens straight into the shared run", () => {
    window.history.replaceState(null, "", "/#/lab?traffic=duplicate-callback&guardrails=idempotency");
    render(<Lab />);
    expect(screen.getByRole("heading", { name: "Webhook retries" })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Idempotent webhooks" })).toHaveAttribute("aria-checked", "true");
    jumpToEnd();
    expect(screen.getByText("of 3 patients handled cleanly")).toBeInTheDocument();
    window.history.replaceState(null, "", "/");
  });
});
