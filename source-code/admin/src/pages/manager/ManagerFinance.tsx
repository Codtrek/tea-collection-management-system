import { type CSSProperties } from "react";
import { Card } from '../../components/ui/Card'
import { Grid } from '../../components/ui/Grid'
import { MetricCard } from '../../components/ui/MetricCard'
import { ProgressBar } from '../../components/ui/ProgressBar'
import styles from "../../styles/modules/pages/AppCommon.module.css";

export const ManagerFinance = () => (
  <div>
    <Grid cols={3} gap={12}><div className={styles.metricsSpan3}>
      <MetricCard accent="green" icon="currency" label="Total Income"   value="LKR 8.82M" sub="Tea leaf sales June" />
      <MetricCard accent="red"   icon="receipt"  label="Total Expenses" value="LKR 3.4M"  sub="All categories June" />
      <MetricCard accent="blue"  icon="chart"    label="Net Position"   value="LKR 5.4M"  sub="Before payroll" />
    </div></Grid>
    <Grid cols={2} gap={16}>
      <Card>
        <div className={styles.cardTitle}>Monthly Income vs Expenses Log</div>
        <div className={styles.chartBarsPaired}>
          {[["Jan",65,40],["Feb",70,38],["Mar",58,45],["Apr",80,42],["May",72,44],["Jun",88,48]].map(([m,inc,exp]) => (
            <div key={m} className={styles.chartBarPair}>
              <div className={styles.chartBarIncome} style={{ "--bar-height": `${inc}%` } as CSSProperties} />
              <div className={styles.chartBarExpense} style={{ "--bar-height": `${exp}%` } as CSSProperties} />
            </div>
          ))}
        </div>
        <div className={styles.chartLabelsWide}>
          {["Jan","Feb","Mar","Apr","May","Jun"].map(m => <div key={m} className={styles.chartLabel}>{m}</div>)}
        </div>
        <div className={styles.legend}>
          <span className={styles.legendItem}><div className={styles.legendDotGreen} /> Income</span>
          <span className={styles.legendItem}><div className={styles.legendDotRed} /> Expenses</span>
        </div>
      </Card>
      <Card>
        <div className={styles.cardTitle}>Expenses Breakdown — June</div>
        {[
          { cat:"Salary Payroll",     amt:"LKR 2,415,000", pct:71 },
          { cat:"Supplier Payments",  amt:"LKR 7,920,000", pct:100 },
          { cat:"Fertilizer Cost",    amt:"LKR 245,000",   pct:7 },
          { cat:"Transport",          amt:"LKR 185,000",   pct:5 },
          { cat:"Utilities",          amt:"LKR 45,000",    pct:1 },
          { cat:"Other Expenses",     amt:"LKR 55,000",    pct:2 },
        ].map(e => <ProgressBar key={e.cat} label={e.cat} value={e.pct} />)}
      </Card>
    </Grid>
  </div>
);
