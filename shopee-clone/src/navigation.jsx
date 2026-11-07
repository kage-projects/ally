import React, { useSyncExternalStore } from 'react';

export function navigate(path) {
  if (location.pathname + location.search === path) return;
  history.pushState({}, '', path);
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
  return <a {...props} href={to} onClick={event => {
    onClick?.(event);
    if (!event.defaultPrevented && !event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0) {
      event.preventDefault();
      navigate(to);
    }
  }}>{children}</a>;
}
