import { Card } from '../../components/ui/Card'
import { Grid } from '../../components/ui/Grid'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Btn } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { MetricCard } from '../../components/ui/MetricCard'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { SearchBar } from '../../components/ui/SearchBar'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { Select } from '../../components/ui/Form'
import { Table } from '../../components/ui/Table'
import styles from "../../styles/modules/pages/AppCommon.module.css";

export const FactoryPerformance = () => (
  <div>
    <Grid cols={4} gap={12}>
      <div className={styles.metricsSpan4}>
        <MetricCard accent="green" icon="chart"    label="Avg Output"        value="88%" sub="↑ 3% vs last month" />
        <MetricCard accent="blue"  icon="calendar" label="Attendance Rate"   value="93%" sub="June 2026" />
        <MetricCard accent="amber" icon="leaf"     label="Leaf Quality"      value="74%" sub="Target 80%" />
        <MetricCard accent="red"   icon="warning"  label="Needs Improvement" value="6"   sub="Below 70% score" />
      </div>
    </Grid>

    <Grid cols={2} gap={16}>
      <Card>
        <div className={styles.cardTitle}>Performance Overview — June 2026</div>
        <ProgressBar label="Average Plucking Output" value={88} />
        <ProgressBar label="Attendance Rate"         value={93} />
        <ProgressBar label="Leaf Quality Score"      value={74} color="var(--color-amber)" />
        <ProgressBar label="Task Completion"         value={95} />
      </Card>
      <Card>
        <div className={styles.cardTitle}>Top Performers</div>
        <Table headers={["Rank","Employee","Score"]} rows={[
          ["1",<div className={styles.avatarRow}><Avatar initials="TP" color="green" size={24}/> Thilak Premaratne</div>,<Badge color="green">97</Badge>],
          ["2",<div className={styles.avatarRow}><Avatar initials="AJ" color="blue" size={24}/> Amal Jayasinghe</div>,<Badge color="green">94</Badge>],
          ["3",<div className={styles.avatarRow}><Avatar initials="MD" color="amber" size={24}/> Mallika Dissanayake</div>,<Badge color="green">89</Badge>],
        ]} />
      </Card>
    </Grid>

    <Card>
      <SectionHeader title="Employee Performance Tracking">
        <SearchBar placeholder="Search employee…" />
        <Select style={{ width: 130 }}><option>June 2026</option><option>May 2026</option><option>April 2026</option></Select>
        <Btn><Icon name="download" size={13} /> Export</Btn>
      </SectionHeader>
      <Table
        headers={["Employee","Department","Output","Attendance","Quality","Rating","Action"]}
        rows={[
          [<div className={styles.avatarRow}><Avatar initials="AJ" color="green" size={24}/> Amal Jayasinghe</div>,"Plucking","92%","100%",<Badge color="green">A</Badge>,<Badge color="green">Excellent</Badge>,<Btn small><Icon name="eye" size={11}/> Review</Btn>],
          [<div className={styles.avatarRow}><Avatar initials="MD" color="blue" size={24}/> Mallika Dissanayake</div>,"Plucking","85%","96%",<Badge color="green">A</Badge>,<Badge color="green">Good</Badge>,<Btn small><Icon name="eye" size={11}/> Review</Btn>],
          [<div className={styles.avatarRow}><Avatar initials="RW" color="amber" size={24}/> Ruvini Weerasinghe</div>,"Quality","78%","88%",<Badge color="amber">B</Badge>,<Badge color="amber">Average</Badge>,<Btn small><Icon name="eye" size={11}/> Review</Btn>],
        ]}
      />
    </Card>
  </div>
);
