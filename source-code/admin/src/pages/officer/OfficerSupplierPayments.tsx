import { C } from '../../styles/tokens'
import { Card } from '../../components/ui/Card'
import { Grid } from '../../components/ui/Grid'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Btn } from '../../components/ui/Button'
import { FormRow , Input ,Select, Textarea} from '../../components/ui/Form'
import { Icon } from '../../components/ui/Icon'
import { MetricCard } from '../../components/ui/MetricCard'
import { SearchBar } from '../../components/ui/SearchBar'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { Table } from '../../components/ui/Table'

export const OfficerSupplierPayments = () => (
  <div>
    <Grid cols={3} gap={12}><div style={{ marginBottom:16, gridColumn:"1/-1", display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
      <MetricCard accent="green" icon="scale"    label="Total Tea Weight (June)" value="44,100 kg" sub="Across 38 suppliers" />
      <MetricCard accent="amber" icon="currency" label="Total Fees Payable"      value="LKR 8.8M"  sub="Before deductions" />
      <MetricCard accent="blue"  icon="cash"     label="Net After Deductions"    value="LKR 7.9M"  sub="Fertilizer + transport" />
    </div></Grid>

    <Card>
      <SectionHeader title="Supplier Tea Leaf Fees — June 2025">
        <SearchBar placeholder="Search supplier…" />
        <Btn><Icon name="filter" size={13} /> Filter</Btn>
      </SectionHeader>
      <Table
        headers={["Supplier","Estate","Tea Weight (kg)","Gross Fee","Fertilizer Ded.","Transport Ded.","Net Payable","Advance","Status","Action"]}
        rows={[
          [<div style={{display:"flex",alignItems:"center",gap:7}}><Avatar initials="NK" size={24} color="green"/>Nimal Kumara</div>,"Ella Estate","4,820 kg","LKR 96,400","LKR 2,400","LKR 1,200","LKR 92,800","LKR 15,000",<Badge color="amber">Pending</Badge>,<Btn small primary>Pay</Btn>],
          [<div style={{display:"flex",alignItems:"center",gap:7}}><Avatar initials="SP" size={24} color="blue"/>Saman Perera</div>,"Dimbula Plot","3,210 kg","LKR 64,200","LKR 1,800","LKR 900","LKR 61,500","Cleared",<Badge color="amber">Pending</Badge>,<Btn small primary>Pay</Btn>],
          [<div style={{display:"flex",alignItems:"center",gap:7}}><Avatar initials="KW" size={24} color="amber"/>Kamani Wijesiri</div>,"Uva Highlands","6,540 kg","LKR 130,800","LKR 3,200","LKR 1,600","LKR 126,000","LKR 28,000",<Badge color="green">Paid</Badge>,<Btn small>Receipt</Btn>],
        ]}
      />
    </Card>

    <Grid cols={2} gap={16}>
      <Card>
        <div style={{ fontSize:13, fontWeight:500, color:C.text, marginBottom:14 }}>Pay Tea Leaf Fee Advance</div>
        <FormRow label="Supplier"><Select><option>Select supplier…</option></Select></FormRow>
        <FormRow label="Advance Amount (LKR)"><Input placeholder="0.00" /></FormRow>
        <FormRow label="Reason"><Textarea placeholder="Reason for advance payment…" rows={2} /></FormRow>
        <Btn primary style={{ width:"100%", justifyContent:"center", marginTop:8 }}>Issue Leaf Fee Advance</Btn>
      </Card>
      <Card>
        <div style={{ fontSize:13, fontWeight:500, color:C.text, marginBottom:14 }}>Fee Calculation Summary</div>
        <div style={{ background:C.grayLight, borderRadius:8, padding:14, fontSize:12 }}>
          {[
            { label:"Tea price per kg",        val:"LKR 20.00" },
            { label:"Fertilizer deduction/kg",  val:"LKR 0.50" },
            { label:"Transport deduction/kg",   val:"LKR 0.25" },
            { label:"Net rate per kg",          val:"LKR 19.25", bold:true, color:C.green },
          ].map(i => (
            <div key={i.label} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:`0.5px solid ${C.grayBorder}` }}>
              <span style={{ color:C.textSub }}>{i.label}</span>
              <span style={{ fontWeight: i.bold ? 600 : 500, color: i.color || C.text }}>{i.val}</span>
            </div>
          ))}
        </div>
      </Card>
    </Grid>
  </div>
);
