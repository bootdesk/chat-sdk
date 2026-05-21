import { describe, it, expect } from "vitest";
import { formatTimestamp } from "../../src/utils/formatTimestamp";

describe("formatTimestamp", () => {
  it('returns "Just now" for timestamps less than 1 minute ago', () => {
    const now = Date.now();
    expect(formatTimestamp(now)).toBe("Just now");
    expect(formatTimestamp(now - 30000)).toBe("Just now");
  });

  it('returns "{n}m ago" for timestamps 1-59 minutes ago', () => {
    const now = Date.now();
    expect(formatTimestamp(now - 5 * 60 * 1000)).toBe("5m ago");
    expect(formatTimestamp(now - 59 * 60 * 1000)).toBe("59m ago");
  });

  it('returns "{n}h ago" for timestamps 1-23 hours ago', () => {
    const now = Date.now();
    expect(formatTimestamp(now - 2 * 60 * 60 * 1000)).toBe("2h ago");
  });
});
