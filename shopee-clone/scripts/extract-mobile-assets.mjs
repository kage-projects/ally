import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';

const sources = {
  'profile.jpeg': [
    ['profile-status-right',516,20,154,30],
    ['profile-avatar',22,90,69,69], ['profile-vip',23,175,675,55],
    ['profile-verify',38,283,62,63], ['profile-digital',38,687,45,40],
    ['profile-food',40,769,42,41], ['profile-doctor',39,850,45,44],
    ...[[86,557,47,45],[251,556,49,45],[414,556,61,45],[584,554,52,52]].map((rect,i)=>[`purchase-icon${i}`,...rect]),
    ...[[85,1018,48,48],[253,1011,55,54],[420,1010,55,55],[584,1018,60,48]].map((rect,i)=>[`wallet-icon${i}`,...rect]),
    ['profile-spaylater',38,1157,644,109], ['finance-later',57,1423,48,51], ['finance-loan',385,1424,44,48],
    ['nav-home-outline',33,1487,54,52], ['nav-me-selected',638,1487,50,51],
  ],
  'shopping cart.jpeg': [
    ['status-dark',516,19,155,32], ['cart-powerbank',98,291,180,181],
    ['cart-ugreen',98,728,180,181], ['cart-flowers',98,1142,180,181],
    ['cart-extra',296,386,100,26],
  ],
  'select voucher.jpeg': [
    ['voucher-shipping',19,399,198,198], ['voucher-discount',19,777,198,197],
    ['voucher-bank',19,995,198,197], ['voucher-mall',19,1215,198,151],
  ],
  'payment method.jpeg': [['payment-promo',98,407,473,135],['bank-icon',46,221,35,35]],
  'edit address.jpeg': [['address-map',11,997,510,205]],
  'my purchases.jpeg': [
    ['order-cleanser',38,329,157,157], ['order-milk',39,742,156,156], ['order-shallots',39,1363,156,157],
  ],
  'delivered.jpeg': [['delivery-driver',39,553,74,76]],
  'orders details.jpeg': [
    ['recommend-loreal',5,1162,186,184], ['recommend-snack',196,1162,190,184],
    ['recommend-serum',5,1483,186,100], ['recommend-eyeliner',196,1483,190,100],
  ],
};
const browser = await chromium.launch({ channel: process.env.VISUAL_BROWSER_CHANNEL || (existsSync(chromium.executablePath())?undefined:'chrome') });
try {
  const page = await browser.newPage();
  let count=0;
  for(const [file,crops] of Object.entries(sources)) {
    const source=(await readFile(`screenshots/reference/${file}`)).toString('base64');
    const results=await page.evaluate(async({source,crops,file})=>{
      const image=new Image(); image.src=`data:image/jpeg;base64,${source}`; await image.decode();
      const results=crops.map(([name,x,y,width,height])=>{
        const canvas=document.createElement('canvas'); canvas.width=width;canvas.height=height;
        canvas.getContext('2d').drawImage(image,x,y,width,height,0,0,width,height);
        if(name==='profile-status-right') {
          const context=canvas.getContext('2d'),pixels=context.getImageData(0,0,width,height);
          for(let i=0;i<pixels.data.length;i+=4){const coverage=Math.max(0,Math.min(1,(pixels.data[i+2]-130)/125));pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=255;pixels.data[i+3]=Math.round(coverage*255)}
          context.putImageData(pixels,0,0);
        }
        return [name,canvas.toDataURL('image/png').split(',')[1]];
      });
      if(file==='profile.jpeg') {
        const canvas=document.createElement('canvas');canvas.width=canvas.height=146;
        const ctx=canvas.getContext('2d');ctx.drawImage(image,292,0,146,73,0,0,146,73);
        ctx.translate(0,146);ctx.scale(1,-1);ctx.drawImage(image,292,0,146,73,0,0,146,73);
        const pattern=ctx.getImageData(0,0,146,146);
        const header=document.createElement('canvas');header.width=720;header.height=245;
        const context=header.getContext('2d');context.drawImage(image,0,0,720,245,0,0,720,245);
        const pixels=context.getImageData(0,0,720,245);
        const regions=[[45,16,154,42],[510,15,166,43],[100,88,130,43],[100,134,290,32],[483,90,57,56],[568,80,73,72],[648,83,64,69],[228,91,84,33],[22,174,677,57],[22,90,69,69]];
        for(let r=0;r<regions.length;r++){
          const [left,top,width,height]=regions[r];
          for(let y=top;y<top+height;y++)for(let x=left;x<left+width;x++){
            const index=(y*720+x)*4;
            const avatar=r===9&&Math.hypot(x-56.5,y-124.5)<35;
            const full=r===7||r===8||avatar;
            if(full||(pixels.data[index+1]>185&&pixels.data[index+2]>165)){
              const sample=((y%146)*146+x%146)*4;
              for(let c=0;c<3;c++)pixels.data[index+c]=pattern.data[sample+c];
            }
          }
        }
        context.putImageData(pixels,0,0);
        results.push(['profile-pattern',header.toDataURL('image/png').split(',')[1]]);
      }
      return results;
    },{source,crops,file});
    for(const [name,data] of results) { await writeFile(`public/assets/${name}.png`,Buffer.from(data,'base64'));count++; }
  }
  console.log(`Extracted ${count} mobile assets.`);
} finally { await browser.close(); }
