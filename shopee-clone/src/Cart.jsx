import React, { useState } from 'react';
import { ChevronRight, ChevronDown, TicketPercent, Coins, CircleHelp, Minus, Plus } from 'lucide-react';
import { AppLink, navigate } from './navigation';
import { PageHeader, ChatIcon, ActionFooter, MallTag, LiveTag, Toggle, art } from './mobile-ui';
import { cartProducts, rupiah, useCommerce } from './commerce';

export default function Cart() {
  const {selected,setSelected,quantities,setQuantities}=useCommerce();
  const [edit,setEdit]=useState(false),[useCoins,setUseCoins]=useState(false);
  const select=(id)=>setSelected(selected.includes(id)?selected.filter(item=>item!==id):[...selected,id]);
  const quantity=(id,change)=>setQuantities({...quantities,[id]:Math.max(1,quantities[id]+change)});
  const total=cartProducts.filter(item=>selected.includes(item.id)).reduce((sum,item)=>sum+item.price*quantities[item.id],0)-(selected.length&&useCoins?100:0);
  return <div className="app flow-page cart-page"><PageHeader title={<>Shopping Cart <small>(188)</small></>} back="/"><button className="cart-edit" onClick={()=>setEdit(!edit)}>{edit?'Done':'Edit'}</button><ChatIcon/></PageHeader><main className="cart-content">
    {cartProducts.map((item,i)=><section className="cart-shop" key={item.id}>
      <div className="cart-shop-heading"><input type="checkbox" aria-label={`Pilih toko ${item.shop}`} checked={selected.includes(item.id)} onChange={()=>select(item.id)}/>{item.mall?<MallTag/>:<span className="star-tag">Star+</span>}<span className="shop-name">{item.shop}</span>{item.live&&<LiveTag/>}<ChevronRight size={14}/><button onClick={()=>setEdit(!edit)}>{edit?'Done':'Edit'}</button></div>
      <div className={`cart-item ${i===0?'streaming':''}`}><input type="checkbox" aria-label={`Pilih ${item.title}`} checked={selected.includes(item.id)} onChange={()=>select(item.id)}/><img className="cart-product-image" src={art(item.image)} alt={item.title}/><div className="cart-item-details"><div className="cart-product-title">{item.title}</div><div className="cart-variant-line"><button className="variant">{item.variant}<ChevronDown size={12}/></button><div className="quantity"><button aria-label={`Kurangi ${item.id}`} onClick={()=>quantity(item.id,-1)}><Minus size={12}/></button><span aria-label={`Jumlah ${item.id}`}>{quantities[item.id]}</span><button aria-label={`Tambah ${item.id}`} onClick={()=>quantity(item.id,1)}><Plus size={12}/></button></div></div><img className="extra-promo" src={art('cart-extra')} alt="Gratis ongkir XTRA, Promo XTRA"/><strong>{rupiah(item.price)}</strong>{i===0&&<small className="stream-price">▣ Streaming Price at Rp149.000 <ChevronRight size={12}/></small>}</div></div>
      {item.voucher&&<AppLink className="cart-shop-voucher" to="/vouchers"><TicketPercent size={16}/><span>Up to Rp{item.voucher} off voucher available</span><ChevronRight size={14}/></AppLink>}
    </section>)}
  </main><ActionFooter className="cart-footer"><AppLink className="cart-footer-voucher" to="/vouchers"><TicketPercent size={17}/><span>Vouchers</span><small>Select or enter code ›</small></AppLink><div className="cart-coins"><Coins size={17}/><span>{selected.length?'Redeem 100 Shopee Coins':'No item selected'}</span><CircleHelp size={15}/><Toggle checked={Boolean(selected.length)&&useCoins} onChange={setUseCoins} disabled={!selected.length} label="Gunakan koin"/></div><div className="cart-checkout"><label><input type="checkbox" checked={selected.length===cartProducts.length} onChange={()=>setSelected(selected.length===cartProducts.length?[]:cartProducts.map(item=>item.id))}/>All</label><strong>{rupiah(total)}</strong><button className="primary-btn" aria-disabled={!selected.length} onClick={()=>selected.length&&navigate('/checkout')}>Check Out ({selected.length})</button></div></ActionFooter></div>;
}
