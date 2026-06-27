import { useState } from 'react'
import { Card } from '../../components/ui/Card'
import { Grid } from '../../components/ui/Grid'
import { Badge } from '../../components/ui/Badge'
import { Btn } from '../../components/ui/Button'
import { FormRow, Input , Select } from '../../components/ui/Form'
import { Icon } from '../../components/ui/Icon'
import { SearchBar } from '../../components/ui/SearchBar'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { Table } from '../../components/ui/Table'
import { Tabs } from '../../components/ui/Tabs'
import styles from "../../styles/modules/pages/AppCommon.module.css";

export const OfficerRegistration = () => {
  const [tab, setTab] = useState(0);
  return (
    <div>
      <Tabs tabs={["Register Employee","Register Supplier","View All"]} active={tab} onChange={setTab} />
      {tab === 0 && (
        <Card>
          <div className={styles.cardTitleMb16}>Register New Employee</div>
          <Grid cols={2} gap={12}>
            <FormRow label="Full Name"><Input placeholder="Full name" /></FormRow>
            <FormRow label="NIC Number"><Input placeholder="XXXXXXXXXV / XXXXXXXXXXXX" /></FormRow>
            <FormRow label="Date of Birth"><Input type="date" /></FormRow>
            <FormRow label="Phone Number"><Input placeholder="+94 XX XXX XXXX" /></FormRow>
            <FormRow label="Role"><Select><option>Field Supervisor</option><option>Tea Plucker</option><option>Lab Analyst</option><option>Store Manager</option></Select></FormRow>
            <FormRow label="Department"><Select><option>Plucking</option><option>Quality</option><option>Inventory</option><option>Admin</option></Select></FormRow>
            <FormRow label="Base Salary (LKR)"><Input placeholder="0.00" /></FormRow>
            <FormRow label="Join Date"><Input type="date" /></FormRow>
          </Grid>
          <Btn primary className={styles.btnFullCenterMt4}><Icon name="plus" size={13} /> Register Employee</Btn>
        </Card>
      )}
      {tab === 1 && (
        <Card>
          <div className={styles.cardTitleMb16}>Register Tea Leaves Supplier</div>
          <Grid cols={2} gap={12}>
            <FormRow label="Supplier Name"><Input placeholder="Full name" /></FormRow>
            <FormRow label="NIC Number"><Input placeholder="XXXXXXXXXV / XXXXXXXXXXXX" /></FormRow>
            <FormRow label="Phone Number"><Input placeholder="+94 XX XXX XXXX" /></FormRow>
            <FormRow label="Estate Name"><Input placeholder="Name of the estate" /></FormRow>
            <FormRow label="Estate Location"><Input placeholder="Address / GPS" /></FormRow>
            <FormRow label="Assigned Route"><Select><option>Route A — Ella</option><option>Route B — Dimbula</option><option>Route C — Uva</option></Select></FormRow>
          </Grid>
          <Btn primary className={styles.btnFullCenterMt4}><Icon name="plus" size={13} /> Register Supplier</Btn>
        </Card>
      )}
      {tab === 2 && (
        <Card>
          <SectionHeader title="All Registered"><SearchBar /></SectionHeader>
          <Table headers={["Name","ID","Type","Role/Estate","Status"]} rows={[
            ["Amal Jayasinghe","EMP-001","Employee","Field Supervisor",<Badge color="green">Active</Badge>],
            ["Nimal Kumara","SUP-001","Supplier","Ella Estate",<Badge color="green">Active</Badge>],
            ["Mallika Dissanayake","EMP-002","Employee","Tea Plucker",<Badge color="green">Active</Badge>],
          ]} />
        </Card>
      )}
    </div>
  );
};
