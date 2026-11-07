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
export const usePath = () => useSyncExternalStore(subscribe, () => location.pathname);

export function AppLink({ to, children, onClick, ...props }) {
  return <a {...props} href={to} onClick={event => {
    onClick?.(event);
    if (!event.defaultPrevented && !event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0) {
      event.preventDefault();
      navigate(to);
    }
  }}>{children}</a>;
}
