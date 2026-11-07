// Host snapshot customizations. Exact anchors fail closed if upstream changes.
function replaceOnce(source,anchor,replacement) {
  if(source.split(anchor).length!==2)throw new Error(`SDK patch requires review: ${anchor}`);
  return source.replace(anchor,replacement);
}

export function patchTransport(source) {
  return replaceOnce(source,'}, 2000);','}, Math.min(30000, Math.max(2000, input.policy.llm.timeoutMs)));');
}

export function patchSensor(source) {
  const patches=[
    ['  let fastEmitted = false;','  let fastEmitted = false;\n  let errorFastEmitted = false;\n  let zoomFastEmitted = false;'],
    ['    fastEmitted = false;','    fastEmitted = false;\n    errorFastEmitted = false;\n    zoomFastEmitted = false;'],
    ['  function maybeFast() {',`  function maybeFastZoom() {
    if (zoomFastEmitted || counts.zoomEvent < 2) return;
    zoomFastEmitted = true;
    emit(snapshot('fast'));
  }

  function maybeFast() {`],
    ['    wheelEpisodeUntil = now + 500;','    wheelEpisodeUntil = now + 500;\n    maybeFastZoom();'],
    ['    previousScale = scale;','    previousScale = scale;\n    maybeFastZoom();'],
    ['    else seenErrors.add(key);',`    else seenErrors.add(key);
    if (!errorFastEmitted && counts.errorLoop >= 6) {
      errorFastEmitted = true;
      emit(snapshot('fast'));
    }`],
  ];
  for(const [anchor,replacement] of patches)source=replaceOnce(source,anchor,replacement);
  return source;
}

export function patchPresets(source) {
  source=replaceOnce(source,"export type SinglePreset = 'motor' | 'visual' | 'cognitive';","export type SinglePreset = 'motor' | 'visual' | 'cognitive';\ntype HostPreset = SinglePreset | 'combined';");
  source=replaceOnce(source,'Record<SinglePreset,','Record<HostPreset,');
  source=replaceOnce(source,'  preset: SinglePreset,','  preset: HostPreset,');
  return replaceOnce(source,'  motor: {',`  combined: {
    tokens: { targetMinSize: 48, spacingScale: 1.15, fontScale: 1.1,
      contrast: 'high', density: 'comfortable' },
    layout: { stepMode: 'default', hideNonEssential: [], primaryActionSticky: false,
      confirmDestructive: true },
    assist: { inlineHints: true, voiceOffer: false },
    explanation: 'Teks, jarak, dan petunjuk diperjelas berdasarkan interaksi berulang.',
  },
  motor: {`);
}

export function patchRules(source) {
  return replaceOnce(source,'requestPlanner: policy.llm.enabled, candidate: null,',
    // A combined preset addresses both supported dimensions. Its confidence is
    // bounded by the weaker one, and must satisfy the merchant's apply threshold.
    "requestPlanner: policy.llm.enabled, candidate: ranked[1][1] >= policy.thresholds.apply ? createPresetPlan('combined', profile, ranked[1][1], policy) : null,");
}
