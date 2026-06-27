import { type BadgeProps } from '../../types'
import styles from "./Badge.module.css";

export const Badge = ({ color = "gray", children } : BadgeProps) => (
  <span className={`${styles.badge} ${styles[color]}`}>{children}</span>
);
