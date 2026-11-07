'use client';

import { useContext } from 'react';
import { AllyContext } from './context.js';
import type { AllyContextValue } from './types.js';

export function useAlly(): AllyContextValue {
  const context = useContext(AllyContext);
  if (!context) throw new Error('useAlly must be used inside AllyProvider');
  return context;
}
