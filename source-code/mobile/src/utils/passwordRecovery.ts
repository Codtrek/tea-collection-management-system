import type { Href } from "expo-router";

export const PASSWORD_RECOVERY_USER_TYPES = [
  "collection-agent",
  "estate-owner",
  "estate-manager",
] as const;

export type PasswordRecoveryUserType =
  (typeof PASSWORD_RECOVERY_USER_TYPES)[number];

export function isPasswordRecoveryUserType(
  value: unknown,
): value is PasswordRecoveryUserType {
  return PASSWORD_RECOVERY_USER_TYPES.some((userType) => userType === value);
}

export function getPasswordRecoveryLoginHref(
  userType: PasswordRecoveryUserType,
): Href {
  if (userType === "collection-agent") {
    return "/auth/collector-login";
  }

  return {
    pathname: "/auth/login",
    params: { userType },
  };
}

export function getPasswordRecoveryUserTypeLabel(
  userType: PasswordRecoveryUserType,
): string {
  switch (userType) {
    case "collection-agent":
      return "Collection Agent";
    case "estate-owner":
      return "Estate Owner";
    case "estate-manager":
      return "Estate Manager";
  }
}
