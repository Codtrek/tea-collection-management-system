import { Card } from '../../components/ui/Card'
import { Grid } from '../../components/ui/Grid'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Btn } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { MetricCard } from '../../components/ui/MetricCard'
import { SearchBar } from '../../components/ui/SearchBar'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { Table } from '../../components/ui/Table'
import styles from "../../styles/modules/pages/AppCommon.module.css";


export const AdminDashboard = () => (
  <div>
    <Grid cols={4} gap={12}><div className={styles.metricsSpan4Wide}>
      <MetricCard accent="green" icon="factory"  label="Registered Factories" value="24"  sub="3 pending approval" />
      <MetricCard accent="blue"  icon="users"    label="Total Users"          value="312" sub="Across all factories" />
      <MetricCard accent="amber" icon="approve"  label="Pending Approvals"    value="3"   sub="Awaiting review" />
      <MetricCard accent="red"   icon="warning"  label="Flagged Accounts"     value="1"   sub="Requires attention" />
    </div></Grid>

    <Card>
      <SectionHeader title="Factory Registration Approvals">
        <Badge color="amber">3 Pending</Badge>
      </SectionHeader>
      <Table
        headers={["Factory Name","BR Number","Location","Contact Person","Submitted","BR Certificate","Action"]}
        rows={[
          ["Ella Valley Tea Factory","BR-2025-00412","Ella, Badulla","K. Bandara","2025-06-14",<Btn small><Icon name="eye" size={11}/> View</Btn>,<div className={styles.actionRow}><Btn small primary><Icon name="approve" size={11}/> Approve</Btn><Btn small danger>Reject</Btn></div>],
          ["Uva Highland Processing","BR-2025-00398","Bandarawela","S. Perera","2025-06-12",<Btn small><Icon name="eye" size={11}/> View</Btn>,<div className={styles.actionRow}><Btn small primary><Icon name="approve" size={11}/> Approve</Btn><Btn small danger>Reject</Btn></div>],
          ["Matale Tea Co.","BR-2025-00371","Matale","R. Fernando","2025-06-10",<Btn small><Icon name="eye" size={11}/> View</Btn>,<div className={styles.actionRow}><Btn small primary><Icon name="approve" size={11}/> Approve</Btn><Btn small danger>Reject</Btn></div>],
        ]}
      />
    </Card>

    <Card>
      <SectionHeader title="All Registered Factories">
        <SearchBar placeholder="Search factories…" />
      </SectionHeader>
      <Table
        headers={["Factory","BR Number","Location","Users","Status","Registered","Actions"]}
        rows={[
          [<div className={styles.avatarRow}><Avatar initials="NK" color="green" size={24}/> Nuwara Eliya Tea</div>,"BR-2024-00211","Nuwara Eliya","28 users",<Badge color="green">Active</Badge>,"2024-03-12",<Btn small><Icon name="eye" size={11}/> View</Btn>],
          [<div className={styles.avatarRow}><Avatar initials="DI" color="blue" size={24}/> Dimbula Industries</div>,"BR-2024-00189","Dimbula","15 users",<Badge color="green">Active</Badge>,"2024-01-28",<Btn small><Icon name="eye" size={11}/> View</Btn>],
          [<div className={styles.avatarRow}><Avatar initials="RU" color="amber" size={24}/> Ruhuna Tea Mills</div>,"BR-2023-00054","Matara","9 users",<Badge color="amber">Suspended</Badge>,"2023-11-05",<Btn small><Icon name="eye" size={11}/> View</Btn>],
        ]}
      />
    </Card>
  </div>
);
