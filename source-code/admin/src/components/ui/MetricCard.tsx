import { Icon } from './Icon'
import { type MetricCardProps } from '../../types'
import styles from "./MetricCard.module.css";

export const MetricCard = ({ label, value, sub, accent, icon } :MetricCardProps ) => {
  const accentClass = {
    green: styles.accentGreen,
    amber: styles.accentAmber,
    blue:  styles.accentBlue,
    red:   styles.accentRed,
  }[accent ?? "green"];

  return (
    <div className={`${styles.card} ${accentClass}`}>
      <div className={styles.label}><Icon name={icon || "leaf"} size={13} /> {label}</div>
      <div className={styles.value}>{value}</div>
      <div className={styles.sub}>{sub}</div>
    </div>
  );
};
