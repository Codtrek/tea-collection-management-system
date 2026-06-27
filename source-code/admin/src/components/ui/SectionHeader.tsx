import { type SectionHeaderProps } from '../../types'
import styles from "./SectionHeader.module.css";

export const SectionHeader = ({ title, children } : SectionHeaderProps) => (
  <div className={styles.header}>
    <span className={styles.title}>{title}</span>
    <div className={styles.actions}>{children}</div>
  </div>
);
