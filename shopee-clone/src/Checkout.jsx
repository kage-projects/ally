import React, { useState } from 'react';
import { MapPin, ShieldCheck, CircleHelp, TicketPercent, Coins, Truck, ChevronRight, Wallet } from 'lucide-react';
import { AppLink } from './navigation';
import { PageHeader, ActionFooter, Row, MallTag, Tag, Toggle, art } from './mobile-ui';
import { useCommerce, rupiah, cartProducts } from './commerce';

export default function Checkout() {
  const {addressIndex,addressBook,shipping,payment,vouchers,selected,quantities}=useCommerce();
  const [protection,setProtection]=useState(false),[coins,setCoins]=useState(false),[dropship,setDropship]=useState(false),[message,setMessage]=useState('');
  const address=addressBook[addressIndex]||addressBook[0];
  const item=cartProducts.find(product=>selected.includes(product.id))||cartProducts[0];
  const quantity=selected.length?quantities[item.id]:1;
  const total=165000*quantity+1200-(vouchers.includes('discount')?10000:0)+(protection?1500:0)-(coins?100:0);
  return <div className="app flow-page checkout-page"><PageHeader title="Checkout" back="/cart"/><main>
    <AppLink to="/addresses" className="checkout-address"><MapPin size={17}/><div><div>{address.name} <small>{address.phone}</small></div><p>{address.street}<br/>{address.region}</p></div><ChevronRight size={15}/></AppLink>
    <section className="checkout-shop"><div className="checkout-shop-heading"><MallTag/><span>{item.shop}</span></div><div className="checkout-product"><img src={art(item.image)} alt={item.title}/><div><div className="truncate">{item.title}</div><small>{item.variant}</small><p><em>Rp155.000</em> <small className="orange">▣</small> <del>Rp469.000</del><span>×{quantity}</span></p></div></div>
      <div className="protection"><label><input type="checkbox" checked={protection} onChange={e=>setProtection(e.target.checked)}/>Damage Recovery Protection <span>Rp1.500 ×1</span></label><p>Get up to 10x item price or cost of primary equipment damaged by the item within 90 days. <span>Learn more</span></p></div>
      <Row className="checkout-option" to="/vouchers" right={<span className="muted">Select or enter code</span>}>Shop Voucher</Row>
      <label className="checkout-message"><span>Message</span><input value={message} onChange={e=>setMessage(e.target.value)} placeholder="Please leave a message" aria-label="Pesan untuk penjual"/><ChevronRight size={14}/></label>
      <Row className="checkout-option shipping-heading" to="/shipping" right="View All">Shipping Option</Row>
      <div className="checkout-shipping"><AppLink to="/shipping" className="selected-shipping"><span><Truck size={13}/>4 Hours</span><small><del>Rp39.000</del> Rp0 <b>VIP</b></small><p>{shipping}</p></AppLink><AppLink to="/shipping"><span>8 - 9 Nov</span><small><del>Rp6.500</del> Rp0</small><p>Reguler</p></AppLink></div>
      <div className="shipping-guarantee">Get up to Rp10.000 if order arrives late <CircleHelp size={11}/></div><Row className="checkout-total" right={rupiah(165000*quantity)}>Total {quantity} Item(s)</Row>
    </section>
    <section className="checkout-vouchers"><Row to="/vouchers" right={<><Tag>-Rp10k</Tag><Tag className="teal-tag">Free Shipping</Tag></>}><TicketPercent size={17}/><b>VIP</b> Vouchers</Row><Row right={<Toggle checked={coins} onChange={setCoins} label="Redeem 100 Shopee Coins"/>}><Coins size={17}/>Redeem 100 Shopee Coins</Row></section>
    <section className="checkout-payment"><Row to="/payment" right="View All">Payment Methods</Row><AppLink to="/payment" className="checkout-bank"><img src={art('bank-icon')} alt=""/><div>Bank Transfer<small>{payment||'SeaBank'}</small></div><i className={payment?'radio selected':'radio'}/></AppLink><div className="checkout-later"><Wallet size={18}/><div><Row right={<Tag>Activate</Tag>}>SPayLater</Row><small>Activate now to get 50K Discount</small><div className="mini-plans"><div>Rp107.000 <span>× 1 mth</span><Tag>Extra 99% OFF</Tag><Tag>0% Interest</Tag></div><div>Rp20.458 <span>× 6 mth</span><small>2.45% interest/mth</small><Tag>Extra 99% OFF</Tag></div></div></div></div></section>
    <section className="payment-details"><h2>Payment Details</h2>{[['Merchandise Subtotal','Rp469.000'],['Shipping Subtotal','Rp39.000'],['Buyer Service Fee ⓘ','Rp1.200'],['Item Discount','-Rp304.000'],['Shipping Discount Subtotal ᴠɪᴘ','-Rp39.000'],['Voucher Discount ᴠɪᴘ','-Rp10.000']].map(([label,value],i)=><Row key={label} right={<span className={i>2?'orange':''}>{value}</span>}>{label}</Row>)}<Row className="total-payment" right={rupiah(total)}>Total Payment</Row></section>
    <section className="checkout-dropship"><Row right={<Toggle checked={dropship} onChange={setDropship} label="Send as Dropshipper"/>}>Send as Dropshipper</Row></section>
  </main><ActionFooter className="checkout-footer"><div className="checkout-summary"><div>Total <strong>{rupiah(total)}</strong><small>Saved <span>Rp353.000</span></small></div><button className="primary-btn" type="button" title="Frontend preview only">Place Order</button></div></ActionFooter></div>;
}
