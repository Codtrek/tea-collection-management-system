import { apiRequest } from "./client";
import { readSessionValue } from "./estate-owner.api";

export interface CollectionRequest {
  id: number;
  estateId: number;
  requestedByUserId: number;
  teaWeightKg: string | null;
  notes: string | null;
  status: "open" | "accepted" | "collected" | "delivered" | "cancelled";
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
}

export function getCollectionRequest(id: number, accessToken: string) {
  return apiRequest<CollectionRequest>(`/collection-request/${id}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export interface OwnerCollectionRequest extends CollectionRequest {
  estate: { id: number; name: string };
  requestedBy: { name: string } | null;
}

interface CollectionRequestInput {
  estateId: number;
  notes?: string | null;
}

type CollectionRequestPatch = CollectionRequestInput | { notes: string | null } | { teaWeightKg: number };

async function sendRequestUpdate(id: number, method: "PUT" | "PATCH", fields: CollectionRequestPatch) {
  const token = await readSessionValue("accessToken");
  if (!token) throw new Error("Sign in to edit your collection request.");
  return apiRequest<{ id: number }>(`/collection-request/${id}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(fields),
  });
}

export function replaceCollectionRequest(id: number, fields: CollectionRequestInput) {
  return sendRequestUpdate(id, "PUT", fields);
}

export function patchCollectionRequest(id: number, fields: CollectionRequestPatch) {
  return sendRequestUpdate(id, "PATCH", fields);
}

export async function deletePendingCollectionRequest(id: number) {
  const token = await readSessionValue("accessToken");
  if (!token) throw new Error("Sign in to delete your collection request.");
  return apiRequest<{ id: number }>(`/collection-request/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getOwnerCollectionRequests() {
  const token = await readSessionValue("accessToken");
  if (!token) throw new Error("Sign in to view your collection requests.");

  return apiRequest<OwnerCollectionRequest[]>("/collection-request", {
    headers: { Authorization: `Bearer ${token}` },
  });
}
