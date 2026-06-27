import { C } from '../styles/tokens'
import { Icon } from '../components/ui/Icon'
import { Btn } from '../components//ui/Button'
import { Avatar } from '../components/ui/Avatar';

interface NavItem {
  key: string;
  icon: string;
  label: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

interface SidebarUser {
  initials: string;
  name: string;
  role: string;
}

interface SidebarProps {
  nav: NavSection[];
  active: string;
  onNav: (key: string) => void;
  title: string;
  badge?: string;
  user: SidebarUser;    
  role: string;
  children: React.ReactNode;
}

export const SidebarLayout = ({ nav, active, onNav, title, badge, user, role, children } : SidebarProps) => (
  <div style={{ display:"flex", height:"100vh", background:C.grayLight, fontFamily:"system-ui,-apple-system,sans-serif", fontSize:13 }}>
    <div style={{ width:200, background:C.greenDark, color:"#e8f5ee", display:"flex", flexDirection:"column", flexShrink:0 }}>
      <div style={{ padding:"16px 16px 12px", borderBottom:"0.5px solid rgba(255,255,255,0.1)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:28, height:28, background:C.green, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", color:C.white }}><Icon name="leaf" size={16} /></div>
          <div><div style={{ fontSize:14, fontWeight:500, color:C.white }}>Tea CMS</div><div style={{ fontSize:10, color:"rgba(255,255,255,0.45)", marginTop:2 }}>{role}</div></div>
        </div>
      </div>
      {nav.map(section => (
        <div key={section.label} style={{ padding:"8px 0" }}>
          <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", padding:"6px 16px 4px", letterSpacing:"0.06em", textTransform:"uppercase" }}>{section.label}</div>
          {section.items.map(item => (
            <div key={item.key} onClick={() => onNav(item.key)} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 16px", cursor:"pointer", color: active===item.key ? C.white : "rgba(255,255,255,0.65)", fontSize:12.5, background: active===item.key ? "rgba(255,255,255,0.12)" : "transparent" }}>
              <Icon name={item.icon} size={15} /> {item.label}
            </div>
          ))}
        </div>
      ))}
      <div style={{ flex:1 }} />
      <div style={{ padding:"12px 16px", borderTop:"0.5px solid rgba(255,255,255,0.1)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <Avatar initials={user.initials} size={28} />
          <div><div style={{ fontSize:12, color:C.white }}>{user.name}</div><div style={{ fontSize:10, color:"rgba(255,255,255,0.4)" }}>{user.role}</div></div>
        </div>
      </div>
    </div>
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ height:48, background:C.white, borderBottom:`0.5px solid ${C.grayBorder}`, display:"flex", alignItems:"center", padding:"0 20px", gap:12 }}>
        <span style={{ fontSize:14, fontWeight:500, color:C.text, flex:1 }}>{title}</span>
        {badge && <span style={{ fontSize:11, background:C.greenLight, color:C.green, padding:"3px 10px", borderRadius:20, border:`0.5px solid #b7dbc8`, display:"flex", alignItems:"center", gap:4 }}><Icon name="leaf" size={11} /> {badge}</span>}
        <Btn><Icon name="bell" size={14} /></Btn>
        <Btn><Icon name="settings" size={14} /></Btn>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:20 }}>{children}</div>
    </div>
  </div>
);