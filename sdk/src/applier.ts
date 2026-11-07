import { guardPlan } from './guard.js';
import type { GuardCorrection } from './guard.js';
import type { AdaptationPlan, AllyPolicy } from './schema.js';

const tokenNames = ['--ally-target', '--ally-space', '--ally-font'] as const;
const attributeNames = [
  'data-ally-hide', 'data-ally-step-mode', 'data-ally-density',
  'data-ally-contrast', 'data-ally-sticky', 'data-ally-inline-hints',
  'data-ally-confirm-destructive',
] as const;
const protectedSelector = [
  '[data-ally-slot="price"]', '[data-ally-slot="legalText"]',
  '[data-ally-slot="totalAmount"]', '[data-ally-slot="payButton"]',
].join(', ');

interface StyleValue { present: boolean; value: string; priority: string }
export interface ScopeSnapshot {
  styles: Record<(typeof tokenNames)[number], StyleValue>;
  attributes: Record<(typeof attributeNames)[number], string | null>;
}

export interface ApplyResult {
  plan: AdaptationPlan;
  corrections: string[];
}

export function captureScope(scope: HTMLElement): ScopeSnapshot {
  const styles = {} as ScopeSnapshot['styles'];
  for (const name of tokenNames) {
    styles[name] = {
      present: Array.from(scope.style).includes(name),
      value: scope.style.getPropertyValue(name),
      priority: scope.style.getPropertyPriority(name),
    };
  }
  const attributes = {} as ScopeSnapshot['attributes'];
  for (const name of attributeNames) attributes[name] = scope.getAttribute(name);
  return { styles, attributes };
}

export function restoreScope(scope: HTMLElement, snapshot: ScopeSnapshot) {
  for (const name of tokenNames) {
    const style = snapshot.styles[name];
    if (style.present) scope.style.setProperty(name, style.value, style.priority);
    else scope.style.removeProperty(name);
  }
  for (const name of attributeNames) {
    const value = snapshot.attributes[name];
    if (value === null) scope.removeAttribute(name);
    else scope.setAttribute(name, value);
  }
}

function setAttribute(scope: HTMLElement, name: string, value: string | null) {
  if (scope.getAttribute(name) === value) return;
  if (value === null) scope.removeAttribute(name);
  else scope.setAttribute(name, value);
}

export function createApplier(
  scope: HTMLElement,
  onCorrection: (result: ApplyResult) => void,
  onIntegrationError: (code: string) => void = (code) => console.error(`Ally integration: ${code}`),
) {
  const initial = captureScope(scope);
  let candidate: AdaptationPlan | null = null;
  let policy: AllyPolicy | null = null;
  let effective: ApplyResult | null = null;
  const reported = new Set<string>();

  function report(code: string) {
    if (reported.has(code)) return;
    reported.add(code);
    onIntegrationError(code);
  }

  function derive(plan: AdaptationPlan, activePolicy: AllyPolicy): ApplyResult {
    const guarded = guardPlan(plan, activePolicy);
    const corrections: string[] = [...guarded.corrections];
    const safeHide = guarded.plan.layout.hideNonEssential.filter((name) => {
      const targets = scope.querySelectorAll<HTMLElement>(`[data-ally-optional="${name}"]`);
      const focused = scope.ownerDocument.activeElement;
      for (const target of targets) {
        if (target.matches(protectedSelector) || target.querySelector(protectedSelector)) {
          report(`protected-slot-inside-${name}`);
          corrections.push('hideNonEssential');
          return false;
        }
        if (focused && (target === focused || target.contains(focused))) {
          corrections.push('hideNonEssential');
          return false;
        }
      }
      return true;
    });
    let sticky = guarded.plan.layout.primaryActionSticky;
    if (sticky) {
      const actions = scope.querySelectorAll<HTMLElement>('[data-ally-slot="primaryAction"]');
      const payButtons = scope.querySelectorAll<HTMLElement>('[data-ally-slot="payButton"]');
      if (!actions.length || [...actions].some((action) => [...payButtons].some((pay) =>
        action === pay || action.contains(pay) || pay.contains(action)))) {
        sticky = false;
        corrections.push('primaryActionSticky');
        report('primaryAction-missing-or-overlaps-payButton');
      }
    }
    const planEffective: AdaptationPlan = {
      ...guarded.plan,
      layout: { ...guarded.plan.layout, hideNonEssential: safeHide, primaryActionSticky: sticky },
      explanation: safeHide.length < guarded.plan.layout.hideNonEssential.length
        ? 'Tampilan disesuaikan tanpa menyembunyikan konten penting.'
        : guarded.plan.explanation,
    };
    return { plan: planEffective, corrections: [...new Set(corrections)] };
  }

  function write(result: ApplyResult) {
    const { plan } = result;
    scope.style.setProperty('--ally-target', `${plan.tokens.targetMinSize}px`);
    scope.style.setProperty('--ally-space', String(plan.tokens.spacingScale));
    scope.style.setProperty('--ally-font', String(plan.tokens.fontScale));
    setAttribute(scope, 'data-ally-hide', plan.layout.hideNonEssential.join(' ') || null);
    setAttribute(scope, 'data-ally-step-mode', plan.layout.stepMode);
    setAttribute(scope, 'data-ally-density', plan.tokens.density);
    setAttribute(scope, 'data-ally-contrast', plan.tokens.contrast);
    setAttribute(scope, 'data-ally-sticky', plan.layout.primaryActionSticky ? 'true' : null);
    setAttribute(scope, 'data-ally-inline-hints', plan.assist.inlineHints ? 'true' : null);
    setAttribute(scope, 'data-ally-confirm-destructive', plan.layout.confirmDestructive ? 'true' : null);
  }

  const observer = new MutationObserver(() => {
    if (!candidate || !policy) return;
    const next = derive(candidate, policy);
    if (JSON.stringify(next) === JSON.stringify(effective)) return;
    effective = next;
    write(next);
    onCorrection(next);
  });
  observer.observe(scope, { subtree: true, childList: true, attributes: true,
    attributeFilter: ['data-ally-slot', 'data-ally-optional'] });

  return {
    initial,
    apply(plan: AdaptationPlan, activePolicy: AllyPolicy): ApplyResult {
      candidate = plan;
      policy = activePolicy;
      effective = derive(plan, activePolicy);
      write(effective);
      return effective;
    },
    reconcile(): ApplyResult | null {
      if (!candidate || !policy) return null;
      const next = derive(candidate, policy);
      effective = next;
      write(next);
      return next;
    },
    restore(snapshot: ScopeSnapshot) {
      candidate = null;
      policy = null;
      effective = null;
      restoreScope(scope, snapshot);
    },
    destroy() {
      observer.disconnect();
      candidate = null;
      policy = null;
      effective = null;
      restoreScope(scope, initial);
    },
  };
}

export type Applier = ReturnType<typeof createApplier>;
