import React, { useState } from 'react';
import { ChevronRight, Settings, X } from 'lucide-react';
import { AppLink } from './navigation';
import { art, Row } from './mobile-ui';

export default function Profile({ BottomNav }) {
  const [showVerify, setShowVerify] = useState(true);
  return <div className="app profile-page">
    <header className="profile-header">
      <div className="status" aria-hidden="true"><img src={art('status-left')} alt=""/><img src={art('profile-status-right')} alt=""/></div>
      <div className="profile-identity"><img src={art('profile-avatar')} alt=""/><div className="profile-name"><div>nopallse <span>Gold ›</span></div><small>10 Following　0 Followers</small></div><Settings size={23}/><AppLink to="/cart" aria-label="Keranjang" className="profile-cart"><img src={art('header-cart')} alt=""/><b>99+</b></AppLink><img className="profile-chat" src={art('header-chat')} alt="Chat"/></div>
      <img className="vip-banner" src={art('profile-vip')} alt="With VIP! You have saved Rp1.657.792"/>
    </header>
    <main className="profile-content">
      {showVerify && <section className="verify-card"><img src={art('profile-verify')} alt=""/><div><h2>Verify your Shopee Account</h2><p>Get 100% Off up to 30K</p><button onClick={() => setShowVerify(false)}>Later</button><button>Verify Now</button></div><button className="close-verify" aria-label="Tutup verifikasi" onClick={() => setShowVerify(false)}><X size={17}/></button></section>}
      <section className="profile-card purchases-summary"><Row to="/purchases" right="View Purchase History"><h2>My Purchases</h2></Row><div className="profile-actions">{['To Pay','To Ship','To Receive','To Rate'].map((name,i)=><AppLink to={`/purchases?tab=${i+1}`} key={name}><div><img src={art(`purchase-icon${i}`)} alt=""/>{i===3&&<b>42</b>}</div><span>{name}</span></AppLink>)}</div>
      {[['Digital Purchase','Rp125RB Off','profile-digital'],['ShopeeFood Purchase','Gratis Ongkir','profile-food'],['Konsultasi Dokter','','profile-doctor']].map(([name,detail,icon])=><Row key={name} right={<><em>{detail}</em><ChevronRight size={16}/></>}><img src={art(icon)} alt=""/>{name}</Row>)}</section>
      <section className="profile-card profile-wallet"><h2>My Wallet</h2><div className="profile-actions">{[['ShopeePay','Pay QRIS'],['Shopee Coins','Check in now!'],['My Voucher','50+ Vouchers'],['Koin s.d 50RB','App ShopeePay']].map(([name,sub],i)=><AppLink to={i===2?'/vouchers':'/payment'} key={name}><div><img src={art(`wallet-icon${i}`)} alt=""/></div><span>{name}</span><small>{sub}</small></AppLink>)}</div><AppLink to="/payment"><img className="spaylater-banner" src={art('profile-spaylater')} alt="SPayLater. Aktivasi SPayLater, Limit s.d. 50JT. Cek Limit"/></AppLink></section>
      <section className="profile-card financial"><Row right={<>See More <ChevronRight size={15}/></>}><h2>Financial Services</h2></Row><div>{[['SPayLater','0% Installments','Guaranteed + Rp50...'],['SPinjam','Free Admin Fee and','25k Coins']].map(([name,line1,line2])=><AppLink to="/payment" key={name}><img src={art(name==='SPayLater'?'finance-later':'finance-loan')} alt=""/><div><h2>{name}</h2><small>{line1}<br/>{line2}</small></div><ChevronRight size={17}/></AppLink>)}</div></section>
    </main><BottomNav selected="me"/>
  </div>;
}
