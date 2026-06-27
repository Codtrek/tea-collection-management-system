import { type CSSProperties } from "react";
import { type GridProps } from '../../types'
import styles from "./Grid.module.css";

export const Grid = ({ cols=2, gap=16, children } : GridProps) => (
  <div
    className={styles.grid}
    style={{ "--cols": cols, "--gap": `${gap}px` } as CSSProperties}
  >
    {children}
  </div>
);
