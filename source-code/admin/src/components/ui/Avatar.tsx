import { type CSSProperties } from "react";
import { type AvatarProps } from '../../types'
import styles from "../../styles/modules/components/Avatar.module.css";

export const Avatar = ({ initials, color = "green", size = 28 } : AvatarProps) => (
  <div
    className={`${styles.avatar} ${styles[color]}`}
    style={{ "--avatar-size": `${size}px` } as CSSProperties}
  >
    {initials}
  </div>
);
