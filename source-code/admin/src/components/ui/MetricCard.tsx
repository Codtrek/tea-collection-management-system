import { C } from '../../styles/tokens'
import { Icon } from './Icon'

interface MetricProps {
  label?: string
  value?: string
  sub?: string
  accent?: string
  icon?: string
}
export const MetricCard = ({ label, value, sub, accent, icon } :MetricProps ) => {
  const accents = { green:C.green, amber:C.amber, blue:C.blue, red:C.red };
  return (
    <div style={{ background:C.white, border:`0.5px solid ${C.grayBorder}`, borderRadius:10, padding:"14px 16px", borderLeft:`3px solid ${accents[accent]||C.green}` }}>
      <div style={{ fontSize:11, color:C.textSub, marginBottom:6, display:"flex", alignItems:"center", gap:5 }}><Icon name={icon} size={13} /> {label}</div>
      <div style={{ fontSize:22, fontWeight:500, color:C.text, lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:11, color:C.textSub, marginTop:4 }}>{sub}</div>
    </div>
  );
};
