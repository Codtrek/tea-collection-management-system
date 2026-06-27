import { type CSSProperties } from "react";
import { type ProgressBarProps } from '../../types'
import styles from "./ProgressBar.module.css";

export const ProgressBar = ({ label, value, color="#2D6A4F" } : ProgressBarProps) => (
  <div className={styles.wrapper}>
    <div className={styles.header}>
      <span>{label}</span>
      <span className={styles.value}>{value}%</span>
    </div>
    <div className={styles.track}>
      <div
        className={styles.fill}
        style={{
          "--bar-width": `${value}%`,
          "--bar-color": color,
        } as CSSProperties}
      />
    </div>
  </div>
);
