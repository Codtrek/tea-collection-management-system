import { Card } from '../../components/ui/Card'
import { Grid } from '../../components/ui/Grid'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Btn } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { MetricCard } from '../../components/ui/MetricCard'
import { SearchBar } from '../../components/ui/SearchBar'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { Select } from '../../components/ui/Form'
import { Table } from '../../components/ui/Table'
import styles from "../../styles/modules/pages/AppCommon.module.css";

export const FactoryAttendance = () => (
  <div>
    <Grid cols={4} gap={12}>
      <div className={styles.metricsSpan4}>
        <MetricCard accent="green" icon="users"    label="Total Employees" value="124"  sub="Active staff" />
        <MetricCard accent="blue"  icon="calendar" label="Present Today"   value="116"  sub="93.5% attendance" />
        <MetricCard accent="red"   icon="warning"  label="Absent Today"    value="8"    sub="2 on leave" />
        <MetricCard accent="amber" icon="receipt"  label="Late Arrivals"   value="5"    sub="After 07:30" />
      </div>
    </Grid>

    <Card>
      <SectionHeader title="Employee Attendance — Today">
        <SearchBar placeholder="Search employee…" />
        <div className={styles.dateLabel}>9 July 2026</div>
        <Btn primary><Icon name="check" size={13} /> Save Attendance</Btn>
      </SectionHeader>
      <Table
        headers={["Employee","ID","Department","Check In","Check Out","Status","Notes"]}
        rows={[
          [<div className={styles.avatarRow}><Avatar initials="AJ" color="green" size={24}/> Amal Jayasinghe</div>,"EMP-001","Plucking","06:52","16:05",<Badge color="green">Present</Badge>,""],
          [<div className={styles.avatarRow}><Avatar initials="MD" color="blue" size={24}/> Mallika Dissanayake</div>,"EMP-002","Plucking","07:41","16:10",<Badge color="amber">Late</Badge>,"Bus delay"],
          [<div className={styles.avatarRow}><Avatar initials="RW" color="amber" size={24}/> Ruvini Weerasinghe</div>,"EMP-003","Quality","—","—",<Select style={{width:100,padding:"3px 8px",fontSize:11}}><option>Absent</option><option>Present</option><option>Leave</option><option>Half Day</option></Select>,"Medical"],
        ]}
      />
    </Card>

    <Card>
      <div className={styles.cardTitle}>Monthly Attendance Rate by Department</div>
      <Grid cols={2} gap={20}>
        <div>
          <Table headers={["Department","Staff","Rate"]} rows={[
            ["Plucking","78",<Badge color="green">94%</Badge>],
            ["Factory Floor","26",<Badge color="green">92%</Badge>],
          ]} />
        </div>
        <div>
          <Table headers={["Department","Staff","Rate"]} rows={[
            ["Quality","12",<Badge color="amber">88%</Badge>],
            ["Administration","8",<Badge color="green">97%</Badge>],
          ]} />
        </div>
      </Grid>
    </Card>
  </div>
);
