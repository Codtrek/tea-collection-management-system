import { Icon } from '../components/ui/Icon'
import { Btn } from '../components//ui/Button'
import { Avatar } from '../components/ui/Avatar';
import { type SidebarProps } from '../types'
import styles from "./SidebarLayout.module.css";

export const SidebarLayout = ({ nav, active, onNav, title, badge, user, role, children } : SidebarProps) => (
  <div className={styles.layout}>
    <div className={styles.sidebar}>
      <div className={styles.sidebarBrand}>
        <div className={styles.brandIcon}><Icon name="leaf" size={16} /></div>
        <div>
          <div className={styles.brandName}>Tea CMS</div>
          <div className={styles.brandRole}>{role}</div>
        </div>
      </div>
      {nav.map(section => (
        <div key={section.label} className={styles.navSection}>
          <div className={styles.navSectionLabel}>{section.label}</div>
          {section.items.map(item => (
            <div key={item.key} onClick={() => onNav(item.key)} className={`${styles.navItem} ${active===item.key ? styles.navItemActive : ""}`}>
              <Icon name={item.icon} size={15} /> {item.label}
            </div>
          ))}
        </div>
      ))}
      <div className={styles.sidebarSpacer} />
      <div className={styles.sidebarUser}>
        <Avatar initials={user.initials} size={28} />
        <div>
          <div className={styles.sidebarUserName}>{user.name}</div>
          <div className={styles.sidebarUserRole}>{user.role}</div>
        </div>
      </div>
    </div>
    <div className={styles.main}>
      <div className={styles.topbar}>
        <span className={styles.topbarTitle}>{title}</span>
        {badge && <span className={styles.topbarBadge}><Icon name="leaf" size={11} /> {badge}</span>}
        <Btn><Icon name="bell" size={14} /></Btn>
        <Btn><Icon name="settings" size={14} /></Btn>
      </div>
      <div className={styles.content}>{children}</div>
    </div>
  </div>
);
