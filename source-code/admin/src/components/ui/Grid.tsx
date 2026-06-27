import { type GridProps } from '../../types'

export const Grid = ({ cols=2, gap=16, children } : GridProps) => (
  <div style={{ display:"grid", gridTemplateColumns:`repeat(${cols},1fr)`, gap }}>{children}</div>
);