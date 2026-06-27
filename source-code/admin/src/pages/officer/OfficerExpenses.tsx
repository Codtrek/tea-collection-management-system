import { C } from '../../styles/tokens'
import { Card } from '../../components/ui/Card'
import { Grid } from '../../components/ui/Grid'
import { Btn } from '../../components/ui/Button'
import { FormRow, Input, Select, Textarea } from '../../components/ui/Form'
import { Icon } from '../../components/ui/Icon'
import { MetricCard } from '../../components/ui/MetricCard'
import { Table } from '../../components/ui/Table'

export const OfficerExpenses = () => (
  <div>
    <Grid cols={3} gap={12}><div style={{ marginBottom:16, gridColumn:"1/-1", display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
      <MetricCard accent="red"   icon="receipt"  label="Total Expenses (June)" value="LKR 485K" sub="All categories" />
      <MetricCard accent="amber" icon="currency" label="Pending Entries"       value="3"        sub="Not yet recorded" />
      <MetricCard accent="blue"  icon="chart"    label="vs Last Month"         value="↑ 8%"    sub="LKR 35K increase" />
    </div></Grid>
    <Grid cols={2} gap={16}>
      <Card>
        <div style={{ fontSize:13, fontWeight:500, color:C.text, marginBottom:14 }}>Enter Expense</div>
        <FormRow label="Expense Category"><Select><option>Utilities</option><option>Maintenance</option><option>Transport</option><option>Office Supplies</option><option>Equipment</option><option>Other</option></Select></FormRow>
        <FormRow label="Amount (LKR)"><Input placeholder="0.00" /></FormRow>
        <FormRow label="Date"><Input type="date" /></FormRow>
        <FormRow label="Vendor / Payee"><Input placeholder="Who was paid" /></FormRow>
        <FormRow label="Description"><Textarea placeholder="What was this expense for…" /></FormRow>
        <FormRow label="Receipt / Evidence"><div style={{ border:`1.5px dashed ${C.grayBorder}`, borderRadius:6, padding:14, textAlign:"center", cursor:"pointer" }}><Icon name="upload" size={16} color={C.textSub} /><div style={{ fontSize:11, color:C.textSub, marginTop:6 }}>Upload receipt</div></div></FormRow>
        <Btn primary style={{ width:"100%", justifyContent:"center", marginTop:4 }}><Icon name="check" size={13} /> Record Expense</Btn>
      </Card>
      <Card>
        <div style={{ fontSize:13, fontWeight:500, color:C.text, marginBottom:12 }}>Recent Expenses</div>
        <Table headers={["Category","Amount","Date","Vendor"]} rows={[
          ["Utilities","LKR 45,000","2025-06-20","CEB"],
          ["Transport","LKR 18,500","2025-06-18","Silva Transport"],
          ["Maintenance","LKR 32,000","2025-06-15","Perera Services"],
          ["Office Supplies","LKR 8,200","2025-06-12","Cargills"],
        ]} />
      </Card>
    </Grid>
  </div>
);