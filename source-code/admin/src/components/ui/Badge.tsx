import { C } from '../../styles/tokens'
type BadgeColor = "green" | "amber" | "red" | "blue" | "gray";

 interface BadgeProp {
  color?: BadgeColor
  children?: React.ReactNode
 }

export const Badge = ({ color = "gray", children } : BadgeProp) => {
  const map = { green:[C.greenLight,C.greenText], amber:[C.amberLight,C.amberText], red:[C.redLight,C.redText], blue:[C.blueLight,C.blueText], gray:["#f3f4f6","#6b7280"] };
  const [bg, txt] = map[color] || map.gray;
  return <span style={{ display:"inline-flex", alignItems:"center", padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:500, background:bg, color:txt }}>{children}</span>;
};