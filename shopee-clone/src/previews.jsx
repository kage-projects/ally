import React, { useState } from 'react';
import { AppLink, navigate } from './navigation';
import { art } from './mobile-ui';
import { catalog, rupiah } from './commerce-model.mjs';
import { useCommerce } from './commerce';
import { useFeedback } from './feedback';

export function MediaPreview({images}) {
  const [index,setIndex]=useState(0);
  return <><div className="dialog-gallery"><button aria-label="Sebelumnya" disabled={index===0} onClick={()=>setIndex(index-1)}>‹</button><img src={art(images[index])} alt={`Pratinjau ${index+1}`}/><button aria-label="Berikutnya" disabled={index===images.length-1} onClick={()=>setIndex(index+1)}>›</button></div><p className="preview-caption">{index+1} / {images.length} · Pratinjau gambar</p></>;
}
function ProductResult({item}) {
  const {addToCart}=useCommerce(),ui=useFeedback();
  const available=catalog.some(product=>product.id===item.id);
  return <div className="dialog-product"><img src={art(item.image)} alt=""/><div><p>{item.title}</p><p>{rupiah(item.price)}</p><button onClick={()=>{if(available){addToCart(item.id);ui.notify('Barang ditambahkan ke keranjang.')}navigate('/cart')}}>{available?'Tambah ke keranjang':'Lihat keranjang'}</button></div></div>;
}
export function ProductSearch({initial=''}) {
  const [query,setQuery]=useState(initial),[submitted,setSubmitted]=useState(initial);
  const results=catalog.filter(item=>`${item.title} ${item.shop}`.toLowerCase().includes(submitted.trim().toLowerCase()));
  return <><form className="dialog-search" onSubmit={event=>{event.preventDefault();setSubmitted(query)}}><input aria-label="Cari produk tersedia" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Cari nama produk atau toko"/><button className="outline-btn orange">Cari</button></form>{results.length?results.map(item=><ProductResult key={item.id} item={item}/>):<p role="status">Tidak ada produk yang cocok. Coba nama seperti UGREEN atau Garnier.</p>}</>;
}
export function Notifications(){const {orders}=useCommerce();return <div>{orders.map(order=><AppLink className="notification-preview" key={order.id} to={`/orders/${order.id}`}><strong>{order.demo?'Pesanan simulasi':order.shop}</strong><span>{order.title}</span><small>{order.status}</small></AppLink>)}</div>}
export function serviceInfo(ui,title,detail='') {
  ui.show(title,<><p>{detail||'Layanan ini tidak tersambung ke akun Shopee dalam pratinjau lokal.'}</p><p>Anda dapat melanjutkan ke halaman yang tersedia berikut.</p><div className="preview-links"><AppLink to="/purchases">My Purchases</AppLink><AppLink to="/vouchers?from=profile">Vouchers</AppLink></div></>);
}
export function openProduct(ui,item){ui.show(item.title,<ProductResult item={item}/>)}
