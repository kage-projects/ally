import { createContext } from 'react';
import type { AllyContextValue } from './types.js';

export const AllyContext = createContext<AllyContextValue | null>(null);
