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

export const FactoryPayroll = () => (
  <div>
    <Grid cols={4} gap={12}>
      <div className={styles.metricsSpan4}>
        <MetricCard accent="green" icon="cash"     label="Gross Payroll"   value="LKR 2.42M" sub="124 employees" />
        <MetricCard accent="red"   icon="receipt"  label="Deductions"      value="LKR 209K"  sub="Advances, EPF, ETF" />
        <MetricCard accent="blue"  icon="currency" label="Net Payable"     value="LKR 2.21M" sub="After deductions" />
        <MetricCard accent="amber" icon="calendar" label="Pay Date"        value="30 Jun"    sub="3 days remaining" />
      </div>
    </Grid>

    <Card>
      <SectionHeader title="Payroll — June 2026">
        <SearchBar placeholder="Search employee…" />
        <Select style={{ width: 130 }}><option>June 2026</option><option>May 2026</option><option>April 2026</option></Select>
        <Btn primary><Icon name="cash" size={13} /> Run Payroll</Btn>
      </SectionHeader>
      <Table
        headers={["Employee","ID","Role","Basic Salary","Allowances","Deductions","Net Salary","Status"]}
        rows={[
          [<div className={styles.avatarRow}><Avatar initials="AJ" color="green" size={24}/> Amal Jayasinghe</div>,"EMP-001","Field Supervisor","LKR 45,000","LKR 6,500","− LKR 14,200","LKR 37,300",<Badge color="green">Processed</Badge>],
          [<div className={styles.avatarRow}><Avatar initials="MD" color="blue" size={24}/> Mallika Dissanayake</div>,"EMP-002","Tea Plucker","LKR 28,500","LKR 4,000","− LKR 2,280","LKR 30,220",<Badge color="amber">Pending</Badge>],
          [<div className={styles.avatarRow}><Avatar initials="RW" color="amber" size={24}/> Ruvini Weerasinghe</div>,"EMP-003","Lab Analyst","LKR 38,000","LKR 5,000","− LKR 23,040","LKR 19,960",<Badge color="amber">Pending</Badge>],
        ]}
      />
    </Card>

    <Grid cols={2} gap={16}>
      <Card>
        <div className={styles.cardTitle}>Payroll Summary</div>
        <div className={`${styles.summaryBox} ${styles.summaryBoxMb14}`}>
          {[
            { label:"Basic salaries",        val:"LKR 2,100,000", color:"var(--color-text)" },
            { label:"Allowances",            val:"LKR 315,000",   color:"var(--color-text)" },
            { label:"Salary advances",       val:"− LKR 185,000", color:"var(--color-red)" },
            { label:"EPF / ETF (employee)",  val:"− LKR 24,000",  color:"var(--color-red)" },
            { label:"Net payable",           val:"LKR 2,206,000", color:"var(--color-green)", bold:true },
          ].map(i => (
            <div key={i.label} className={styles.summaryRow}>
              <span className={styles.summaryLabel}>{i.label}</span>
              <span className={i.bold ? styles.summaryValueBold : styles.summaryValue} style={{ color: i.color }}>{i.val}</span>
            </div>
          ))}
        </div>
        <Btn primary className={styles.btnFullCenter}><Icon name="cash" size={13} /> Process Salary Payment</Btn>
      </Card>
      <Card>
        <div className={styles.cardTitle}>Payroll by Department</div>
        <Table
          headers={["Department","Staff","Net Payable"]}
          rows={[
            ["Plucking","78","LKR 1,420,000"],
            ["Factory Floor","26","LKR 520,000"],
            ["Quality","12","LKR 190,000"],
            ["Administration","8","LKR 76,000"],
          ]}
        />
      </Card>
    </Grid>
  </div>
);
