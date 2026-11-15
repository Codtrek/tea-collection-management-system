import { create } from "zustand";
import { estateProfiles } from "@/data/estateOwnerEstates";
import type { EstateProfile } from "@/types/estateOwner";
type NewEstate = Pick<EstateProfile, "name" | "imageSrc" | "location" | "areaAcres" | "managerName" | "managerPhone">;
export const useEstateStore = create<{ estates: EstateProfile[]; addEstate: (estate: NewEstate) => void }>((set) => ({
  estates: estateProfiles,
  addEstate: (estate) => set((state) => ({ estates: [{ ...estate, id: String(Date.now()), grade: "Not graded", factories: [], workersActive: 0, workersTotal: 0, workers: [], weeklyPluckedWeightsKg: [0, 0, 0, 0, 0, 0, 0], recentActivities: [] }, ...state.estates] })),
}));
