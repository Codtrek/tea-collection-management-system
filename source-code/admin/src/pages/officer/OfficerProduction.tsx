import { Card } from '../../components/ui/Card'
import { Grid } from '../../components/ui/Grid'
import { Btn } from '../../components/ui/Button'
import { FormRow, Input } from '../../components/ui/Form'
import { Icon } from '../../components/ui/Icon'
import { Table } from '../../components/ui/Table'
import styles from "../../styles/modules/pages/AppCommon.module.css";

export const OfficerProduction = () => (
  <div>
    <Card>
      <div className={styles.cardTitle}>Enter Tea Produced Weight by Grade</div>
      <Grid cols={2} gap={12}>
        <FormRow label="Production Date"><Input type="date" /></FormRow>
        <FormRow label="Batch Reference"><Input placeholder="PROD-XXXX" /></FormRow>
        <FormRow label="BOP (Broken Orange Pekoe) — kg"><Input placeholder="0.0" /></FormRow>
        <FormRow label="BOPF (BOP Fannings) — kg"><Input placeholder="0.0" /></FormRow>
        <FormRow label="Dust Grade 1 — kg"><Input placeholder="0.0" /></FormRow>
        <FormRow label="Dust Grade 2 — kg"><Input placeholder="0.0" /></FormRow>
        <FormRow label="PF (Pekoe Fannings) — kg"><Input placeholder="0.0" /></FormRow>
        <FormRow label="OPA (Orange Pekoe A) — kg"><Input placeholder="0.0" /></FormRow>
      </Grid>
      <div className={styles.infoBox}>
        <div className={styles.summaryRowPlain}><span className={styles.summaryLabel}>Total Production</span><span className={styles.summaryValue}>0.0 kg</span></div>
      </div>
      <Btn primary className={styles.btnFullCenter}><Icon name="check" size={13} /> Record Production</Btn>
    </Card>
    <Card>
      <div className={styles.cardTitleMb12}>Recent Production Records</div>
      <Table headers={["Date","Batch","BOP","BOPF","Dust 1","Dust 2","Total","Actions"]} rows={[
        ["2025-06-24","PROD-0041","340 kg","280 kg","190 kg","120 kg","930 kg",<Btn small>View</Btn>],
        ["2025-06-23","PROD-0040","310 kg","260 kg","175 kg","110 kg","855 kg",<Btn small>View</Btn>],
      ]} />
    </Card>
  </div>
);
