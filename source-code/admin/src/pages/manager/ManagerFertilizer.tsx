import { C } from '../../styles/tokens'
import { Card } from '../../components/ui/Card'
import { Grid } from '../../components/ui/Grid'
import { Badge } from '../../components/ui/Badge'
import { MetricCard } from '../../components/ui/MetricCard'
import { Table } from '../../components/ui/Table'


export const ManagerFertilizer = () => (
  <div>
    <Grid cols={3} gap={12}><div style={{ marginBottom:16, gridColumn:"1/-1", display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
      <MetricCard accent="green" icon="seeding" label="Total Stock"        value="2,450 kg"  sub="All fertilizer types" />
      <MetricCard accent="red"   icon="warning" label="Expiring Soon"      value="2 items"   sub="Within 7 days" />
      <MetricCard accent="amber" icon="currency" label="Stock Value"        value="LKR 245K"  sub="Current inventory" />
    </div></Grid>
    <Card>
      <div style={{ fontSize:13, fontWeight:500, color:C.text, marginBottom:12 }}>Fertilizer Stock Status</div>
      <Table headers={["Fertilizer","Batch","In Stock","Value","Expiry","Status"]} rows={[
        ["Urea 46%","BATCH-2241","480 kg","LKR 40,800","2026-06-29",<Badge color="red">Expiring Soon</Badge>],
        ["NPK 15-15-15","BATCH-2198","1,200 kg","LKR 144,000","2026-09-14",<Badge color="green">Good</Badge>],
        ["Muriate of Potash","BATCH-2205","320 kg","LKR 30,400","2026-07-01",<Badge color="amber">Caution</Badge>],
        ["Rock Phosphate","BATCH-2180","450 kg","LKR 32,400","2026-11-20",<Badge color="green">Good</Badge>],
      ]} />
    </Card>
  </div>
);