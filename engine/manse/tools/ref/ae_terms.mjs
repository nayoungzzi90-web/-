import * as AA from 'astronomy-engine';
const A=AA.default||AA;
import fs from 'fs';
const out=[]; const t0=Date.now();
for (let y=1900;y<=2100;y++) for (let k=0;k<24;k++){
  const lon=(285+15*k)%360;
  const off = lon>=285 ? -(360-lon)*1.0146 : lon*1.0146;
  const start=new Date(Date.UTC(y,2,20,12)+ (off-7)*86400000);
  const t=A.SearchSunLongitude(lon,start,14);
  if(!t) throw new Error('null '+y+' '+lon);
  out.push([y,lon,t.date.toISOString(),t.ut,t.tt]);
}
console.log(out.length,(Date.now()-t0)+'ms'); fs.writeFileSync(process.argv[2],JSON.stringify(out));
