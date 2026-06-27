import { type TabsProps } from '../../types'
import styles from "../../styles/modules/components/Tabs.module.css";

export const Tabs = ({ tabs, active, onChange } : TabsProps) => (
  <div className={styles.tabs}>
    {tabs.map((t,i) => <div key={t} onClick={() => onChange(i)} className={`${styles.tab} ${active===i ? styles.active : ""}`}>{t}</div>)}
  </div>
);
