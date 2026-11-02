import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { PublicUser } from "@/app/services/api/auth.api";
import { apiRequest } from "@/app/services/api/client";
export type OwnerProfile = PublicUser & { email?: string };
export type ProfileField = "name" | "phone" | "email";
export const profileLabels: Record<ProfileField, string> = { name: "Name", phone: "Mobile", email: "E-mail" };
async function authorization() {
  const token = Platform.OS === "web" ? localStorage.getItem("accessToken") : await SecureStore.getItemAsync("accessToken");
  if (!token) throw new Error("Please sign in again.");
  return { Authorization: `Bearer ${token}` };
}
async function cacheProfile(user: OwnerProfile) {
  const serialized = JSON.stringify(user);
  if (Platform.OS === "web") localStorage.setItem("user", serialized);
  else await SecureStore.setItemAsync("user", serialized);
}
export async function readOwnerProfile(): Promise<OwnerProfile> {
  const user = await apiRequest<OwnerProfile>("/auth/mobile/me", { headers: await authorization() });
  await cacheProfile(user);
  return user;
}
export async function saveOwnerProfileField(field: ProfileField, value: string) {
  const user = await apiRequest<OwnerProfile>("/auth/mobile/me", {
    method: "PATCH", headers: await authorization(), body: JSON.stringify({[field]: value}),
  });
  await cacheProfile(user);
}
