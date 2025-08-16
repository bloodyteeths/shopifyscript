import React, { useEffect, useState } from 'react';
import AppShell from '../components/AppShell.jsx';

export default function AIPage(){
  const [tenant, setTenant] = useState('TENANT_123');
  const [data, setData] = useState({ rsa_default: [], library: [], sitelinks: [], callouts: [], snippets: [] });
  const [toast, setToast] = useState('');
  const [sel, setSel] = useState({});

  async function load(){
    const r = await fetch('/app/api/ai/drafts');
    const j = await r.json();
    setData(j||{ rsa_default: [], library: [], sitelinks: [], callouts: [], snippets: [] });
  }
  useEffect(()=>{ load(); },[]);

  async function run(){
    const r = await fetch('/app/api/ai/writer', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ nonce: Date.now(), dryRun:true, limit: 20 }) });
    setToast(r.ok? 'AI dry-run started' : 'AI job failed');
  }

  async function accept(){
    const items = (data.library||[]).filter((_,i)=> sel[i]).map(r=> ({ theme:r.theme, headlines_pipe:(r.headlines||[]).join('|'), descriptions_pipe:(r.descriptions||[]).join('|'), source:r.source||'ui' }));
    const r = await fetch('/app/api/ai/accept', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ nonce: Date.now(), items }) });
    const j = await r.json(); setToast(j.ok? `Accepted ${j.accepted}` : 'Accept failed');
    if (j.ok) load();
  }

  return (
    <AppShell>
      <h1>AI Drafts</h1>
      {toast && <p>{toast}</p>}
      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        <input value={tenant} onChange={e=>setTenant(e.target.value)} />
        <button onClick={run}>Run AI Draft (dry-run)</button>
        <button onClick={load}>Refresh</button>
      </div>
      <h3 style={{ marginTop:16 }}>Default RSA</h3>
      {data.rsa_default.length===0? <p>Empty</p> : (
        <table border="1" cellPadding="6" style={{ width:'100%' }}>
          <thead><tr><th>Theme</th><th>Headlines</th><th>Descriptions</th><th>Lint</th></tr></thead>
          <tbody>
          {data.rsa_default.map((r,idx)=> (
            <tr key={idx}><td>{r.theme}</td><td>{(r.headlines||[]).join(' | ')}</td><td>{(r.descriptions||[]).join(' | ')}</td><td>{r?.lint?.ok? 'OK' : (r?.lint?.errors||[]).join(',')}</td></tr>
          ))}
          </tbody>
        </table>
      )}
      <h3 style={{ marginTop:16 }}>Library</h3>
      <div style={{ marginBottom:8 }}>
        <button onClick={accept} disabled={!Object.values(sel).some(Boolean)}>Accept</button>
      </div>
      {data.library.length===0? <p>Empty</p> : (
        <table border="1" cellPadding="6" style={{ width:'100%' }}>
          <thead><tr><th></th><th>Theme</th><th>Headlines</th><th>Descriptions</th><th>Source</th><th>Lint</th></tr></thead>
          <tbody>
          {data.library.map((r,idx)=> (
            <tr key={idx}>
              <td><input type="checkbox" checked={!!sel[idx]} onChange={e=> setSel({...sel, [idx]: e.target.checked})} /></td>
              <td>{r.theme}</td>
              <td>{(r.headlines||[]).join(' | ')}</td>
              <td>{(r.descriptions||[]).join(' | ')}</td>
              <td>{r.source||''}</td>
              <td>{r?.lint?.ok? 'OK' : (r?.lint?.errors||[]).join(',')}</td>
            </tr>
          ))}
          </tbody>
        </table>
      )}
      <h3 style={{ marginTop:16 }}>Sitelinks</h3>
      {data.sitelinks.length===0? <p>Empty</p> : (
        <ul>{data.sitelinks.map((s, i)=> <li key={i}>{s.text} → {s.final_url}</li>)}</ul>
      )}
      <h3 style={{ marginTop:16 }}>Callouts</h3>
      {data.callouts.length===0? <p>Empty</p> : (
        <ul>{data.callouts.map((s, i)=> <li key={i}>{s.text}</li>)}</ul>
      )}
      <h3 style={{ marginTop:16 }}>Snippets</h3>
      {data.snippets.length===0? <p>Empty</p> : (
        <ul>{data.snippets.map((s, i)=> <li key={i}>{s.header}: {(s.values||[]).join(', ')}</li>)}</ul>
      )}
    </AppShell>
  );
}


