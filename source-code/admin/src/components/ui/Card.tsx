import { C } from '../../styles/tokens'
import { type CardProps } from '../../types'

export const Card = ({ children, style }: CardProps) => (
  <div style={{ background:C.white, border:`0.5px solid ${C.grayBorder}`, borderRadius:10, padding:16, marginBottom:16, ...style }}>{children}</div>
);