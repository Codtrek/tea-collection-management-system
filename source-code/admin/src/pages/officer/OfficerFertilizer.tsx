import { useState } from 'react'
import { C } from '../../styles/tokens'
import { Card } from '../../components/ui/Card'
import { Grid } from '../../components/ui/Grid'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Btn } from '../../components/ui/Button'
import { FormRow, Input, Select  } from '../../components/ui/Form'
import { Icon } from '../../components/ui/Icon'
import { Table } from '../../components/ui/Table'
import { Tabs } from '../../components/ui/Tabs'

export const OfficerFertilizer = () => {
  const [tab, setTab] = useState(0);
  return (
    <div>
      <Tabs tabs={["Stock Management","Issue to Estate","Stock Levels"]} active={tab} onChange={setTab} />
      <Alert type="warning"><strong>2 items expiring within 7 days.</strong> Review stock and notify relevant estates.</Alert>
      <Grid cols={2} gap={16}>
        <Card>
          <div style={{ fontSize:13, fontWeight:500, color:C.text, marginBottom:14 }}>Receive Fertilizer Stock</div>
          <Grid cols={2} gap={12}>
            <FormRow label="Fertilizer Name"><Input placeholder="e.g. Urea 46%" /></FormRow>
            <FormRow label="Supplier / Brand"><Input placeholder="Manufacturer name" /></FormRow>
            <FormRow label="Quantity (kg)"><Input placeholder="0.0" /></FormRow>
            <FormRow label="Unit Cost (LKR/kg)"><Input placeholder="0.00" /></FormRow>
            <FormRow label="Batch Number"><Input placeholder="BATCH-XXXX" /></FormRow>
            <FormRow label="Expiry Date"><Input type="date" /></FormRow>
          </Grid>
          <Btn primary style={{ width:"100%", justifyContent:"center", marginTop:4 }}><Icon name="plus" size={13} /> Add to Stock</Btn>
        </Card>
        <Card>
          <div style={{ fontSize:13, fontWeight:500, color:C.text, marginBottom:14 }}>Issue Fertilizer to Estate</div>
          <FormRow label="Estate / Supplier"><Select><option>Select estate…</option></Select></FormRow>
          <FormRow label="Fertilizer Type"><Select><option>Select from stock…</option><option>Urea 46% (480 kg available)</option><option>NPK 15-15-15 (1,200 kg available)</option></Select></FormRow>
          <FormRow label="Quantity to Issue (kg)"><Input placeholder="0.0" /></FormRow>
          <FormRow label="Issue Date"><Input type="date" /></FormRow>
          <div style={{ background:C.grayLight, borderRadius:6, padding:10, fontSize:12, margin:"0 0 12px" }}>
            <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:C.textSub }}>Cost to deduct</span><span style={{ fontWeight:500 }}>LKR 0.00</span></div>
          </div>
          <Btn primary style={{ width:"100%", justifyContent:"center" }}><Icon name="send" size={13} /> Issue & Create Deduction</Btn>
        </Card>
      </Grid>
      <Card>
        <div style={{ fontSize:13, fontWeight:500, color:C.text, marginBottom:12 }}>Current Stock Levels</div>
        <Table
          headers={["Fertilizer","Batch","In Stock","Unit Cost","Expiry","Days Left","Status"]}
          rows={[
            ["Urea 46%","BATCH-2241","480 kg","LKR 85/kg","2026-06-29","5 days",<Badge color="red">Expiring Soon</Badge>],
            ["NPK 15-15-15","BATCH-2198","1,200 kg","LKR 120/kg","2026-09-14","82 days",<Badge color="green">Good</Badge>],
            ["Muriate of Potash","BATCH-2205","320 kg","LKR 95/kg","2026-07-01","7 days",<Badge color="amber">Caution</Badge>],
          ]}
        />
      </Card>
    </div>
  );
};
