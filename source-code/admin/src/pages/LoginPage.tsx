import { C } from '../styles/tokens'
import { Card } from '../components/ui/Card'
import { Btn } from '../components/ui/Button'
import { FormRow, Input} from '../components/ui/Form'
import { Icon } from '../components/ui/Icon'
import { type LoginProps } from '../types'

export const LoginPage = ({ onNavigate, onLogin }: LoginProps) => (
  <div style={{ minHeight:"100vh", background:C.grayLight, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"system-ui,-apple-system,sans-serif" }}>
    <div style={{ width:400 }}>
      <div style={{ textAlign:"center", marginBottom:28 }}>
        <div style={{ width:48, height:48, background:C.green, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px" }}><Icon name="leaf" size={24} color={C.white} /></div>
        <h1 style={{ fontSize:22, fontWeight:600, color:C.text, margin:"0 0 6px" }}>Welcome back</h1>
        <p style={{ fontSize:13, color:C.textSub }}>Sign in to Tea CMS</p>
      </div>
      <Card style={{ marginBottom:0, padding:28 }}>
        <FormRow label="NIC Number"><Input placeholder="Enter your NIC number" /></FormRow>
        <FormRow label="Password"><Input type="password" placeholder="Enter your password" /></FormRow>
        <Btn primary style={{ width:"100%", justifyContent:"center", padding:"9px", fontSize:13, marginTop:4 }} onClick={() => onLogin("officer")}>Sign In as Officer</Btn>
        <Btn style={{ width:"100%", justifyContent:"center", padding:"9px", fontSize:13, marginTop:8 }} onClick={() => onLogin("manager")}>Sign In as Manager</Btn>
        <Btn style={{ width:"100%", justifyContent:"center", padding:"9px", fontSize:13, marginTop:8, background:C.blueLight, color:C.blue, borderColor:C.blue }} onClick={() => onLogin("admin")}>Sign In as Dev Admin</Btn>
        <div style={{ textAlign:"center", marginTop:16, fontSize:12, color:C.textSub }}>
          Don't have an account? <span style={{ color:C.green, cursor:"pointer", fontWeight:500 }} onClick={() => onNavigate("/signup")}>Register factory</span>
        </div>
      </Card>
      <div style={{ textAlign:"center", marginTop:16 }}>
        <span style={{ fontSize:12, color:C.textSub, cursor:"pointer" }} onClick={() => onNavigate("/landing")}>← Back to home</span>
      </div>
    </div>
  </div>
);
