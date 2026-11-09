// Public documentation captures from an isolated H5 browser context.
// Generic fixture names never update app source, shared accounts or databases.
const {chromium}=require('playwright');const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const mobile=process.env.MOBILE_SHOWCASE_URL||'http://127.0.0.1:5197/';const out=path.join(__dirname,'../../docs/screenshots');
async function main(){const browser=await chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));let seq=0;
const visit=async route=>{await page.goto(mobile+'?showcase='+seq+++'#/'+route);await page.waitForLoadState('networkidle');};
const store=async function(){const url=performance.getEntriesByType('resource').map(r=>r.name).find(url=>new URL(url).pathname==='/src/store.js');if(!url)throw Error('Live mobile store not found');return import(url);};
const shot=async name=>{await page.evaluate(()=>{const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while(n=walker.nextNode()){if(!['SCRIPT','STYLE'].includes(n.parentElement?.tagName)&&/南阳师范学院|南阳师院/.test(n.textContent))n.textContent=n.textContent.replaceAll('南阳师范学院','示例校园').replaceAll('南阳师院','示例校区');}});assert.doesNotMatch(await page.locator('body').innerText(),/南阳师范学院|南阳师院/);await page.screenshot({path:path.join(out,'mobile-'+name+'.png'),animations:'disabled'});};
try{
 await visit('pages/home/index');await page.locator('.station-card').first().waitFor();
 await page.evaluate(async()=>{const url=performance.getEntriesByType('resource').map(r=>r.name).find(url=>new URL(url).pathname==='/src/store.js');const {state,persist}=await import(url);const names=['生活区示例充电站','教学区示例充电站','运动区示例充电站'];state.stations.forEach((s,i)=>{s.name=names[i]||'示例充电站';s.address=['生活区自行车停放点','教学区室外停车区','运动区自行车停车棚'][i]||'示例停车点';s.area=['生活区','教学区','运动区'][i]||'示例区';delete s.latitude;delete s.longitude;delete s.landmark;});state.orders.forEach(o=>o.stationName=state.stations.find(s=>s.id===o.stationId)?.name||'示例充电站');persist();});
 await shot('home');
 await visit('pages/station/index?id=baoan');await page.locator('.row-tabs').waitFor();await shot('station');
 await visit('pages/start/index?station=baoan&device=14500006&socket=14500006-01');const options=page.locator('.strategy-grid .strategy');await options.first().waitFor();assert.equal(await options.count(),5);await options.nth(2).click();assert.match(await page.locator('.start-summary').innerText(),/0\.72/);await shot('start');
 await page.locator('.action-bar .primary').click();await page.locator('.uni-modal__btn_primary').click();await page.locator('.session-summary').waitFor();
 const orderId=await page.evaluate(async()=>{const url=performance.getEntriesByType('resource').map(r=>r.name).find(url=>new URL(url).pathname==='/src/store.js');const {state,persist,refreshData}=await import(url);const o=state.orders.find(o=>o.status==='charging');o.startedAt=Date.now()-25*60000;await refreshData();persist();return o.id;});await page.waitForFunction(()=>Number(document.querySelector('.energy-value')?.textContent)>0);await shot('charging');
 await page.evaluate(async()=>{const url=performance.getEntriesByType('resource').map(r=>r.name).find(url=>new URL(url).pathname==='/src/store.js');const {state,persist,refreshData}=await import(url);state.orders.find(o=>o.status==='charging').startedAt=Date.now()-181*60000;await refreshData();persist();});await page.getByText('定时时长已到',{exact:true}).waitFor();assert.match(await page.locator('.action-bar .primary').innerText(),/0\.72/);await shot('payment');
 await page.locator('.action-bar .primary').click();await page.getByText('模拟支付完成',{exact:true}).waitFor();
 await visit('pages/orders/index');await page.locator('.order-card').first().waitFor();await shot('orders');
 await visit('pages/report/index?code=14500006-01');await page.locator('.form-textarea textarea').fill('插座指示灯不亮，请安排检查。');await shot('repair');
 await page.locator('uni-button').filter({hasText:'提交模拟报修'}).click();await page.locator('.report-success').waitFor();
 await visit('pages/mine/index');await page.locator('.mine-hero').waitFor();await shot('mine');assert.deepEqual(errors,[]);console.log(JSON.stringify({captured:8,source:'uni-app H5 preview',nativeWeChatCapture:false,genericSchoolData:true,chargeOptions:5,durationPrice:'3h / 0.72元',pageErrors:errors}));
}finally{await browser.close();}}
main().catch(e=>{console.error(e);process.exitCode=1});
