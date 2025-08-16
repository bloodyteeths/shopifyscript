import * as React from 'react'
import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from '@remix-run/node'
import { useLoaderData, Form, useNavigation } from '@remix-run/react'

export async function loader({request}: LoaderFunctionArgs){
  const { backendFetch } = await import('../server/hmac.server')
  const cfg = await backendFetch('/config','GET')
  return json({ cfg: cfg.json?.config||{} })
}

export async function action({request}: ActionFunctionArgs){
  const fd = await request.formData()
  const settings:any = {
    AP_SCHEDULE: String(fd.get('schedule')||'off'),
    AP_TARGET_CPA: String(fd.get('target_cpa')||''),
    AP_TARGET_ROAS: String(fd.get('target_roas')||''),
    AP_DESIRED_KEYWORDS_PIPE: String(fd.get('desired_keywords')||'').split(/\r?\n|,|[|]/).map(s=>s.trim()).filter(Boolean).join('|'),
    AP_PLAYBOOK_PROMPT: String(fd.get('playbook')||'')
  }
  const { backendFetch } = await import('../server/hmac.server')
  await backendFetch('/upsertConfig','POST',{ nonce: Date.now(), settings })
  if (fd.get('save_caps')==='1'){
    const caps_campaign = fd.getAll('caps_campaign') as string[]
    const caps_value = fd.getAll('caps_value') as string[]
    const items = caps_campaign.map((c,i)=>({ campaign:c, value:Number(caps_value[i]||0) })).filter(x=>!Number.isNaN(x.value))
    if (items.length){ await backendFetch('/cpc-ceilings/batch','POST',{ nonce: Date.now(), items }) }
  }
  if (fd.get('tick')==='1'){ await backendFetch('/jobs/autopilot_tick','POST',{ nonce: Date.now() }) }
  // SEO tools
  if (fd.get('seo_preview')==='1'){
    const ids = String(fd.get('product_ids')||'').split(/\s|,|\|/).map(s=>s.trim()).filter(Boolean)
    const strategy = String(fd.get('strategy')||'template')
    const templateTitle = String(fd.get('template_title')||'')
    const templateDescription = String(fd.get('template_description')||'')
    const r = await backendFetch('/shopify/seo/preview','POST',{ nonce: Date.now(), productIds: ids, strategy, templateTitle, templateDescription })
    return json({ ok:true, preview:r.json?.proposals||[], dry:true })
  }
  if (fd.get('seo_apply')==='1'){
    const changes = JSON.parse(String(fd.get('changes_json')||'[]'))
    const r = await backendFetch('/shopify/seo/apply','POST',{ nonce: Date.now(), changes })
    return json({ ok: r.json?.ok, applied: r.json?.applied||0 })
  }
  if (fd.get('tags_apply')==='1'){
    const ids = String(fd.get('product_ids')||'').split(/\s|,|\|/).map(s=>s.trim()).filter(Boolean)
    const add = String(fd.get('tags_add')||'').split(/,|\|/).map(s=>s.trim()).filter(Boolean)
    const remove = String(fd.get('tags_remove')||'').split(/,|\|/).map(s=>s.trim()).filter(Boolean)
    const r = await backendFetch('/shopify/tags/batch','POST',{ nonce: Date.now(), productIds: ids, add, remove })
    return json({ ok:r.json?.ok, updated:r.json?.updated||0 })
  }
  return json({ ok:true })
}

