export type BadgeColor = "green" | "amber" | "red" | "blue" | "gray";
export type AvatarColor = "green" | "blue" | "amber";
export type AlertType = "info" | "warning";
export type AccentColor = "green" | "amber" | "blue" | "red";

export interface BadgeProps {
  color?: BadgeColor;
  children: React.ReactNode;
}

export interface AvatarProps {
  initials: string;
  color?: AvatarColor;
  size?: number;
}

export interface AlertProps {
  type?: AlertType;
  children: React.ReactNode;
}

export interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: AccentColor;
  icon?: string;
}

export interface ButtonProps {
  children: React.ReactNode;
  primary?: boolean;
  danger?: boolean;
  small?: boolean;
  style?: React.CSSProperties;
  className?: string;
  onClick?: () => void;
}

export interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export interface IconProps {
  name: string;
  size?: number;
  color?: string;
}

export interface FormRowProps {
  label: string;
  children: React.ReactNode;
  half?: boolean;
}

export interface InputProps {
  placeholder?: string;
  type?: string;
  style?: React.CSSProperties;
}

export interface SelectProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export interface TextareaProps {
  placeholder?: string;
  rows?: number;
}

export interface TableProps {
  headers: string[];
  rows: React.ReactNode[][];
}

export interface TabsProps {
  tabs: string[];
  active: number;
  onChange: (index: number) => void;
}

export interface SectionHeaderProps {
  title: string;
  children?: React.ReactNode;
}

export interface ProgressBarProps {
  label: string;
  value: number;
  color?: string;
}

export interface GridProps {
  cols?: number;
  gap?: number;
  children: React.ReactNode;
}