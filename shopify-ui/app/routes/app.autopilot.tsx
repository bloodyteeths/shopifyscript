import * as React from 'react';
import { useLoaderData, useFetcher, useNavigation, useNavigate } from '@remix-run/react';
import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/node';

export async function loader({request}: LoaderFunctionArgs){
  const { backendFetch } = await import('../server/hmac.server')
  const cfg = await backendFetch('/config','GET')
  const logs = await backendFetch('/run-logs?limit=10','GET')
  return json({ cfg: cfg.json?.config||{}, logs: logs.json?.rows||[] })
}

export async function action({ request }: ActionFunctionArgs){
  const form = await request.formData();
  const kind = String(form.get('kind')||'');
  const { backendFetch, backendFetchText } = await import('../server/hmac.server')

  if (kind==='save_basic'){
    const settings = {
      AP_OBJECTIVE: String(form.get('objective')||'protect'),
      AP_MODE: String(form.get('mode')||'auto'),
      AP_SCHEDULE: String(form.get('schedule')||'off'),
      AP_TARGET_CPA: String(form.get('target_cpa')||''),
      daily_budget_cap_default: String(form.get('budget')||'3')
    }
    const r = await backendFetch('/upsertConfig','POST',{ nonce: Date.now(), settings })
    return json({ ok: !!r?.json?.ok, raw: r?.json })
  }

  if (kind==='run_preview'){
    const r = await backendFetch('/jobs/autopilot_tick?force=1&dry=1','POST',{ nonce: Date.now() })
    return json({ ok: !!r?.json?.ok, planned: r?.json?.planned||[], kpi: r?.json?.kpi, reasons: r?.json?.reasons||[] })
  }
  if (kind==='seed_demo'){
    const r = await backendFetch('/seed-demo','POST',{ nonce: Date.now() })
    return json({ ok: !!r?.json?.ok, seeded: r?.json?.seeded||null })
  }

  if (kind==='apply_plan'){
    const planStr = String(form.get('plan')||'[]')
    let plan: any[] = []
    try { plan = JSON.parse(planStr) } catch {}
    const toAdd = plan.filter(p=>p?.type==='add_negative').map(p=>({ action:'add_negative', term:p.term, match:p.match, scope:p.scope }))
    const toCaps = plan.filter(p=>p?.type==='lower_cpc_ceiling').map(p=>({ campaign:p.campaign||'*', value:p.amount }))
    const results: any = {}
    if (toAdd.length){ const r1 = await backendFetch('/insights/actions/apply','POST',{ actions: toAdd }); results.negatives = r1?.json }
    if (toCaps.length){ const r2 = await backendFetch('/cpc-ceilings/batch','POST',{ nonce: Date.now(), items: toCaps }); results.caps = r2?.json }
    return json({ ok:true, results })
  }

  if (kind==='quickstart'){
    const body = {
      nonce: Date.now(),
      mode: String(form.get('mode')||'protect'),
      daily_budget: Number(form.get('budget')||3),
      cpc_ceiling: Number(form.get('cpc')||0.2),
      final_url: String(form.get('url')||'https://example.com'),
      start_in_minutes: 2,
      duration_minutes: 60
    };
    const r = await backendFetch('/autopilot/quickstart','POST', body);
    return json(r.json||{ ok:false });
  }
  if (kind==='script'){
    const code = await backendFetchText('/ads-script/raw');
    return json({ ok: true, code });
  }
  return json({ ok:false });
}

export default function Autopilot(){
  const { cfg, logs } = useLoaderData<typeof loader>() as any
  const fetcher = useFetcher<typeof action>()
  const nav = useNavigation()
  const busy = fetcher.state !== 'idle' || nav.state !== 'idle'
  const [plan, setPlan] = React.useState<any[]>([])
  const [toast, setToast] = React.useState<string>('')

  React.useEffect(()=>{
    const d:any = fetcher.data
    if (d && Array.isArray(d.planned)){
      setPlan(d.planned)
      setToast(`Planned ${d.planned.length} action${d.planned.length!==1?'s':''}`)
    } else if (d && d.ok && d.seeded){
      // auto re-run preview after seeding
      try {
        const f = new FormData(); f.set('kind','run_preview');
        fetcher.submit(f, { method: 'post', replace: true });
      } catch {}
    } else if (d && d.ok && d.results){
      setToast('Applied plan')
    } else if (d && d.ok){
      setToast('Saved')
    }
  }, [fetcher.data])

  return (
    <div style={{maxWidth:720}}>
      <h1>Autopilot</h1>
      <fetcher.Form method="post" style={{display:'grid', gap:8}} onSubmit={()=>setPlan([])}>
        <input type="hidden" name="kind" value="save_basic" />
        <label>Objective
          <select name="objective" defaultValue={cfg?.AP?.objective||'protect'}>
            <option value="grow">Grow</option>
            <option value="efficient">Efficient</option>
            <option value="protect">Protect</option>
          </select>
        </label>
        <label>Daily budget <input name="budget" type="number" step="0.01" defaultValue={cfg?.daily_budget_cap_default||3}/></label>
        <label>Automation
          <select name="mode" defaultValue={cfg?.AP?.mode||'auto'}>
            <option value="review">Review</option>
            <option value="auto">Auto</option>
          </select>
        </label>
        <div>
          <button type="submit" disabled={busy}>Save</button>
        </div>
      </fetcher.Form>
      <div>
        <fetcher.Form method="post" replace style={{display:'inline-block', marginLeft:8}}>
          <input type="hidden" name="kind" value="run_preview" />
          <button type="submit" disabled={busy}>Run now (preview)</button>
        </fetcher.Form>
      </div>
      {!!toast && <div style={{marginTop:8,fontSize:12,opacity:.8}}>{toast}</div>}
      <h3 style={{marginTop:16}}>Preview plan</h3>
      {plan.length ? (
        <>
          <ul style={{margin:'8px 0'}}>
            {plan.map((a,i)=> <li key={i}><code>{a.type}</code> {a.term?`“${a.term}”`:''} {a.match?`• ${a.match}`:''} {a.scope?`@ ${a.scope}`:''} {a.amount?`→ ${a.amount}`:''}</li>)}
          </ul>
          <fetcher.Form method="post" replace>
            <input type="hidden" name="kind" value="apply_plan" />
            <input type="hidden" name="plan" value={JSON.stringify(plan)} />
            <button type="submit" disabled={busy}>Apply plan</button>
          </fetcher.Form>
        </>
      ) : (
        <div>
          <div>No pending actions. Click “Run now (preview)”.</div>
          <div style={{marginTop:8}}>
            <strong>Status & Gating</strong>
            <ul style={{margin:'4px 0', paddingLeft: '18px'}}>
              {(Array.isArray((fetcher.data as any)?.reasons)?(fetcher.data as any).reasons:[]).map((r:any,idx:number)=>(<li key={idx}>{String(r||'')}</li>))}
            </ul>
          </div>
          <fetcher.Form method="post" replace>
            <input type="hidden" name="kind" value="seed_demo" />
            <button type="submit" disabled={busy} style={{marginTop:8}}>Seed demo data</button>
          </fetcher.Form>
        </div>
      )}
      <h3 style={{marginTop:16}}>Recent activity</h3>
      <ul>{(logs||[]).map((l:any,i:number)=><li key={i}><code>{l.timestamp}</code> — {l.message}</li>)}</ul>
    </div>
  )
}


