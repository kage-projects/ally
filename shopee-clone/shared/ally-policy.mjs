import { DEFAULT_POLICY } from '@ally/react/core';

export const ALLY_STEPS=['cart','checkout','confirmation'];
export const ALLY_FIELDS=['name','phone','street','region','voucher','payment','address','cart'];
export const ALLY_ERRORS=['required','invalid','minimum','unavailable'];

// Both browser and server use this ceiling. The server never trusts browser limits.
export function createHostPolicy({ai=false,model='configured-on-host'}={}) {
  return {...DEFAULT_POLICY,
    limits:{targetMinSize:[44,56],spacingScale:[1,1.2],fontScale:[1,1.2]},
    lockedComponents:[...DEFAULT_POLICY.lockedComponents],
    allowHide:[],
    llm:{...DEFAULT_POLICY.llm,enabled:ai,model,timeoutMs:15000},
  };
}

export function allyPhase(route) {
  const path=route.split('?')[0];
  if(path==='/cart')return 'cart';
  if(['/checkout','/vouchers','/shipping','/payment','/addresses','/address/edit'].includes(path))return 'checkout';
  if(/^\/orders\/demo-\d+$/.test(path))return 'confirmation';
  return null;
}
