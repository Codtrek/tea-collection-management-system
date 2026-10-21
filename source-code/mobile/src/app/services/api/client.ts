const API_URL = "http://localhost:3001";

export class ApiError extends Error {
  readonly messages: string[];

  constructor(messages: string | string[]) {
    const normalizedMessages = (Array.isArray(messages) ? messages : [messages])
      .filter((message): message is string => Boolean(message));

    super(normalizedMessages.join("\n") || "Something went wrong");
    this.name = "ApiError";
    this.messages = normalizedMessages;
  }
}

export function getErrorMessages(error: unknown, fallback: string): string[] {
  if (error instanceof ApiError && error.messages.length > 0) {
    return error.messages;
  }

  if (error instanceof Error && error.message) {
    return [error.message];
  }

  return [fallback];
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(data.message || "Something went wrong");
  }

  return data;
}
