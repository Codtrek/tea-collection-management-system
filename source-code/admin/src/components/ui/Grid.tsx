import { type CSSProperties } from "react";
import { type GridProps } from '../../types'
import styles from "../../styles/modules/components/Grid.module.css";

export const Grid = ({ cols=2, gap=16, children } : GridProps) => (
  <div
    className={styles.grid}
    style={{
      "--grid-cols": cols,
      "--grid-gap": `${gap}px`,
    } as CSSProperties}
  >
    {children}
  </div>
);
