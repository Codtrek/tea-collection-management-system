import { type CSSProperties } from "react";
import { Card } from '../../components/ui/Card'
import { Grid } from '../../components/ui/Grid'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Btn } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { MetricCard } from '../../components/ui/MetricCard'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { Input, Select } from '../../components/ui/Form'
import { Table } from '../../components/ui/Table'
import styles from "../../styles/modules/pages/AppCommon.module.css";

export const FactoryCollectionReport = () => (
  <div>
    <Card>
      <SectionHeader title="Report Filters">
        <Select style={{ width: 140 }}><option>Monthly</option><option>Weekly</option><option>Daily</option><option>Custom Range</option></Select>
        <Input type="date" style={{ width: 140 }} />
        <Input type="date" style={{ width: 140 }} />
        <Select style={{ width: 140 }}><option>All Routes</option><option>Route A</option><option>Route B</option><option>Route C</option></Select>
        <Btn primary><Icon name="filter" size={13} /> Generate</Btn>
      </SectionHeader>
    </Card>

    <Grid cols={4} gap={12}>
      <div className={styles.metricsSpan4}>
        <MetricCard accent="green" icon="scale"   label="Total Collected"  value="44,100 kg" sub="June 2026" />
        <MetricCard accent="blue"  icon="chart"   label="Daily Average"    value="1,470 kg"  sub="30 collection days" />
        <MetricCard accent="amber" icon="leaf"    label="Grade A Share"    value="68%"       sub="↑ 4% vs May" />
        <MetricCard accent="red"   icon="warning" label="Rejected"         value="1,120 kg"  sub="2.5% of total" />
      </div>
    </Grid>

    <Grid cols={2} gap={16}>
      <Card>
        <SectionHeader title="Daily Collection Trend (kg)" />
        <div className={styles.chartBars}>
          {[55,70,48,90,75,82,65,72,60,88,78,84].map((h,i) => <div key={i} className={`${styles.chartBar} ${i===11 ? styles.chartBarAmber : styles.chartBarGreen}`} style={{ "--bar-height": `${h}%` } as CSSProperties} />)}
        </div>
        <div className={styles.chartLabels}>
          {["1","3","5","7","9","11","13","15","17","19","21","23"].map(d => <div key={d} className={styles.chartLabel}>{d}</div>)}
        </div>
      </Card>
      <Card>
        <SectionHeader title="Collection by Route" />
        <ProgressBar label="Route A — Ella"         value={92} />
        <ProgressBar label="Route B — Dimbula"      value={78} />
        <ProgressBar label="Route C — Uva"          value={85} />
        <ProgressBar label="Route D — Nuwara Eliya" value={54} color="var(--color-amber)" />
      </Card>
    </Grid>

    <Card>
      <SectionHeader title="Collection Report by Supplier — June 2026">
        <Badge color="green">44,100 kg</Badge>
        <Btn><Icon name="download" size={13} /> Export PDF</Btn>
        <Btn><Icon name="download" size={13} /> Export Excel</Btn>
      </SectionHeader>
      <Table
        headers={["Supplier","Estate","Route","Total Weight","Grade A %","Rejected","Collections"]}
        rows={[
          [<div className={styles.avatarRow}><Avatar initials="KW" color="amber" size={24}/> Kamani Wijesiri</div>,"Uva Highlands","Route C","6,540 kg",<Badge color="green">74%</Badge>,"82 kg","26"],
          [<div className={styles.avatarRow}><Avatar initials="NK" color="green" size={24}/> Nimal Kumara</div>,"Ella Estate","Route A","4,820 kg",<Badge color="green">82%</Badge>,"40 kg","24"],
          [<div className={styles.avatarRow}><Avatar initials="SP" color="blue" size={24}/> Saman Perera</div>,"Dimbula Plot","Route B","3,210 kg",<Badge color="amber">61%</Badge>,"96 kg","22"],
        ]}
      />
    </Card>
  </div>
);
