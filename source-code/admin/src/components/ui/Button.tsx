import { type ButtonProps } from '../../types'
import styles from "./Button.module.css";

export const Btn = ({ 
  children,
  primary , 
  danger , 
  small , 
  style = {}, 
  className = "",
  onClick }: ButtonProps) => {
  const cls = [
    styles.btn,
    primary ? styles.primary : "",
    danger  ? styles.danger  : "",
    small   ? styles.small   : "",
    className,
  ].filter(Boolean).join(" ");
  return (
    <button className={cls} style={style} onClick={onClick}>{children}</button>
  );
};
