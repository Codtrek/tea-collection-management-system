import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  validateAgentSession,
  type AgentProfile,
} from "@/app/services/api/auth.api";
import {
  ApiError,
  setAgentAuthFailureHandler,
} from "@/app/services/api/client";
import {
  clearCollectorSession,
  clearCompletedCollectorSession,
  completeCollectorSession,
  getActiveMobileRole,
  getCollectorSession,
  getPendingCollectorSession,
  setActiveMobileRole,
  storePendingCollectorSession,
  type CollectorProfile,
  type CollectorSessionInput,
} from "@/utils/collectorSession";

type CollectorAuthStatus =
  | "checking"
  | "authenticated"
  | "password-change"
  | "unauthenticated"
  | "unavailable";

interface CollectorAuthContextValue {
  status: CollectorAuthStatus;
  profile?: CollectorProfile;
  authenticate: (session: CollectorSessionInput) => Promise<void>;
  beginPasswordChange: (session: CollectorSessionInput) => Promise<void>;
  activateEstateRole: (role: "Estate Owner" | "Estate Manager") => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

const CollectorAuthContext =
  createContext<CollectorAuthContextValue | undefined>(undefined);

function toProfile(agent: AgentProfile): CollectorProfile {
  return {
    name: agent.name,
    role: agent.role,
    phone: agent.phone,
  };
}

export function CollectorAuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [status, setStatus] = useState<CollectorAuthStatus>("checking");
  const [profile, setProfile] = useState<CollectorProfile>();
  const invalidationStarted = useRef(false);

  const logout = useCallback(async () => {
    invalidationStarted.current = true;
    await clearCollectorSession();
    setProfile(undefined);
    setStatus("unauthenticated");
  }, []);

  const restoreSession = useCallback(async () => {
    try {
      const activeRole = await getActiveMobileRole();
      setStatus("checking");
      setProfile(undefined);

      if (
        activeRole !== "CollectionAgent" &&
        activeRole !== "CollectionAgentPending"
      ) {
        setStatus("unauthenticated");
        return;
      }

      const session =
        activeRole === "CollectionAgentPending"
          ? await getPendingCollectorSession()
          : await getCollectorSession();
      if (!session) {
        await clearCollectorSession();
        setStatus("unauthenticated");
        return;
      }

      const validation = await validateAgentSession(session.accessToken);
      const refreshedSession = {
        accessToken: session.accessToken,
        agent: validation.agent,
      };

      if (validation.mustChangePassword) {
        await storePendingCollectorSession(refreshedSession);
        await clearCompletedCollectorSession();
        setStatus("password-change");
        return;
      }

      await completeCollectorSession(refreshedSession);
      invalidationStarted.current = false;
      setProfile(toProfile(validation.agent));
      setStatus("authenticated");
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.status === 401 || error.status === 403)
      ) {
        try {
          await clearCollectorSession();
          setStatus("unauthenticated");
        } catch {
          setStatus("unavailable");
        }
        return;
      }

      setStatus("unavailable");
    }
  }, []);

  const authenticate = useCallback(
    async (session: CollectorSessionInput) => {
      await completeCollectorSession(session);
      invalidationStarted.current = false;
      setProfile(toProfile(session.agent));
      setStatus("authenticated");
    },
    [],
  );

  const beginPasswordChange = useCallback(
    async (session: CollectorSessionInput) => {
      await storePendingCollectorSession(session);
      setProfile(undefined);
      setStatus("password-change");
    },
    [],
  );

  const activateEstateRole = useCallback(
    async (role: "Estate Owner" | "Estate Manager") => {
      await setActiveMobileRole(role);
      setProfile(undefined);
      setStatus("unauthenticated");
    },
    [],
  );

  const handleAgentAuthFailure = useCallback(async (error: ApiError) => {
    if (invalidationStarted.current) {
      return;
    }
    invalidationStarted.current = true;
    if (error.code === "AGENT_PASSWORD_CHANGE_REQUIRED") {
      const session = await getCollectorSession();
      if (session) {
        await storePendingCollectorSession(session);
        await clearCompletedCollectorSession();
        setProfile(undefined);
        setStatus("password-change");
        return;
      }
    }

    await clearCollectorSession();
    setProfile(undefined);
    setStatus("unauthenticated");
  }, []);

  useEffect(
    () => setAgentAuthFailureHandler(handleAgentAuthFailure),
    [handleAgentAuthFailure],
  );

  useEffect(() => {
    void Promise.resolve().then(restoreSession);
  }, [restoreSession]);

  const value = useMemo(
    () => ({
      status,
      profile,
      authenticate,
      beginPasswordChange,
      activateEstateRole,
      logout,
      restoreSession,
    }),
    [
      status,
      profile,
      authenticate,
      beginPasswordChange,
      activateEstateRole,
      logout,
      restoreSession,
    ],
  );

  return (
    <CollectorAuthContext.Provider value={value}>
      {children}
    </CollectorAuthContext.Provider>
  );
}

export function useCollectorAuth(): CollectorAuthContextValue {
  const context = useContext(CollectorAuthContext);
  if (!context) {
    throw new Error(
      "useCollectorAuth must be used within CollectorAuthProvider.",
    );
  }
  return context;
}

export function CollectorAuthNotice({
  message,
  onRetry,
  onSignIn,
}: {
  message: string;
  onRetry?: () => void;
  onSignIn?: () => void;
}) {
  return (
    <View style={styles.notice}>
      <Text style={styles.title}>Unable to verify your Collector session</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Pressable accessibilityRole="button" onPress={onRetry}>
          <Text style={styles.action}>Try again</Text>
        </Pressable>
      ) : null}
      {onSignIn ? (
        <Pressable accessibilityRole="button" onPress={onSignIn}>
          <Text style={styles.action}>Go to sign in</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
    backgroundColor: "#F7FAF8",
  },
  title: {
    color: "#193322",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  message: {
    color: "#52645A",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  action: {
    color: "#1D6839",
    fontSize: 15,
    fontWeight: "700",
    padding: 8,
  },
});
