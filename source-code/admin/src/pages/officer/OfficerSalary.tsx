import { type CSSProperties } from "react";
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
import styles from "../../styles/modules/pages/AppCommon.module.css";

export const OfficerSalary = () => {
  const [tab, setTab] = useState(0);
  return (
    <div>
      <Tabs tabs={["Salary Status","Pay Advance","Salary Transactions"]} active={tab} onChange={setTab} />
      <Grid cols={3} gap={12}><div className={styles.metricsSpan3}>
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
            [<div className={styles.avatarRow}><Avatar initials="AJ" color="green" size={24}/> Amal Jayasinghe</div>,"EMP-001","Field Supervisor","LKR 45,000",<Badge color="amber">LKR 10,000</Badge>,"LKR 35,000",<Badge color="green">Active</Badge>],
            [<div className={styles.avatarRow}><Avatar initials="MD" color="blue" size={24}/> Mallika Dissanayake</div>,"EMP-002","Tea Plucker","LKR 28,500",<Badge color="green">None</Badge>,"LKR 28,500",<Badge color="green">Active</Badge>],
            [<div className={styles.avatarRow}><Avatar initials="RW" color="amber" size={24}/> Ruvini Weerasinghe</div>,"EMP-003","Lab Analyst","LKR 38,000",<Badge color="red">LKR 20,000</Badge>,"LKR 18,000",<Badge color="green">Active</Badge>],
          ]}
        />
      </Card>

      <Grid cols={2} gap={16}>
        <Card>
          <div className={styles.cardTitle}>Pay Salary Advance</div>
          <FormRow label="Employee"><Select><option>Select employee…</option><option>EMP-001 — Amal Jayasinghe</option><option>EMP-002 — Mallika Dissanayake</option></Select></FormRow>
          <FormRow label="Amount (LKR)"><Input placeholder="0.00" /></FormRow>
          <FormRow label="Reason"><Select><option>Medical</option><option>Personal</option><option>Emergency</option><option>Other</option></Select></FormRow>
          <FormRow label="Deduction Month"><Input placeholder="July 2025" /></FormRow>
          <div className={styles.summaryBoxSm}>
            <div className={styles.summaryRowPlain}><span className={styles.summaryLabel}>Available balance</span><span className={styles.summaryValueGreen}>LKR 35,000</span></div>
            <div className={styles.summaryRowPlain}><span className={styles.summaryLabel}>Max advance allowed (50%)</span><span className={styles.summaryValue}>LKR 22,500</span></div>
          </div>
          <Btn primary className={styles.btnFullCenter}>Approve & Pay Advance</Btn>
        </Card>
        <Card>
          <div className={styles.cardTitle}>Pay Monthly Salaries</div>
          <div className={`${styles.summaryBox} ${styles.summaryBoxMb14}`}>
            {[
              { label:"Total payroll",        val:"LKR 2,415,000", color:"var(--color-text)" },
              { label:"Total advances issued", val:"− LKR 185,000",  color:"var(--color-red)" },
              { label:"Other deductions",      val:"− LKR 24,000",   color:"var(--color-red)" },
              { label:"Net payable",           val:"LKR 2,206,000",  color:"var(--color-green)" },
            ].map(i => (
              <div key={i.label} className={styles.summaryRow}>
                <span className={styles.summaryLabel}>{i.label}</span>
                <span className={styles.summaryValue} style={{ color: i.color } as CSSProperties}>{i.val}</span>
              </div>
            ))}
          </div>
          <Btn primary className={styles.btnFullCenter}><Icon name="cash" size={13} /> Process Salary Payment</Btn>
        </Card>
      </Grid>
    </div>
  );
};
