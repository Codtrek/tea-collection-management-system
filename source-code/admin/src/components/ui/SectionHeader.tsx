import { C } from '../../styles/tokens'

interface SectionProp {
  title?: string
  children?: React.ReactNode
}

export const SectionHeader = ({ title, children } : SectionProp) => (
  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
    <span style={{ fontSize:13, fontWeight:500, color:C.text }}>{title}</span>
    <div style={{ display:"flex", gap:8 }}>{children}</div>
  </div>
);
