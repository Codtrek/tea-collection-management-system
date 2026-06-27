import { C } from '../../styles/tokens'
import { type TabsProps } from '../../types'

export const Tabs = ({ tabs, active, onChange } : TabsProps) => (
  <div style={{ display:"flex", gap:2, borderBottom:`0.5px solid ${C.grayBorder}`, marginBottom:16 }}>
    {tabs.map((t,i) => <div key={t} onClick={() => onChange(i)} style={{ padding:"7px 14px", fontSize:12, cursor:"pointer", color: active===i ? C.green : C.textSub, borderBottom: active===i ? `2px solid ${C.green}` : "2px solid transparent", marginBottom:-1, fontWeight: active===i ? 500 : 400 }}>{t}</div>)}
  </div>
);
