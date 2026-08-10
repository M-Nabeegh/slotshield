import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import Home from "./page";

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
});
