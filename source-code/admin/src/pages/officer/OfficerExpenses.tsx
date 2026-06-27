import { Card } from '../../components/ui/Card'
import { Grid } from '../../components/ui/Grid'
import { Btn } from '../../components/ui/Button'
import { FormRow, Input, Select, Textarea } from '../../components/ui/Form'
import { Icon } from '../../components/ui/Icon'
import { MetricCard } from '../../components/ui/MetricCard'
import { Table } from '../../components/ui/Table'
import styles from "../../styles/modules/pages/AppCommon.module.css";

export const OfficerExpenses = () => (
  <div>
    <Grid cols={3} gap={12}><div className={styles.metricsSpan3}>
      <MetricCard accent="red"   icon="receipt"  label="Total Expenses (June)" value="LKR 485K" sub="All categories" />
      <MetricCard accent="amber" icon="currency" label="Pending Entries"       value="3"        sub="Not yet recorded" />
      <MetricCard accent="blue"  icon="chart"    label="vs Last Month"         value="↑ 8%"    sub="LKR 35K increase" />
    </div></Grid>
    <Grid cols={2} gap={16}>
      <Card>
        <div className={styles.cardTitle}>Enter Expense</div>
        <FormRow label="Expense Category"><Select><option>Utilities</option><option>Maintenance</option><option>Transport</option><option>Office Supplies</option><option>Equipment</option><option>Other</option></Select></FormRow>
        <FormRow label="Amount (LKR)"><Input placeholder="0.00" /></FormRow>
        <FormRow label="Date"><Input type="date" /></FormRow>
        <FormRow label="Vendor / Payee"><Input placeholder="Who was paid" /></FormRow>
        <FormRow label="Description"><Textarea placeholder="What was this expense for…" /></FormRow>
        <FormRow label="Receipt / Evidence"><div className={styles.uploadZoneSm}><Icon name="upload" size={16} /><div className={styles.uploadHintSm}>Upload receipt</div></div></FormRow>
        <Btn primary className={styles.btnFullCenterMt4}><Icon name="check" size={13} /> Record Expense</Btn>
      </Card>
      <Card>
        <div className={styles.cardTitleMb12}>Recent Expenses</div>
        <Table headers={["Category","Amount","Date","Vendor"]} rows={[
          ["Utilities","LKR 45,000","2025-06-20","CEB"],
          ["Transport","LKR 18,500","2025-06-18","Silva Transport"],
          ["Maintenance","LKR 32,000","2025-06-15","Perera Services"],
          ["Office Supplies","LKR 8,200","2025-06-12","Cargills"],
        ]} />
      </Card>
    </Grid>
  </div>
);
