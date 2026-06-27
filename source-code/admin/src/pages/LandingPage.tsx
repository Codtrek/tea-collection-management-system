
import { C } from '../styles/tokens'
import { Icon } from '../components/ui/Icon'
import { Btn } from '../components//ui/Button'
import { type NavigateProps } from '../types'

export const LandingPage = ({ onNavigate }: NavigateProps) => (
  <div style={{ fontFamily:"system-ui,-apple-system,sans-serif", background:C.white, minHeight:"100vh" }}>
    {/* Nav */}
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 48px", borderBottom:`0.5px solid ${C.grayBorder}`, position:"sticky", top:0, background:C.white, zIndex:10 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:32, height:32, background:C.green, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center" }}><Icon name="leaf" size={18} color={C.white} /></div>
        <span style={{ fontSize:16, fontWeight:600, color:C.text }}>Tea CMS</span>
      </div>
      <div style={{ display:"flex", gap:10 }}>
        <Btn onClick={() =>  onNavigate("/login")}>Login</Btn>
        <Btn primary onClick={() => onNavigate("signup")}>Register Factory</Btn>
      </div>
    </div>

    {/* Hero */}
    <div style={{ background:`linear-gradient(135deg, ${C.greenDark} 0%, #2D6A4F 60%, #52b788 100%)`, padding:"80px 48px", textAlign:"center", color:C.white }}>
      <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(255,255,255,0.12)", padding:"6px 16px", borderRadius:20, fontSize:12, marginBottom:24, border:"0.5px solid rgba(255,255,255,0.2)" }}>
        <Icon name="leaf" size={13} /> Sri Lanka Tea Industry — Digital Management
      </div>
      <h1 style={{ fontSize:42, fontWeight:700, margin:"0 0 16px", lineHeight:1.2 }}>Manage Your Tea Factory<br />From Field to Factory</h1>
      <p style={{ fontSize:16, color:"rgba(255,255,255,0.8)", maxWidth:520, margin:"0 auto 36px", lineHeight:1.6 }}>A complete digital platform for Sri Lankan tea estates and factories — track collections, manage employees, handle payments, and analyze production in one place.</p>
      <div style={{ display:"flex", gap:12, justifyContent:"center" }}>
        <Btn primary style={{ background:C.white, color:C.green, borderColor:C.white, padding:"10px 24px", fontSize:14 }} onClick={() => onNavigate("signup")}>Get Started Free</Btn>
        <Btn style={{ background:"rgba(255,255,255,0.1)", color:C.white, borderColor:"rgba(255,255,255,0.3)", padding:"10px 24px", fontSize:14 }} onClick={() =>  onNavigate("/login")}>Sign In</Btn>
      </div>
    </div>

    {/* Stats */}
    <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:0, borderBottom:`0.5px solid ${C.grayBorder}` }}>
      {[
        { val:"2,400+", label:"Tonnes Tracked Monthly" },
        { val:"150+",   label:"Registered Factories" },
        { val:"12,000+",label:"Employees Managed" },
        { val:"99.9%",  label:"System Uptime" },
      ].map((s,i) => (
        <div key={i} style={{ padding:"28px 32px", textAlign:"center", borderRight: i<3 ? `0.5px solid ${C.grayBorder}` : "none" }}>
          <div style={{ fontSize:28, fontWeight:700, color:C.green }}>{s.val}</div>
          <div style={{ fontSize:12, color:C.textSub, marginTop:4 }}>{s.label}</div>
        </div>
      ))}
    </div>

    {/* Features */}
    <div style={{ padding:"64px 48px" }}>
      <div style={{ textAlign:"center", marginBottom:48 }}>
        <h2 style={{ fontSize:28, fontWeight:600, color:C.text, margin:"0 0 12px" }}>Everything Your Factory Needs</h2>
        <p style={{ fontSize:14, color:C.textSub }}>Designed specifically for Sri Lankan tea estate and factory operations</p>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:24 }}>
        {[
          { icon:"scale",    title:"Tea Collection Tracking",     desc:"Record daily tea leaf weights from every estate. Track quality grades, verify collections with OTP, and capture photo evidence." },
          { icon:"seeding",  title:"Fertilizer Management",        desc:"Manage fertilizer stock, issue to estates, and automatically deduct costs from monthly tea leaf payment calculations." },
          { icon:"users",    title:"Employee Management",          desc:"Register employees, track attendance, manage salary advances, and process monthly payroll — all in one place." },
          { icon:"truck",    title:"Supplier & Estate Management", desc:"Register tea estate suppliers, assign collection routes, and track their delivery history and payment status." },
          { icon:"cash",     title:"Payments & Deductions",        desc:"Calculate tea leaf fees, apply fertilizer and transport deductions, issue salary advances, and finalize monthly payments." },
          { icon:"chart",    title:"Analytics & Reports",          desc:"Visualize collection trends by route and supplier, analyze employee performance, and generate financial reports." },
        ].map(f => (
          <div key={f.title} style={{ background:C.grayLight, borderRadius:12, padding:24, border:`0.5px solid ${C.grayBorder}` }}>
            <div style={{ width:40, height:40, background:C.greenLight, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", color:C.green, marginBottom:14 }}><Icon name={f.icon} size={20} /></div>
            <div style={{ fontSize:14, fontWeight:600, color:C.text, marginBottom:8 }}>{f.title}</div>
            <div style={{ fontSize:12, color:C.textSub, lineHeight:1.6 }}>{f.desc}</div>
          </div>
        ))}
      </div>
    </div>

    {/* Workflow */}
    <div style={{ padding:"48px 48px 64px", background:C.grayLight, borderTop:`0.5px solid ${C.grayBorder}` }}>
      <div style={{ textAlign:"center", marginBottom:40 }}>
        <h2 style={{ fontSize:24, fontWeight:600, color:C.text, margin:"0 0 10px" }}>How It Works</h2>
        <p style={{ fontSize:13, color:C.textSub }}>Simple workflow from estate to factory</p>
      </div>
      <div style={{ display:"flex", alignItems:"flex-start", gap:0, maxWidth:900, margin:"0 auto" }}>
        {[
          { num:"01", title:"Register",    desc:"Factory registers and gets approved by the Tea CMS admin team." },
          { num:"02", title:"Setup",       desc:"Add employees, suppliers, estates, and configure collection routes." },
          { num:"03", title:"Collect",     desc:"Collection agents visit estates, record tea weights with OTP verification." },
          { num:"04", title:"Process",     desc:"Officers enter data, manage inventory, and track daily operations." },
          { num:"05", title:"Pay",         desc:"System calculates fees, applies deductions, and processes payments." },
        ].map((s,i) => (
          <div key={i} style={{ flex:1, textAlign:"center", padding:"0 12px", position:"relative" }}>
            <div style={{ width:40, height:40, borderRadius:"50%", background:C.green, color:C.white, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, margin:"0 auto 12px" }}>{s.num}</div>
            {i < 4 && <div style={{ position:"absolute", top:20, left:"60%", right:"-10%", height:"0.5px", background:C.grayBorder }} />}
            <div style={{ fontSize:13, fontWeight:600, color:C.text, marginBottom:6 }}>{s.title}</div>
            <div style={{ fontSize:11, color:C.textSub, lineHeight:1.5 }}>{s.desc}</div>
          </div>
        ))}
      </div>
    </div>

    {/* CTA */}
    <div style={{ padding:"48px", textAlign:"center", background:C.greenDark, color:C.white }}>
      <h2 style={{ fontSize:24, fontWeight:600, margin:"0 0 12px" }}>Ready to digitize your factory?</h2>
      <p style={{ fontSize:13, color:"rgba(255,255,255,0.7)", marginBottom:24 }}>Register your factory today and start managing operations digitally.</p>
      <Btn primary style={{ background:C.white, color:C.green, borderColor:C.white, padding:"10px 28px", fontSize:14 }} onClick={() => onNavigate("signup")}>Register Your Factory</Btn>
    </div>

    {/* Footer */}
    <div style={{ padding:"20px 48px", borderTop:`0.5px solid ${C.grayBorder}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ width:20, height:20, background:C.green, borderRadius:4, display:"flex", alignItems:"center", justifyContent:"center" }}><Icon name="leaf" size={12} color={C.white} /></div>
        <span style={{ fontSize:12, color:C.textSub }}>Tea CMS © 2025</span>
      </div>
      <span style={{ fontSize:11, color:C.textSub }}>University of Colombo School of Computing — Industry Project</span>
    </div>
  </div>
);