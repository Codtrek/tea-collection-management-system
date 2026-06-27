import { Icon } from './Icon'
import { type AlertProps } from '../../types'
import styles from "./Alert.module.css";

export const Alert = ({ type = "info" , children } : AlertProps) => {
  const iconMap = { warning: "warning", info: "info" } as const;
  return (
    <div className={`${styles.alert} ${styles[type]}`}>
      <Icon name={iconMap[type] || "info"} size={14} />{children}
    </div>
  );
};
