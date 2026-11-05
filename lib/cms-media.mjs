export const MAX_MEDIA_BYTES=750000;
export function detectImageMime(bytes){
 const b=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
 if(b.length>=8&&[137,80,78,71,13,10,26,10].every((x,i)=>b[i]===x))return 'image/png';
 if(b.length>=3&&b[0]===255&&b[1]===216&&b[2]===255)return 'image/jpeg';
 if(b.length>=12&&String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP')return 'image/webp';
 if(b.length>=12&&String.fromCharCode(...b.slice(4,12)).includes('ftypavif'))return 'image/avif';
 return null;
}
