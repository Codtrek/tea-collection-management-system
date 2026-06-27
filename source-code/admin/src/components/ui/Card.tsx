import { type CardProps } from '../../types'
import styles from "./Card.module.css";

export const Card = ({ children, style, className = "" }: CardProps) => (
  <div className={`${styles.card} ${className}`.trim()} style={style}>{children}</div>
);
