import { C } from '../../styles/tokens'
import { type CSSProperties } from "react";
import { type FormRowProps, type InputProps, type SelectProps, type TextareaProps } from '../../types'

export const FormRow = ({ label, children , half = false} : FormRowProps) => (
  <div style={{ display:"flex", flexDirection:"column", gap:4, marginBottom:12, gridColumn: half ? "span 1" : undefined }}>
    <label style={{ fontSize:11, color:C.textSub, fontWeight:500 }}>{label}</label>
    {children}
  </div>
);

export const inp : CSSProperties = { 
  padding:"7px 10px", 
  border:`0.5px solid ${C.grayBorder}`, 
  borderRadius:6, background:C.white, 
  color:C.text, 
  fontSize:12, 
  outline:"none", 
  width:"100%", 
  boxSizing:"border-box" 
};

export const Input = ({ 
  placeholder , 
  type="text", 
  style  
  } : InputProps) =>  <input type={type} placeholder={placeholder} style={{ ...inp, ...style }} />;

export const Select = ({ children, style } : SelectProps) => <select style={{ ...inp, ...style }}>{children}</select>;
export const Textarea = ({ placeholder, rows=2 } : TextareaProps) => <textarea placeholder={placeholder} rows={rows} style={{ ...inp, resize:"none" }} />;
