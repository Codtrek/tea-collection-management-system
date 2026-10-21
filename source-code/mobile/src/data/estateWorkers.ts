import { useSyncExternalStore } from "react";

export interface EstateWorker {
  id: string;
  name: string;
  role: string;
  contactNumber: string;
  present: boolean;
}

const savedWorkersByEstate = new Map<string, EstateWorker[]>();
const listeners = new Set<() => void>();

export function getEstateWorkers(
  estateId: string
): EstateWorker[] {
  return (savedWorkersByEstate.get(estateId) ?? []).map((worker) => ({
    ...worker,
  }));
}

export function getSavedEstateWorkers(
  estateId: string
): EstateWorker[] | undefined {
  return savedWorkersByEstate.get(estateId);
}

export function saveEstateWorkers(
  estateId: string,
  workers: EstateWorker[]
): void {
  savedWorkersByEstate.set(
    estateId,
    workers.map((worker) => ({ ...worker }))
  );
  listeners.forEach((listener) => listener());
}

export function useSavedEstateWorkers(
  estateId: string | undefined
): EstateWorker[] | undefined {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => (estateId ? savedWorkersByEstate.get(estateId) : undefined),
    () => undefined
  );
}
