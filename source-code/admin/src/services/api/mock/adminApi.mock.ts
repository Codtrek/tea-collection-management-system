import { factory , adminMetrics } from "../../../types/api";

export const adminApiMock = {
    getFactories: async (): Promise<factory[]> => {
        const res = await fetch("/data/admin-factories.json");
        if (!res.ok) throw new Error("Failed to load factories");
        return res.json();
    },

    approveFactory: async (id: string) => {
        return { id, status: "approved" as const };
    },

    rejectFactory: async (id: string) => {
        return { id, status: "rejected" as const};
    },
};