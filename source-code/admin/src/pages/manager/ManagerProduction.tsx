import { C } from '../../styles/tokens'
import { Card } from '../../components/ui/Card'
import { Grid } from '../../components/ui/Grid'
import { MetricCard } from '../../components/ui/MetricCard'

export const ManagerProduction = () => (
  <div>
    <Grid cols={4} gap={12}><div style={{ marginBottom:16, gridColumn:"1/-1", display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
      <MetricCard accent="green" icon="leaf"  label="Total Production" value="14,820 kg" sub="This month" />
      <MetricCard accent="blue"  icon="scale" label="BOP Grade"        value="5,100 kg"  sub="34% of total" />
      <MetricCard accent="amber" icon="scale" label="BOPF Grade"       value="4,200 kg"  sub="28% of total" />
      <MetricCard accent="red"   icon="scale" label="Dust Grades"      value="5,520 kg"  sub="38% of total" />
    </div></Grid>
    <Card>
      <div style={{ fontSize:13, fontWeight:500, color:C.text, marginBottom:12 }}>Production by Grade — June 2025</div>
      {[
        { grade:"BOP (Broken Orange Pekoe)", kg:5100, pct:34 },
        { grade:"BOPF (BOP Fannings)",       kg:4200, pct:28 },
        { grade:"Dust Grade 1",              kg:3100, pct:21 },
        { grade:"Dust Grade 2",              kg:1500, pct:10 },
        { grade:"PF (Pekoe Fannings)",       kg:620,  pct:4  },
        { grade:"OPA",                       kg:300,  pct:2  },
      ].map((g,i) => (
        <div key={g.grade} style={{ marginBottom:10 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
            <span style={{ fontSize:12 }}>{g.grade}</span>
            <span style={{ fontSize:12, fontWeight:500 }}>{g.kg.toLocaleString()} kg ({g.pct}%)</span>
          </div>
          <div style={{ height:6, background:"#f3f4f6", borderRadius:3, overflow:"hidden" }}><div style={{ height:"100%", borderRadius:3, background:i===0?C.green:i===1?C.blue:i===2?C.amber:C.red, width:`${g.pct*2.5}%` }} /></div>
        </div>
      ))}
    </Card>
  </div>
);
