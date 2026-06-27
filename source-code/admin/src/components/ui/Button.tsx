import { C } from '../../styles/tokens'

interface BtnProps {
  children: React.ReactNode
  primary?: boolean
  danger?: boolean
  small?: boolean
  style?: React.CSSProperties
  onClick?: () => void
}
export const Btn = ({ 
  children,
  primary , 
  danger , 
  small , 
  style = {}, 
  onClick }: BtnProps) => (
  <button onClick={onClick} style={{ padding: small ? "4px 10px" : "7px 14px", borderRadius:6, border:`0.5px solid ${primary ? C.green : danger ? C.red : C.grayBorder}`, background: primary ? C.green : danger ? C.redLight : C.white, color: primary ? C.white : danger ? C.red : C.text, fontSize: small ? 11 : 12, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:5, fontWeight: primary ? 500 : 400, ...style }}>
    {children}
  </button>
);