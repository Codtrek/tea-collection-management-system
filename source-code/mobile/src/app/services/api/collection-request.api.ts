import { apiRequest } from "./client";
import { readSessionValue } from "./estate-owner.api";

export interface CollectionRequest {
  id: number;
  estateId: number;
  requestedByUserId: number;
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
}

export async function getOwnerCollectionRequests() {
  const token = await readSessionValue("accessToken");
  if (!token) throw new Error("Sign in to view your collection requests.");

  return apiRequest<OwnerCollectionRequest[]>("/collection-request", {
    headers: { Authorization: `Bearer ${token}` },
  });
}
