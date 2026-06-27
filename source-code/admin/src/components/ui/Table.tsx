import { C } from '../../styles/tokens'
import { type TableProps } from '../../types'

export const Table = ({ headers, rows } : TableProps) => (
  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
    <thead><tr>{headers.map(h => <th key={h} style={{ textAlign:"left", fontSize:11, fontWeight:500, color:C.textSub, padding:"8px 12px", borderBottom:`0.5px solid ${C.grayBorder}` }}>{h}</th>)}</tr></thead>
    <tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell,j) => <td key={j} style={{ padding:"9px 12px", borderBottom:`0.5px solid ${C.grayBorder}`, color:C.text, verticalAlign:"middle" }}>{cell}</td>)}</tr>)}</tbody>
  </table>
);