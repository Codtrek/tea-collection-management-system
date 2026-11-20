import { createContext, useContext, useState } from "react";

import type { PasswordRecoveryUserType } from "@/utils/passwordRecovery";

interface PasswordRecoveryContextValue {
  userType: PasswordRecoveryUserType | null;
  phoneNumber: string;
  startRecovery: (
    userType: PasswordRecoveryUserType,
    phoneNumber: string,
  ) => void;
  clearRecovery: () => void;
}

const PasswordRecoveryContext =
  createContext<PasswordRecoveryContextValue | null>(null);

export function PasswordRecoveryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userType, setUserType] = useState<PasswordRecoveryUserType | null>(
    null,
  );
  const [phoneNumber, setPhoneNumber] = useState("");

  function startRecovery(
    nextUserType: PasswordRecoveryUserType,
    nextPhoneNumber: string,
  ) {
    setUserType(nextUserType);
    setPhoneNumber(nextPhoneNumber);
  }

  function clearRecovery() {
    setUserType(null);
    setPhoneNumber("");
  }

  return (
    <PasswordRecoveryContext.Provider
      value={{ userType, phoneNumber, startRecovery, clearRecovery }}
    >
      {children}
    </PasswordRecoveryContext.Provider>
  );
}

export function usePasswordRecovery() {
  const context = useContext(PasswordRecoveryContext);
  if (!context) {
    throw new Error(
      "usePasswordRecovery must be used within PasswordRecoveryProvider.",
    );
  }
  return context;
}
