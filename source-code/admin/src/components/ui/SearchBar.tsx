import { Icon } from './Icon'
import styles from "./SearchBar.module.css";

export const SearchBar = ({ placeholder="Search…" }) => (
  <div className={styles.searchBar}>
    <span className={styles.iconWrap}><Icon name="search" size={14} /></span>
    <input placeholder={placeholder} className={styles.input} />
  </div>
);
