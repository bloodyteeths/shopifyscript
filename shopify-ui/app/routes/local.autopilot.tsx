import * as React from 'react';
import { useLoaderData } from '@remix-run/react';
import { backendFetch } from '../server/hmac.server';

export async function loader(){
  const diag = await backendFetch('/diagnostics','GET');
  const status = await backendFetch('/promote/status','GET');
  return { diag: diag.json||{}, status: status.json||{} };
}

export default function LocalAutopilot(){
  const { diag, status } = useLoaderData<typeof loader>();
  const [mode, setMode] = React.useState('protect');
  const [budget, setBudget] = React.useState('3.00');
  const [cpc, setCpc] = React.useState('0.20');
  const [url, setUrl] = React.useState('');
  const [sheetId, setSheetId] = React.useState('');
  const [tested, setTested] = React.useState(false);
  const [toast, setToast] = React.useState('');
  const [scriptCode, setScriptCode] = React.useState('');
  const [showScript, setShowScript] = React.useState(false);

  async function run(){
    const body = { nonce: Date.now(), mode, daily_budget: Number(budget||3), cpc_ceiling: Number(cpc||0.2), final_url: url, start_in_minutes:2, duration_minutes:60 };
    const r = await backendFetch('/autopilot/quickstart','POST', body);
    setToast(r.json?.ok? 'Scheduled' : 'Failed');
  }
  async function testSheet(){ const r = await backendFetch('/connect/sheets/test','POST', { nonce: Date.now(), sheetId }); setTested(!!r.json?.ok); setToast(r.json?.ok? 'Sheet OK':'Sheet failed'); }
  async function saveSheet(){ const r = await backendFetch('/connect/sheets/save','POST', { nonce: Date.now(), sheetId }); setToast(r.json?.ok? 'Saved':'Save failed'); }
  async function loadScript(){ const r = await backendFetch('/ads-script/raw','GET'); if(r.json?.ok){ setScriptCode(r.json.code||''); setShowScript(true); } }

  return (
    <div>
      <h1>Developer Preview: Autopilot</h1>
      {!diag?.sheets_ok && (
        <section style={{ border:'1px solid #eee', padding:12 }}>
          <h3>Connect Sheets</h3>
          <input value={sheetId} onChange={e=>setSheetId(e.target.value)} placeholder="Google Sheet ID" style={{ width:'100%' }} />
          <div style={{ marginTop:8, display:'flex', gap:8 }}>
            <button onClick={testSheet}>Test</button>
            <button disabled={!tested} onClick={saveSheet}>Save</button>
          </div>
        </section>
      )}
      {toast && <p>{toast}</p>}
      <section style={{ border:'1px solid #eee', padding:12 }}>
        <h3>Goal</h3>
        <label><input type="radio" name="goal" value="protect" checked={mode==='protect'} onChange={()=>setMode('protect')} /> Protect</label><br/>
        <label><input type="radio" name="goal" value="grow" checked={mode==='grow'} onChange={()=>setMode('grow')} /> Grow</label><br/>
        <label><input type="radio" name="goal" value="scale" checked={mode==='scale'} onChange={()=>setMode('scale')} /> Scale</label>
      </section>
      <section style={{ border:'1px solid #eee', padding:12 }}>
        <h3>Budget & CPC</h3>
        <input type="number" step="0.01" value={budget} onChange={e=>setBudget(e.target.value)} placeholder="$ per day" />
        <input type="number" step="0.01" value={cpc} onChange={e=>setCpc(e.target.value)} placeholder="Max CPC" />
      </section>
      <section style={{ border:'1px solid #eee', padding:12 }}>
        <h3>Landing URL</h3>
        <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://example.com" style={{ width:'100%' }} />
      </section>
      <div style={{ marginTop:8 }}>
        <button onClick={run}>Enable Autopilot</button>
        <button onClick={loadScript} style={{ marginLeft:8 }}>Copy Script</button>
      </div>
      {showScript && (
        <section style={{ border:'1px solid #eee', padding:12, marginTop:12 }}>
          <h3>Google Ads Script</h3>
          <textarea readOnly value={scriptCode} style={{ width:'100%', height:240 }} />
          <div style={{ marginTop:8 }}>
            <button onClick={()=>{ navigator.clipboard.writeText(scriptCode); setToast('Copied'); }}>Copy</button>
          </div>
          <ol>
            <li>Google Ads → Tools → Bulk actions → Scripts → + New script</li>
            <li>Paste, Authorize, then Preview first</li>
            <li>If ok, Run once, then Schedule daily</li>
          </ol>
        </section>
      )}
    </div>
  );
}


