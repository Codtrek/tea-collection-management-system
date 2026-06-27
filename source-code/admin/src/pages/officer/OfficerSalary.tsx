import { C } from '../../styles/tokens'
import { useState } from 'react'
import { Card } from '../../components/ui/Card'
import { Grid } from '../../components/ui/Grid'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Btn } from '../../components/ui/Button'
import { FormRow ,Input , Select } from '../../components/ui/Form'
import { Icon } from '../../components/ui/Icon'
import { MetricCard } from '../../components/ui/MetricCard'
import { SearchBar } from '../../components/ui/SearchBar'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { Table } from '../../components/ui/Table'
import { Tabs } from '../../components/ui/Tabs'

export const OfficerSalary = () => {
  const [tab, setTab] = useState(0);
  return (
    <div>
      <Tabs tabs={["Salary Status","Pay Advance","Salary Transactions"]} active={tab} onChange={setTab} />
      <Grid cols={3} gap={12}><div style={{ marginBottom:16, gridColumn:"1/-1", display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
        <MetricCard accent="green" icon="cash"    label="Total Payroll (June)" value="LKR 2.4M" sub="124 employees" />
        <MetricCard accent="amber" icon="receipt" label="Advances Issued"      value="LKR 185K" sub="23 employees this month" />
        <MetricCard accent="blue"  icon="cash"    label="Net Payable"          value="LKR 2.2M" sub="After deductions" />
      </div></Grid>

      <Card>
        <SectionHeader title="Employee Salary Status — June 2025">
          <SearchBar placeholder="Search employee…" />
        </SectionHeader>
        <Table
          headers={["Employee","ID","Role","Base Salary","Advance Taken","Available Balance","Status"]}
          rows={[
            [<div style={{display:"flex",alignItems:"center",gap:7}}><Avatar initials="AJ" color="green" size={24}/> Amal Jayasinghe</div>,"EMP-001","Field Supervisor","LKR 45,000",<Badge color="amber">LKR 10,000</Badge>,"LKR 35,000",<Badge color="green">Active</Badge>],
            [<div style={{display:"flex",alignItems:"center",gap:7}}><Avatar initials="MD" color="blue" size={24}/> Mallika Dissanayake</div>,"EMP-002","Tea Plucker","LKR 28,500",<Badge color="green">None</Badge>,"LKR 28,500",<Badge color="green">Active</Badge>],
            [<div style={{display:"flex",alignItems:"center",gap:7}}><Avatar initials="RW" color="amber" size={24}/> Ruvini Weerasinghe</div>,"EMP-003","Lab Analyst","LKR 38,000",<Badge color="red">LKR 20,000</Badge>,"LKR 18,000",<Badge color="green">Active</Badge>],
          ]}
        />
      </Card>

      <Grid cols={2} gap={16}>
        <Card>
          <div style={{ fontSize:13, fontWeight:500, color:C.text, marginBottom:14 }}>Pay Salary Advance</div>
          <FormRow label="Employee"><Select><option>Select employee…</option><option>EMP-001 — Amal Jayasinghe</option><option>EMP-002 — Mallika Dissanayake</option></Select></FormRow>
          <FormRow label="Amount (LKR)"><Input placeholder="0.00" /></FormRow>
          <FormRow label="Reason"><Select><option>Medical</option><option>Personal</option><option>Emergency</option><option>Other</option></Select></FormRow>
          <FormRow label="Deduction Month"><Input placeholder="July 2025" /></FormRow>
          <div style={{ background:C.grayLight, borderRadius:6, padding:10, fontSize:12, margin:"0 0 12px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}><span style={{ color:C.textSub }}>Available balance</span><span style={{ fontWeight:500, color:C.green }}>LKR 35,000</span></div>
            <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:C.textSub }}>Max advance allowed (50%)</span><span style={{ fontWeight:500 }}>LKR 22,500</span></div>
          </div>
          <Btn primary style={{ width:"100%", justifyContent:"center" }}>Approve & Pay Advance</Btn>
        </Card>
        <Card>
          <div style={{ fontSize:13, fontWeight:500, color:C.text, marginBottom:14 }}>Pay Monthly Salaries</div>
          <div style={{ background:C.grayLight, borderRadius:8, padding:14, fontSize:12, marginBottom:14 }}>
            {[
              { label:"Total payroll",        val:"LKR 2,415,000", color:C.text },
              { label:"Total advances issued", val:"− LKR 185,000",  color:C.red },
              { label:"Other deductions",      val:"− LKR 24,000",   color:C.red },
              { label:"Net payable",           val:"LKR 2,206,000",  color:C.green },
            ].map(i => (
              <div key={i.label} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:`0.5px solid ${C.grayBorder}` }}>
                <span style={{ color:C.textSub }}>{i.label}</span>
                <span style={{ fontWeight:500, color:i.color }}>{i.val}</span>
              </div>
            ))}
          </div>
          <Btn primary style={{ width:"100%", justifyContent:"center" }}><Icon name="cash" size={13} /> Process Salary Payment</Btn>
        </Card>
      </Grid>
    </div>
  );
};