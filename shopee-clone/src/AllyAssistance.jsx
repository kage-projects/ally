import React, { useEffect, useState } from 'react';
import { useAlly } from '@ally/react';
import { ALLY_SCENARIOS } from '../shared/ally-scenarios.mjs';

export function finishAllyInput() {
  const field=document.activeElement;
  if(field?.matches('input, textarea, select, [contenteditable]'))field.blur();
}

export function AllyHint({context}) {
  const ally=useAlly();
  if(!['applied','kept'].includes(ally.status)||!ally.plan?.assist.inlineHints)return null;
  const scenario=ALLY_SCENARIOS.find(item=>item.id===context);
  if(!scenario)return null;
  return <aside className="ally-context-hint" data-ally-ui="" aria-label="Petunjuk Ally"><strong>Petunjuk Ally</strong><p>{scenario.hint}</p></aside>;
}

// Native modal dialogs are above fixed page controls. Keep SDK actions usable
// inside that top layer, without creating another adaptation state or provider.
export function AllyDialogControls() {
  const ally=useAlly(),[why,setWhy]=useState(false);
  useEffect(()=>{if(!ally.helpVisible)setWhy(false)},[ally.helpVisible]);
  if(ally.status==='pending')return <div className="ally-dialog-controls" data-ally-ui=""><p>Penyesuaian siap setelah input selesai.</p><button type="button" onClick={finishAllyInput}>Selesai mengisi, terapkan</button></div>;
  if(!ally.plan||!ally.helpVisible||!['applied','kept'].includes(ally.status))return null;
  return <div className="ally-dialog-controls" data-ally-ui="" aria-label="Kontrol Ally dalam formulir">
    <div>{ally.status!=='kept'&&<button type="button" onClick={ally.keep}>Keep</button>}<button type="button" onClick={ally.undo}>Undo</button><button type="button" aria-expanded={why} onClick={()=>setWhy(!why)}>Why</button></div>
    {why&&<p>{ally.explanation}</p>}
  </div>;
}
