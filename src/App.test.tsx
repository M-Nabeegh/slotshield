import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";

afterEach(() => {
  window.location.hash = "";
});

describe("App", () => {
  it("opens on the lab", () => {
    render(<App />);
    expect(screen.getByRole("link", { name: "Lab" })).toHaveAttribute("aria-current", "page");
    expect(document.title).toContain("Booking reliability lab");
  });

  it("switches sections from the tabs", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("link", { name: "Page check" }));
    expect(await screen.findByRole("heading", { name: "Check a booking page" })).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Staging" }));
    expect(await screen.findByRole("heading", { name: /staging API/ })).toBeInTheDocument();
  });

  it("says the patients are fictional", () => {
    render(<App />);
    expect(screen.getByText(/patients are fictional/)).toBeInTheDocument();
  });
});
