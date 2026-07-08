import { Card } from '../../components/ui/Card'
import { Grid } from '../../components/ui/Grid'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Btn } from '../../components/ui/Button'
import { FormRow, Input, Select, Textarea } from '../../components/ui/Form'
import { Icon } from '../../components/ui/Icon'
import { SectionHeader } from '../../components/ui/SectionHeader'
import styles from "../../styles/modules/pages/FactoryAdmin.module.css";

const UploadZone = ({ hint }: { hint: string }) => (
  <div className={styles.uploadZone}>
    <Icon name="upload" size={20} />
    <div className={styles.uploadText}>Click to upload or drag and drop</div>
    <div className={styles.uploadHint}>{hint}</div>
  </div>
);

export const FactoryRegistration = () => (
  <div>
    <Alert type="info">Registration details are reviewed by the system administrator. Approval usually takes 24-48 hours.</Alert>
    <Card>
      <SectionHeader title="Factory Registration Form">
        <Badge color="amber">Draft</Badge>
      </SectionHeader>

      <div className={styles.sectionTitle}>Factory Information</div>
      <Grid cols={2} gap={12}>
        <FormRow label="Factory Name"><Input placeholder="e.g. Nuwara Eliya Tea Factory" /></FormRow>
        <FormRow label="BR Number"><Input placeholder="e.g. BR-2024-XXXXX" /></FormRow>
        <FormRow label="Tea Board Registration No."><Input placeholder="e.g. TB-XXXX" /></FormRow>
        <FormRow label="Factory Type"><Select><option>Orthodox</option><option>CTC</option><option>Green Tea</option><option>Mixed</option></Select></FormRow>
        <FormRow label="Factory Address"><Input placeholder="Street, City, District" /></FormRow>
        <FormRow label="Region"><Select><option>Nuwara Eliya</option><option>Uva</option><option>Dimbula</option><option>Kandy</option><option>Ruhuna</option></Select></FormRow>
        <FormRow label="Official Email"><Input type="email" placeholder="factory@example.com" /></FormRow>
        <FormRow label="Official Phone"><Input placeholder="+94 XX XXX XXXX" /></FormRow>
        <FormRow label="Daily Processing Capacity (kg)"><Input placeholder="0" /></FormRow>
        <FormRow label="Year Established"><Input placeholder="e.g. 1998" /></FormRow>
      </Grid>

      <div className={styles.sectionTitleSpaced}>Owner &amp; Contact Person</div>
      <Grid cols={2} gap={12}>
        <FormRow label="Owner Name"><Input placeholder="Full name" /></FormRow>
        <FormRow label="Owner NIC"><Input placeholder="NIC number" /></FormRow>
        <FormRow label="Contact Person Name"><Input placeholder="Full name" /></FormRow>
        <FormRow label="Position / Designation"><Input placeholder="e.g. General Manager" /></FormRow>
        <FormRow label="Contact Mobile"><Input placeholder="+94 7X XXX XXXX" /></FormRow>
        <FormRow label="Contact Email"><Input type="email" placeholder="name@example.com" /></FormRow>
      </Grid>

      <div className={styles.sectionTitleSpaced}>Bank Details</div>
      <Grid cols={2} gap={12}>
        <FormRow label="Bank Name"><Input placeholder="e.g. Bank of Ceylon" /></FormRow>
        <FormRow label="Branch"><Input placeholder="Branch name" /></FormRow>
        <FormRow label="Account Number"><Input placeholder="XXXXXXXXXX" /></FormRow>
        <FormRow label="Account Holder"><Input placeholder="Name as in bank records" /></FormRow>
      </Grid>

      <div className={styles.sectionTitleSpaced}>Documents</div>
      <Grid cols={2} gap={12}>
        <FormRow label="BR Certificate"><UploadZone hint="PDF, JPG, PNG up to 5MB" /></FormRow>
        <FormRow label="Tea Board Licence"><UploadZone hint="PDF, JPG, PNG up to 5MB" /></FormRow>
      </Grid>
      <FormRow label="Additional Notes"><Textarea placeholder="Anything the reviewer should know…" rows={3} /></FormRow>

      <div className={styles.formActions}>
        <Btn>Save Draft</Btn>
        <Btn primary><Icon name="send" size={13} /> Submit Registration</Btn>
      </div>
    </Card>
  </div>
);
