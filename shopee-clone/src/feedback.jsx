import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

const Context=createContext(null);
export const useFeedback=()=>useContext(Context);
export function FeedbackProvider({children}) {
  const [dialog,setDialog]=useState(null),[toast,setToast]=useState('');
  const ref=useRef(null),resolver=useRef(null),timer=useRef(null);
  function close(value=false){resolver.current?.(value);resolver.current=null;setDialog(null)}
  function show(title,body,actions=[]){resolver.current?.(false);resolver.current=null;setDialog({title,body,actions})}
  function notify(message){clearTimeout(timer.current);setToast(message);timer.current=setTimeout(()=>setToast(''),3000)}
  function confirm(title,body,label='Lanjutkan'){return new Promise(resolve=>{show(title,body);resolver.current=resolve;setDialog({title,body,actions:[{label:'Batal',run:()=>close(false)},{label,primary:true,run:()=>close(true)}]})})}
  useEffect(()=>{
    if(dialog&&!ref.current.open)ref.current.showModal();
    if(!dialog&&ref.current.open)ref.current.close();
  },[dialog]);
  useEffect(()=>{const cancel=()=>close();window.addEventListener('popstate',cancel);return()=>{window.removeEventListener('popstate',cancel);clearTimeout(timer.current)}},[]);
  return <Context.Provider value={{show,close,notify,confirm}}>{children}
    <dialog className="mobile-dialog" ref={ref} aria-labelledby="dialog-title" onCancel={event=>{event.preventDefault();close()}} onClick={event=>{if(event.target===ref.current)close()}}>
      {dialog&&<><h2 id="dialog-title">{dialog.title}</h2><div className="dialog-body">{dialog.body}</div><div className="dialog-actions">{(dialog.actions.length?dialog.actions:[{label:'Tutup',run:()=>close()}]).map((action,index)=><button key={index} type="button" className={action.primary?'primary-btn':'outline-btn'} onClick={action.run}>{action.label}</button>)}</div></>}
    </dialog>
    {toast&&<div className="mobile-toast" role="status">{toast}</div>}
  </Context.Provider>;
}
export function Action({children,onClick,label,className='',...props}) {return <button type="button" className={`plain-action ${className}`} aria-label={label} onClick={onClick} {...props}>{children}</button>}
export function InfoAction({title,body,children,label,className=''}) {const ui=useFeedback();return <Action label={label||title} className={className} onClick={()=>ui.show(title,body)}>{children}</Action>}
export async function copyText(text,ui){try{await navigator.clipboard.writeText(text);ui.notify('Berhasil disalin.');return true}catch{ui.show('Salin secara manual',<textarea readOnly aria-label="Teks untuk disalin" defaultValue={text} onFocus={event=>event.target.select()}/>);return false}}
