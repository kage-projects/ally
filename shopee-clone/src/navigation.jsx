import React, { useSyncExternalStore } from 'react';

function withAllyMode(path) {
  const target = new URL(path, location.href);
  if (target.origin !== location.origin) return path;
  const mode = new URLSearchParams(location.search).get('ally');
  if (['0', '1'].includes(mode) && !target.searchParams.has('ally')) {
    target.searchParams.set('ally', mode);
  }
  return target.pathname + target.search + target.hash;
}

export function navigate(path) {
  const target = withAllyMode(path);
  if (location.pathname + location.search + location.hash === target) return;
  history.pushState({}, '', target);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo(0, 0);
}

const subscribe = (callback) => {
  window.addEventListener('popstate', callback);
  return () => window.removeEventListener('popstate', callback);
};
export const useRoute = () => useSyncExternalStore(subscribe, () => location.pathname + location.search);
export const usePath = () => useRoute().split('?')[0];
export function returnPath(fallback='/checkout') {
  const from=new URLSearchParams(location.search).get('from');
  return ({cart:'/cart',profile:'/profile',home:'/'})[from]||fallback;
}

export function AppLink({ to, children, onClick, ...props }) {
  const href = withAllyMode(to);
  return <a {...props} href={href} onClick={event => {
    onClick?.(event);
    if (!event.defaultPrevented && !event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0) {
      event.preventDefault();
      navigate(href);
    }
  }}>{children}</a>;
}
