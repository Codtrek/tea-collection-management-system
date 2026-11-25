import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export function readSessionValue(key: string) {
  return Platform.OS === "web"
    ? localStorage.getItem(key)
    : SecureStore.getItemAsync(key);
}

/** Reads the owner profile returned by mobile sign-in or registration. */
export async function getSignedInOwnerName(): Promise<string> {
  const [token, storedUser] = await Promise.all([
    readSessionValue("accessToken"),
    readSessionValue("user"),
  ]);
  if (!token || !storedUser) return "";

  const user = JSON.parse(storedUser);
  return user?.role === "Estate Owner" && typeof user.name === "string"
    ? user.name.trim()
    : "";
}
