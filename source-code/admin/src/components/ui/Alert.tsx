import { C } from '../../styles/tokens'
import { Icon } from './Icon'

type AlertType = "info" | "warning";

interface AlertProps {
  type?: AlertType 
  children: React.ReactNode
}
export const Alert = ({ type = "info" , children } : AlertProps) => {
  const map = { warning:[C.amberLight,C.amberText,"#fcd34d","warning"], info:[C.blueLight,C.blueText,"#93c5fd","info"] };
  const [bg,txt,border,icon] = map[type]||map.info;
  return <div style={{ padding:"10px 14px", borderRadius:8, fontSize:12, display:"flex", alignItems:"center", gap:8, marginBottom:8, background:bg, color:txt, border:`0.5px solid ${border}` }}><Icon name={icon} size={14} />{children}</div>;
};