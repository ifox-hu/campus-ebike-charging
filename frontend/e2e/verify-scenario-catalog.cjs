// Run against local Pages demo and this repository's H5 preview, in isolated contexts.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),path=require('node:path');
async function main(){
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const errors=[],admin=await browser.newPage({viewport:{width:1440,height:1100}});
  admin.on('pageerror',e=>errors.push(e.message));
  await admin.goto((process.env.SCENARIO_ADMIN_URL||'http://127.0.0.1:5207')+'/#/dashboard');
  await admin.locator('input[autocomplete=username]').fill('demo');
  await admin.locator('input[autocomplete=current-password]').fill('Demo@123456');
  await admin.locator('.login-submit').click();await admin.locator('.station-map-card').waitFor();
  const url=await admin.evaluate(()=>performance.getEntriesByType('resource').map(e=>e.name).find(s=>new URL(s).pathname==='/src/domain/store.js'));
  const counts=await admin.evaluate(async url=>{const {db}=await import(url);return {stations:db.stations.length,devices:db.devices.length,sockets:db.sockets.length}},url);
  assert.deepEqual(counts,{stations:16,devices:365,sockets:730});
  await admin.getByLabel('选择地图站点',{exact:true}).selectOption('ST07');
  await admin.getByText('医院职工停车区一号示例站',{exact:true}).first().waitFor();
  await admin.getByText(/虚构演示站点及模拟规划坐标/).waitFor();
  await admin.screenshot({path:path.join(__dirname,'scenario-admin.png'),fullPage:true});
  const mobile=await browser.newPage({viewport:{width:390,height:844}});
  mobile.on('pageerror',e=>errors.push(e.message));
  await mobile.goto((process.env.SCENARIO_MOBILE_URL||'http://127.0.0.1:5198')+'/#/pages/home/index');
  await mobile.locator('.station-card').first().waitFor();assert.equal(await mobile.locator('.station-card').count(),16);
  for(const scene of ['医院','住宅小区','产业园区','办公区','商业配套']){
   await mobile.locator('.scene-filters').getByText(scene,{exact:true}).click();
   assert.equal(await mobile.locator('.station-card').count(),2,scene);
  }
  await mobile.locator('.scene-filters').getByText('医院',{exact:true}).click();
  await mobile.screenshot({path:path.join(__dirname,'scenario-mobile.png'),fullPage:true});
  assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await mobile.locator('.station-card').first().click();await mobile.locator('.row-device-grid').waitFor();
  assert.match(await mobile.locator('body').innerText(),/虚构演示站点/);
  assert.equal(await mobile.locator('.device-card').count(),12);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({counts,filteredScenes:5,mobilePerScene:2,pageErrors:errors}));
 }finally{await browser.close()}
}
main().catch(e=>{console.error(e);process.exitCode=1});
