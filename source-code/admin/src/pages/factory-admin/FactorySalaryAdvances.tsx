import { Card } from '../../components/ui/Card'
import { Grid } from '../../components/ui/Grid'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Btn } from '../../components/ui/Button'
import { FormRow, Input, Select } from '../../components/ui/Form'
import { Icon } from '../../components/ui/Icon'
import { MetricCard } from '../../components/ui/MetricCard'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { Table } from '../../components/ui/Table'
import styles from "../../styles/modules/pages/AppCommon.module.css";

export const FactorySalaryAdvances = () => (
  <div>
    <Grid cols={3} gap={12}>
      <div className={styles.metricsSpan3}>
        <MetricCard accent="amber" icon="receipt"  label="Advances Issued"   value="LKR 185K" sub="23 employees this month" />
        <MetricCard accent="red"   icon="warning"  label="Pending Requests"  value="4"        sub="Awaiting approval" />
        <MetricCard accent="blue"  icon="currency" label="To Recover (Jul)"  value="LKR 142K" sub="Auto-deducted from payroll" />
      </div>
    </Grid>

    <Grid cols={2} gap={16}>
      <Card>
        <div className={styles.cardTitle}>Issue Salary Advance</div>
        <FormRow label="Employee"><Select><option>Select employee…</option><option>EMP-001 — Amal Jayasinghe</option><option>EMP-002 — Mallika Dissanayake</option><option>EMP-003 — Ruvini Weerasinghe</option></Select></FormRow>
        <Grid cols={2} gap={12}>
          <FormRow label="Amount (LKR)"><Input placeholder="0.00" /></FormRow>
          <FormRow label="Deduction Month"><Input placeholder="July 2026" /></FormRow>
        </Grid>
        <FormRow label="Reason"><Select><option>Medical</option><option>Personal</option><option>Emergency</option><option>Other</option></Select></FormRow>
        <div className={styles.summaryBoxSm}>
          <div className={styles.summaryRowPlain}><span className={styles.summaryLabel}>Available balance</span><span className={styles.summaryValueGreen}>LKR 35,000</span></div>
          <div className={styles.summaryRowPlain}><span className={styles.summaryLabel}>Max advance allowed (50%)</span><span className={styles.summaryValue}>LKR 22,500</span></div>
        </div>
        <Btn primary className={styles.btnFullCenter}>Approve &amp; Pay Advance</Btn>
      </Card>
      <Card>
        <SectionHeader title="Pending Requests">
          <Badge color="amber">4 Pending</Badge>
        </SectionHeader>
        <Table
          headers={["Employee","Amount","Reason","Action"]}
          rows={[
            [<div className={styles.avatarRow}><Avatar initials="RW" color="amber" size={24}/> Ruvini Weerasinghe</div>,"LKR 15,000","Medical",<div className={styles.actionRow}><Btn small primary><Icon name="approve" size={11}/> Approve</Btn><Btn small danger>Reject</Btn></div>],
            [<div className={styles.avatarRow}><Avatar initials="MD" color="blue" size={24}/> Mallika Dissanayake</div>,"LKR 8,000","Personal",<div className={styles.actionRow}><Btn small primary><Icon name="approve" size={11}/> Approve</Btn><Btn small danger>Reject</Btn></div>],
          ]}
        />
      </Card>
    </Grid>

    <Card>
      <SectionHeader title="Advance History" />
      <Table
        headers={["Employee","ID","Amount","Issued","Deduct From","Reason","Status"]}
        rows={[
          [<div className={styles.avatarRow}><Avatar initials="AJ" color="green" size={24}/> Amal Jayasinghe</div>,"EMP-001","LKR 10,000","2026-06-12","July 2026","Medical",<Badge color="amber">Outstanding</Badge>],
          [<div className={styles.avatarRow}><Avatar initials="RW" color="amber" size={24}/> Ruvini Weerasinghe</div>,"EMP-003","LKR 20,000","2026-06-03","July 2026","Emergency",<Badge color="amber">Outstanding</Badge>],
          [<div className={styles.avatarRow}><Avatar initials="MD" color="blue" size={24}/> Mallika Dissanayake</div>,"EMP-002","LKR 5,000","2026-05-10","June 2026","Personal",<Badge color="green">Recovered</Badge>],
        ]}
      />
    </Card>
  </div>
);
