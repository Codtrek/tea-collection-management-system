import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { jwtDecode } from "jwt-decode";

export interface CollectorAgent {
  id: number;
  name: string;
  phone: string;
  role: string;
}

export interface CollectorSession {
  accessToken: string;
  role: "CollectionAgent";
  agent: CollectorAgent;
}

export interface CollectorSessionInput {
  accessToken: string;
  agent: CollectorAgent;
}

export interface CollectorProfile {
  name?: string;
  role?: string;
  phone?: string;
  email?: string;
}

export type ActiveMobileRole =
  | "CollectionAgent"
  | "CollectionAgentPending"
  | "Estate Owner"
  | "Estate Manager";

const COLLECTOR_SESSION_KEY = "collectorSession";
const PENDING_SESSION_KEY = "collectorPendingSession";
const ACTIVE_ROLE_KEY = "mobileActiveRole";
const LEGACY_TOKEN_KEY = "accessToken";
const LEGACY_USER_KEY = "user";

interface AgentTokenClaims {
  role?: unknown;
  exp?: unknown;
}

interface LegacyCollectorUser {
  id?: unknown;
  name?: unknown;
  role?: unknown;
  jobRole?: unknown;
  phone?: unknown;
}

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

function isActiveRole(value: string | null): value is ActiveMobileRole {
  return (
    value === "CollectionAgent" ||
    value === "CollectionAgentPending" ||
    value === "Estate Owner" ||
    value === "Estate Manager"
  );
}

function isAgent(value: unknown): value is CollectorAgent {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const agent = value as Partial<CollectorAgent>;
  return (
    typeof agent.id === "number" &&
    Number.isInteger(agent.id) &&
    agent.id > 0 &&
    typeof agent.name === "string" &&
    agent.name.trim().length > 0 &&
    typeof agent.phone === "string" &&
    agent.phone.trim().length > 0 &&
    typeof agent.role === "string" &&
    agent.role.trim().length > 0
  );
}

export function isCollectorTokenLocallyValid(accessToken: string): boolean {
  try {
    const claims = jwtDecode<AgentTokenClaims>(accessToken);
    return (
      claims.role === "CollectionAgent" &&
      typeof claims.exp === "number" &&
      claims.exp * 1000 > Date.now()
    );
  } catch {
    return false;
  }
}

function normalizeSession(value: unknown): CollectorSession | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const session = value as {
    accessToken?: unknown;
    role?: unknown;
    agent?: unknown;
  };
  if (
    typeof session.accessToken !== "string" ||
    !isAgent(session.agent) ||
    (session.role !== undefined && session.role !== "CollectionAgent") ||
    !isCollectorTokenLocallyValid(session.accessToken)
  ) {
    return undefined;
  }

  return {
    accessToken: session.accessToken,
    role: "CollectionAgent",
    agent: {
      id: session.agent.id,
      name: session.agent.name.trim(),
      phone: session.agent.phone.trim(),
      role: session.agent.role.trim(),
    },
  };
}

