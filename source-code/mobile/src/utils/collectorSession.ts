import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

export interface CollectorAgent {
  id: number;
  name: string;
  phone: string;
  role?: string;
}

export interface CollectorSession {
  accessToken: string;
  agent: CollectorAgent;
}

export interface CollectorProfile {
  name?: string;
  role?: string;
  phone?: string;
  email?: string;
}

const PENDING_SESSION_KEY = "collectorPendingSession";

async function setStoredValue(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

async function getStoredValue(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
}

async function removeStoredValue(key: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}

function isCollectorSession(value: unknown): value is CollectorSession {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const session = value as Partial<CollectorSession>;
  return (
    typeof session.accessToken === "string" &&
    typeof session.agent?.id === "number" &&
    typeof session.agent.name === "string" &&
    typeof session.agent.phone === "string" &&
    (session.agent.role === undefined ||
      typeof session.agent.role === "string")
  );
}

export async function storePendingCollectorSession(
  session: CollectorSession,
): Promise<void> {
  await setStoredValue(PENDING_SESSION_KEY, JSON.stringify(session));
}

export async function getPendingCollectorSession(): Promise<
  CollectorSession | undefined
> {
  const serializedSession = await getStoredValue(PENDING_SESSION_KEY);
  if (!serializedSession) {
    return undefined;
  }

  const parsedSession: unknown = JSON.parse(serializedSession);
  if (!isCollectorSession(parsedSession)) {
    throw new Error("The saved collector sign-in session is invalid.");
  }

  return parsedSession;
}

export async function completeCollectorSession(
  session: CollectorSession,
): Promise<void> {
  const user = {
    ...session.agent,
    id: String(session.agent.id),
    role: "CollectionAgent",
    ...(session.agent.role?.trim()
      ? { jobRole: session.agent.role.trim() }
      : {}),
  };
  await setStoredValue("accessToken", session.accessToken);
  await setStoredValue("user", JSON.stringify(user));
  await removeStoredValue(PENDING_SESSION_KEY);
}

export async function getCollectorProfile(): Promise<
  CollectorProfile | undefined
> {
  const [accessToken, serializedUser] = await Promise.all([
    getStoredValue("accessToken"),
    getStoredValue("user"),
  ]);
  if (!accessToken || !serializedUser) {
    return undefined;
  }

  let parsedUser: unknown;
  try {
    parsedUser = JSON.parse(serializedUser);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return undefined;
    }
    throw error;
  }
  if (typeof parsedUser !== "object" || parsedUser === null) {
    return undefined;
  }

  const user = parsedUser as {
    role?: unknown;
    name?: unknown;
    jobRole?: unknown;
    phone?: unknown;
    email?: unknown;
  };
  if (user.role !== "CollectionAgent") {
    return undefined;
  }

  return {
    name:
      typeof user.name === "string" ? user.name.trim() || undefined : undefined,
    role:
      typeof user.jobRole === "string"
        ? user.jobRole.trim() || undefined
        : undefined,
    phone:
      typeof user.phone === "string" ? user.phone.trim() || undefined : undefined,
    email:
      typeof user.email === "string" ? user.email.trim() || undefined : undefined,
  };
}
