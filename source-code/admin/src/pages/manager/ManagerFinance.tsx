import { C } from '../../styles/tokens'
import { Card } from '../../components/ui/Card'
import { Grid } from '../../components/ui/Grid'
import { MetricCard } from '../../components/ui/MetricCard'
import { ProgressBar } from '../../components/ui/ProgressBar'

export const ManagerFinance = () => (
  <div>
    <Grid cols={3} gap={12}><div style={{ marginBottom:16, gridColumn:"1/-1", display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
      <MetricCard accent="green" icon="currency" label="Total Income"   value="LKR 8.82M" sub="Tea leaf sales June" />
      <MetricCard accent="red"   icon="receipt"  label="Total Expenses" value="LKR 3.4M"  sub="All categories June" />
      <MetricCard accent="blue"  icon="chart"    label="Net Position"   value="LKR 5.4M"  sub="Before payroll" />
    </div></Grid>
    <Grid cols={2} gap={16}>
      <Card>
        <div style={{ fontSize:13, fontWeight:500, color:C.text, marginBottom:14 }}>Monthly Income vs Expenses Log</div>
        <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:100, paddingTop:8, marginBottom:8 }}>
          {[["Jan",65,40],["Feb",70,38],["Mar",58,45],["Apr",80,42],["May",72,44],["Jun",88,48]].map(([m,inc,exp],i) => (
            <div key={m} style={{ flex:1, display:"flex", gap:2, alignItems:"flex-end" }}>
              <div style={{ flex:1, background:C.green, borderRadius:"2px 2px 0 0", height:`${inc}%`, opacity:0.8 }} />
              <div style={{ flex:1, background:C.red, borderRadius:"2px 2px 0 0", height:`${exp}%`, opacity:0.7 }} />
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:8, marginBottom:4 }}>
          {["Jan","Feb","Mar","Apr","May","Jun"].map(m => <div key={m} style={{ flex:1, textAlign:"center", fontSize:10, color:C.textSub }}>{m}</div>)}
        </div>
        <div style={{ display:"flex", gap:16, marginTop:8, fontSize:11 }}>
          <span style={{ display:"flex", alignItems:"center", gap:4 }}><div style={{ width:10, height:10, borderRadius:2, background:C.green }} /> Income</span>
          <span style={{ display:"flex", alignItems:"center", gap:4 }}><div style={{ width:10, height:10, borderRadius:2, background:C.red }} /> Expenses</span>
        </div>
      </Card>
      <Card>
        <div style={{ fontSize:13, fontWeight:500, color:C.text, marginBottom:14 }}>Expenses Breakdown — June</div>
        {[
          { cat:"Salary Payroll",     amt:"LKR 2,415,000", pct:71 },
          { cat:"Supplier Payments",  amt:"LKR 7,920,000", pct:100 },
          { cat:"Fertilizer Cost",    amt:"LKR 245,000",   pct:7 },
          { cat:"Transport",          amt:"LKR 185,000",   pct:5 },
          { cat:"Utilities",          amt:"LKR 45,000",    pct:1 },
          { cat:"Other Expenses",     amt:"LKR 55,000",    pct:2 },
        ].map(e => <ProgressBar key={e.cat} label={e.cat} value={e.pct} />)}
      </Card>
    </Grid>
  </div>
);
