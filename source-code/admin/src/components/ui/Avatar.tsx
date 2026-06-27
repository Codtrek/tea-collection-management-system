import { C } from '../../styles/tokens'

type AvatarColor = "green" | "blue" | "amber";

interface AvatarProps {
  initials: string;
  color?: AvatarColor;
  size?: number;
}

export const Avatar = ({ initials, color = "green", size = 28 } : AvatarProps) => {
  const map = { green:[C.greenLight,C.greenText], blue:[C.blueLight,C.blueText], amber:[C.amberLight,C.amberText] };
  const [bg, txt] = map[color] || map.green;
  return <div style={{ width:size, height:size, borderRadius:"50%", display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:size*0.38, fontWeight:500, background:bg, color:txt, flexShrink:0 }}>{initials}</div>;
};