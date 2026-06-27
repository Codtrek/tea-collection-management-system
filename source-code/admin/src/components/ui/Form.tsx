import { type FormRowProps, type InputProps, type SelectProps, type TextareaProps } from '../../types'
import styles from "./Form.module.css";

export const FormRow = ({ label, children , half = false} : FormRowProps) => (
  <div className={`${styles.formRow} ${half ? styles.half : ""}`}>
    <label className={styles.label}>{label}</label>
    {children}
  </div>
);

export const Input = ({ 
  placeholder , 
  type="text", 
  style  
  } : InputProps) =>  <input type={type} placeholder={placeholder} className={styles.input} style={style} />;

export const Select = ({ children, style } : SelectProps) => <select className={styles.select} style={style}>{children}</select>;
export const Textarea = ({ placeholder, rows=2 } : TextareaProps) => <textarea placeholder={placeholder} rows={rows} className={styles.textarea} />;
