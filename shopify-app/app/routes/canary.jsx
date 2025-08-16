import React, { useState } from 'react';
import AppShell from '../components/AppShell.jsx';

export default function CanaryWizard(){
  const [campaign, setCampaign] = useState('');
  const [dailyCap, setDailyCap] = useState('3.00');
  const [maxCpc, setMaxCpc] = useState('0.20');
  const [exclusionsCsv, setExclusionsCsv] = useState('');
  const [userListId, setUserListId] = useState('');
  const [duration, setDuration] = useState(60);
  const [toast, setToast] = useState('');
  const [status, setStatus] = useState(null);

  async function writeCaps(){
    // Placeholder instructions; real write to Sheets would be via backend /api/upsertConfig or dedicated helpers
    setToast('Caps planned. Ensure Sheets configured.');
  }
  async function attachAudience(){
    const body = { nonce: Date.now(), rows: [{ campaign, ad_group:'', user_list_id: userListId, mode:'OBSERVE', bid_modifier: '0.10' }] };
    const r = await fetch('/app/api/audiences/mapUpsert', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(body) });
    setToast(r.ok? 'Audience mapped' : 'Map failed');
  }
  async function aiDryRun(){
    const body = { nonce: Date.now(), dryRun: true, limit: 5 };
    const r = await fetch('/app/api/ai/writer', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(body) });
    setToast(r.ok? 'AI dry-run started' : 'AI job failed');
  }
  async function promoteWindow(){
    const body = { nonce: Date.now(), start_at: 'now+2m', duration_minutes: Number(duration||60) };
    const r = await fetch('/app/api/promote/window', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(body) });
    setToast(r.ok? 'Promote window scheduled' : 'Promote schedule failed');
  }

  async function loadStatus(){
    const r = await fetch('/app/api/promote/status');
    const j = await r.json(); setStatus(j);
  }
  React.useEffect(()=>{ loadStatus(); const t = setInterval(loadStatus, 15000); return ()=> clearInterval(t); },[]);

  return (
    <AppShell>
    <div style={{ padding:16, maxWidth:800 }}>
      <h1>Canary Wizard</h1>
      {status && status.ok && (
        <div style={{ margin:'8px 0', padding:8, border:'1px solid #eee', background:'#f9f9f9' }}>
          <strong>Status:</strong> {status?.window?.state||'inactive'} · PROMOTE: {String(!!status?.promote)}
          {status?.window?.start && <div>Window: {new Date(status.window.start).toLocaleString()} → {new Date(status.window.end||0).toLocaleString()}</div>}
        </div>
      )}
      {toast && <p>{toast}</p>}
      <ol>
        <li>
          <h3>Pick Canary Campaign</h3>
          <input placeholder="Campaign name" value={campaign} onChange={e=>setCampaign(e.target.value)} />
          <p>Apply label PROOFKIT_AUTOMATED in Google Ads UI to this campaign only.</p>
        </li>
        <li>
          <h3>Risk Caps</h3>
          <div style={{ display:'flex', gap:8 }}>
            <input placeholder="Daily cap" value={dailyCap} onChange={e=>setDailyCap(e.target.value)} />
            <input placeholder="Max CPC" value={maxCpc} onChange={e=>setMaxCpc(e.target.value)} />
          </div>
          <textarea placeholder="Exclusions (other campaign names CSV)" value={exclusionsCsv} onChange={e=>setExclusionsCsv(e.target.value)} />
          <button onClick={writeCaps}>Write Caps/Exclusions</button>
        </li>
        <li>
          <h3>Audience Attach (OBSERVE)</h3>
          <input placeholder="User List ID" value={userListId} onChange={e=>setUserListId(e.target.value)} />
          <button onClick={attachAudience}>Map Audience</button>
        </li>
        <li>
          <h3>AI Drafts (optional; dry-run)</h3>
          <button onClick={aiDryRun}>Run AI Drafts (dry-run)</button>
        </li>
        <li>
          <h3>Promote Window</h3>
          <input type="number" value={duration} onChange={e=>setDuration(e.target.value)} /> minutes
          <button onClick={promoteWindow}>Enable for window</button>
        </li>
      </ol>
      <p>Preview logs should include: Budget capped, Bidding, Schedule, Master negatives, N-gram miner, RSA build (draft gate), Audience attach. When PROMOTE off → no ad/keyword mutations.</p>
    </div>
    </AppShell>
  );
}




