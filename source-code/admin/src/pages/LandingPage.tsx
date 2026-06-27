
import { Icon } from '../components/ui/Icon'
import { Btn } from '../components//ui/Button'
import { type NavigateProps } from '../types'
import styles from "./LandingPage.module.css";

export const LandingPage = ({ onNavigate }: NavigateProps) => (
  <div className={styles.page}>
    {/* Nav */}
    <div className={styles.nav}>
      <div className={styles.navLogo}>
        <div className={styles.logoIcon}><Icon name="leaf" size={18} color="#ffffff" /></div>
        <span className={styles.logoText}>Tea CMS</span>
      </div>
      <div className={styles.navActions}>
        <Btn onClick={() =>  onNavigate("/login")}>Login</Btn>
        <Btn primary onClick={() => onNavigate("signup")}>Register Factory</Btn>
      </div>
    </div>

    {/* Hero */}
    <div className={styles.hero}>
      <div className={styles.heroBadge}>
        <Icon name="leaf" size={13} /> Sri Lanka Tea Industry — Digital Management
      </div>
      <h1 className={styles.heroTitle}>Manage Your Tea Factory<br />From Field to Factory</h1>
      <p className={styles.heroSub}>A complete digital platform for Sri Lankan tea estates and factories — track collections, manage employees, handle payments, and analyze production in one place.</p>
      <div className={styles.heroActions}>
        <Btn primary className={styles.heroBtnPrimary} onClick={() => onNavigate("signup")}>Get Started Free</Btn>
        <Btn className={styles.heroBtnSecondary} onClick={() =>  onNavigate("/login")}>Sign In</Btn>
      </div>
    </div>

    {/* Stats */}
    <div className={styles.stats}>
      {[
        { val:"2,400+", label:"Tonnes Tracked Monthly" },
        { val:"150+",   label:"Registered Factories" },
        { val:"12,000+",label:"Employees Managed" },
        { val:"99.9%",  label:"System Uptime" },
      ].map((s,i) => (
        <div key={i} className={styles.statItem}>
          <div className={styles.statVal}>{s.val}</div>
          <div className={styles.statLabel}>{s.label}</div>
        </div>
      ))}
    </div>

    {/* Features */}
    <div className={styles.features}>
      <div className={styles.featuresHeader}>
        <h2 className={styles.featuresTitle}>Everything Your Factory Needs</h2>
        <p className={styles.featuresSub}>Designed specifically for Sri Lankan tea estate and factory operations</p>
      </div>
      <div className={styles.featuresGrid}>
        {[
          { icon:"scale",    title:"Tea Collection Tracking",     desc:"Record daily tea leaf weights from every estate. Track quality grades, verify collections with OTP, and capture photo evidence." },
          { icon:"seeding",  title:"Fertilizer Management",        desc:"Manage fertilizer stock, issue to estates, and automatically deduct costs from monthly tea leaf payment calculations." },
          { icon:"users",    title:"Employee Management",          desc:"Register employees, track attendance, manage salary advances, and process monthly payroll — all in one place." },
          { icon:"truck",    title:"Supplier & Estate Management", desc:"Register tea estate suppliers, assign collection routes, and track their delivery history and payment status." },
          { icon:"cash",     title:"Payments & Deductions",        desc:"Calculate tea leaf fees, apply fertilizer and transport deductions, issue salary advances, and finalize monthly payments." },
          { icon:"chart",    title:"Analytics & Reports",          desc:"Visualize collection trends by route and supplier, analyze employee performance, and generate financial reports." },
        ].map(f => (
          <div key={f.title} className={styles.featureCard}>
            <div className={styles.featureIcon}><Icon name={f.icon} size={20} /></div>
            <div className={styles.featureTitle}>{f.title}</div>
            <div className={styles.featureDesc}>{f.desc}</div>
          </div>
        ))}
      </div>
    </div>

    {/* Workflow */}
    <div className={styles.workflow}>
      <div className={styles.workflowHeader}>
        <h2 className={styles.workflowTitle}>How It Works</h2>
        <p className={styles.workflowSub}>Simple workflow from estate to factory</p>
      </div>
      <div className={styles.workflowSteps}>
        {[
          { num:"01", title:"Register",    desc:"Factory registers and gets approved by the Tea CMS admin team." },
          { num:"02", title:"Setup",       desc:"Add employees, suppliers, estates, and configure collection routes." },
          { num:"03", title:"Collect",     desc:"Collection agents visit estates, record tea weights with OTP verification." },
          { num:"04", title:"Process",     desc:"Officers enter data, manage inventory, and track daily operations." },
          { num:"05", title:"Pay",         desc:"System calculates fees, applies deductions, and processes payments." },
        ].map((s,i) => (
          <div key={i} className={styles.workflowStep}>
            <div className={styles.stepNum}>{s.num}</div>
            {i < 4 && <div className={styles.stepConnector} />}
            <div className={styles.stepTitle}>{s.title}</div>
            <div className={styles.stepDesc}>{s.desc}</div>
          </div>
        ))}
      </div>
    </div>

    {/* CTA */}
    <div className={styles.cta}>
      <h2 className={styles.ctaTitle}>Ready to digitize your factory?</h2>
      <p className={styles.ctaSub}>Register your factory today and start managing operations digitally.</p>
      <Btn primary className={styles.ctaBtn} onClick={() => onNavigate("signup")}>Register Your Factory</Btn>
    </div>

    {/* Footer */}
    <div className={styles.footer}>
      <div className={styles.footerLogo}>
        <div className={styles.footerIcon}><Icon name="leaf" size={12} color="#ffffff" /></div>
        <span className={styles.footerText}>Tea CMS © 2025</span>
      </div>
      <span className={styles.footerCredit}>University of Colombo School of Computing — Industry Project</span>
    </div>
  </div>
);
