import { C } from '../../styles/tokens'
import { type ProgressBarProps } from '../../types'

export const ProgressBar = ({ label, value, color=C.green } : ProgressBarProps) => (
  <div style={{ marginBottom:10 }}>
    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}><span style={{ fontSize:12 }}>{label}</span><span style={{ fontSize:12, fontWeight:500 }}>{value}%</span></div>
    <div style={{ height:6, background:"#f3f4f6", borderRadius:3, overflow:"hidden" }}><div style={{ height:"100%", borderRadius:3, background:color, width:`${value}%` }} /></div>
  </div>
);