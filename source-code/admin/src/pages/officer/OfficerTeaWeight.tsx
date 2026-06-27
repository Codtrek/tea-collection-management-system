import { C } from '../../styles/tokens'
import { useState } from 'react'
import { Card } from '../../components/ui/Card'
import { Grid } from '../../components/ui/Grid'
import { Badge } from '../../components/ui/Badge'
import { Btn } from '../../components/ui/Button'
import { FormRow, Input , Select , Textarea } from '../../components/ui/Form'
import { Icon } from '../../components/ui/Icon'
import { Table } from '../../components/ui/Table'
import { Tabs } from '../../components/ui/Tabs'

export const OfficerTeaWeight = () => {
  const [tab, setTab] = useState(0);
  return (
    <div>
      <Tabs tabs={["Record Entry","Today's Entries","History"]} active={tab} onChange={setTab} />
      <Grid cols={2} gap={16}>
        <Card>
          <div style={{ fontSize:13, fontWeight:500, color:C.text, marginBottom:14 }}>Record Tea Leaves Collection</div>
          <Grid cols={2} gap={12}>
            <FormRow label="Estate / Supplier"><Select><option>Select estate…</option><option>Ella Estate — Nimal Kumara</option><option>Dimbula Plot — Saman Perera</option><option>Uva Highlands — Kamani Wijesiri</option></Select></FormRow>
            <FormRow label="Date"><Input type="date" /></FormRow>
            <FormRow label="Gross Weight (kg)"><Input placeholder="0.0" /></FormRow>
            <FormRow label="Container Count"><Input placeholder="0" /></FormRow>
            <FormRow label="Leaf Quality Grade"><Select><option>Grade A – Premium</option><option>Grade B – Standard</option><option>Grade C – Reject</option></Select></FormRow>
            <FormRow label="Receiving Officer"><Input placeholder="Officer name or ID" /></FormRow>
          </Grid>
          <FormRow label="Remarks"><Textarea placeholder="Moisture level, foreign matter, coarse leaves…" /></FormRow>
          <Btn primary style={{ width:"100%", justifyContent:"center", marginTop:4 }}><Icon name="check" size={13} /> Record Collection</Btn>
        </Card>
        <Card>
          <div style={{ fontSize:13, fontWeight:500, color:C.text, marginBottom:12 }}>Today's Entries</div>
          <Table
            headers={["Estate","Weight","Grade","Time"]}
            rows={[
              ["Ella Estate — Nimal K.","320 kg",<Badge color="green">A</Badge>,"08:24"],
              ["Dimbula — Saman P.","185 kg",<Badge color="amber">B</Badge>,"09:10"],
              ["Uva Highlands","440 kg",<Badge color="green">A</Badge>,"09:45"],
              ["Matale North","95 kg",<Badge color="red">C</Badge>,"10:15"],
            ]}
          />
          <div style={{ marginTop:12, padding:10, background:C.grayLight, borderRadius:8, display:"flex", justifyContent:"space-between", fontSize:12 }}>
            <span style={{ color:C.textSub }}>Running total</span>
            <span style={{ fontWeight:500 }}>1,040 kg (4 entries)</span>
          </div>
        </Card>
      </Grid>
    </div>
  );
};