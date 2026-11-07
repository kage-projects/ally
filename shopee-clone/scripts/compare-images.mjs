import { readFile, writeFile } from 'node:fs/promises';

export async function compareImages(page, referencePath, capturePath, diffPath, sections) {
  const reference=(await readFile(referencePath)).toString('base64');
  const actual=(await readFile(capturePath)).toString('base64');
  const result=await page.evaluate(async({reference,actual,sections})=>{
    const load=url=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=url});
    const [ref,capture]=await Promise.all([load(`data:image/jpeg;base64,${reference}`),load(`data:image/png;base64,${actual}`)]);
    if(ref.width!==capture.width||ref.height!==capture.height) return {dimensionsMatch:false,reference:[ref.width,ref.height],actual:[capture.width,capture.height]};
    const canvas=document.createElement('canvas');canvas.width=ref.width;canvas.height=ref.height;
    const context=canvas.getContext('2d',{willReadFrequently:true});
    context.drawImage(ref,0,0);const a=context.getImageData(0,0,ref.width,ref.height);
    context.drawImage(capture,0,0);const b=context.getImageData(0,0,ref.width,ref.height),diff=context.createImageData(ref.width,ref.height);
    const rows=sections||[['screen',0,ref.height]];
    const measurements=rows.map(([name,top,bottom])=>{
      let sum=0;
      for(let y=top;y<bottom;y++)for(let x=0;x<ref.width;x++){
        const offset=(y*ref.width+x)*4;
        for(let k=0;k<3;k++){const delta=Math.abs(a.data[offset+k]-b.data[offset+k]);sum+=delta;diff.data[offset+k]=Math.min(255,delta*3)}
        diff.data[offset+3]=255;
      }
      return {name,meanAbsoluteError:+(sum/((bottom-top)*ref.width*3)).toFixed(2)};
    });
    context.putImageData(diff,0,0);
    return {dimensionsMatch:true,dimensions:[ref.width,ref.height],sections:measurements,diff:canvas.toDataURL('image/png').split(',')[1]};
  },{reference,actual,sections});
  if(result.diff){await writeFile(diffPath,Buffer.from(result.diff,'base64'));delete result.diff}
  return result;
}
