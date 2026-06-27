import { type CSSProperties } from "react";
import { Card } from '../../components/ui/Card'
import { Grid } from '../../components/ui/Grid'
import { MetricCard } from '../../components/ui/MetricCard'
import styles from "../../styles/modules/pages/AppCommon.module.css";

const fillClasses = [styles.fillGreen, styles.fillBlue, styles.fillAmber, styles.fillRed];

export const ManagerProduction = () => (
  <div>
    <Grid cols={4} gap={12}><div className={styles.metricsSpan4}>
      <MetricCard accent="green" icon="leaf"  label="Total Production" value="14,820 kg" sub="This month" />
      <MetricCard accent="blue"  icon="scale" label="BOP Grade"        value="5,100 kg"  sub="34% of total" />
      <MetricCard accent="amber" icon="scale" label="BOPF Grade"       value="4,200 kg"  sub="28% of total" />
      <MetricCard accent="red"   icon="scale" label="Dust Grades"      value="5,520 kg"  sub="38% of total" />
    </div></Grid>
    <Card>
      <div className={styles.cardTitleMb12}>Production by Grade — June 2025</div>
      {[
        { grade:"BOP (Broken Orange Pekoe)", kg:5100, pct:34 },
        { grade:"BOPF (BOP Fannings)",       kg:4200, pct:28 },
        { grade:"Dust Grade 1",              kg:3100, pct:21 },
        { grade:"Dust Grade 2",              kg:1500, pct:10 },
        { grade:"PF (Pekoe Fannings)",       kg:620,  pct:4  },
        { grade:"OPA",                       kg:300,  pct:2  },
      ].map((g,i) => (
        <div key={g.grade} className={styles.progressItemTight}>
          <div className={styles.progressHeader}>
            <span className={styles.progressHeaderLabel}>{g.grade}</span>
            <span className={styles.progressHeaderValue}>{g.kg.toLocaleString()} kg ({g.pct}%)</span>
          </div>
          <div className={styles.progressTrackSm}><div className={`${styles.progressFillSm} ${fillClasses[Math.min(i, 3)]}`} style={{ "--fill-width": `${g.pct*2.5}%` } as CSSProperties} /></div>
        </div>
      ))}
    </Card>
  </div>
);
