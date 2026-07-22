import { type CSSProperties } from "react";
import { Card } from '../../components/ui/Card'
import { Grid } from '../../components/ui/Grid'
import { Badge } from '../../components/ui/Badge'
import { Btn } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { MetricCard } from '../../components/ui/MetricCard'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { FormRow, Input, Select } from '../../components/ui/Form'
import { Table } from '../../components/ui/Table'
import styles from "../../styles/modules/pages/AppCommon.module.css";

export const FactoryRevenueReport = () => (
  <div>
    <Card>
      <SectionHeader title="Generate Revenue Report">
        <Badge color="blue">Step 1 of 2</Badge>
      </SectionHeader>
      <Grid cols={4} gap={12}>
        <FormRow label="Report Type"><Select><option>Summary</option><option>Detailed</option><option>By Grade</option><option>By Estate Owner</option></Select></FormRow>
        <FormRow label="Period"><Select><option>This Month</option><option>Last Month</option><option>Quarterly</option><option>Yearly</option><option>Custom Range</option></Select></FormRow>
        <FormRow label="From"><Input type="date" /></FormRow>
        <FormRow label="To"><Input type="date" /></FormRow>
        <FormRow label="Group By"><Select><option>Month</option><option>Week</option><option>Day</option><option>Grade</option></Select></FormRow>
        <FormRow label="Compare With"><Select><option>Previous period</option><option>Same period last year</option><option>No comparison</option></Select></FormRow>
        <FormRow label="Include"><Select><option>Revenue &amp; expenses</option><option>Revenue only</option><option>Profit &amp; loss</option></Select></FormRow>
        <FormRow label="Format"><Select><option>PDF</option><option>Excel</option><option>CSV</option></Select></FormRow>
      </Grid>
      <div className={styles.actionRow}>
        <Btn primary><Icon name="chart" size={13} /> Generate Report</Btn>
        <Btn>Reset</Btn>
      </div>
    </Card>

    <Card>
      <SectionHeader title="Recently Generated Reports" />
      <Table
        headers={["Report","Period","Format","Generated","Status","Action"]}
        rows={[
          ["Revenue Summary","June 2026","PDF","2026-07-16 16:20",<Badge color="green">Ready</Badge>,<Btn small><Icon name="download" size={11}/> Download</Btn>],
          ["Revenue by Grade","Q2 2026","Excel","2026-07-10 11:05",<Badge color="green">Ready</Badge>,<Btn small><Icon name="download" size={11}/> Download</Btn>],
          ["Detailed Revenue","May 2026","PDF","2026-06-30 09:40",<Badge color="amber">Processing</Badge>,<Btn small>View</Btn>],
        ]}
      />
    </Card>

    <Grid cols={4} gap={12}>
      <div className={styles.metricsSpan4}>
        <MetricCard accent="green" icon="currency" label="Total Revenue"   value="LKR 8.82M" sub="↑ 8% vs May" />
        <MetricCard accent="red"   icon="receipt"  label="Total Expenses"  value="LKR 6.31M" sub="Payroll, estates, inputs" />
        <MetricCard accent="blue"  icon="chart"    label="Net Profit"      value="LKR 2.51M" sub="28.5% margin" />
        <MetricCard accent="amber" icon="cash"     label="Avg Price / kg"  value="LKR 200"   sub="Made tea sales" />
      </div>
    </Grid>

    <Grid cols={2} gap={16}>
      <Card>
        <SectionHeader title="Monthly Revenue vs Expenses">
          <Select style={{ width: 130 }}><option>Last 6 months</option><option>Last 12 months</option></Select>
        </SectionHeader>
        <div className={styles.chartBarsPaired}>
          {[["Jan",65,40],["Feb",70,38],["Mar",58,45],["Apr",80,42],["May",72,44],["Jun",88,48]].map(([m,rev,exp]) => (
            <div key={m} className={styles.chartBarPair}>
              <div className={styles.chartBarIncome} style={{ "--bar-height": `${rev}%` } as CSSProperties} />
              <div className={styles.chartBarExpense} style={{ "--bar-height": `${exp}%` } as CSSProperties} />
            </div>
          ))}
        </div>
        <div className={styles.chartLabelsWide}>
          {["Jan","Feb","Mar","Apr","May","Jun"].map(m => <div key={m} className={styles.chartLabel}>{m}</div>)}
        </div>
        <div className={styles.legend}>
          <span className={styles.legendItem}><div className={styles.legendDotGreen} /> Revenue</span>
          <span className={styles.legendItem}><div className={styles.legendDotRed} /> Expenses</span>
        </div>
      </Card>
      <Card>
        <SectionHeader title="Revenue by Grade" />
        <ProgressBar label="Grade A — BOP / BOPF" value={68} />
        <ProgressBar label="Grade B — Dust"       value={22} color="var(--color-amber)" />
        <ProgressBar label="Grade C — Fannings"   value={10} color="var(--color-red)" />
      </Card>
    </Grid>

    <Card>
      <SectionHeader title="Revenue Report — June 2026">
        <Badge color="green">LKR 8,820,000</Badge>
        <Btn><Icon name="download" size={13} /> Export PDF</Btn>
        <Btn><Icon name="download" size={13} /> Export Excel</Btn>
      </SectionHeader>
      <Table
        headers={["Revenue Source","Quantity","Avg Price","Revenue","Share"]}
        rows={[
          ["Made tea — Grade A","29,988 kg","LKR 230/kg","LKR 6,897,000",<Badge color="green">78%</Badge>],
          ["Made tea — Grade B","9,702 kg","LKR 150/kg","LKR 1,455,000",<Badge color="amber">16%</Badge>],
          ["Made tea — Grade C","4,410 kg","LKR 100/kg","LKR 441,000",<Badge color="gray">5%</Badge>],
          ["Other (by-products)","—","—","LKR 27,000",<Badge color="gray">1%</Badge>],
        ]}
      />
    </Card>

    <Card>
      <div className={styles.cardTitle}>Profit &amp; Loss Summary</div>
      <div className={styles.summaryBox}>
        {[
          { label:"Total revenue",        val:"LKR 8,820,000",  color:"var(--color-green)" },
          { label:"Estate owner payments", val:"− LKR 3,720,000", color:"var(--color-red)" },
          { label:"Payroll",              val:"− LKR 2,206,000", color:"var(--color-red)" },
          { label:"Fertilizer & inputs",  val:"− LKR 245,000",  color:"var(--color-red)" },
          { label:"Other expenses",       val:"− LKR 138,000",  color:"var(--color-red)" },
          { label:"Net profit",           val:"LKR 2,511,000",  color:"var(--color-green)", bold:true },
        ].map(i => (
          <div key={i.label} className={styles.summaryRow}>
            <span className={styles.summaryLabel}>{i.label}</span>
            <span className={i.bold ? styles.summaryValueBold : styles.summaryValue} style={{ color: i.color } as CSSProperties}>{i.val}</span>
          </div>
        ))}
      </div>
    </Card>
  </div>
);
