import React, { createContext, useContext, useState } from 'react';

export const rupiah = value => `Rp${new Intl.NumberFormat('id-ID').format(value)}`;
export const cartProducts = [
  {id:'kiip',shop:'KiiP Official Shop',mall:true,live:true,title:'KiiP E33C Power Bank Slim 10000mAh Dual',variant:'Black',image:'cart-powerbank',price:165000,voucher:'15k'},
  {id:'ugreen',shop:'UGREEN Official Store',mall:true,live:true,title:'UGREEN Power Bank Slim 10,000mAh',variant:'10Rb 20W-Slim Gray',image:'cart-ugreen',price:275000,voucher:'24k'},
  {id:'flowers',shop:'Oudy Shop',star:true,title:'Beautiful Japanese Frangipani Flower Brooch',variant:'Red Brooch',image:'cart-flowers',price:3650},
];
export const addresses = [
  {name:'naufal',phone:'(+62) 851-1904-5590',street:'Kost Qaireen Bersaudara, Jalan Slipi VIII No. 21, RT.3/RW.3, Slipi, Palmerah, Kota Jakarta Barat, Dki Jakarta 11410, Indonesia',region:'PALMERAH, KOTA JAKARTA BARAT, DKI JAKARTA, ID 11410',default:true},
  {name:'Indra',phone:'(+62) 851-1904-5590',street:'Jalan Ahmad Yani, Kelurahan Pasar, Lembah Segar (Aneka photo)',region:'LEMBAH SEGAR, KOTA SAWAH LUNTO, SUMATERA BARAT, ID 27411'},
  {name:'Naufal',phone:'(+62) 851-1904-5590',street:'Jalan G Rt 003/03 No 21 Kost Qaireen Bersaudara',region:'PALMERAH, KOTA JAKARTA BARAT, DKI JAKARTA, ID 11410'},
  {name:'Aa aldy',phone:'(+62) 878-9644-3386',street:'Pondok Indah Serang, RT.2/RW.12, Kagungan (blok L /17)',region:'SERANG, KOTA SERANG, BANTEN, ID 42114'},
  {name:'Anisa Fitria Lauren',phone:'(+62) 878-7844-9687',street:'Smp Negeri 6 Sawahlunto, Jalan Jenderal Sudirman, Muaro Kalaban (sebelah smp 6)',region:'SILUNGKANG, KOTA SAWAH LUNTO, SUMATERA BARAT, ID 27435'},
  {name:'Naufal',phone:'(+62) 851-1904-5590',street:'Perumahan Delora, Jalan Raya Dago Blok D2 No. 16, RT.4/RW.1, Kabasiran',region:'PARUNG PANJANG, KAB. BOGOR, JAWA BARAT, ID 16360'},
];
const Context=createContext(null);
export function CommerceProvider({children}) {
  const [selected,setSelected]=useState([]),[quantities,setQuantities]=useState({kiip:1,ugreen:1,flowers:2});
  const [shipping,setShipping]=useState('Instant'),[payment,setPayment]=useState(''),[addressIndex,setAddressIndex]=useState(0);
  const [addressBook,setAddressBook]=useState(addresses),[vouchers,setVouchers]=useState(['shipping','discount']);
  return <Context.Provider value={{selected,setSelected,quantities,setQuantities,shipping,setShipping,payment,setPayment,addressIndex,setAddressIndex,addressBook,setAddressBook,vouchers,setVouchers}}>{children}</Context.Provider>;
}
export const useCommerce=()=>useContext(Context);
