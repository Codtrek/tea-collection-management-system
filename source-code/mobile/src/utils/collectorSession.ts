import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

export interface CollectorAgent {
  id: number;
  name: string;
  phone: string;
}

export interface CollectorSession {
  accessToken: string;
  agent: CollectorAgent;
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
    typeof session.agent.phone === "string"
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
  };
  await setStoredValue("accessToken", session.accessToken);
  await setStoredValue("user", JSON.stringify(user));
  await removeStoredValue(PENDING_SESSION_KEY);
}
