import * as React from 'react'
import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData, useSearchParams, Link, Form, useNavigation } from '@remix-run/react'

export async function loader(args: LoaderFunctionArgs){
  const url = new URL(args.request.url)
  const w = url.searchParams.get('w') || '7d'
  const q = url.searchParams.get('q') || ''
  const campaign = url.searchParams.get('campaign') || ''
  const min_clicks = url.searchParams.get('min_clicks') || '0'
  const min_cost = url.searchParams.get('min_cost') || '0'
  const sort = url.searchParams.get('sort') || 'cost'
  const dir  = url.searchParams.get('dir')  || 'desc'
  const page = url.searchParams.get('page') || '1'
  const page_size = url.searchParams.get('page_size') || '50'
  const { backendFetch } = await import('../server/hmac.server')
  const data = await backendFetch(`/insights/terms?w=${w}&q=${encodeURIComponent(q)}&campaign=${encodeURIComponent(campaign)}&min_clicks=${min_clicks}&min_cost=${min_cost}&sort=${sort}&dir=${dir}&page=${page}&page_size=${page_size}&include_total=true`,'GET')
  return json(data.json || { ok:false, rows:[] })
}

export default function TermsExplorer(){
  const data = useLoaderData<typeof loader>() as any
  const [sp] = useSearchParams()
  const nav = useNavigation()
  const rows = data?.rows || []
  const [toast, setToast] = React.useState<string>('')
  async function applyNegatives(terms: string[]){
    const { backendFetch } = await import('../server/hmac.server')
    const actions = terms.map(t => ({ type:'add_exact_negative', target:t }))
    const r = await backendFetch('/insights/actions/apply','POST',{ nonce: Date.now(), actions })
    const ok = r?.json?.ok; const applied = r?.json?.applied?.length||0; const skipped = r?.json?.skipped?.length||0
    setToast(ok ? `Applied ${applied}, skipped ${skipped}` : 'Failed to add negatives')
  }
  async function removeNegative(term: string){
    const { backendFetch } = await import('../server/hmac.server')
    const r = await backendFetch('/insights/actions/apply','POST',{ nonce: Date.now(), actions:[{ type:'remove_exact_negative', target: term }] })
    const ok = r?.json?.ok; const applied = r?.json?.applied?.length||0; const skipped = r?.json?.skipped?.length||0
    setToast(ok ? `Applied ${applied}, skipped ${skipped}` : 'Failed to remove')
  }
  const selected = React.useRef<Set<string>>(new Set())

  const spInit = new URLSearchParams(Array.from(sp.entries()))
  const toCsvHref = `/app/insights/terms.csv?${spInit.toString()}`
  return (
    <div>
      <h1 style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span>Search Terms Explorer</span>
        <Link to="/app/insights">← Back to Insights</Link>
      </h1>
      <Form method="get" style={{display:'grid',gridTemplateColumns:'repeat(6,minmax(0,1fr))',gap:8,margin:'12px 0'}}>
        <input name="q" placeholder="term contains…" defaultValue={sp.get('q')||''} />
        <input name="campaign" placeholder="campaign contains…" defaultValue={sp.get('campaign')||''} />
        <select name="w" defaultValue={sp.get('w')||'7d'}>
          <option value="24h">24h</option>
          <option value="7d">7d</option>
          <option value="30d">30d</option>
        </select>
        <input name="min_clicks" type="number" step="1" min="0" defaultValue={sp.get('min_clicks')||'0'} />
        <input name="min_cost" type="number" step="0.01" min="0" defaultValue={sp.get('min_cost')||'0'} />
        <button type="submit" disabled={nav.state!=='idle'}>Filter</button>
      </Form>

      <div style={{margin:'8px 0', display:'flex', gap:8, alignItems:'center'}}>
        <button
          onClick={()=>{
            const candidates = rows.filter((r:any)=>!r.is_negative && selected.current.has(r.term)).map((r:any)=>r.term)
            return applyNegatives(candidates)
          }}
          disabled={nav.state!=='idle'}
        >Add exact negative (selected)</button>
        <a href={toCsvHref}><button type="button">Export CSV (current filters)</button></a>
        {!!toast && <span role="status" style={{fontSize:12, opacity:.8}}>{toast}</span>}
      </div>

      <table cellPadding={6} style={{width:'100%',borderCollapse:'collapse'}}>
        <thead>
          <tr>
            <th><input type="checkbox" onChange={(e)=>{
              if (e.currentTarget.checked){ rows.forEach((r:any)=>selected.current.add(r.term)) }
              else { selected.current.clear() }
            }}/></th>
            {['term','clicks','cost','conversions','cpc','cpa'].map(col=>{
              const is = (sp.get('sort')||'cost')===col
              const nextDir = is && (sp.get('dir')||'desc')==='desc' ? 'asc' : 'desc'
              const u = new URLSearchParams(Array.from(sp.entries()))
              u.set('sort', col); u.set('dir', nextDir); u.set('page','1')
              return <th key={col} align={col==='term'?'left':'right'}>
                <a href={`?${u.toString()}`} style={{textDecoration:'none'}}>{col.toUpperCase()}{is? (sp.get('dir')==='asc'?' ▲':' ▼'):''}</a>
              </th>
            })}
            <th align="right">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r:any)=>(
            <tr key={r.term}>
              <td><input type="checkbox" disabled={r.is_negative} onChange={(e)=>{ if (e.currentTarget.checked) selected.current.add(r.term); else selected.current.delete(r.term) }}/></td>
              <td>
                {r.term}
                {r.is_negative && <span style={{marginLeft:6, fontSize:10, padding:'2px 6px', border:'1px solid #eee', borderRadius:6}}>NEGATIVE</span>}
              </td>
              <td align="right">{r.clicks}</td>
              <td align="right">${(Number(r.cost||0)).toFixed(2)}</td>
              <td align="right">{r.conversions}</td>
              <td align="right">${(Number(r.cpc||0)).toFixed(2)}</td>
              <td align="right">${(Number(r.cpa||0)).toFixed(2)}</td>
              <td align="right">
                {!r.is_negative
                  ? <button onClick={()=>applyNegatives([r.term])}>Add exact negative</button>
                  : <button onClick={()=>removeNegative(r.term)}>Remove</button>}
              </td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={8}>No rows match your filters.</td></tr>}
        </tbody>
      </table>

      <div style={{display:'flex', gap:12, alignItems:'center', marginTop:8}}>
        {(() => {
          const total = data?.total || 0, page = data?.page || 1, pages = data?.pages || 1
          const prev = new URLSearchParams(Array.from(sp.entries())); prev.set('page', String(Math.max(1, page-1)))
          const next = new URLSearchParams(Array.from(sp.entries())); next.set('page', String(Math.min(pages, page+1)))
          return (
            <>
              <span>{page} / {pages} ({total} rows)</span>
              <a href={`?${prev.toString()}`}><button disabled={page<=1}>Prev</button></a>
              <a href={`?${next.toString()}`}><button disabled={page>=pages}>Next</button></a>
            </>
          )
        })()}
      </div>
    </div>
  )
}


