import { type TableProps } from '../../types'
import styles from "./Table.module.css";

export const Table = ({ headers, rows } : TableProps) => (
  <table className={styles.table}>
    <thead><tr>{headers.map(h => <th key={h} className={styles.th}>{h}</th>)}</tr></thead>
    <tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell,j) => <td key={j} className={styles.td}>{cell}</td>)}</tr>)}</tbody>
  </table>
);
