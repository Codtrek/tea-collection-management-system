import { Card } from '../../components/ui/Card'
import { Grid } from '../../components/ui/Grid'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Btn } from '../../components/ui/Button'
import { FormRow, Input, Select } from '../../components/ui/Form'
import { Icon } from '../../components/ui/Icon'
import { MetricCard } from '../../components/ui/MetricCard'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { Table } from '../../components/ui/Table'
import styles from "../../styles/modules/pages/AppCommon.module.css";

export const FactoryFertilizer = () => (
  <div>
    <Alert type="warning"><strong>2 items expiring within 7 days.</strong> Review stock and notify relevant estates.</Alert>
    <Grid cols={4} gap={12}>
      <div className={styles.metricsSpan4}>
        <MetricCard accent="green" icon="seeding"  label="Total Stock"   value="2,450 kg" sub="All fertilizer types" />
        <MetricCard accent="amber" icon="currency" label="Stock Value"   value="LKR 245K" sub="Current inventory" />
        <MetricCard accent="blue"  icon="send"     label="Issued (June)" value="860 kg"   sub="To 14 estates" />
        <MetricCard accent="red"   icon="warning"  label="Expiring Soon" value="2 items"  sub="Within 7 days" />
      </div>
    </Grid>

    <Grid cols={2} gap={16}>
      <Card>
        <div className={styles.cardTitle}>Receive Fertilizer Stock</div>
        <Grid cols={2} gap={12}>
          <FormRow label="Fertilizer Name"><Input placeholder="e.g. Urea 46%" /></FormRow>
          <FormRow label="Supplier / Brand"><Input placeholder="Manufacturer name" /></FormRow>
          <FormRow label="Quantity (kg)"><Input placeholder="0.0" /></FormRow>
          <FormRow label="Unit Cost (LKR/kg)"><Input placeholder="0.00" /></FormRow>
          <FormRow label="Batch Number"><Input placeholder="BATCH-XXXX" /></FormRow>
          <FormRow label="Expiry Date"><Input type="date" /></FormRow>
        </Grid>
        <Btn primary className={styles.btnFullCenterMt4}><Icon name="plus" size={13} /> Add to Stock</Btn>
      </Card>
      <Card>
        <div className={styles.cardTitle}>Issue Fertilizer to Estate</div>
        <FormRow label="Estate / Supplier"><Select><option>Select estate…</option></Select></FormRow>
        <FormRow label="Fertilizer Type"><Select><option>Select from stock…</option><option>Urea 46% (480 kg available)</option><option>NPK 15-15-15 (1,200 kg available)</option></Select></FormRow>
        <FormRow label="Quantity to Issue (kg)"><Input placeholder="0.0" /></FormRow>
        <FormRow label="Issue Date"><Input type="date" /></FormRow>
        <div className={styles.summaryBoxSm}>
          <div className={styles.summaryRowPlain}><span className={styles.summaryLabel}>Cost to deduct</span><span className={styles.summaryValue}>LKR 0.00</span></div>
        </div>
        <Btn primary className={styles.btnFullCenter}><Icon name="send" size={13} /> Issue &amp; Create Deduction</Btn>
      </Card>
    </Grid>

    <Card>
      <SectionHeader title="Current Stock Levels" />
      <Table
        headers={["Fertilizer","Batch","In Stock","Unit Cost","Value","Expiry","Status"]}
        rows={[
          ["Urea 46%","BATCH-2241","480 kg","LKR 85/kg","LKR 40,800","2026-06-29",<Badge color="red">Expiring Soon</Badge>],
          ["NPK 15-15-15","BATCH-2198","1,200 kg","LKR 120/kg","LKR 144,000","2026-09-14",<Badge color="green">Good</Badge>],
          ["Muriate of Potash","BATCH-2205","320 kg","LKR 95/kg","LKR 30,400","2026-07-01",<Badge color="amber">Caution</Badge>],
          ["Rock Phosphate","BATCH-2180","450 kg","LKR 72/kg","LKR 32,400","2026-11-20",<Badge color="green">Good</Badge>],
        ]}
      />
    </Card>
  </div>
);