function parseLegacyCollectorUser(serializedUser: string): LegacyCollectorUser | undefined {
  try {
    const value: unknown = JSON.parse(serializedUser);
    if (typeof value === "object" && value !== null) {
      return value as LegacyCollectorUser;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

async function restoreNonCollectorRole(): Promise<void> {
  const serializedUser = await getStoredValue(LEGACY_USER_KEY);
  const user = serializedUser
    ? parseLegacyCollectorUser(serializedUser)
    : undefined;
  const role =
    user?.role === "Estate Owner" || user?.role === "Estate Manager"
      ? user.role
      : undefined;

  if (role) {
    await setStoredValue(ACTIVE_ROLE_KEY, role);
  } else {
    await removeStoredValue(ACTIVE_ROLE_KEY);
  }
}

export async function setActiveMobileRole(
  role: "Estate Owner" | "Estate Manager",
): Promise<void> {
  await setStoredValue(ACTIVE_ROLE_KEY, role);
}

export async function getActiveMobileRole(): Promise<
  ActiveMobileRole | undefined
> {
  const savedRole = await getStoredValue(ACTIVE_ROLE_KEY);
  if (isActiveRole(savedRole)) {
    return savedRole;
  }

  const serializedUser = await getStoredValue(LEGACY_USER_KEY);
  const user = serializedUser
    ? parseLegacyCollectorUser(serializedUser)
    : undefined;
  if (
    user?.role === "Estate Owner" ||
    user?.role === "Estate Manager" ||
    user?.role === "CollectionAgent"
  ) {
    const role = user.role;
    await setStoredValue(ACTIVE_ROLE_KEY, role);
    return role;
  }

  if (await getStoredValue(PENDING_SESSION_KEY)) {
    await setStoredValue(ACTIVE_ROLE_KEY, "CollectionAgentPending");
    return "CollectionAgentPending";
  }
  if (await getStoredValue(COLLECTOR_SESSION_KEY)) {
    await setStoredValue(ACTIVE_ROLE_KEY, "CollectionAgent");
    return "CollectionAgent";
  }

  return undefined;
}

export async function storePendingCollectorSession(
  input: CollectorSessionInput,
): Promise<void> {
  const session = normalizeSession({ ...input, role: "CollectionAgent" });
  if (!session) {
    throw new Error("The collector sign-in session is invalid or expired.");
  }

  await setStoredValue(ACTIVE_ROLE_KEY, "CollectionAgentPending");
  await setStoredValue(PENDING_SESSION_KEY, JSON.stringify(session));
}

export async function getPendingCollectorSession(): Promise<
  CollectorSession | undefined
> {
  const serializedSession = await getStoredValue(PENDING_SESSION_KEY);
  if (!serializedSession) {
    return undefined;
  }

  let parsedSession: unknown;
  try {
    parsedSession = JSON.parse(serializedSession);
  } catch {
    await clearPendingCollectorSession();
    return undefined;
  }

  const session = normalizeSession(parsedSession);
  if (!session) {
    await clearPendingCollectorSession();
    return undefined;
  }

  return session;
}

export async function clearPendingCollectorSession(): Promise<void> {
  await removeStoredValue(PENDING_SESSION_KEY);
  if ((await getStoredValue(ACTIVE_ROLE_KEY)) === "CollectionAgentPending") {
    await restoreNonCollectorRole();
  }
}

export async function clearCompletedCollectorSession(): Promise<void> {
  await removeStoredValue(COLLECTOR_SESSION_KEY);
}

export async function completeCollectorSession(
  input: CollectorSessionInput,
): Promise<void> {
  const session = normalizeSession({ ...input, role: "CollectionAgent" });
  if (!session) {
    throw new Error("The collector sign-in session is invalid or expired.");
  }

  await setStoredValue(ACTIVE_ROLE_KEY, "CollectionAgent");
  await setStoredValue(COLLECTOR_SESSION_KEY, JSON.stringify(session));
  await removeStoredValue(PENDING_SESSION_KEY);
}

export async function getCollectorSession(): Promise<
  CollectorSession | undefined
> {
  const serializedSession = await getStoredValue(COLLECTOR_SESSION_KEY);
  if (serializedSession) {
    let parsedSession: unknown;
    try {
      parsedSession = JSON.parse(serializedSession);
    } catch {
      await clearCompletedCollectorSession();
      return undefined;
    }

    const session = normalizeSession(parsedSession);
    if (!session) {
      await clearCompletedCollectorSession();
      return undefined;
    }
    return session;
  }

  const [accessToken, serializedUser] = await Promise.all([
    getStoredValue(LEGACY_TOKEN_KEY),
    getStoredValue(LEGACY_USER_KEY),
  ]);
  if (!serializedUser) {
    return undefined;
  }

  const user = parseLegacyCollectorUser(serializedUser);
  if (user?.role !== "CollectionAgent") {
    return undefined;
  }
  if (!accessToken) {
    await removeStoredValue(LEGACY_USER_KEY);
    return undefined;
  }

  const id =
    typeof user.id === "number"
      ? user.id
      : typeof user.id === "string"
        ? Number(user.id)
        : NaN;
  const legacySession = normalizeSession({
    accessToken,
    role: "CollectionAgent",
    agent: {
      id,
      name: user.name,
      phone: user.phone,
      role: user.jobRole ?? "Tea Collecting Agent",
    },
  });
  if (!legacySession) {
    await removeStoredValue(LEGACY_TOKEN_KEY);
    await removeStoredValue(LEGACY_USER_KEY);
    return undefined;
  }

  await setStoredValue(COLLECTOR_SESSION_KEY, JSON.stringify(legacySession));
  await removeStoredValue(LEGACY_TOKEN_KEY);
  await removeStoredValue(LEGACY_USER_KEY);
  await setStoredValue(ACTIVE_ROLE_KEY, "CollectionAgent");
  return legacySession;
}

export async function clearCollectorSession(): Promise<void> {
  await removeStoredValue(COLLECTOR_SESSION_KEY);
  await removeStoredValue(PENDING_SESSION_KEY);

  const serializedUser = await getStoredValue(LEGACY_USER_KEY);
  const legacyUser = serializedUser
    ? parseLegacyCollectorUser(serializedUser)
    : undefined;
  if (legacyUser?.role === "CollectionAgent") {
    await removeStoredValue(LEGACY_TOKEN_KEY);
    await removeStoredValue(LEGACY_USER_KEY);
  }

  const activeRole = await getStoredValue(ACTIVE_ROLE_KEY);
  if (
    activeRole === "CollectionAgent" ||
    activeRole === "CollectionAgentPending"
  ) {
    await restoreNonCollectorRole();
  }
}

export async function getCollectorProfile(): Promise<
  CollectorProfile | undefined
> {
  const session = await getCollectorSession();
  if (!session) {
    return undefined;
  }

  return {
    name: session.agent.name,
    role: session.agent.role,
    phone: session.agent.phone,
  };
}
