export const rupiah = value => `Rp${new Intl.NumberFormat('id-ID').format(value)}`;
export const cartProducts = [
  {id:'kiip',shop:'KiiP Official Shop',mall:true,live:true,title:'KiiP E33C Power Bank Slim 10000mAh Dual',variant:'Black',image:'cart-powerbank',price:165000,originalPrice:469000,voucher:'15k'},
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
export const historyOrders = [
  {id:'1',productId:'garnier',shop:'Garnier Indonesia Official Shop',mall:true,live:true,title:'GARNIER Facial Wash Bright Complete',image:'order-cleanser',qty:1,price:1,old:1000000000,total:1001,rated:5,status:'Completed'},
  {id:'2',productId:'milk',shop:'fahrigunawan84',title:'Entrasol gold 560 gr vanilla chocolate',variant:'Vanilla, 560 gr',image:'order-milk',qty:1,price:120900,total:116055,rewards:true,status:'Completed'},
  {id:'3',productId:'shallots',shop:'Sayur Express',title:'INSTANT SEND Shallots 200gr Express',image:'order-shallots',qty:2,price:18200,total:36400,compact:true,status:'Completed'},
].map(order=>({...order,address:order.id==='1'?{...addresses[0]}:null,payment:'SeaBank Bayar Instan'}));
export const catalog = [...cartProducts,...historyOrders.map(({productId,qty,total,status,...item})=>({...item,id:productId,star:!item.mall}))];
export const shippingOptions = [
  {name:'Instant',date:'4 Hours',price:39000},
  {name:'Hemat Kargo',date:'8 - 9 Nov',price:3500},
  {name:'Reguler',date:'8 - 9 Nov',price:6500},
];
export const voucherData = [
  {id:'shipping',code:'ONGKIR',image:'voucher-shipping',title:'Free Shipping',minimum:'Min. Spend Rp150k',minSpend:150000,tag:'ShopeeVIP',expiry:'Valid Till: 12.11.2026',recommended:true},
  {id:'discount',code:'VIP10K',image:'voucher-discount',title:'20% off Capped at Rp10k',minimum:'Min. Spend Rp40k',minSpend:40000,tag:'ShopeeVIP',expiry:'Expiring: 13 hours left'},
  {id:'bank',image:'voucher-bank',title:'Rp15k off',minimum:'Min. Spend Rp100k',minSpend:100000,tag:'Debit Card',expiry:'Running out · valid till 30.11...',recommended:true,limited:true},
  {id:'mall',image:'voucher-mall',title:'100% off Capped at Rp30k',minimum:'Min. Spend Rp30k',minSpend:30000,tag:'Verified User',limited:true},
];
export function toggleVoucher(chosen,id) {
  if(chosen.includes(id)) return chosen.filter(value=>value!==id);
  return id==='shipping'?[...chosen,id]:[...chosen.filter(value=>value==='shipping'),id];
}
export function voucherProblem(voucher,subtotal) {
  if(!voucher) return 'Voucher tidak tersedia.';
  if(subtotal<voucher.minSpend) return `Minimal belanja ${rupiah(voucher.minSpend)} belum terpenuhi.`;
  if(voucher.id==='bank') return 'Voucher ini memerlukan kartu debit; metode yang tersedia saat ini adalah transfer bank.';
  if(voucher.id==='mall') return 'Voucher ini memerlukan akun terverifikasi.';
  return '';
}
export function checkoutSummary({items=[],vouchers=[],shipping='Instant',protection=false,coins=false}) {
  const subtotal=items.reduce((sum,item)=>sum+item.price*item.qty,0);
  const merchandise=items.reduce((sum,item)=>sum+(item.originalPrice??item.price)*item.qty,0);
  const shippingOption=shippingOptions.find(option=>option.name===shipping)||shippingOptions[0];
  const shippingFee=items.length?shippingOption.price*new Set(items.map(item=>item.shop)).size:0;
  const shippingDiscount=vouchers.includes('shipping')&&subtotal>=150000?shippingFee:0;
  const discount=vouchers.includes('discount')&&subtotal>=40000?Math.min(10000,Math.floor(subtotal*.2)):0;
  const serviceFee=items.length?1200:0;
  const protectionFee=protection?items.reduce((sum,item)=>sum+1500*item.qty,0):0;
  const beforeCoins=subtotal+shippingFee-shippingDiscount-discount+serviceFee+protectionFee;
  const coinDiscount=coins?Math.min(100,beforeCoins):0;
  return {subtotal,merchandise,itemDiscount:merchandise-subtotal,shippingFee,shippingDiscount,discount,serviceFee,protectionFee,coinDiscount,total:beforeCoins-coinDiscount,saved:merchandise-subtotal+shippingDiscount+discount+coinDiscount,shippingOption};
}
export function safeAddressIndex(value,length,fallback=0) {
  const number=Number(value);
  return length?Math.min(length-1,Math.max(0,Number.isInteger(number)&&value!==null?number:fallback)):0;
}
export function validateAddress({name='',phone='',street='',region=''}) {
  const errors={},lines=region.split('\n').map(line=>line.trim());
  if(name.trim().length<2) errors.name='Isi nama lengkap minimal 2 karakter.';
  if(!/^[+()\d\s-]+$/.test(phone)||phone.replace(/\D/g,'').length<8||phone.replace(/\D/g,'').length>15) errors.phone='Masukkan nomor telepon yang valid (8–15 digit).';
  if(street.trim().length<5) errors.street='Isi alamat jalan minimal 5 karakter.';
  if(lines.length!==4||lines.slice(0,3).some(line=>!line)||!/^\d{5}$/.test(lines[3])) errors.region='Isi provinsi, kota, kecamatan, dan kode pos 5 digit pada empat baris.';
  return errors;
}
export function parseAddressPaste(text) {
  const lines=text.split('\n').map(line=>line.trim()).filter(Boolean);
  if(lines.length<3) return null;
  const name=lines[0].replace(/^(full name|nama|name)\s*:\s*/i,'');
  const phone=lines[1].replace(/^(phone number|phone|telepon|nomor)\s*:\s*/i,'');
  if(phone.replace(/\D/g,'').length<8) return null;
  return {name,phone,street:lines[2].replace(/^(street|alamat)\s*:\s*/i,''),...(lines.length>=7?{region:lines.slice(3,7).join('\n')}:{})};
}
