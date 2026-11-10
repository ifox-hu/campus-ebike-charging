const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path'),fs=require('node:fs');
const base=process.env.AVATAR_QA_URL||'http://127.0.0.1:5231/',accountMode=process.env.AVATAR_ACCOUNT_MODE==='true';
async function main(){
 const browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 const artifacts=path.join(__dirname,'artifacts');fs.mkdirSync(artifacts,{recursive:true});page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base);await page.locator('.login-submit').waitFor();
  if(accountMode){await page.locator('input[autocomplete=username]').fill('avatar_test_admin');await page.locator('input[autocomplete=current-password]').fill('AvatarTest2026!');}
  else await page.getByRole('button',{name:'填入演示账号',exact:true}).click();
  await page.locator('.login-submit').click();await page.locator('.profile-button').waitFor();
  const open=async()=>{await page.getByRole('button',{name:'管理员账号菜单',exact:true}).click();await page.getByRole('button',{name:'个人中心',exact:true}).click();await page.locator('.account-summary').waitFor();};
  const buffer=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=640;c.height=320;const g=c.getContext('2d');g.fillStyle='#b8aafa';g.fillRect(0,0,640,320);g.fillStyle='#6955bb';g.beginPath();g.arc(320,160,105,0,Math.PI*2);g.fill();g.fillStyle='white';g.font='bold 85px sans-serif';g.textAlign='center';g.fillText('A',320,192);return c.toDataURL('image/png').split(',')[1];}),'base64');
  const upload=async()=>{await page.locator('.avatar-file').setInputFiles({name:'avatar.png',mimeType:'image/png',buffer});await page.locator('.profile-avatar-large img').waitFor();await page.waitForFunction(()=>document.querySelector('.profile-avatar-large img')?.naturalWidth===256);};
  await open();assert.equal(await page.locator('.profile-button .avatar img').count(),0);await upload();assert.equal(await page.locator('.profile-button .avatar img').count(),0);
  const avatar=await page.locator('.profile-avatar-large img').getAttribute('src');assert.ok(avatar.startsWith('data:image/jpeg;base64,'));
  await page.locator('.account-form').getByRole('button',{name:'取消',exact:true}).click();await open();assert.equal(await page.locator('.profile-avatar-large img').count(),0);
  await upload();await page.locator('.account-form').getByRole('button',{name:'保存',exact:true}).click();await page.locator('.account-form').waitFor({state:'detached'});assert.equal(await page.locator('.profile-button .avatar img').getAttribute('src'),avatar);
  await page.reload();await page.locator('.profile-button .avatar img').waitFor();assert.equal(await page.locator('.profile-button .avatar img').getAttribute('src'),avatar);
  await open();
  for(const bad of [{name:'broken.png',mimeType:'image/png',buffer:Buffer.from('broken image')},{name:'vector.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg/>')},{name:'too-big.png',mimeType:'image/png',buffer:Buffer.alloc(5*1024*1024+1)}]){
   await page.locator('.avatar-file').setInputFiles(bad);await page.locator('.account-form .form-error').waitFor();assert.equal(await page.locator('.profile-avatar-large img').getAttribute('src'),avatar);
  }
  await page.locator('.account-form').getByRole('button',{name:'取消',exact:true}).click();await open();
  await page.locator('.account-summary').screenshot({path:path.join(artifacts,'editable-avatar.png')});
  await page.getByRole('button',{name:'恢复默认',exact:true}).click();assert.equal(await page.locator('.profile-avatar-large img').count(),0);assert.equal(await page.locator('.profile-button .avatar img').count(),1);
  await page.locator('.account-form').getByRole('button',{name:'取消',exact:true}).click();await open();assert.equal(await page.locator('.profile-avatar-large img').count(),1);
  await page.setViewportSize({width:390,height:844});assert.ok(await page.locator('.modal-card').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
  await page.getByRole('button',{name:'恢复默认',exact:true}).click();await page.locator('.account-form').getByRole('button',{name:'保存',exact:true}).click();await page.locator('.account-form').waitFor({state:'detached'});
  await page.reload();await page.locator('.profile-button').waitFor();assert.equal(await page.locator('.profile-button .avatar img').count(),0);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({accountMode,uploadAndResize:true,previewAndCancel:true,toolbarSync:true,persistedAfterReload:true,rejectInvalidAndOversized:true,restoreDefault:true,mobileFits:true,pageErrors:errors}));
 }catch(e){await page.screenshot({path:path.join(artifacts,'avatar-failed.png'),fullPage:true});throw e;}finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
