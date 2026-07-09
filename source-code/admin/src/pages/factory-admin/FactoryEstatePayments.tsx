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

export const FactoryEstatePayments = () => (
  <div>
    <Grid cols={3} gap={12}>
      <div className={styles.metricsSpan3}>
        <MetricCard accent="green" icon="currency" label="Total Payable (June)" value="LKR 7.92M" sub="42 estate owners" />
        <MetricCard accent="amber" icon="receipt"  label="Pending Payments"     value="LKR 1.85M" sub="9 estate owners" />
        <MetricCard accent="blue"  icon="cash"      label="Paid This Month"      value="LKR 6.07M" sub="33 estate owners" />
      </div>
    </Grid>

    <Card>
      <SectionHeader title="Estate Owner Payments — June 2026">
        <SearchBar placeholder="Search estate owner…" />
        <Btn><Icon name="download" size={13} /> Export</Btn>
      </SectionHeader>
      <Table
        headers={["Estate Owner","Estate","Total Weight","Gross Amount","Deductions","Net Payable","Status","Action"]}
        rows={[
          [<div className={styles.avatarRow}><Avatar initials="KW" color="amber" size={24}/> Kamani Wijesiri</div>,"Uva Highlands","6,540 kg","LKR 1,308,000","− LKR 42,000","LKR 1,266,000",<Badge color="green">Paid</Badge>,<Btn small><Icon name="eye" size={11}/> Slip</Btn>],
          [<div className={styles.avatarRow}><Avatar initials="NK" color="green" size={24}/> Nimal Kumara</div>,"Ella Estate","4,820 kg","LKR 964,000","− LKR 18,500","LKR 945,500",<Badge color="amber">Pending</Badge>,<Btn small primary><Icon name="cash" size={11}/> Pay</Btn>],
          [<div className={styles.avatarRow}><Avatar initials="SP" color="blue" size={24}/> Saman Perera</div>,"Dimbula Plot","3,210 kg","LKR 642,000","− LKR 31,200","LKR 610,800",<Badge color="amber">Pending</Badge>,<Btn small primary><Icon name="cash" size={11}/> Pay</Btn>],
        ]}
      />
    </Card>

    <Grid cols={2} gap={16}>
      <Card>
        <div className={styles.cardTitle}>Make Estate Owner Payment</div>
        <FormRow label="Estate Owner"><Select><option>Select estate owner…</option><option>Nimal Kumara — Ella Estate</option><option>Saman Perera — Dimbula Plot</option></Select></FormRow>
        <Grid cols={2} gap={12}>
          <FormRow label="Payment Method"><Select><option>Bank Transfer</option><option>Cheque</option><option>Cash</option></Select></FormRow>
          <FormRow label="Payment Date"><Input type="date" /></FormRow>
        </Grid>
        <FormRow label="Reference No."><Input placeholder="Transaction / cheque number" /></FormRow>
        <Btn primary className={styles.btnFullCenter}><Icon name="send" size={13} /> Confirm Payment</Btn>
      </Card>
      <Card>
        <div className={styles.cardTitle}>Payment Summary</div>
        <div className={styles.summaryBox}>
          {[
            { label:"Gross tea leaf value",  val:"LKR 964,000", color:"var(--color-text)" },
            { label:"Fertilizer deductions", val:"− LKR 12,500", color:"var(--color-red)" },
            { label:"Advance recoveries",    val:"− LKR 6,000",  color:"var(--color-red)" },
            { label:"Net payable",           val:"LKR 945,500", color:"var(--color-green)", bold:true },
          ].map(i => (
            <div key={i.label} className={styles.summaryRow}>
              <span className={styles.summaryLabel}>{i.label}</span>
              <span className={i.bold ? styles.summaryValueBold : styles.summaryValue} style={{ color: i.color }}>{i.val}</span>
            </div>
          ))}
        </div>
      </Card>
    </Grid>
  </div>
);
