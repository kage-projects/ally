import type { AllyStatus } from './types.js';

export type UiEvent = 'enable' | 'disable' | 'defer' | 'apply' | 'keep' | 'restore';

export function transitionStatus(status: AllyStatus, event: UiEvent): AllyStatus {
  if (event === 'disable') return 'disabled';
  if (event === 'enable') return status === 'disabled' ? 'observing' : status;
  if (status === 'disabled') return status;
  if (event === 'defer') return 'pending';
  if (event === 'apply') return 'applied';
  if (event === 'keep') return status === 'applied' ? 'kept' : status;
  if (event === 'restore') return 'observing';
  return status;
}
