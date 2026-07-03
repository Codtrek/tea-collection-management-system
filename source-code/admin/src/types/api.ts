export interface factory {
    id: string;
    name: string;
    status: "pending" | "approved" | "rejected";
    region: string;
}

export interface adminMetrics {
    totalFactories: number;
    pendingApprovals: number;
    activeOfficers: number;
    activeManagers: number;
}

export interface managerSummary {
    collectionVolumeKg: number;
    income: number;
    expenses: number;
    supplierCount: number;
}

export interface teaAnalysisEntry {
    id: string;
    batchId: string;
    gradeQuality: string;
    moisturePercent: number;
    date: string;
}

export interface teaWeightEntry {
  id: string;
  supplierName: string;
  weightKg: number;
  date: string;
}

export interface attendanceEntry {
  id: string;
  staffName: string;
  status: "present" | "absent" | "leave";
  date: string;
}