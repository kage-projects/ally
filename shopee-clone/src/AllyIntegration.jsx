import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AllyProvider, useAlly } from '@ally/react';
import { useRoute, AppLink } from './navigation';
import { ALLY_STEPS, ALLY_FIELDS, ALLY_ERRORS, allyPhase, createHostPolicy } from '../shared/ally-policy.mjs';
import { ALLY_SCENARIOS, scenarioForRoute } from '../shared/ally-scenarios.mjs';
import { finishAllyInput } from './AllyAssistance';
import '@ally/react/styles.css';
import './ally.css';

const labels={disabled:'Nonaktif',observing:'Mengamati',pending:'Menunggu input selesai',applied:'Penyesuaian aktif',kept:'Penyesuaian disimpan'};

function PendingAdaptation() {
  return <div className="ally-demo-waiting" role="status">
    <p>Penyesuaian siap. Selesaikan input agar tampilan dapat disesuaikan.</p>
    <button type="button" onClick={finishAllyInput}>Selesai mengisi, terapkan</button>
  </div>;
}

function AllyBridge({phase,active}) {
  const {reportStep}=useAlly();
  useEffect(()=>{
    if(!active||!phase)return;
    // Provider constructs the runtime in an effect; report after it is ready.
    const frame=requestAnimationFrame(()=>reportStep(phase));
    return()=>cancelAnimationFrame(frame);
  },[phase,active,reportStep]);
  return null;
}

function AllyTools({enabled,setEnabled,backend,refresh,events,clearEvents,phase,scenario}) {
  const ally=useAlly(),[open,setOpen]=useState(false);
  const counts=ally.summary?.counts;
  return <aside className="ally-demo-tools" data-ally-ui="" aria-label="Demo Ally">
    <button className="ally-demo-trigger" aria-expanded={open} onClick={()=>setOpen(!open)}>Ally · {['pending','applied','kept'].includes(ally.status)?labels[ally.status]:ally.plannerStatus==='loading'?'Memproses…':labels[ally.status]}</button>
    {!open&&ally.status==='pending'&&<PendingAdaptation/>}
    {open&&<section className="ally-demo-panel" aria-label="Panel Ally">
      <header><strong>Ally · Mobile demo</strong><button aria-label="Tutup panel Ally" onClick={()=>setOpen(false)}>×</button></header>
      <label className="ally-enable"><input type="checkbox" checked={enabled} onChange={event=>setEnabled(event.target.checked)}/> Aktifkan tampilan adaptif</label>
      <p role="status">{backend.error?'Backend belum terhubung · bantuan lokal tersedia':backend.loading?'Memeriksa backend…':!backend.aiEnabled?'Aturan lokal · AI dinonaktifkan':backend.keyConfigured?`AI dikonfigurasi · ${backend.model}`:'Aturan lokal · API key belum diisi'}</p>
      <p>Fase: <b>{phase||'di luar alur belanja'}</b> · {labels[ally.status]}{ally.plannerStatus==='loading'?' · Menghubungi AI…':ally.plannerStatus==='fallback'?' · AI tidak tersedia; aturan lokal tetap aktif':''}</p>
      {ally.status==='pending'&&<PendingAdaptation/>}
      {!phase&&<AppLink to="/cart">Buka keranjang untuk mencoba</AppLink>}
      {scenario&&<p>Use case: <b>{scenario.title}</b></p>}
      <p className="ally-demo-help">Ketukan meleset, dua kali zoom, atau error berulang dapat memicu bantuan lokal segera. Untuk zoom, perbesar lalu kembalikan ke ukuran normal, kemudian ulangi. AI dapat menyempurnakannya. Keep menyimpan pilihan sesi ini; Undo mengembalikannya.</p>
      <details className="ally-scenarios"><summary>{ALLY_SCENARIOS.length} skenario untuk dicoba</summary>{ALLY_SCENARIOS.map(item=><div key={item.id}><AppLink to={item.path}>{item.title}</AppLink><p>{item.trigger}</p><small>{item.effect}</small></div>)}</details>
      <dl className="ally-metrics">{[['Tap',counts?.taps],['Miss tap',counts?.missTap],['Rage click',counts?.rageClick],['Error berulang',counts?.errorLoop],['Kembali',counts?.backtrack],['Zoom',counts?.zoomEvent]].map(([name,value])=><div key={name}><dt>{name}</dt><dd>{value??'—'}</dd></div>)}</dl>
      {events.length>0&&<div className="ally-decisions"><strong>Keputusan sesi ini</strong>{events.map((event,i)=><p key={i}>{event.action} · {event.source} · {event.preset||'none'}</p>)}</div>}
      <div className="ally-demo-buttons"><button onClick={refresh}>Periksa koneksi</button><button onClick={()=>{ally.resetPreferences();clearEvents()}}>Reset preferensi</button></div>
      <small>Hanya counter dan timing anonim. Isi formulir tidak dikirim. Pesanan tetap simulasi lokal.</small>
    </section>}
  </aside>;
}

export default function AllyIntegration({children}) {
  const route=useRoute(),phase=allyPhase(route);
  const value=new URLSearchParams(location.search).get('ally');
  const demoVisible=value==='1'||(value!=='0'&&import.meta.env.VITE_ALLY_ENABLED==='1');
  const [enabled,setEnabled]=useState(true),[events,setEvents]=useState([]);
  const [backend,setBackend]=useState({loading:demoVisible,keyConfigured:false,aiEnabled:false});
  const refresh=useCallback(async()=>{
    try{const response=await fetch('/api/ally/status',{signal:AbortSignal.timeout(3000)});if(!response.ok)throw new Error();const data=await response.json();if(typeof data.keyConfigured!=='boolean'||typeof data.aiEnabled!=='boolean')throw new Error();setBackend({...data,loading:false})}
    catch{setBackend({loading:false,error:true,keyConfigured:false,aiEnabled:false})}
  },[]);
  useEffect(()=>{
    if(!demoVisible)return;
    refresh();const interval=setInterval(refresh,10000);return()=>clearInterval(interval);
  },[demoVisible,refresh]);
  const policy=useMemo(()=>createHostPolicy({ai:!!backend.keyConfigured&&backend.aiEnabled}),[backend.keyConfigured,backend.aiEnabled]);
  const active=demoVisible&&enabled&&!!phase;
  const config=useMemo(()=>({enabled:active,endpoint:'/api/ally/plan',steps:ALLY_STEPS,allowedFields:ALLY_FIELDS,errorCategories:ALLY_ERRORS,persistence:'memory',storageKey:'ally:shopee:v1'}),[active]);
  const onDecision=useCallback(event=>setEvents(current=>[{action:event.action,source:event.source,preset:event.preset},...current].slice(0,6)),[]);
  return <AllyProvider policy={policy} config={config} onDecision={onDecision}>
    <AllyBridge phase={phase} active={active}/>{children}
    {demoVisible&&<AllyTools enabled={enabled} setEnabled={setEnabled} backend={backend} refresh={refresh} events={events} clearEvents={()=>setEvents([])} phase={phase} scenario={scenarioForRoute(route)}/>}
  </AllyProvider>;
}
