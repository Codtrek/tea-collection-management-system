import { Card } from '../components/ui/Card'
import { Btn } from '../components/ui/Button'
import { FormRow, Input} from '../components/ui/Form'
import { Icon } from '../components/ui/Icon'
import { type LoginProps } from '../types'
import styles from "./LoginPage.module.css";

export const LoginPage = ({ onNavigate, onLogin }: LoginProps) => (
  <div className={styles.page}>
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.iconWrap}><Icon name="leaf" size={24} color="#ffffff" /></div>
        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.sub}>Sign in to Tea CMS</p>
      </div>
      <Card className={styles.formCard}>
        <FormRow label="NIC Number"><Input placeholder="Enter your NIC number" /></FormRow>
        <FormRow label="Password"><Input type="password" placeholder="Enter your password" /></FormRow>
        <Btn primary className={styles.btnFull} onClick={() => onLogin("officer")}>Sign In as Officer</Btn>
        <Btn className={`${styles.btnFull} ${styles.btnManager}`} onClick={() => onLogin("manager")}>Sign In as Manager</Btn>
        <Btn className={`${styles.btnFull} ${styles.btnAdmin}`} onClick={() => onLogin("admin")}>Sign In as Dev Admin</Btn>
        <div className={styles.footer}>
          Don't have an account? <span className={styles.link} onClick={() => onNavigate("/signup")}>Register factory</span>
        </div>
      </Card>
      <div className={styles.back} onClick={() => onNavigate("/landing")}>← Back to home</div>
    </div>
  </div>
);
