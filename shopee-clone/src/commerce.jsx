import React, { createContext, useContext, useRef, useState } from 'react';
import { addresses, cartProducts, catalog, historyOrders, checkoutSummary } from './commerce-model.mjs';
export { addresses, cartProducts, rupiah } from './commerce-model.mjs';

const Context=createContext(null);
export function CommerceProvider({children}) {
  const [cartIds,setCartIds]=useState(cartProducts.map(item=>item.id)),[cartChanged,setCartChanged]=useState(false);
  const [selected,setSelected]=useState([]),[quantities,setQuantities]=useState({kiip:1,ugreen:1,flowers:2});
  const [shipping,setShipping]=useState('Instant'),[payment,setPayment]=useState(''),[addressIndex,setAddressIndex]=useState(0);
  const [addressBook,setAddressBook]=useState(addresses),[vouchers,setVoucherState]=useState(['shipping','discount']),[vouchersTouched,setVouchersTouched]=useState(false);
  const [draft,setDraft]=useState({message:'',protection:false,coins:false,dropship:false});
  const [checkoutStarted,setCheckoutStarted]=useState(false),[demoOrders,setDemoOrders]=useState([]);
  const [reviews,setReviews]=useState({}),[refunds,setRefunds]=useState({}),[showVerify,setShowVerify]=useState(true);
  const committed=useRef(false);
  const cartItems=cartIds.map(id=>catalog.find(item=>item.id===id)).filter(Boolean);
  const checkoutIds=selected.length?selected:!checkoutStarted&&cartIds.includes('kiip')?['kiip']:[];
  const checkoutItems=cartItems.filter(item=>checkoutIds.includes(item.id)).map(item=>({...item,qty:quantities[item.id]||1}));
  const quote=checkoutSummary({items:checkoutItems,vouchers,shipping,...draft});
  function patchDraft(patch){setDraft(current=>({...current,...patch}))}
  function setVouchers(values){setVoucherState(values);setVouchersTouched(true)}
  function beginCheckout(){if(!selected.some(id=>cartIds.includes(id)))return false;committed.current=false;setCheckoutStarted(true);return true}
  function removeCart(ids){setCartIds(current=>current.filter(id=>!ids.includes(id)));setSelected(current=>current.filter(id=>!ids.includes(id)));setCartChanged(true)}
  function addToCart(id,qty=1){if(!catalog.some(item=>item.id===id))return;setCartIds(current=>current.includes(id)?current:[...current,id]);setQuantities(current=>({...current,[id]:(cartIds.includes(id)?current[id]||1:0)+qty}));setSelected([id]);setCartChanged(true);committed.current=false}
  function placeDemoOrder(){
    const address=addressBook[addressIndex];
    if(committed.current||!checkoutItems.length||!payment||!address)return null;
    committed.current=true;
    const order={...checkoutItems[0],id:`demo-${Date.now()}`,productId:checkoutItems[0].id,items:checkoutItems.map(item=>({...item})),qty:checkoutItems.reduce((sum,item)=>sum+item.qty,0),total:quote.total,quote:{...quote},address:{...address},payment,status:'To Pay',demo:true,draft:{...draft}};
    setDemoOrders(current=>[order,...current]);removeCart(checkoutItems.map(item=>item.id));setCheckoutStarted(true);patchDraft({message:'',protection:false,coins:false,dropship:false});return order;
  }
  return <Context.Provider value={{cartItems,cartChanged,selected,setSelected,quantities,setQuantities,shipping,setShipping,payment,setPayment,addressIndex,setAddressIndex,addressBook,setAddressBook,vouchers,setVouchers,vouchersTouched,draft,patchDraft,checkoutItems,quote,beginCheckout,removeCart,addToCart,placeDemoOrder,orders:[...demoOrders,...historyOrders],reviews,setReviews,refunds,setRefunds,showVerify,setShowVerify}}>{children}</Context.Provider>;
}
export const useCommerce=()=>useContext(Context);
