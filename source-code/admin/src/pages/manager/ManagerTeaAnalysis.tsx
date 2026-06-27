import { type CSSProperties } from "react";
import { Card } from '../../components/ui/Card'
import { Grid } from '../../components/ui/Grid'
import { Badge } from '../../components/ui/Badge'
import { Btn } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { MetricCard } from '../../components/ui/MetricCard'
import { SearchBar } from '../../components/ui/SearchBar'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { Table } from '../../components/ui/Table'
import styles from "../../styles/modules/pages/AppCommon.module.css";

export const ManagerTeaAnalysis = () => (
  <div>
    <Grid cols={3} gap={12}><div className={styles.metricsSpan3}>
      <MetricCard accent="green" icon="scale"  label="Total This Month"    value="44,100 kg" sub="Across all routes" />
      <MetricCard accent="blue"  icon="route"  label="Active Routes"       value="5"         sub="All operational" />
      <MetricCard accent="amber" icon="truck"  label="Active Suppliers"    value="38"        sub="6 deliveries today" />
    </div></Grid>
    <Grid cols={2} gap={16}>
      <Card>
        <div className={styles.cardTitle}>Collection by Route</div>
        {[
          { route:"Route A — Ella",    kg:14200, pct:32, color:"var(--color-green)" },
          { route:"Route B — Dimbula", kg:10800, pct:24, color:"var(--color-blue)" },
          { route:"Route C — Uva",     kg:11500, pct:26, color:"var(--color-amber)" },
          { route:"Route D — Matale",  kg:7600,  pct:18, color:"#7c3aed" },
        ].map(r => (
          <div key={r.route} className={styles.progressItem}>
            <div className={styles.progressHeader}>
              <span className={styles.progressHeaderLabel}>{r.route}</span>
              <span className={styles.progressHeaderValue}>{r.kg.toLocaleString()} kg ({r.pct}%)</span>
            </div>
            <div className={styles.progressTrack}><div className={styles.progressFill} style={{ "--fill-width": `${r.pct*3}%`, "--fill-color": r.color } as CSSProperties} /></div>
          </div>
        ))}
      </Card>
      <Card>
        <div className={styles.cardTitle}>Quality Grade Distribution</div>
        {[
          { grade:"Grade A — Premium",  kg:29988, pct:68, color:"var(--color-green)" },
          { grade:"Grade B — Standard", kg:10584, pct:24, color:"var(--color-amber)" },
          { grade:"Grade C — Reject",   kg:3528,  pct:8,  color:"var(--color-red)" },
        ].map(r => (
          <div key={r.grade} className={styles.progressItemLoose}>
            <div className={styles.progressHeader}>
              <span className={styles.progressHeaderLabel}>{r.grade}</span>
              <span className={styles.progressHeaderValue}>{r.kg.toLocaleString()} kg ({r.pct}%)</span>
            </div>
            <div className={styles.progressTrack}><div className={styles.progressFill} style={{ "--fill-width": `${r.pct}%`, "--fill-color": r.color } as CSSProperties} /></div>
          </div>
        ))}
      </Card>
    </Grid>
    <Card>
      <SectionHeader title="Collection by Supplier">
        <SearchBar placeholder="Search supplier…" />
        <Btn><Icon name="filter" size={13} /> Filter by Route</Btn>
      </SectionHeader>
      <Table
        headers={["Supplier","Estate","Route","Weight (kg)","Grade A %","Trend","Status"]}
        rows={[
          ["Kamani Wijesiri","Uva Highlands","Route C","6,540 kg",<Badge color="green">74%</Badge>,"↑ 12%",<Badge color="green">Active</Badge>],
          ["Nimal Kumara","Ella Estate","Route A","4,820 kg",<Badge color="green">82%</Badge>,"↑ 5%",<Badge color="green">Active</Badge>],
          ["Saman Perera","Dimbula Plot","Route B","3,210 kg",<Badge color="amber">61%</Badge>,"↓ 3%",<Badge color="green">Active</Badge>],
        ]}
      />
    </Card>
  </div>
);
