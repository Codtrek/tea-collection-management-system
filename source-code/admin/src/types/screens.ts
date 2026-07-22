export type OfficerScreen =
  | "tea-weight"
  | "fertilizer"
  | "attendance"
  | "production"
  | "registration"
  | "salary"
  | "supplier-pay"
  | "expenses";

export type ManagerScreen =
  | "dashboard"
  | "tea"
  | "fertilizer"
  | "production"
  | "finance"
  | "performance";

export type AdminScreen = "dashboard" | "factories" | "users";

export type FactoryAdminScreen =
  | "dashboard"
  | "registration"
  | "tea-collection"
  | "fertilizer"
  | "estate-payments"
  | "payroll"
  | "salary-advances"
  | "attendance"
  | "performance"
  | "collection-report"
  | "revenue-report"
  | "expense-report";
