import QrScanner from 'qr-scanner';

// Browser-only: never imported into the WeChat build.
export function scanImage(onCode){
 const input=document.createElement('input');input.type='file';input.accept='image/*';
 input.onchange=async()=>{
  const file=input.files?.[0];if(!file)return;
  if(file.size>10*1024*1024){uni.showToast({title:'请选择10MB以内的二维码图片',icon:'none'});return;}
  try{const result=await QrScanner.scanImage(file,{returnDetailedScanResult:true,alsoTryWithoutScanRegion:true});onCode(result.data);}
  catch{uni.showToast({title:'未识别到二维码，请上传清晰的插座二维码',icon:'none'});}
 };
 input.click();
}
export async function scanCamera(onCode){
 if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){uni.showToast({title:'摄像头需要HTTPS或localhost，可改用图片识别',icon:'none'});return;}
 const cover=document.createElement('div');cover.style.cssText='position:fixed;inset:0;background:#17242cf5;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;color:white;padding:24px';
 const title=document.createElement('strong');title.textContent='将插座二维码对准摄像头';
 const video=document.createElement('video');video.setAttribute('playsinline','');video.style.cssText='width:min(90vw,560px);max-height:65vh;border-radius:16px';
 const close=document.createElement('button');close.textContent='关闭摄像头';close.style.cssText='padding:12px 24px;border:0;border-radius:8px';cover.append(title,video,close);document.body.append(cover);
 let scanner,closed=false;
 const cleanup=()=>{if(closed)return;closed=true;scanner?.destroy();cover.remove();window.removeEventListener('hashchange',cleanup);window.removeEventListener('pagehide',cleanup);document.removeEventListener('visibilitychange',hidden);};
 const hidden=()=>{if(document.hidden)cleanup();};
 close.onclick=cleanup;window.addEventListener('hashchange',cleanup);window.addEventListener('pagehide',cleanup);document.addEventListener('visibilitychange',hidden);
 try{scanner=new QrScanner(video,result=>{if(closed)return;cleanup();onCode(result.data);},{returnDetailedScanResult:true,preferredCamera:'environment'});await scanner.start();if(closed)scanner.destroy();}
 catch{cleanup();uni.showToast({title:'无法打开摄像头，请检查权限或使用图片识别',icon:'none'});}
}
