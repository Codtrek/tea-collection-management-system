import { type CSSProperties } from "react";
import { Card } from '../../components/ui/Card'
import { Grid } from '../../components/ui/Grid'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { MetricCard } from '../../components/ui/MetricCard'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { Table } from '../../components/ui/Table'
import styles from "../../styles/modules/pages/AppCommon.module.css";


export const ManagerDashboard = () => (
  <div>
    <Grid cols={4} gap={12}>
        <div className={styles.metricsSpan4Wide}>
            <MetricCard accent="green" icon="scale"    label="Total Collected (June)" value="44,100 kg" sub="↑ 8% vs last month" />
            <MetricCard accent="amber" icon="currency" label="Income This Month"      value="LKR 8.8M"  sub="Before deductions" />
            <MetricCard accent="red"   icon="receipt"  label="Expenses This Month"    value="LKR 485K"  sub="↑ 8% vs last month" />
            <MetricCard accent="blue"  icon="leaf"     label="Grade A %"              value="68%"       sub="↑ 4% from last week" />
        </div>
    </Grid>

    <Grid cols={2} gap={16}>
      <Card>
        <SectionHeader title="Weekly Tea Collection (kg)" />
        <div className={styles.chartBars}>
          {[55,70,48,90,75,82,65].map((h,i) => <div key={i} className={`${styles.chartBar} ${i===6 ? styles.chartBarAmber : styles.chartBarGreen}`} style={{ "--bar-height": `${h}%` } as CSSProperties} />)}
        </div>
        <div className={styles.chartLabels}>
          {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => <div key={d} className={styles.chartLabel}>{d}</div>)}
        </div>
      </Card>
      <Card>
        <SectionHeader title="Income vs Expenses — June 2025" />
        <div className={styles.summaryBox}>
          {[
            { label:"Total income",       val:"LKR 8,820,000", color:"var(--color-green)" },
            { label:"Total expenses",     val:"LKR 485,000",   color:"var(--color-red)" },
            { label:"Salary payroll",     val:"LKR 2,415,000", color:"var(--color-red)" },
            { label:"Supplier payments",  val:"LKR 7,920,000", color:"var(--color-red)" },
            { label:"Net profit/loss",    val:"LKR −2,000,000",color:"var(--color-red)", bold:true },
          ].map(i => (
            <div key={i.label} className={styles.summaryRow}>
              <span className={styles.summaryLabel}>{i.label}</span>
              <span className={i.bold ? styles.summaryValueBold : styles.summaryValue} style={{ color: i.color } as CSSProperties}>{i.val}</span>
            </div>
          ))}
        </div>
      </Card>
    </Grid>

    <Card>
      <SectionHeader title="Top Suppliers This Month">
        <Badge color="green">June 2025</Badge>
      </SectionHeader>
      <Table
        headers={["Supplier","Estate","Route","Total Weight","Grade A %","Fee Payable","Status"]}
        rows={[
          [<div className={styles.avatarRow}><Avatar initials="KW" color="amber" size={24}/> Kamani Wijesiri</div>,"Uva Highlands","Route C","6,540 kg",<Badge color="green">74%</Badge>,"LKR 126,000",<Badge color="green">Paid</Badge>],
          [<div className={styles.avatarRow}><Avatar initials="NK" color="green" size={24}/> Nimal Kumara</div>,"Ella Estate","Route A","4,820 kg",<Badge color="green">82%</Badge>,"LKR 92,800",<Badge color="amber">Pending</Badge>],
          [<div className={styles.avatarRow}><Avatar initials="SP" color="blue" size={24}/> Saman Perera</div>,"Dimbula Plot","Route B","3,210 kg",<Badge color="amber">61%</Badge>,"LKR 61,500",<Badge color="amber">Pending</Badge>],
        ]}
      />
    </Card>
  </div>
);
