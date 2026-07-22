import { Card } from '../../components/ui/Card'
import { Grid } from '../../components/ui/Grid'
import { Badge } from '../../components/ui/Badge'
import { Btn } from '../../components/ui/Button'
import { FormRow, Input, Select } from '../../components/ui/Form'
import { Icon } from '../../components/ui/Icon'
import { MetricCard } from '../../components/ui/MetricCard'
import { SectionHeader } from '../../components/ui/SectionHeader'
import styles from "../../styles/modules/pages/AppCommon.module.css";

export const FactoryExpenseReport = () => (
  <div>
    <Card>
      <SectionHeader title="Generate Expense Report">
        <Badge color="blue">Step 1 of 2</Badge>
      </SectionHeader>
      <Grid cols={4} gap={12}>
        <FormRow label="Report Type"><Select><option>Summary</option><option>Detailed</option><option>By Category</option></Select></FormRow>
        <FormRow label="Period"><Select><option>This Month</option><option>Last Month</option><option>Quarterly</option><option>Yearly</option><option>Custom Range</option></Select></FormRow>
        <FormRow label="From"><Input type="date" /></FormRow>
        <FormRow label="To"><Input type="date" /></FormRow>
      </Grid>
      <div className={styles.actionRow}>
        <Btn primary><Icon name="receipt" size={13} /> Generate Report</Btn>
        <Btn>Reset</Btn>
      </div>
    </Card>

    <Grid cols={4} gap={12}>
      <div className={styles.metricsSpan4}>
        <MetricCard accent="red"   icon="receipt"  label="Total Expenses" value="LKR 6.31M" sub="June 2026" />
        <MetricCard accent="amber" icon="cash"     label="Payroll"        value="LKR 2.21M" sub="35% of expenses" />
        <MetricCard accent="blue"  icon="currency" label="Estate Owners"  value="LKR 3.72M" sub="59% of expenses" />
        <MetricCard accent="green" icon="chart"    label="vs Last Month"  value="↑ 3%"      sub="LKR 180K higher" />
      </div>
    </Grid>
  </div>
);
