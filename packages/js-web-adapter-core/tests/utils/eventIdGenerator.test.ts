import { describe, it, expect } from "vitest";
import { generateId, generateConversationId } from "../../src/utils/eventIdGenerator";

describe("eventIdGenerator", () => {
  it("generates unique IDs", () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });

  it("generates message-prefixed IDs", () => {
    expect(generateId()).toMatch(/^msg-/);
  });

  it("generates conversation-prefixed IDs", () => {
    expect(generateConversationId()).toMatch(/^conv-/);
  });

  it("generates unique conversation IDs", () => {
    const id1 = generateConversationId();
    const id2 = generateConversationId();
    expect(id1).not.toBe(id2);
  });
});
