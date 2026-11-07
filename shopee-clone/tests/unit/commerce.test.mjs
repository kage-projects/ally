import test from 'node:test';
import assert from 'node:assert/strict';
import { cartProducts, checkoutSummary, toggleVoucher, safeAddressIndex, validateAddress, parseAddressPaste } from '../../src/commerce-model.mjs';

const quote=(items,extra={})=>checkoutSummary({items,vouchers:['shipping','discount'],...extra});
test('reference checkout retains its measured amounts',()=>{
  const result=quote([{...cartProducts[0],qty:1}]);
  assert.equal(result.total,156200);assert.equal(result.saved,353000);
  assert.equal(result.merchandise,469000);assert.equal(result.itemDiscount,304000);
});
test('UGREEN uses its own price instead of the KiiP fixture',()=>{
  const result=quote([{...cartProducts[1],qty:1}]);
  assert.equal(result.subtotal,275000);assert.equal(result.total,266200);
});
test('all selected lines, quantities, protection and coins enter the total',()=>{
  const result=quote([{...cartProducts[0],qty:2},{...cartProducts[2],qty:2}],{shipping:'Hemat Kargo',protection:true,coins:true});
  assert.equal(result.subtotal,337300);assert.equal(result.shippingFee,7000);
  assert.equal(result.protectionFee,6000);assert.equal(result.coinDiscount,100);assert.equal(result.total,334400);
});
test('voucher thresholds and caps are enforced and shipping is charged without eligibility',()=>{
  const small=quote([{...cartProducts[2],qty:2}]);assert.equal(small.discount,0);assert.equal(small.shippingDiscount,0);assert.equal(small.total,47500);
  const threshold=quote([{...cartProducts[0],price:40000,qty:1}]);assert.equal(threshold.discount,8000);
});
test('an empty checkout has neither charges nor negative totals',()=>{
  const result=quote([],{coins:true,protection:true});assert.equal(result.total,0);assert.equal(result.serviceFee,0);
});
test('one discount voucher coexists with one shipping voucher',()=>{
  assert.deepEqual(toggleVoucher(['shipping','discount'],'bank'),['shipping','bank']);
  assert.deepEqual(toggleVoucher(['shipping','discount'],'discount'),['shipping']);
});
test('malformed address indexes never produce undefined access',()=>{
  for(const value of ['abc','Infinity',undefined]) assert.equal(safeAddressIndex(value,6,2),2);
  assert.equal(safeAddressIndex('-10',6),0);assert.equal(safeAddressIndex('999',6),5);assert.equal(safeAddressIndex('1',0),0);
});
test('address validation rejects whitespace names, bad phones and missing region fields',()=>{
  const invalid=validateAddress({name:' ',phone:'abc',street:' ',region:'DKI'});
  assert.deepEqual(Object.keys(invalid).sort(),['name','phone','region','street']);
  assert.deepEqual(validateAddress({name:'Nama Contoh',phone:'+628123456789',street:'Jalan Contoh 21',region:'DKI JAKARTA\nKOTA JAKARTA BARAT\nPALMERAH\n11410'}),{});
});
test('quick-fill preserves values instead of silently clearing partial input',()=>{
  assert.equal(parseAddressPaste('Nama saja'),null);
  const parsed=parseAddressPaste('Nama: Nama Contoh\nPhone: +628123456789\nAlamat: Jalan Contoh 21\nDKI JAKARTA\nKOTA JAKARTA BARAT\nPALMERAH\n11410');
  assert.equal(parsed.name,'Nama Contoh');assert.equal(parsed.street,'Jalan Contoh 21');assert.match(parsed.region,/11410$/);
});
