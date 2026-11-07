import React, { useState } from 'react';
import { useAlly } from '@ally/react';
import { MapPin, CircleHelp, TicketPercent, Coins, Truck, ChevronRight, Wallet } from 'lucide-react';
import { AppLink, navigate } from './navigation';
import { PageHeader, ActionFooter, Row, MallTag, Tag, Toggle, art } from './mobile-ui';
import { useCommerce, rupiah } from './commerce';
import { shippingOptions } from './commerce-model.mjs';
import { Action, useFeedback } from './feedback';

export default function Checkout() {
  const {addressIndex,addressBook,shipping,payment,vouchers,checkoutItems,quote,draft,patchDraft,placeDemoOrder}=useCommerce();
  const ui=useFeedback(),ally=useAlly(),[error,setError]=useState('');
  const address=addressBook[addressIndex]||addressBook[0],current=quote.shippingOption;
  const alternate=shippingOptions.find(option=>option.name===(shipping==='Reguler'?'Instant':'Reguler'));
  const info=(title,body)=>ui.show(title,body);
  async function place(){
    if(!checkoutItems.length){ui.notify('Pilih barang di keranjang terlebih dahulu.');return}
    if(!address){ally.reportError({field:'address',category:'required'});setError('Pilih alamat pengiriman terlebih dahulu.');document.querySelector('.checkout-address')?.focus();return}
    if(!payment){ally.reportError({field:'payment',category:'required'});setError('Pilih metode pembayaran terlebih dahulu.');document.querySelector('.checkout-bank')?.focus();return}
    if(await ui.confirm('Buat pesanan simulasi?',<><p>Total {rupiah(quote.total)} · {payment}</p><p>Pesanan ini disimpan di pratinjau lokal. Tidak ada pembayaran atau pesanan yang dikirim ke penjual.</p></>,'Buat simulasi')){
      const order=placeDemoOrder();if(order){ui.notify('Pesanan simulasi tersimpan.');navigate(`/orders/${order.id}`)}
    }
  }
  return <div className="app flow-page checkout-page"><PageHeader title="Checkout" back="/cart"/><main>
    <AppLink to="/addresses" className="checkout-address"><MapPin size={17}/><div>{address?<><div>{address.name} <small>{address.phone}</small></div><p>{address.street}<br/>{address.region}</p></>:<div>Pilih atau tambahkan alamat pengiriman</div>}</div><ChevronRight size={15}/></AppLink>
    {!checkoutItems.length&&<div className="empty-state"><h2>Belum ada barang untuk checkout</h2><AppLink to="/cart" className="outline-btn orange">Pilih barang</AppLink></div>}
    {checkoutItems.map((item,index)=><section className="checkout-shop" key={item.id}><div className="checkout-shop-heading">{item.mall?<MallTag/>:<span className="star-tag">Star+</span>}<span>{item.shop}</span></div><div className="checkout-product"><img src={art(item.image)} alt={item.title}/><div><div className="truncate">{item.title}</div><small>{item.variant}</small><p><em data-ally-slot="price">{rupiah(Math.max(0,item.price*item.qty-(index===0?quote.discount:0)))}</em> <small className="orange">▣</small> {item.originalPrice&&<del>{rupiah(item.originalPrice*item.qty)}</del>}<span>×{item.qty}</span></p></div></div>
      <div className="protection"><label><input type="checkbox" checked={draft.protection} onChange={event=>patchDraft({protection:event.target.checked})}/>Damage Recovery Protection <span>Rp1.500 ×{item.qty}</span></label><p data-ally-slot="legalText">Get up to 10x item price or cost of primary equipment damaged by the item within 90 days. <Action className="text-action" label="Learn more about protection" onClick={()=>info('Damage Recovery Protection','Perlindungan barang hingga 10 kali harga barang atau biaya perangkat utama yang rusak dalam 90 hari. Pilihan ini hanya dicatat dalam simulasi checkout.')}>Learn more</Action></p></div>
      <Row className="checkout-option" to="/vouchers" right={<span className="muted">Select or enter code</span>}>Shop Voucher</Row>
      <label className="checkout-message"><span>Message</span><input value={draft.message} maxLength={200} onChange={event=>patchDraft({message:event.target.value})} placeholder="Please leave a message" aria-label="Pesan untuk penjual"/><ChevronRight size={14}/></label>
      <Row className="checkout-option shipping-heading" to="/shipping" right="View All">Shipping Option</Row>
      <div className="checkout-shipping">{[current,alternate].map((option,i)=><AppLink key={option.name} to="/shipping" className={i===0?'selected-shipping':''}><span>{option.name==='Instant'&&<Truck size={13}/>} {option.date}</span><small>{quote.shippingDiscount>0?<><del>{rupiah(option.price)}</del> Rp0 <b>VIP</b></>:rupiah(option.price)}</small><p>{option.name}</p></AppLink>)}</div>
      <div className="shipping-guarantee">Get up to Rp10.000 if order arrives late <Action label="Delivery guarantee" onClick={()=>info('Guaranteed On-Time Delivery','Voucher hingga Rp10.000 mengikuti ketentuan jaminan waktu pengiriman di Shopee. Simulasi ini tidak mengajukan klaim pengiriman.')}><CircleHelp size={11}/></Action></div><Row className="checkout-total" right={rupiah(item.price*item.qty)}>Total {item.qty} Item(s)</Row>
    </section>)}
    <section className="checkout-vouchers"><Row to="/vouchers" right={<>{quote.discount>0&&<Tag>{quote.discount===10000?'-Rp10k':`-${rupiah(quote.discount)}`}</Tag>}{quote.shippingDiscount>0&&<Tag className="teal-tag">Free Shipping</Tag>}</>}><TicketPercent size={17}/><b>VIP</b> Vouchers</Row><Row right={<Toggle checked={draft.coins} disabled={!checkoutItems.length} onChange={coins=>patchDraft({coins})} label="Redeem 100 Shopee Coins"/>}><Coins size={17}/>Redeem 100 Shopee Coins</Row></section>
    <section className="checkout-payment"><Row to="/payment" right="View All">Payment Methods</Row><AppLink to="/payment" className="checkout-bank"><img src={art('bank-icon')} alt=""/><div>Bank Transfer<small>{payment||'SeaBank'}</small></div><i className={payment?'radio selected':'radio'}/></AppLink><div className="checkout-later"><Wallet size={18}/><div><Row right={<button type="button" className="tag activate-tag" onClick={()=>info('SPayLater','Aktivasi memerlukan aplikasi Shopee dan verifikasi akun. Tidak ada fasilitas kredit yang diaktifkan dalam pratinjau ini.')}>Activate</button>}>SPayLater</Row><small>Activate now to get 50K Discount</small><div className="mini-plans"><div>Rp107.000 <span>× 1 mth</span><Tag>Extra 99% OFF</Tag><Tag>0% Interest</Tag></div><div>Rp20.458 <span>× 6 mth</span><small>2.45% interest/mth</small><Tag>Extra 99% OFF</Tag></div></div></div></div></section>
    <section className={`payment-details ${draft.protection||draft.coins?'expanded-details':''}`}><h2>Payment Details</h2>{[['Merchandise Subtotal',quote.merchandise],['Shipping Subtotal',quote.shippingFee],['Buyer Service Fee ⓘ',quote.serviceFee],['Item Discount',-quote.itemDiscount],['Shipping Discount Subtotal ᴠɪᴘ',-quote.shippingDiscount],['Voucher Discount ᴠɪᴘ',-quote.discount],...(draft.protection?[['Damage Recovery Protection',quote.protectionFee]]:[]),...(draft.coins?[['Shopee Coins',-quote.coinDiscount]]:[])].map(([label,value],i)=><Row key={label} right={<span className={i>2?'orange':''}>{value<0?`-${rupiah(-value)}`:i>2&&value===0?'-Rp0':rupiah(value)}</span>}>{label}</Row>)}<Row className="total-payment" right={<span data-ally-slot="totalAmount">{rupiah(quote.total)}</span>}>Total Payment</Row></section>
    <section className="checkout-dropship"><Row right={<Toggle checked={draft.dropship} onChange={dropship=>patchDraft({dropship})} label="Send as Dropshipper"/>}>Send as Dropshipper</Row></section>
    {error&&<p className="form-error" role="alert">{error}</p>}
  </main><ActionFooter className="checkout-footer"><div className="checkout-summary"><div>Total <strong data-ally-slot="totalAmount">{rupiah(quote.total)}</strong><small>Saved <span>{rupiah(quote.saved)}</span></small></div><button className="primary-btn" data-ally-slot="payButton" type="button" onClick={place}>Place Order</button></div></ActionFooter></div>;
}
