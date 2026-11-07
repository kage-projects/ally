import React from 'react';
import { createRoot } from 'react-dom/client';
import { Search, ChevronRight } from 'lucide-react';
import { AppLink, usePath } from './navigation';
import Profile from './Profile';
import Cart from './Cart';
import Checkout from './Checkout';
import { Vouchers, Shipping, Payment } from './CheckoutOptions';
import { AddressSelection, EditAddress } from './Addresses';
import { Purchases, OrderDetails, Delivered } from './Orders';
import { CommerceProvider } from './commerce';
import './style.css';
import './mobile.css';

const asset = (name) => `/assets/${name}.png`;
const categories = ['Pulsa & Tagihan', 'ShopeeFood', 'Shopee Games', 'Belanja Instant', 'Nonton Drama Gr...', 'Shopee'];
function Header() { return <header className="header"><div className="status" aria-hidden="true"><img src={asset('status-left')} alt=""/><img src={asset('status-right')} alt=""/></div><div className="search-row"><label className="search"><Search size={18}/><input aria-label="Cari di Shopee" placeholder="Poco M7 Pro 5g"/><img className="camera" src={asset('header-camera')} alt="Kamera"/></label><AppLink to="/cart" className="cart" aria-label="Keranjang, 99 lebih produk"><img src={asset('header-cart')} alt=""/><b>99+</b></AppLink><div className="chat" aria-label="Chat"><img src={asset('header-chat')} alt=""/><i/></div></div></header> }
function WalletBar() { return <section className="wallet" aria-label="Dompet Shopee"><div className="qr"><img src={asset('qris')} alt="QRIS"/></div><div><div className="wallet-title"><img src={asset('balance')} alt=""/> Rp22.045</div><small>Pay QRIS</small></div><div><div className="wallet-title"><img className="coins" src={asset('coins')} alt=""/> Claim Now</div><small className="orange">Coins await!</small></div><div><div className="wallet-title"><img src={asset('paylater')} alt=""/> SPayLater</div><small>50k Discount!</small></div></section> }
function Categories() { return <section className="categories" aria-label="Layanan Shopee"><div className="category-scroll"><div className="category-row">{categories.map((name,i)=><div className="category" key={name}><img src={asset(`category${i+1}`)} width="34" height="34.5" alt=""/><span>{name}</span></div>)}</div></div><div className="dots" aria-hidden="true"><b></b><i></i></div></section> }
function MediaPanel({title,images}) {return <div className="media-panel"><h2 className="media-title">{title}<ChevronRight size={13}/></h2><div className="media-images">{images.map((name,i)=><img key={name} src={asset(name)} alt={`${title} ${i+1}`}/>)}</div></div>}
function BottomNav({selected='home'}){const items=[['home','Home'],['migoo','Migoo'],['deals','Deals'],['live','Live & Video'],['notification','Notification'],['me','Me']]; return <nav className="bottom" aria-label="Navigasi utama">{items.map(([icon,label],i)=>{const artwork=icon==='home'&&selected==='me'?'home-outline':icon==='me'&&selected==='me'?'me-selected':icon;const content=<><div className="nav-icon"><img src={asset(`nav-${artwork}`)} alt=""/>{i===4&&<b>{selected==='me'?37:40}</b>}</div><span>{label}</span></>;return <div className={icon===selected?'active':''} key={label} aria-current={icon===selected?'page':undefined}>{icon==='home'||icon==='me'?<AppLink to={icon==='me'?'/profile':'/'}>{content}</AppLink>:content}</div>})}<div className="home-indicator" aria-hidden="true"/></nav>}
function Home(){return <div className="app"><Header/><main><WalletBar/><Categories/><section className="banner" aria-label="Bonus koin"><img src={asset('banner')} alt="Bonus koin, hanya 1 menit, langsung dapat sampai dengan 100 ribu"/></section><section className="media" aria-label="Live dan video"><MediaPanel title="Shopee Live" images={['live1','live2']}/><MediaPanel title="Shopee Video" images={['video1','video2']}/></section><section className="products" aria-label="Rekomendasi"><div><img src={asset('promo')} alt="Shopee Live, diskon 50 persen sampai dengan 30 ribu"/></div><div className="product"><img src={asset('product')} alt="Makarizo Hair Energy Fibertherapy"/><div><b>Star+</b> HBK Makarizo Hair Energy Fibertherapy Condi...</div></div></section></main><BottomNav/></div>}
function App(){const path=usePath();const pages={'/profile':<Profile BottomNav={BottomNav}/>,'/cart':<Cart/>,'/checkout':<Checkout/>,'/vouchers':<Vouchers/>,'/shipping':<Shipping/>,'/payment':<Payment/>,'/addresses':<AddressSelection/>,'/address/edit':<EditAddress/>,'/purchases':<Purchases/>,'/orders/1':<OrderDetails/>,'/delivery':<Delivered/>};return pages[path]||<Home/>}

createRoot(document.getElementById('root')).render(<CommerceProvider><App/></CommerceProvider>);
