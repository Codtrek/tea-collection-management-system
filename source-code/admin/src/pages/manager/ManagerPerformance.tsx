import { C } from '../../styles/tokens'
import { Card } from '../../components/ui/Card'
import { Grid } from '../../components/ui/Grid'
import { Badge } from '../../components/ui/Badge'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { Table } from '../../components/ui/Table'

export const ManagerPerformance = () => (
  <div>
    <Card>
      <div style={{ fontSize:13, fontWeight:500, color:C.text, marginBottom:14 }}>Employee Performance Overview — June 2025</div>
      <Grid cols={2} gap={20}>
        <div>
          <ProgressBar label="Average Plucking Output" value={88} />
          <ProgressBar label="Attendance Rate"         value={93} />
          <ProgressBar label="Leaf Quality Score"      value={74} color={C.amber} />
          <ProgressBar label="Task Completion"         value={95} />
        </div>
        <div>
          <Table headers={["Employee","Output","Attendance","Quality"]} rows={[
            ["Amal Jayasinghe","92%","100%",<Badge color="green">A</Badge>],
            ["Mallika Dissanayake","85%","96%",<Badge color="green">A</Badge>],
            ["Ruvini Weerasinghe","78%","88%",<Badge color="amber">B</Badge>],
            ["Thilak Premaratne","95%","100%",<Badge color="green">A</Badge>],
          ]} />
        </div>
      </Grid>
    </Card>
  </div>
);