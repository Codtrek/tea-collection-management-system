/**
 * Types for the Estate Owner home experience.
 * Mirrors the domain vocabulary in the root `Claude.md`
 * (estates, pickup requests, deliveries).
 */

export type EstateGrade = "Super" | "Normal" | "Mixed";

export interface Estate {
  id: string;
  name: string;
  location: string;
  areaAcres: number;
  grade: EstateGrade;
}

export type PickupRequestStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "expired";

export interface PickupRequest {
  id: string;
  estateName: string;
  factory: string;
  estimatedWeightKg: number;
  requestedAt: string;
  status: PickupRequestStatus;
}

export type DeliveryStatus = "loading" | "in_transit" | "at_factory";

export interface ActiveDelivery {
  id: string;
  estateName: string;
  collector: string;
  vehicle: string;
  weightKg: number;
  status: DeliveryStatus;
}

export interface MonthlySummary {
  month: string;
  totalWeightKg: number;
  revenue: number;
}

type RequestStatus = "Pending" | "Accepted" | "On the way" | "Completed";

type RequestCategory = "collection" | "fertiliser";

interface RequestItem {
  id: string;
  category: RequestCategory;
  estate: string;
  about: string;
  amount: string;
  manager: string;
  managerContact: string;
  requestedAt: string;
  status: RequestStatus;
}