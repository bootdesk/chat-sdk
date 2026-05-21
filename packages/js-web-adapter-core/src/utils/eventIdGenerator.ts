export function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export function generateConversationId(): string {
  return `conv-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
