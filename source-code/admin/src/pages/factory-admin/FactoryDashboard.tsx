import { type CSSProperties } from "react";
import { Card } from '../../components/ui/Card'
import { Grid } from '../../components/ui/Grid'
import { Alert } from '../../components/ui/Alert'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { MetricCard } from '../../components/ui/MetricCard'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { Table } from '../../components/ui/Table'
import styles from "../../styles/modules/pages/AppCommon.module.css";

export const FactoryDashboard = () => (
  <div>
    <Alert type="warning"><strong>2 fertilizer batches expiring within 7 days.</strong> Review them under Fertilizer Inventory.</Alert>

    <Grid cols={4} gap={12}>
      <div className={styles.metricsSpan4Wide}>
        <MetricCard accent="green" icon="scale"   label="Collected Today"   value="1,860 kg" sub="↑ 6% vs yesterday" />
        <MetricCard accent="blue"  icon="users"   label="Active Suppliers"  value="42"       sub="Across 5 routes" />
        <MetricCard accent="amber" icon="seeding" label="Fertilizer Stock"  value="2,450 kg" sub="4 batches in store" />
        <MetricCard accent="red"   icon="warning" label="Pending Approvals" value="3"        sub="Needs your review" />
      </div>
    </Grid>

    <Grid cols={2} gap={16}>
      <Card>
        <SectionHeader title="Weekly Tea Leaves Collection (kg)" />
        <div className={styles.chartBars}>
          {[55,70,48,90,75,82,65].map((h,i) => <div key={i} className={`${styles.chartBar} ${i===6 ? styles.chartBarAmber : styles.chartBarGreen}`} style={{ "--bar-height": `${h}%` } as CSSProperties} />)}
        </div>
        <div className={styles.chartLabels}>
          {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => <div key={d} className={styles.chartLabel}>{d}</div>)}
        </div>
      </Card>
      <Card>
        <SectionHeader title="Collection by Route — Today" />
        <ProgressBar label="Route A — Ella"         value={92} />
        <ProgressBar label="Route B — Dimbula"      value={78} />
        <ProgressBar label="Route C — Uva"          value={85} />
        <ProgressBar label="Route D — Nuwara Eliya" value={54} color="var(--color-amber)" />
      </Card>
    </Grid>

    <Card>
      <SectionHeader title="Recent Collections">
        <Badge color="green">Today</Badge>
      </SectionHeader>
      <Table
        headers={["Supplier","Estate","Route","Weight","Grade","Time"]}
        rows={[
          [<div className={styles.avatarRow}><Avatar initials="KW" color="amber" size={24}/> Kamani Wijesiri</div>,"Uva Highlands","Route C","312 kg",<Badge color="green">A</Badge>,"08:42"],
          [<div className={styles.avatarRow}><Avatar initials="NK" color="green" size={24}/> Nimal Kumara</div>,"Ella Estate","Route A","268 kg",<Badge color="green">A</Badge>,"09:05"],
          [<div className={styles.avatarRow}><Avatar initials="SP" color="blue" size={24}/> Saman Perera</div>,"Dimbula Plot","Route B","190 kg",<Badge color="amber">B</Badge>,"09:31"],
        ]}
      />
    </Card>
  </div>
);
