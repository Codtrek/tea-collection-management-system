import { create } from "zustand";

import { estateProfiles } from "@/data/estateOwnerEstates";
import type { EstateProfile } from "@/types/estateOwner";

type NewEstate = Pick<EstateProfile, "name" | "imageSrc" | "location" | "areaAcres" | "managerName" | "managerPhone"> & { id?: string };
export type PluckingRecord = {
  id: number;
  weightKg: number;
  recordedAt: number;
  workerId: string;
  workerName: string;
};

export const useEstateStore = create<{
  estates: EstateProfile[];
  pluckingByEstate: Record<string, PluckingRecord[]>;
  addEstate: (estate: NewEstate) => void;
  updateEstate: (id: string, changes: Partial<Pick<EstateProfile, "name" | "location" | "areaAcres" | "factories">>) => void;
  addPluckingRecord: (id: string, record: Omit<PluckingRecord, "id">) => void;
  updatePluckingWeight: (id: string, recordId: number, weightKg: number) => void;
}>((set) => ({
  estates: estateProfiles,
  pluckingByEstate: {},
  addEstate: (estate) => set((state) => ({
    estates: [{
      ...estate,
      id: estate.id ?? String(Date.now()),
      grade: "Not graded",
      factories: [],
      workersActive: 0,
      workersTotal: 0,
      workers: [],
      weeklyPluckedWeightsKg: [0, 0, 0, 0, 0, 0, 0],
      recentActivities: [],
    }, ...state.estates],
  })),
  updateEstate: (id, changes) => set((state) => ({
    estates: state.estates.map((estate) => estate.id === id ? { ...estate, ...changes } : estate),
  })),
  addPluckingRecord: (id, record) => set((state) => ({
    pluckingByEstate: {
      ...state.pluckingByEstate,
      [id]: [{ ...record, id: (state.pluckingByEstate[id]?.[0]?.id ?? 0) + 1 }, ...(state.pluckingByEstate[id] ?? [])],
    },
  })),
  updatePluckingWeight: (id, recordId, weightKg) => set((state) => ({
    pluckingByEstate: {
      ...state.pluckingByEstate,
      [id]: (state.pluckingByEstate[id] ?? []).map((record) =>
        record.id === recordId ? { ...record, weightKg } : record
      ),
    },
  })),
}));
