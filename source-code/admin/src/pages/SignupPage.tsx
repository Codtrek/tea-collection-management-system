import { C } from '../styles/tokens'
import { Card } from '../components/ui/Card'
import { Grid } from '../components/ui/Grid'
import { Alert } from '../components/ui/Alert'
import { Btn } from '../components/ui/Button'
import { FormRow,Input } from '../components/ui/Form'
import { Icon } from '../components/ui/Icon'
import { type NavigateFunction } from "react-router-dom";

interface SignupProp {
  onNavigate: NavigateFunction;
  onLogin: NavigateFunction
}


export const SignupPage = ({ onNavigate }: SignupProp) => (
  <div style={{ minHeight:"100vh", background:C.grayLight, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"system-ui,-apple-system,sans-serif", padding:"40px 20px" }}>
    <div style={{ width:560 }}>
      <div style={{ textAlign:"center", marginBottom:24 }}>
        <div style={{ width:48, height:48, background:C.green, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px" }}><Icon name="factory" size={24} color={C.white} /></div>
        <h1 style={{ fontSize:22, fontWeight:600, color:C.text, margin:"0 0 6px" }}>Register Your Factory</h1>
        <p style={{ fontSize:13, color:C.textSub }}>Your registration will be reviewed and approved by our team</p>
      </div>
      <Card style={{ marginBottom:0, padding:28 }}>
        <div style={{ fontSize:13, fontWeight:500, color:C.text, marginBottom:16, paddingBottom:10, borderBottom:`0.5px solid ${C.grayBorder}` }}>Factory Information</div>
        <Grid cols={2} gap={12}>
          <FormRow label="Factory Name"><Input placeholder="e.g. Nuwara Eliya Tea Factory" /></FormRow>
          <FormRow label="BR Number"><Input placeholder="e.g. BR-2024-XXXXX" /></FormRow>
          <FormRow label="Factory Address"><Input placeholder="Street, City, District" /></FormRow>
          <FormRow label="Official Email"><Input type="email" placeholder="factory@example.com" /></FormRow>
          <FormRow label="Official Phone"><Input placeholder="+94 XX XXX XXXX" /></FormRow>
        </Grid>

        <div style={{ fontSize:13, fontWeight:500, color:C.text, margin:"8px 0 16px", paddingBottom:10, borderBottom:`0.5px solid ${C.grayBorder}` }}>Contact Person</div>
        <Grid cols={2} gap={12}>
          <FormRow label="Contact Person Name"><Input placeholder="Full name" /></FormRow>
          <FormRow label="Position / Designation"><Input placeholder="e.g. General Manager" /></FormRow>
        </Grid>

        <div style={{ fontSize:13, fontWeight:500, color:C.text, margin:"8px 0 16px", paddingBottom:10, borderBottom:`0.5px solid ${C.grayBorder}` }}>Documents</div>
        <FormRow label="BR Certificate Upload">
          <div style={{ border:`1.5px dashed ${C.grayBorder}`, borderRadius:8, padding:"20px", textAlign:"center", cursor:"pointer", background:C.grayLight }}>
            <Icon name="upload" size={20} color={C.textSub} />
            <div style={{ fontSize:12, color:C.textSub, marginTop:8 }}>Click to upload or drag and drop</div>
            <div style={{ fontSize:11, color:C.textSub, marginTop:4 }}>PDF, JPG, PNG up to 5MB</div>
          </div>
        </FormRow>

        <Alert type="info">Your registration will be reviewed within 24-48 hours. You will receive an email confirmation once approved.</Alert>

        <Btn primary style={{ width:"100%", justifyContent:"center", padding:"9px", fontSize:13, marginTop:8 }}>Submit Registration</Btn>
        <div style={{ textAlign:"center", marginTop:14, fontSize:12, color:C.textSub }}>
          Already registered? <span style={{ color:C.green, cursor:"pointer", fontWeight:500 }} onClick={() =>  onNavigate("/login")}>Sign in</span>
        </div>
      </Card>
      <div style={{ textAlign:"center", marginTop:16 }}>
        <span style={{ fontSize:12, color:C.textSub, cursor:"pointer" }} onClick={() => onNavigate("/landing")}>← Back to home</span>
      </div>
    </div>
  </div>
);