export const MAX_AVATAR_LENGTH=180000
export function validateAvatar(value){
 if(value==='')return ''
 if(typeof value!=='string'||value.length>MAX_AVATAR_LENGTH||!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(value))throw Error('头像格式无效，请重新选择图片。')
 let bytes
 try{bytes=atob(value.split(',')[1])}catch{throw Error('头像数据无效，请重新选择图片。')}
 const valid=value.startsWith('data:image/png;')?bytes.startsWith('\x89PNG\r\n\x1a\n'):bytes.startsWith('\xff\xd8\xff')&&bytes.endsWith('\xff\xd9')
 if(!valid)throw Error('头像数据无效，请重新选择图片。')
 return value
}
export async function prepareAvatar(file){
 if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('请选择 JPG、PNG 或 WebP 图片。')
 if(file.size>5*1024*1024)throw Error('请选择不超过 5MB 的头像图片。')
 const url=URL.createObjectURL(file),image=new Image()
 let timer
 try{
  await new Promise((resolve,reject)=>{
   timer=setTimeout(()=>reject(Error('图片读取超时，请重新选择。')),10000)
   image.onload=resolve;image.onerror=()=>reject(Error('无法读取这张图片，请重新选择。'));image.src=url
  })
  const {naturalWidth:width,naturalHeight:height}=image
  if(!width||!height||width*height>25000000)throw Error('图片尺寸过大，请选择不超过 2500 万像素的图片。')
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256
  const context=canvas.getContext('2d');if(!context)throw Error('当前浏览器无法处理图片，请更换浏览器。')
  const size=Math.min(width,height);context.fillStyle='#ffffff';context.fillRect(0,0,256,256);context.drawImage(image,(width-size)/2,(height-size)/2,size,size,0,0,256,256)
  return validateAvatar(canvas.toDataURL('image/jpeg',.86))
 }finally{clearTimeout(timer);image.onload=image.onerror=null;URL.revokeObjectURL(url)}
}
