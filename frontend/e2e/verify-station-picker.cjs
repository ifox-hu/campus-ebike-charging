// Uses a real AMap SDK; no map or service responses are replaced with fixtures.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const base=process.env.STATION_PICKER_URL||'http://127.0.0.1:5231/';
const connected=process.env.STATION_PICKER_CONNECTED==='true';
async function main(){
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[];
 const artifact=path.join(__dirname,'artifacts');fs.mkdirSync(artifact,{recursive:true});
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'#/stations');
  async function login(){
   if(connected){await page.locator('input[autocomplete=username]').fill('graduation_admin');await page.locator('input[autocomplete=current-password]').fill('DemoAdmin2027!');}
   else await page.getByRole('button',{name:'填入演示账号',exact:true}).click();
   await page.locator('.login-submit').click();
  }
  await login();
  await page.locator('.navigation .nav-item').filter({hasText:'站点管理'}).click();
  await page.locator('.management-table tbody tr').first().getByRole('button',{name:'编辑',exact:true}).click();
  await page.getByRole('button',{name:'地图选点',exact:true}).waitFor({timeout:5000});
  const form=page.locator(connected?'.connected-editor':'.entity-form'),latitude=form.getByLabel(/纬度/),longitude=form.getByLabel(/经度/);
  const original={lat:await latitude.inputValue(),lng:await longitude.inputValue(),address:await form.getByLabel(/^地址/).inputValue()};
  const open=async()=>{await page.getByRole('button',{name:'地图选点',exact:true}).click();await page.locator('.location-map-badge').waitFor({timeout:35000});};
  const clickMap=async()=>{const area=await page.locator('.location-map').boundingBox();await page.mouse.click(area.x+area.width*.7,area.y+area.height*.6);};
  await open();const initial=await page.locator('.location-coordinates').innerText();await clickMap();
  await page.waitForFunction(text=>document.querySelector('.location-coordinates')?.textContent!==text,initial);
  await page.getByRole('button',{name:'取消选点',exact:true}).click();
  assert.equal(await latitude.inputValue(),original.lat);assert.equal(await longitude.inputValue(),original.lng);assert.equal(await form.getByLabel(/^地址/).inputValue(),original.address);
  await open();await clickMap();const beforeDrag=await page.locator('.location-coordinates').innerText(),pin=await page.locator('.location-pin').boundingBox();
  await page.mouse.move(pin.x+pin.width/2,pin.y+pin.height/2);await page.mouse.down();await page.mouse.move(pin.x+pin.width/2+55,pin.y+pin.height/2+25,{steps:12});await page.mouse.up();
  await page.waitForFunction(text=>document.querySelector('.location-coordinates')?.textContent!==text,beforeDrag);
  await page.getByLabel('搜索选址地点',{exact:true}).fill('南阳师范学院');
  await page.getByRole('button',{name:'搜索地点',exact:true}).waitFor();
  await page.waitForFunction(()=>!document.querySelector('.location-search button')?.disabled);
  await page.getByLabel('搜索选址地点',{exact:true}).press('Enter');
  await page.locator('.location-results button').first().waitFor({timeout:20000});await page.locator('.location-results button').first().click();
  await page.waitForFunction(()=>!document.querySelector('.location-selection')?.textContent.includes('正在解析附近地址'));
  const chosen=await page.locator('.location-coordinates').innerText();
  await page.locator('.location-workspace').screenshot({path:path.join(artifact,'station-map-picker.png')});
  await page.getByRole('button',{name:'使用此位置',exact:true}).click();
  const saved={lat:await latitude.inputValue(),lng:await longitude.inputValue()};assert.ok(chosen.includes(saved.lat)&&chosen.includes(saved.lng));
  await form.getByRole('button',{name:connected?'保存到服务端':'保存',exact:true}).click();await form.waitFor({state:'detached'});
  await page.reload();if(connected){await login();await page.locator('.navigation .nav-item').filter({hasText:'站点管理'}).click();}await page.locator('.management-table tbody tr').first().getByRole('button',{name:'编辑',exact:true}).click();
  assert.equal(await latitude.inputValue(),saved.lat);assert.equal(await longitude.inputValue(),saved.lng);
  await form.getByRole('button',{name:'取消',exact:true}).click();
  await page.getByRole('button',{name:/新增站点/}).click();await open();
  assert.equal(await page.locator('.location-coordinates').count(),0);assert.equal(await page.getByRole('button',{name:'使用此位置',exact:true}).isEnabled(),false);
  await clickMap();await page.locator('.location-coordinates').waitFor();await page.getByRole('button',{name:'使用此位置',exact:true}).click();assert.ok(await latitude.inputValue());
  await form.getByRole('button',{name:'取消',exact:true}).click();
  await page.setViewportSize({width:390,height:844});await page.locator('.management-table tbody tr').first().getByRole('button',{name:'编辑',exact:true}).click();await open();
  assert.ok(await page.locator('.modal-card').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'picker must fit the dialog');
  await page.locator('.modal-card').screenshot({path:path.join(artifact,'station-map-picker-mobile.png')});
  if(!connected){
   const offline=await browser.newPage();await offline.route('https://webapi.amap.com/maps*',route=>route.abort());
   try{
    await offline.goto(base+'#/stations');await offline.getByRole('button',{name:'填入演示账号',exact:true}).click();await offline.locator('.login-submit').click();
    await offline.locator('.navigation .nav-item').filter({hasText:'站点管理'}).click();await offline.locator('.management-table tbody tr').first().getByRole('button',{name:'编辑',exact:true}).click();
    const input=offline.locator('.entity-form').getByLabel(/纬度/),original=await input.inputValue();
    await offline.getByRole('button',{name:'地图选点',exact:true}).click();await offline.locator('.location-error').waitFor();
    assert.equal(await offline.getByRole('button',{name:'使用此位置',exact:true}).isEnabled(),false);
    await offline.getByRole('button',{name:'取消选点',exact:true}).click();assert.equal(await input.inputValue(),original);await input.fill('32.976100');assert.equal(await input.inputValue(),'32.976100');
   }finally{await offline.close();}
  }
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({connected,realAmap:true,mapClick:true,markerDrag:true,placeSearch:true,cancelPreservesForm:true,confirmAndPersist:true,newStation:true,mobileFits:true,networkFailureAllowsManualEntry:!connected,pageErrors:errors}));
 }catch(e){await page.screenshot({path:path.join(artifact,'station-picker-failed.png'),fullPage:true});throw e;}finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
