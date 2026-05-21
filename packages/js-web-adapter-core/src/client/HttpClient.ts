export interface HttpClientConfig {
  apiUrl: string;
  headers?: Record<string, string>;
  timeout?: number;
  verifyToken?: string;
}

export interface ChatResponse {
  id: string;
  role: "assistant" | "user";
  text: string;
  attachments?: Array<{
    type: string;
    url: string;
    name?: string;
    mime_type?: string;
    size?: number;
  }>;
  events?: Array<Record<string, unknown>>;
}

export class HttpClient {
  private config: Required<Pick<HttpClientConfig, "apiUrl" | "timeout">> & {
    headers: Record<string, string>;
  };

  constructor(config: HttpClientConfig) {
    const headers: Record<string, string> = { ...config.headers };
    if (config.verifyToken) {
      headers["X-Verify-Token"] = config.verifyToken;
    }
    this.config = { apiUrl: config.apiUrl, timeout: config.timeout ?? 30000, headers };
  }

  async get(url: string): Promise<unknown> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const fullUrl = this.resolve(url);
      const response = await fetch(fullUrl, {
        method: "GET",
        headers: this.config.headers,
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      return response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async post(url: string, body: unknown): Promise<unknown> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const fullUrl = this.resolve(url);
      const response = await fetch(fullUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...this.config.headers },
        signal: controller.signal,
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      return response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async delete(url: string): Promise<unknown> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const fullUrl = this.resolve(url);
      const response = await fetch(fullUrl, {
        method: "DELETE",
        headers: this.config.headers,
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const text = await response.text();
      return text ? JSON.parse(text) : undefined;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async sendMessage(
    messages: Array<{
      id: string;
      role: string;
      text: string;
      attachments?: Array<{ url: string; name?: string; mime_type?: string; size?: number }>;
    }>,
    endpoint: string = "/api/webhooks/web",
  ): Promise<ChatResponse> {
    return this.post(endpoint, { messages }) as Promise<ChatResponse>;
  }

  async editMessage(
    messageId: string,
    newText: string,
    endpointTemplate: string = "/api/chat/messages/{id}/edit",
  ): Promise<void> {
    const url = this.expandTemplate(endpointTemplate, { id: messageId });
    await this.post(url, { text: newText });
  }

  async deleteMessage(
    messageId: string,
    endpointTemplate: string = "/api/chat/messages/{id}",
  ): Promise<void> {
    const url = this.expandTemplate(endpointTemplate, { id: messageId });
    await this.delete(url);
  }

  async addReaction(
    messageId: string,
    emoji: string,
    endpointTemplate: string = "/api/chat/messages/{id}/reactions",
  ): Promise<void> {
    const url = this.expandTemplate(endpointTemplate, { id: messageId });
    await this.post(url, { emoji });
  }

  async removeReaction(
    messageId: string,
    emoji: string,
    endpointTemplate: string = "/api/chat/messages/{id}/reactions/{emoji}",
  ): Promise<void> {
    const url = this.expandTemplate(endpointTemplate, { id: messageId, emoji });
    await this.delete(url);
  }

  private resolve(url: string): string {
    return /^https?:\/\//.test(url) ? url : `${this.config.apiUrl}${url}`;
  }

  private expandTemplate(template: string, params: Record<string, string>): string {
    let url = template;
    for (const [key, value] of Object.entries(params)) {
      url = url.replace(`{${key}}`, encodeURIComponent(value));
    }
    return this.resolve(url);
  }
}
