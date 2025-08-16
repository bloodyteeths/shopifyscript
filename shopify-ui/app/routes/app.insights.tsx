import * as React from 'react'
import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData, useNavigation, useSearchParams, Link, useFetcher } from '@remix-run/react'

// Simplified chart component to avoid lazy loading issues
function SimpleChart({ data }: { data: any[] }) {
  if (!data?.length) return <div style={{height:180,border:'1px solid #eee',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',color:'#666'}}>No data</div>
  return <div style={{height:180,border:'1px solid #eee',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',color:'#666'}}>Chart: {data.length} points</div>
}

export async function loader(args: LoaderFunctionArgs){
  const url = new URL(args.request.url)
  const w = url.searchParams.get('w') === '24h' ? '24h' : '7d'
  const { backendFetch } = await import('../server/hmac.server')
  const r = await backendFetch(`/insights?w=${w}`,'GET')
  const logs = await backendFetch(`/run-logs?limit=10`,'GET')
  const base = { ok:false, w, kpi:{ clicks:0, cost:0, conversions:0, impressions:0, ctr:0, cpc:0, cpa:0 }, top_terms:[], series:[], explain:[], logs:[] }
  const merged = r?.json?.ok ? { ...r.json, logs: logs.json?.rows||[] } : base
  return json(merged)
}

export default function Insights(){
  const data = useLoaderData<typeof loader>() as any
  const [sp] = useSearchParams()
  const nav = useNavigation()
  const fetcher = useFetcher()
  const [toast, setToast] = React.useState<string>('')
  const w = (sp.get('w') === '24h') ? '24h' : (data?.w || '7d')
  const k = data?.kpi || {}
  const terms = data?.top_terms || []
  const series = data?.series || []
  const explain = data?.explain || []
  const logs = data?.logs || []
  return (
    <div>
      <h1 style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span>Insights</span>
        <span style={{display:'inline-flex',gap:8}}>
          <Link to="/app/insights?w=7d"><button disabled={w==='7d' || nav.state!=='idle'}>7d</button></Link>
          <Link to="/app/insights?w=24h"><button disabled={w==='24h' || nav.state!=='idle'}>24h</button></Link>
        </span>
      </h1>
      <div style={{display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:12}}>
        <Card label="Clicks" value={k.clicks} />
        <Card label="Cost" value={fmt(k.cost)} />
        <Card label="Conv." value={k.conversions} />
        <Card label="Impr." value={k.impressions} />
        <Card label="CTR" value={pct(k.ctr)} />
        <Card label="CPC" value={fmt(k.cpc)} />
        <Card label="CPA" value={fmt(k.cpa)} />
      </div>
      <h3 style={{marginTop:16}}>Trend ({w})</h3>
      <SimpleChart data={series} />
      <h3 style={{marginTop:16,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span>Top search terms ({w})</span>
        <Link to={`/app/insights/terms?w=${w}`}><button>View all terms</button></Link>
      </h3>
      <h3 style={{marginTop:16}}>Activity (last 10)</h3>
      <ul>
        {logs.map((l:any,i:number)=> <li key={i}><code>{l.timestamp}</code> — {l.message}</li>)}
        {!logs.length && <li>No recent activity.</li>}
      </ul>
      <table cellPadding={6} style={{width:'100%', borderCollapse:'collapse'}}>
        <thead><tr><th align="left">Term</th><th align="right">Clicks</th><th align="right">Cost</th><th align="right">Conv.</th></tr></thead>
        <tbody>
          {terms.map((t:any, i:number)=> (
            <tr key={i}>
              <td>{t.term}</td>
              <td align="right">{t.clicks}</td>
              <td align="right">{fmt(t.cost)}</td>
              <td align="right">{t.conversions}</td>
            </tr>
          ))}
          {!terms.length && <tr><td colSpan={4}>Not enough data yet.</td></tr>}
        </tbody>
      </table>
      <h3 style={{marginTop:16}}>Explain my spend</h3>
      <ul>
        {explain.map((e:any, i:number)=> {
          const disabled = fetcher.state !== 'idle'
          const onApply = async () => {
            const { backendFetch } = await import('../server/hmac.server')
            const body:any = { nonce: Date.now(), actions: [] as any[] }
            if (e.action === 'add_exact_negative') {
              body.actions.push({ type:'add_exact_negative', target:e.target })
            } else if (e.action === 'lower_cpc_ceiling') {
              const cur = Number(data?.kpi?.cpc||0)
              const newCpc = Math.max(0, (isFinite(cur)&&cur>0) ? cur*0.8 : 0.15)
              body.actions.push({ type:'lower_cpc_ceiling', campaign:'*', amount: Number(newCpc.toFixed(2)) })
            } else {
              return
            }
            const r = await backendFetch('/insights/actions/apply','POST', body)
            setToast(r?.json?.ok ? 'Action applied' : 'Action failed')
            try {
              const { backendFetch: bf } = await import('../server/hmac.server')
              const logs = await bf(`/run-logs?limit=10`,'GET')
              ;(data as any).logs = logs.json?.rows||[]
            } catch {}
          }
          return (
            <li key={i} style={{marginBottom:8, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <span><b>{e.label}</b> — {e.reason}. Suggest: <code>{e.action}</code>{e.target ? ` (${e.target})` : ''}</span>
              <button onClick={onApply} disabled={disabled} style={{padding:'6px 10px', border:'1px solid #eee', borderRadius:6}}>Apply</button>
            </li>
          )
        })}
        {!explain.length && <li>No high-confidence suggestions yet.</li>}
      </ul>
      {!!toast && <div style={{marginTop:6, fontSize:12, opacity:.8}}>{toast}</div>}
    </div>
  )
}

function Card({label, value}:{label:string, value:any}){
  return <div style={{border:'1px solid #eee', borderRadius:8, padding:12}}>
    <div style={{fontSize:12, opacity:.7}}>{label}</div>
    <div style={{fontSize:20, fontWeight:600}}>{value ?? '—'}</div>
  </div>
}
function fmt(n:number){ return typeof n==='number' ? `$${n.toFixed(2)}` : '—' }
function pct(n:number){ return typeof n==='number' ? `${(n*100).toFixed(2)}%` : '—' }
