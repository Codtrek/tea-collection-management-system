import Constants from "expo-constants";
import { getCollectorSession } from "@/utils/collectorSession";

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
  readonly status?: number;
  readonly code?: string;

  constructor(
    messages: string | string[],
    status?: number,
    code?: string,
  ) {
    const normalizedMessages = (Array.isArray(messages) ? messages : [messages])
      .filter((message): message is string => Boolean(message));

    super(normalizedMessages.join("\n") || "Something went wrong");
    this.name = "ApiError";
    this.messages = normalizedMessages;
    this.status = status;
    this.code = code;
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
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const responseText = await response.text();
  let data: unknown;
  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      if (response.ok) {
        throw new ApiError("The server returned an invalid response.", response.status);
      }
    }
  }

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null && "message" in data
        ? data.message
        : "Something went wrong";
    const code =
      typeof data === "object" &&
      data !== null &&
      "code" in data &&
      typeof data.code === "string"
        ? data.code
        : undefined;
    throw new ApiError(
      typeof message === "string" || Array.isArray(message)
        ? message
        : "Something went wrong",
      response.status,
      code,
    );
  }

  return data as T;
}

type AgentAuthFailureHandler = (error: ApiError) => void | Promise<void>;
let agentAuthFailureHandler: AgentAuthFailureHandler | undefined;

export function setAgentAuthFailureHandler(
  handler: AgentAuthFailureHandler | undefined,
): () => void {
  agentAuthFailureHandler = handler;
  return () => {
    if (agentAuthFailureHandler === handler) {
      agentAuthFailureHandler = undefined;
    }
  };
}

async function handleAgentAuthFailure(error: ApiError): Promise<void> {
  await agentAuthFailureHandler?.(error);
}

/** Authenticated requests for Agent-only APIs; generic estate requests stay unchanged. */
export async function agentApiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const session = await getCollectorSession();
  if (!session) {
    const error = new ApiError("Collector sign-in is required.", 401);
    await handleAgentAuthFailure(error);
    throw error;
  }

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${session.accessToken}`);

  try {
    return await apiRequest<T>(endpoint, { ...options, headers });
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 401 ||
        (error.status === 403 &&
          (error.code === "AGENT_SESSION_INVALID" ||
            error.code === "AGENT_PASSWORD_CHANGE_REQUIRED")))
    ) {
      await handleAgentAuthFailure(error);
    }
    throw error;
  }
}
