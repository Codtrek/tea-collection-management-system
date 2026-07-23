import { type CSSProperties } from "react";
import { Card } from '../../components/ui/Card'
import { Grid } from '../../components/ui/Grid'
import { Badge } from '../../components/ui/Badge'
import { Btn } from '../../components/ui/Button'
import { FormRow, Input, Select } from '../../components/ui/Form'
import { Icon } from '../../components/ui/Icon'
import { MetricCard } from '../../components/ui/MetricCard'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { Table } from '../../components/ui/Table'
import styles from "../../styles/modules/pages/AppCommon.module.css";

export const FactoryExpenseReport = () => (
  <div>
    <Card>
      <SectionHeader title="Generate Expense Report">
        <Badge color="blue">Step 1 of 2</Badge>
      </SectionHeader>
      <Grid cols={4} gap={12}>
        <FormRow label="Report Type"><Select><option>Summary</option><option>Detailed</option><option>By Category</option><option>By Department</option></Select></FormRow>
        <FormRow label="Period"><Select><option>This Month</option><option>Last Month</option><option>Quarterly</option><option>Yearly</option><option>Custom Range</option></Select></FormRow>
        <FormRow label="From"><Input type="date" /></FormRow>
        <FormRow label="To"><Input type="date" /></FormRow>
        <FormRow label="Category"><Select><option>All categories</option><option>Estate Owner Payments</option><option>Payroll</option><option>Fertilizer &amp; Inputs</option><option>Transport</option><option>Utilities</option><option>Other</option></Select></FormRow>
        <FormRow label="Compare With"><Select><option>Previous period</option><option>Same period last year</option><option>No comparison</option></Select></FormRow>
        <FormRow label="Payment Status"><Select><option>All</option><option>Paid</option><option>Pending</option></Select></FormRow>
        <FormRow label="Format"><Select><option>PDF</option><option>Excel</option><option>CSV</option></Select></FormRow>
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

    <Grid cols={2} gap={16}>
      <Card>
        <SectionHeader title="Monthly Expense Trend">
          <Select style={{ width: 130 }}><option>Last 6 months</option><option>Last 12 months</option></Select>
        </SectionHeader>
        <div className={styles.chartBars}>
          {[40,38,45,42,44,48].map((h,i) => <div key={i} className={`${styles.chartBar} ${i===5 ? styles.chartBarAmber : styles.chartBarGreen}`} style={{ "--bar-height": `${h * 2}%` } as CSSProperties} />)}
        </div>
        <div className={styles.chartLabels}>
          {["Jan","Feb","Mar","Apr","May","Jun"].map(m => <div key={m} className={styles.chartLabel}>{m}</div>)}
        </div>
      </Card>
      <Card>
        <SectionHeader title="Expenses by Category" />
        <ProgressBar label="Estate Owner Payments" value={59} />
        <ProgressBar label="Payroll"               value={35} color="var(--color-amber)" />
        <ProgressBar label="Fertilizer & Inputs"   value={4}  color="var(--color-red)" />
        <ProgressBar label="Transport & Utilities" value={2}  color="var(--color-red)" />
      </Card>
    </Grid>

    <Card>
      <SectionHeader title="Expense Report — June 2026">
        <Badge color="red">LKR 6,309,000</Badge>
        <Btn><Icon name="download" size={13} /> Export PDF</Btn>
        <Btn><Icon name="download" size={13} /> Export Excel</Btn>
      </SectionHeader>
      <Table
        headers={["Category","Description","Transactions","Amount","Share","Status"]}
        rows={[
          ["Estate Owner Payments","Tea leaf fees — 42 owners","42","LKR 3,720,000",<Badge color="red">59%</Badge>,<Badge color="amber">9 pending</Badge>],
          ["Payroll","Salaries, allowances, EPF/ETF","124","LKR 2,206,000",<Badge color="amber">35%</Badge>,<Badge color="green">Paid</Badge>],
          ["Fertilizer & Inputs","Urea, NPK, potash","6","LKR 245,000",<Badge color="gray">4%</Badge>,<Badge color="green">Paid</Badge>],
          ["Transport","Collection routes fuel","30","LKR 85,000",<Badge color="gray">1%</Badge>,<Badge color="green">Paid</Badge>],
          ["Utilities & Other","Power, water, maintenance","11","LKR 53,000",<Badge color="gray">1%</Badge>,<Badge color="green">Paid</Badge>],
        ]}
      />
    </Card>

    <Grid cols={2} gap={16}>
      <Card>
        <div className={styles.cardTitle}>Expense Summary</div>
        <div className={styles.summaryBox}>
          {[
            { label:"Estate owner payments", val:"LKR 3,720,000", color:"var(--color-red)" },
            { label:"Payroll",               val:"LKR 2,206,000", color:"var(--color-red)" },
            { label:"Fertilizer & inputs",   val:"LKR 245,000",   color:"var(--color-red)" },
            { label:"Transport & other",     val:"LKR 138,000",   color:"var(--color-red)" },
            { label:"Total expenses",        val:"LKR 6,309,000", color:"var(--color-text)", bold:true },
          ].map(i => (
            <div key={i.label} className={styles.summaryRow}>
              <span className={styles.summaryLabel}>{i.label}</span>
              <span className={i.bold ? styles.summaryValueBold : styles.summaryValue} style={{ color: i.color } as CSSProperties}>{i.val}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <SectionHeader title="Recently Generated Reports" />
        <Table
          headers={["Report","Period","Format","Status","Action"]}
          rows={[
            ["Expense Summary","June 2026","PDF",<Badge color="green">Ready</Badge>,<Btn small><Icon name="download" size={11}/> Download</Btn>],
            ["Expenses by Category","Q2 2026","Excel",<Badge color="green">Ready</Badge>,<Btn small><Icon name="download" size={11}/> Download</Btn>],
            ["Detailed Expenses","May 2026","PDF",<Badge color="amber">Processing</Badge>,<Btn small>View</Btn>],
          ]}
        />
      </Card>
    </Grid>
  </div>
);
