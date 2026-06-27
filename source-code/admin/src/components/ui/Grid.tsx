interface GridProps {
  children?: React.ReactNode
  cols?: number
  gap?: number
}

export const Grid = ({ cols=2, gap=16, children } : GridProps) => (
  <div style={{ display:"grid", gridTemplateColumns:`repeat(${cols},1fr)`, gap }}>{children}</div>
);