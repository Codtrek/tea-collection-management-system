import { Card } from '../components/ui/Card'
import { Grid } from '../components/ui/Grid'
import { Alert } from '../components/ui/Alert'
import { Btn } from '../components/ui/Button'
import { FormRow,Input } from '../components/ui/Form'
import { Icon } from '../components/ui/Icon'
import { type NavigateProps } from '../types'
import styles from "./SignupPage.module.css";


export const SignupPage = ({ onNavigate }: NavigateProps) => (
  <div className={styles.page}>
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.iconWrap}><Icon name="factory" size={24} color="#ffffff" /></div>
        <h1 className={styles.title}>Register Your Factory</h1>
        <p className={styles.sub}>Your registration will be reviewed and approved by our team</p>
      </div>
      <Card className={styles.formCard}>
        <div className={styles.sectionTitle}>Factory Information</div>
        <Grid cols={2} gap={12}>
          <FormRow label="Factory Name"><Input placeholder="e.g. Nuwara Eliya Tea Factory" /></FormRow>
          <FormRow label="BR Number"><Input placeholder="e.g. BR-2024-XXXXX" /></FormRow>
          <FormRow label="Factory Address"><Input placeholder="Street, City, District" /></FormRow>
          <FormRow label="Official Email"><Input type="email" placeholder="factory@example.com" /></FormRow>
          <FormRow label="Official Phone"><Input placeholder="+94 XX XXX XXXX" /></FormRow>
        </Grid>

        <div className={styles.sectionTitleSpaced}>Contact Person</div>
        <Grid cols={2} gap={12}>
          <FormRow label="Contact Person Name"><Input placeholder="Full name" /></FormRow>
          <FormRow label="Position / Designation"><Input placeholder="e.g. General Manager" /></FormRow>
        </Grid>

        <div className={styles.sectionTitleSpaced}>Documents</div>
        <FormRow label="BR Certificate Upload">
          <div className={styles.uploadZone}>
            <Icon name="upload" size={20} />
            <div className={styles.uploadText}>Click to upload or drag and drop</div>
            <div className={styles.uploadHint}>PDF, JPG, PNG up to 5MB</div>
          </div>
        </FormRow>

        <Alert type="info">Your registration will be reviewed within 24-48 hours. You will receive an email confirmation once approved.</Alert>

        <Btn primary className={styles.btnFull}>Submit Registration</Btn>
        <div className={styles.footer}>
          Already registered? <span className={styles.link} onClick={() =>  onNavigate("/login")}>Sign in</span>
        </div>
      </Card>
      <div className={styles.back} onClick={() => onNavigate("/landing")}>← Back to home</div>
    </div>
  </div>
);
