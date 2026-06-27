import { C } from '../../styles/tokens'
import { Card } from '../../components/ui/Card'
import { Grid } from '../../components/ui/Grid'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { MetricCard } from '../../components/ui/MetricCard'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { Table } from '../../components/ui/Table'


export const ManagerDashboard = () => (
  <div>
    <Grid cols={4} gap={12}>
        <div style={{ marginBottom:20, gridColumn:"1/-1", display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
            <MetricCard accent="green" icon="scale"    label="Total Collected (June)" value="44,100 kg" sub="↑ 8% vs last month" />
            <MetricCard accent="amber" icon="currency" label="Income This Month"      value="LKR 8.8M"  sub="Before deductions" />
            <MetricCard accent="red"   icon="receipt"  label="Expenses This Month"    value="LKR 485K"  sub="↑ 8% vs last month" />
            <MetricCard accent="blue"  icon="leaf"     label="Grade A %"              value="68%"       sub="↑ 4% from last week" />
        </div>
    </Grid>

    <Grid cols={2} gap={16}>
      <Card>
        <SectionHeader title="Weekly Tea Collection (kg)" />
        <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:100, paddingTop:8 }}>
          {[55,70,48,90,75,82,65].map((h,i) => <div key={i} style={{ flex:1, background: i===6?C.amber:C.green, borderRadius:"3px 3px 0 0", height:`${h}%`, opacity:0.85 }} />)}
        </div>
        <div style={{ display:"flex", gap:6, marginTop:4 }}>
          {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => <div key={d} style={{ flex:1, textAlign:"center", fontSize:10, color:C.textSub }}>{d}</div>)}
        </div>
      </Card>
      <Card>
        <SectionHeader title="Income vs Expenses — June 2025" />
        <div style={{ background:C.grayLight, borderRadius:8, padding:14, fontSize:12 }}>
          {[
            { label:"Total income",       val:"LKR 8,820,000", color:C.green },
            { label:"Total expenses",     val:"LKR 485,000",   color:C.red },
            { label:"Salary payroll",     val:"LKR 2,415,000", color:C.red },
            { label:"Supplier payments",  val:"LKR 7,920,000", color:C.red },
            { label:"Net profit/loss",    val:"LKR −2,000,000",color:C.red, bold:true },
          ].map(i => (
            <div key={i.label} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:`0.5px solid ${C.grayBorder}` }}>
              <span style={{ color:C.textSub }}>{i.label}</span>
              <span style={{ fontWeight: i.bold ? 600 : 500, color:i.color }}>{i.val}</span>
            </div>
          ))}
        </div>
      </Card>
    </Grid>

    <Card>
      <SectionHeader title="Top Suppliers This Month">
        <Badge color="green">June 2025</Badge>
      </SectionHeader>
      <Table
        headers={["Supplier","Estate","Route","Total Weight","Grade A %","Fee Payable","Status"]}
        rows={[
          [<div style={{display:"flex",alignItems:"center",gap:7}}><Avatar initials="KW" color="amber" size={24}/> Kamani Wijesiri</div>,"Uva Highlands","Route C","6,540 kg",<Badge color="green">74%</Badge>,"LKR 126,000",<Badge color="green">Paid</Badge>],
          [<div style={{display:"flex",alignItems:"center",gap:7}}><Avatar initials="NK" color="green" size={24}/> Nimal Kumara</div>,"Ella Estate","Route A","4,820 kg",<Badge color="green">82%</Badge>,"LKR 92,800",<Badge color="amber">Pending</Badge>],
          [<div style={{display:"flex",alignItems:"center",gap:7}}><Avatar initials="SP" color="blue" size={24}/> Saman Perera</div>,"Dimbula Plot","Route B","3,210 kg",<Badge color="amber">61%</Badge>,"LKR 61,500",<Badge color="amber">Pending</Badge>],
        ]}
      />
    </Card>
  </div>
);