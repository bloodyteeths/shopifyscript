import React, { useEffect, useState } from 'react';
import AppShell from '../components/AppShell.jsx';

export default function AudiencesPage(){
  const [exportsList, setExportsList] = useState([]);
  const [segmentsCsv, setSegmentsCsv] = useState('all_buyers,last_30d');
  const [toast, setToast] = useState('');
  const [cfg, setCfg] = useState({ plan:'starter' });

  async function load(){
    const r = await fetch('/app/api/audiences/export/list');
    const j = await r.json();
    setExportsList(j.rows||[]);
  }
  useEffect(()=>{ load(); },[]);
  useEffect(()=>{ (async()=>{ try{ const r = await fetch('/app/api/config'); const j = await r.json(); if(j?.ok) setCfg(j.config||{ plan:'starter' }); }catch{} })(); },[]);

  async function build(){
    const r = await fetch('/app/api/audiences/export/build', {
      method:'POST', headers:{'content-type':'application/json'},
      body: JSON.stringify({ nonce: Date.now(), segments_csv: segmentsCsv })
    });
    const ok = r.ok; setToast(ok? 'Build requested' : 'Build failed');
    if(ok) load();
  }

  return (
    <AppShell>
    <div style={{ padding:16 }}>
      <h1>Audiences</h1>
      {toast && <p>{toast}</p>}
      {cfg?.plan!=='growth' && <p style={{ color:'#888' }}>Upgrade to Growth to build segments.</p>}
      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        <input value={segmentsCsv} onChange={e=>setSegmentsCsv(e.target.value)} placeholder="segments (csv)" />
        <button onClick={build} disabled={cfg?.plan!=='growth'}>Build</button>
      </div>
      <table border="1" cellPadding="6" style={{ marginTop:16, width:'100%' }}>
        <thead><tr><th>segment</th><th>status</th><th>ui_csv</th><th>api_csv</th><th>updated_at</th></tr></thead>
        <tbody>
          {exportsList.map((row, idx)=> (
            <tr key={idx}>
              <td>{row.segment}</td>
              <td>{row.status}</td>
              <td>{row.cm_ui_unhashed_csv? <a href={row.cm_ui_unhashed_csv} target="_blank" rel="noreferrer">download</a> : ''}</td>
              <td>{row.cm_api_hashed_csv? <a href={row.cm_api_hashed_csv} target="_blank" rel="noreferrer">download</a> : ''}</td>
              <td>{row.updated_at}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </AppShell>
  );
}


