import { describe, expect, it } from "vitest";
import { safeExternalUrl } from "./external-links";

describe("safeExternalUrl", () => {
  it("accepts and normalizes HTTPS resource links", () => {
    expect(safeExternalUrl(" https://example.edu/course?id=42 ")).toBe("https://example.edu/course?id=42");
  });

  it.each([
    "http://example.edu/course",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "file:///etc/passwd",
    "/courses/123",
    "//example.edu/course",
    "https://user:password@example.edu/course",
    "",
    "   ",
  ])("rejects unsafe or non-absolute URL %s", value => {
    expect(safeExternalUrl(value)).toBeNull();
  });

  it("returns null for missing values", () => {
    expect(safeExternalUrl(undefined)).toBeNull();
    expect(safeExternalUrl(null)).toBeNull();
  });
});
