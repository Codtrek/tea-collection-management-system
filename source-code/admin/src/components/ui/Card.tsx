import { C } from '../../styles/tokens'

interface CardProps {
  children?: React.ReactNode
  style?: React.CSSProperties
}
export const Card = ({ children, style }: CardProps) => (
  <div style={{ background:C.white, border:`0.5px solid ${C.grayBorder}`, borderRadius:10, padding:16, marginBottom:16, ...style }}>{children}</div>
);