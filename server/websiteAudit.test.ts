import { describe, expect, it } from "vitest";
import { extractPageSignals, validatePublicUrl } from "./websiteAudit";

describe("validatePublicUrl", () => {
  it("accepts an https public URL", () => {
    expect(validatePublicUrl("https://clinic.example.com")).toEqual({
      ok: true,
      url: "https://clinic.example.com/",
    });
  });

  it.each([
    "http://clinic.example.com",
    "https://localhost:8787",
    "https://127.0.0.1/",
    "https://10.0.0.5/",
    "https://clinic.example.com:8443/",
    "https://user:secret@clinic.example.com/",
    "javascript:alert(1)",
  ])("rejects unsafe target %s", (value) => {
    expect(validatePublicUrl(value).ok).toBe(false);
  });
});

describe("extractPageSignals", () => {
  it("finds the title and bounded booking links", () => {
    const result = extractPageSignals(
      `
        <title>Altaf Clinic</title>
        <a href="/appointments">Book an appointment</a>
        <a href="/about">About</a>
        <a href="https://other.example/book">Other</a>
      `,
      "https://clinic.example.com/",
    );

    expect(result.title).toBe("Altaf Clinic");
    expect(result.bookingLinks).toEqual([
      {
        label: "Book an appointment",
        url: "https://clinic.example.com/appointments",
      },
    ]);
  });
});
