import { C } from '../../styles/tokens'
import { Card } from '../../components/ui/Card'
import { Grid } from '../../components/ui/Grid'
import { Avatar } from '../../components/ui/Avatar'
import { Btn } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { MetricCard } from '../../components/ui/MetricCard'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { Select } from '../../components/ui/Form'
import { Table } from '../../components/ui/Table'

export const OfficerAttendance = () => (
  <div>
    <Grid cols={3} gap={12}><div style={{ marginBottom:16, gridColumn:"1/-1", display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
      <MetricCard accent="green" icon="users"    label="Total Employees" value="124" sub="Active staff" />
      <MetricCard accent="amber" icon="calendar" label="Present Today"   value="116" sub="93.5% attendance" />
      <MetricCard accent="red"   icon="warning"  label="Absent Today"    value="8"   sub="2 on leave" />
    </div></Grid>

    <Card>
      <SectionHeader title="Mark Attendance — Today">
        <div style={{ fontSize:12, color:C.textSub }}>25 June 2025</div>
        <Btn primary><Icon name="check" size={13} /> Save Attendance</Btn>
      </SectionHeader>
      <Table
        headers={["Employee","ID","Role","Department","Status","Notes"]}
        rows={[
          [<div style={{display:"flex",alignItems:"center",gap:7}}><Avatar initials="AJ" color="green" size={24}/> Amal Jayasinghe</div>,"EMP-001","Field Supervisor","Plucking",<Select style={{width:100,padding:"3px 8px",fontSize:11}}><option>Present</option><option>Absent</option><option>Leave</option><option>Half Day</option></Select>,""],
          [<div style={{display:"flex",alignItems:"center",gap:7}}><Avatar initials="MD" color="blue" size={24}/> Mallika Dissanayake</div>,"EMP-002","Tea Plucker","Plucking",<Select style={{width:100,padding:"3px 8px",fontSize:11}}><option>Present</option><option>Absent</option><option>Leave</option><option>Half Day</option></Select>,""],
          [<div style={{display:"flex",alignItems:"center",gap:7}}><Avatar initials="RW" color="amber" size={24}/> Ruvini Weerasinghe</div>,"EMP-003","Lab Analyst","Quality",<Select style={{width:100,padding:"3px 8px",fontSize:11}}><option selected>Absent</option><option>Present</option><option>Leave</option></Select>,"Medical"],
        ]}
      />
    </Card>
  </div>
);
