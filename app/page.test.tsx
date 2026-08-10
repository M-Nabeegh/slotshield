import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Home from "./page";
import { PUBLIC_PREVIEW_URL } from "./lib/publicPreview";

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

    await user.click(
      screen.getByRole("button", { name: "Run selected simulation" }),
    );

    expect(
      screen.getByRole("heading", { name: "Reliability report" }),
    ).toBeVisible();
    expect(screen.getByText(/one patient holds the slot/i)).toBeVisible();
  });

  it("shows an account-free public preview and canonical share URL", () => {
    render(<Home />);

    expect(screen.getByText("PUBLIC PREVIEW")).toBeVisible();
    expect(screen.getByText(PUBLIC_PREVIEW_URL)).toBeVisible();
    expect(screen.getByText(/no account required/i)).toBeVisible();
  });

  it("copies the public URL and confirms the action", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    render(<Home />);

    await user.click(screen.getByRole("button", { name: /copy share link/i }));

    expect(writeText).toHaveBeenCalledWith(PUBLIC_PREVIEW_URL);
    expect(screen.getByText("Link copied")).toBeVisible();
  });

  it("offers a selectable manual-copy fallback when clipboard access fails", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
    render(<Home />);

    await user.click(screen.getByRole("button", { name: /copy share link/i }));

    expect(screen.getByText("Select and copy this link")).toBeVisible();
  });
});
