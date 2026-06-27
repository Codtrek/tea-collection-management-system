import { Icon } from './Icon'
import styles from "../../styles/modules/components/SearchBar.module.css";

export const SearchBar = ({ placeholder="Search…" }) => (
  <div className={styles.searchBar}>
    <Icon name="search" size={14} />
    <input placeholder={placeholder} className={styles.input} />
  </div>
);
