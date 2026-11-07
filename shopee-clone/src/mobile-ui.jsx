import React from 'react';
import { ArrowLeft, ChevronRight, MessageCircleMore } from 'lucide-react';
import { AppLink } from './navigation';

export const art = name => `/assets/${name}.png`;
export function DeviceStatus({ time = '10:16' }) {
  return <div className="device-status" aria-hidden="true"><span>{time}<small>▣ ···</small></span><img src={art('status-dark')} alt=""/></div>;
}
export function PageHeader({ title, back = '/profile', children, time }) {
  return <><DeviceStatus time={time}/><header className="page-header"><AppLink to={back} aria-label="Kembali"><ArrowLeft size={23} strokeWidth={1.6}/></AppLink><h1>{title}</h1><div className="header-actions">{children}</div></header></>;
}
export function GestureBar() { return <div className="gesture-bar" aria-hidden="true"><i/></div>; }
export function ActionFooter({ children, className = '' }) { return <footer className={`action-footer ${className}`}><div>{children}</div><GestureBar/></footer>; }
export function Row({ children, right, to, className = '', onClick }) {
  const content = <><span>{children}</span><span className="row-right">{right}{(to || onClick) && <ChevronRight size={15}/>}</span></>;
  return to ? <AppLink to={to} className={`ui-row ${className}`}>{content}</AppLink> : onClick ? <button type="button" className={`ui-row row-button ${className}`} onClick={onClick}>{content}</button> : <div className={`ui-row ${className}`}>{content}</div>;
}
export function Tag({ children, className = '' }) { return <span className={`tag ${className}`}>{children}</span>; }
export function MallTag() { return <span className="mall-tag">Mall | <b>ORI</b></span>; }
export function LiveTag() { return <span className="live-tag">▣ LIVE</span>; }
export function ChatIcon() { return <MessageCircleMore size={23} strokeWidth={1.6}/>; }
export function Toggle({ checked, onChange, label, disabled }) { return <button type="button" role="switch" aria-label={label} aria-checked={checked} disabled={disabled} className={`toggle ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}><i/></button>; }
