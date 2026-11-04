import Constants from "expo-constants";

const API_PORT = 3001;

// On a physical device "localhost" is the phone itself, so the request never reaches the
// backend. Prefer an explicit EXPO_PUBLIC_API_URL, otherwise reuse the host the Expo dev
// server is served from (the dev machine's LAN IP).
function resolveApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  const devHost = Constants.expoConfig?.hostUri?.split(":")[0];
  return `http://${devHost ?? "localhost"}:${API_PORT}`;
}

const API_URL = resolveApiUrl();

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
