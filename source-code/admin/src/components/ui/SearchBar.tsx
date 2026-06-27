import { C } from '../../styles/tokens'
import { Icon } from './Icon'

export const SearchBar = ({ placeholder="Search…" }) => (
  <div style={{ display:"flex", alignItems:"center", gap:8, background:C.grayLight, border:`0.5px solid ${C.grayBorder}`, borderRadius:6, padding:"6px 10px", flex:1, maxWidth:240 }}>
    <Icon name="search" size={14} color={C.textSub} />
    <input placeholder={placeholder} style={{ background:"none", border:"none", outline:"none", color:C.text, fontSize:12, flex:1 }} />
  </div>
);