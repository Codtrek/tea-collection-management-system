import { type CSSProperties } from "react";
import { Card } from '../../components/ui/Card'
import { Grid } from '../../components/ui/Grid'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Btn } from '../../components/ui/Button'
import { FormRow, Input, Select } from '../../components/ui/Form'
import { Icon } from '../../components/ui/Icon'
import { MetricCard } from '../../components/ui/MetricCard'
import { SearchBar } from '../../components/ui/SearchBar'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { Table } from '../../components/ui/Table'
import styles from "../../styles/modules/pages/AppCommon.module.css";

export const FactoryTeaCollection = () => (
  <div>
    <Grid cols={4} gap={12}>
      <div className={styles.metricsSpan4}>
        <MetricCard accent="green" icon="scale"   label="Collected Today" value="1,860 kg"  sub="42 suppliers" />
        <MetricCard accent="blue"  icon="chart"   label="Month to Date"   value="44,100 kg" sub="↑ 8% vs last month" />
        <MetricCard accent="amber" icon="leaf"    label="Grade A Share"   value="68%"       sub="↑ 4% from last week" />
        <MetricCard accent="red"   icon="warning" label="Rejected Today"  value="46 kg"     sub="High moisture" />
      </div>
    </Grid>

    <Grid cols={2} gap={16}>
      <Card>
        <div className={styles.cardTitle}>Record Collection</div>
        <FormRow label="Supplier / Estate"><Select><option>Select supplier…</option><option>Kamani Wijesiri — Uva Highlands</option><option>Nimal Kumara — Ella Estate</option></Select></FormRow>
        <Grid cols={2} gap={12}>
          <FormRow label="Gross Weight (kg)"><Input placeholder="0.0" /></FormRow>
          <FormRow label="Moisture Deduction (kg)"><Input placeholder="0.0" /></FormRow>
          <FormRow label="Grade"><Select><option>A</option><option>B</option><option>C</option></Select></FormRow>
          <FormRow label="Collection Date"><Input type="date" /></FormRow>
        </Grid>
        <div className={styles.summaryBoxSm}>
          <div className={styles.summaryRowPlain}><span className={styles.summaryLabel}>Net weight</span><span className={styles.summaryValueGreen}>0.0 kg</span></div>
          <div className={styles.summaryRowPlain}><span className={styles.summaryLabel}>Rate (LKR/kg)</span><span className={styles.summaryValue}>LKR 200</span></div>
        </div>
        <Btn primary className={styles.btnFullCenter}><Icon name="plus" size={13} /> Save Collection</Btn>
      </Card>
      <Card>
        <div className={styles.cardTitle}>Collection by Grade — Today</div>
        <div className={styles.summaryBox}>
          {[
            { label:"Grade A", val:"1,265 kg", color:"var(--color-green)" },
            { label:"Grade B", val:"474 kg",   color:"var(--color-amber)" },
            { label:"Grade C", val:"121 kg",   color:"var(--color-red)" },
            { label:"Total",   val:"1,860 kg", color:"var(--color-text)", bold:true },
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
      <SectionHeader title="Collection Log">
        <SearchBar placeholder="Search supplier…" />
        <Btn><Icon name="download" size={13} /> Export</Btn>
      </SectionHeader>
      <Table
        headers={["Supplier","Estate","Route","Net Weight","Grade","Value","Status"]}
        rows={[
          [<div className={styles.avatarRow}><Avatar initials="KW" color="amber" size={24}/> Kamani Wijesiri</div>,"Uva Highlands","Route C","312 kg",<Badge color="green">A</Badge>,"LKR 62,400",<Badge color="green">Verified</Badge>],
          [<div className={styles.avatarRow}><Avatar initials="NK" color="green" size={24}/> Nimal Kumara</div>,"Ella Estate","Route A","268 kg",<Badge color="green">A</Badge>,"LKR 53,600",<Badge color="green">Verified</Badge>],
          [<div className={styles.avatarRow}><Avatar initials="SP" color="blue" size={24}/> Saman Perera</div>,"Dimbula Plot","Route B","190 kg",<Badge color="amber">B</Badge>,"LKR 38,000",<Badge color="amber">Pending</Badge>],
        ]}
      />
    </Card>
  </div>
);
