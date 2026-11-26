import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { apiRequest } from "./client";

export interface OwnedEstate {
  id: number;
  name: string;
  location: string;
  ytdDeliveriesKg: string;
}

export async function getOwnedEstates() {
  const token = await readSessionValue("accessToken");
  if (!token) throw new Error("Sign in to view your estates.");
  return apiRequest<OwnedEstate[]>("/collection-request/estates", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function readSessionValue(key: string) {
  return Platform.OS === "web"
    ? localStorage.getItem(key)
    : SecureStore.getItemAsync(key);
}

export interface CreateEstateInMobile {
  name: string;
  address: string;
  areaAcres: number;
}

export async function registerOwnedEstate(details: CreateEstateInMobile) {
  const token = await readSessionValue("accessToken");
  if (!token) throw new Error("Sign in to register an estate.");
  return apiRequest<Pick<OwnedEstate, "id" | "name" | "location">>("/mobile/estates", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(details),
  });
}

export interface ManagerRegistration {
  estateId?: number;
  name: string;
  phone: string;
  nic: string;
  dateOfBirth: string;
  password: string;
  confirmPassword: string;
}

export interface OwnerEmployee {
  id: number;
  name: string;
  estateId: number | null;
  estateName: string | null;
}

export interface EmployeeDirectory {
  employees: OwnerEmployee[];
  availableEstates: Pick<OwnedEstate, "id" | "name">[];
}

async function ownerEmployeeRequest<T>(path: string, method = "GET") {
  const token = await readSessionValue("accessToken");
  if (!token) throw new Error("Sign in to manage employees.");
  return apiRequest<T>(path, { method, headers: { Authorization: `Bearer ${token}` } });
}

export function getOwnerEmployees() {
  return ownerEmployeeRequest<EmployeeDirectory>("/mobile/estates/employees");
}

export function changeManagerAssignment(employeeId: number, estateId: number, assign: boolean) {
  return ownerEmployeeRequest<{ ok: boolean }>(`/mobile/estates/${estateId}/managers/${employeeId}`, assign ? "PUT" : "DELETE");
}

export async function registerEstateManager(details: ManagerRegistration) {
  const token = await readSessionValue("accessToken");
  if (!token) throw new Error("Sign in to register a manager.");
  return apiRequest<{ id: number; name: string; estateName: string | null }>("/auth/mobile/estate-managers", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(details),
  });
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