export default function Advanced(){
  const data = useLoaderData<typeof loader>() as any
  const cfg = data?.cfg||{}
  const nav = useNavigation()
  const caps = cfg?.CPC_CEILINGS || {}
  const capRows = Object.entries(caps).map(([campaign,value]:any)=>({campaign, value}))
  const [preview, setPreview] = React.useState<any[]>([])

  return (
    <div style={{maxWidth:920}}>
      <h1>Advanced</h1>
      <Form method="post" style={{display:'grid', gap:16}}>
        <fieldset style={{border:'1px solid #eee', padding:12}}>
          <legend>Schedule</legend>
          <select name="schedule" defaultValue={cfg?.AP?.schedule||'off'}>
            <option value="off">Off</option><option value="hourly">Hourly</option>
            <option value="daily">Daily (9am)</option><option value="weekdays_9_18">Weekdays 9–18</option>
          </select>
        </fieldset>

        <fieldset style={{border:'1px solid #eee', padding:12}}>
          <legend>Targets</legend>
          <label>Target CPA <input name="target_cpa" type="number" step="0.01" defaultValue={cfg?.AP?.target_cpa||''}/></label>
          <label>Target ROAS <input name="target_roas" type="number" step="0.01" defaultValue={cfg?.AP?.target_roas||''}/></label>
        </fieldset>

        <fieldset style={{border:'1px solid #eee', padding:12}}>
          <legend>CPC ceilings (set 0 to effectively remove)</legend>
          <div id="caps" style={{display:'grid', gridTemplateColumns:'1fr 140px', gap:8}}>
            {capRows.map((row,i)=>(
              <React.Fragment key={i}>
                <input name="caps_campaign" defaultValue={row.campaign} placeholder="campaign (or *)"/>
                <input name="caps_value" type="number" step="0.01" defaultValue={row.value}/>
              </React.Fragment>
            ))}
            <input name="caps_campaign" placeholder="campaign (or *)"/>
            <input name="caps_value" type="number" step="0.01" placeholder="0.20"/>
          </div>
          <button type="submit" name="save_caps" value="1" disabled={nav.state!=='idle'} style={{marginTop:8}}>Save caps</button>
        </fieldset>

        <fieldset style={{border:'1px solid #eee', padding:12}}>
          <legend>SEO & Keywords</legend>
          <div style={{display:'grid', gap:8}}>
            <textarea name="product_ids" rows={3} placeholder="Product IDs or handles (space/comma/| separated)" />
            <div>
              <label><input type="radio" name="strategy" value="template" defaultChecked/> Template</label>
              <label><input type="radio" name="strategy" value="ai" style={{marginLeft:12}}/> AI</label>
            </div>
            <input name="template_title" placeholder="Title template e.g., {{title}} | Free Shipping" />
            <input name="template_description" placeholder="Description template e.g., Discover {{title}} by {{brand}}." />
            <div style={{display:'flex', gap:8}}>
              <button type="submit" name="seo_preview" value="1" disabled={nav.state!=='idle'}>Preview</button>
              <button type="submit" name="seo_apply" value="1" disabled={nav.state!=='idle'}>Apply</button>
            </div>
          </div>
        </fieldset>

        <fieldset style={{border:'1px solid #eee', padding:12}}>
          <legend>Desired keywords</legend>
          <textarea name="desired_keywords" rows={4} placeholder="One per line, comma, or |">{(cfg?.AP?.desired_keywords||[]).join('\n')}</textarea>
        </fieldset>

        <fieldset style={{border:'1px solid #eee', padding:12}}>
          <legend>AI playbook</legend>
          <textarea name="playbook" rows={6} placeholder="Guidance for Autopilot and SEO generation">{cfg?.AP?.playbook_prompt||''}</textarea>
        </fieldset>

        <div>
          <button type="submit" name="tick" value="1" disabled={nav.state!=='idle'}>Run now</button>
        </div>
      </Form>

      {Array.isArray(preview) && preview.length>0 && (
        <div style={{marginTop:12}}>
          <h3>Preview</h3>
          <table cellPadding={6} style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr><th align="left">Product</th><th align="left">Title</th><th align="left">Description</th><th align="left">Image alt</th></tr></thead>
            <tbody>
              {preview.map((p:any,i:number)=> <tr key={i}><td>{p.productId}</td><td>{p.title}</td><td>{p.description}</td><td>{p.images?.[0]?.altText||''}</td></tr>)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}


