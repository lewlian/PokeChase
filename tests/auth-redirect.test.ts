import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/auth-redirect";

describe("safeNextPath", () => {
  it("passes through same-origin relative paths", () => {
    expect(safeNextPath("/portfolio")).toBe("/portfolio");
    expect(safeNextPath("/cards/123?tab=graded")).toBe("/cards/123?tab=graded");
  });

  it("rejects absolute, protocol-relative, and malformed targets", () => {
    expect(safeNextPath("https://evil.example")).toBe("/");
    expect(safeNextPath("//evil.example")).toBe("/");
    expect(safeNextPath("/\\evil.example")).toBe("/");
    expect(safeNextPath("javascript:alert(1)")).toBe("/");
    expect(safeNextPath("")).toBe("/");
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath(undefined)).toBe("/");
  });
});
