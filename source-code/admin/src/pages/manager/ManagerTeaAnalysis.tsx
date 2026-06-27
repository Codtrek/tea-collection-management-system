import { C } from '../../styles/tokens'
import { Card } from '../../components/ui/Card'
import { Grid } from '../../components/ui/Grid'
import { Badge } from '../../components/ui/Badge'
import { Btn } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { MetricCard } from '../../components/ui/MetricCard'
import { SearchBar } from '../../components/ui/SearchBar'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { Table } from '../../components/ui/Table'

export const ManagerTeaAnalysis = () => (
  <div>
    <Grid cols={3} gap={12}><div style={{ marginBottom:16, gridColumn:"1/-1", display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
      <MetricCard accent="green" icon="scale"  label="Total This Month"    value="44,100 kg" sub="Across all routes" />
      <MetricCard accent="blue"  icon="route"  label="Active Routes"       value="5"         sub="All operational" />
      <MetricCard accent="amber" icon="truck"  label="Active Suppliers"    value="38"        sub="6 deliveries today" />
    </div></Grid>
    <Grid cols={2} gap={16}>
      <Card>
        <div style={{ fontSize:13, fontWeight:500, color:C.text, marginBottom:14 }}>Collection by Route</div>
        {[
          { route:"Route A — Ella",    kg:14200, pct:32, color:C.green },
          { route:"Route B — Dimbula", kg:10800, pct:24, color:C.blue },
          { route:"Route C — Uva",     kg:11500, pct:26, color:C.amber },
          { route:"Route D — Matale",  kg:7600,  pct:18, color:"#7c3aed" },
        ].map(r => (
          <div key={r.route} style={{ marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <span style={{ fontSize:12 }}>{r.route}</span>
              <span style={{ fontSize:12, fontWeight:500 }}>{r.kg.toLocaleString()} kg ({r.pct}%)</span>
            </div>
            <div style={{ height:8, background:"#f3f4f6", borderRadius:4, overflow:"hidden" }}><div style={{ height:"100%", borderRadius:4, background:r.color, width:`${r.pct*3}%` }} /></div>
          </div>
        ))}
      </Card>
      <Card>
        <div style={{ fontSize:13, fontWeight:500, color:C.text, marginBottom:14 }}>Quality Grade Distribution</div>
        {[
          { grade:"Grade A — Premium",  kg:29988, pct:68, color:C.green },
          { grade:"Grade B — Standard", kg:10584, pct:24, color:C.amber },
          { grade:"Grade C — Reject",   kg:3528,  pct:8,  color:C.red },
        ].map(r => (
          <div key={r.grade} style={{ marginBottom:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <span style={{ fontSize:12 }}>{r.grade}</span>
              <span style={{ fontSize:12, fontWeight:500 }}>{r.kg.toLocaleString()} kg ({r.pct}%)</span>
            </div>
            <div style={{ height:8, background:"#f3f4f6", borderRadius:4, overflow:"hidden" }}><div style={{ height:"100%", borderRadius:4, background:r.color, width:`${r.pct}%` }} /></div>
          </div>
        ))}
      </Card>
    </Grid>
    <Card>
      <SectionHeader title="Collection by Supplier">
        <SearchBar placeholder="Search supplier…" />
        <Btn><Icon name="filter" size={13} /> Filter by Route</Btn>
      </SectionHeader>
      <Table
        headers={["Supplier","Estate","Route","Weight (kg)","Grade A %","Trend","Status"]}
        rows={[
          ["Kamani Wijesiri","Uva Highlands","Route C","6,540 kg",<Badge color="green">74%</Badge>,"↑ 12%",<Badge color="green">Active</Badge>],
          ["Nimal Kumara","Ella Estate","Route A","4,820 kg",<Badge color="green">82%</Badge>,"↑ 5%",<Badge color="green">Active</Badge>],
          ["Saman Perera","Dimbula Plot","Route B","3,210 kg",<Badge color="amber">61%</Badge>,"↓ 3%",<Badge color="green">Active</Badge>],
        ]}
      />
    </Card>
  </div>
);
