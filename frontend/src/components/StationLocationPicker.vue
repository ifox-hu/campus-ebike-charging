<script setup>
import {nextTick,onBeforeUnmount,ref} from 'vue'
import {loadAmap} from '../services/amap.js'
import {stationPosition} from '../domain/stationMap.js'

const props=defineProps({latitude:[Number,String],longitude:[Number,String],address:String,coordinateType:{type:String,default:'GCJ02'},fallbackPosition:Array,disabled:Boolean})
const emit=defineEmits(['select'])
const opened=ref(false),container=ref(null),loading=ref(false),ready=ref(false),servicesReady=ref(false)
const position=ref(null),address=ref(''),keyword=ref(''),results=ref([]),searching=ref(false),resolving=ref(false),error=ref(''),notice=ref('')
let sdk,map,marker,geocoder,searchService,session=0,lookupVersion=0,searchVersion=0
let pluginTimer,lookupTimer,searchTimer,tileTimer
const isCurrent=version=>opened.value&&version===session
function coordinates(value){
 if(!value)return null
 const lng=typeof value.getLng==='function'?value.getLng():value[0]??value.lng
 const lat=typeof value.getLat==='function'?value.getLat():value[1]??value.lat
 return stationPosition({lng,lat,coordinateType:'GCJ02'})
}
function destroy(){
 session++;lookupVersion++;searchVersion++
 for(const timer of [pluginTimer,lookupTimer,searchTimer,tileTimer])clearTimeout(timer)
 marker?.off('dragend',dragged);map?.off('click',clicked);map?.destroy()
 map=marker=geocoder=searchService=null
 ready.value=false;servicesReady.value=false;loading.value=false;searching.value=false;resolving.value=false
}
function close(){opened.value=false;destroy()}
function reverseLookup(point){
 const version=++lookupVersion,current=session;clearTimeout(lookupTimer)
 address.value='';notice.value=''
 if(!geocoder){notice.value='可先使用坐标，地址可在表单中填写。';return}
 resolving.value=true
 lookupTimer=setTimeout(()=>{if(isCurrent(current)&&version===lookupVersion){resolving.value=false;notice.value='地址解析超时，可保留坐标并手动填写地址。'}},8000)
 geocoder.getAddress(point,(status,result)=>{
  if(!isCurrent(current)||version!==lookupVersion)return
  clearTimeout(lookupTimer);resolving.value=false
  if(status==='complete'&&result.regeocode?.formattedAddress)address.value=result.regeocode.formattedAddress
  else notice.value='未能解析地址，可保留坐标并手动填写地址。'
 })
}
function choose(value,focus=false){
 const point=coordinates(value);if(!point||!map)return
 searchVersion++;clearTimeout(searchTimer);searching.value=false
 position.value=point;results.value=[]
 if(!marker){
  const pin=document.createElement('div');pin.className='location-pin';pin.title='拖动调整站点位置';pin.textContent='●'
  marker=new sdk.Marker({position:point,draggable:true,cursor:'move',anchor:'center',content:pin,title:'站点选址标记'})
  map.add(marker);marker.on('dragend',dragged)
 }else marker.setPosition(point)
 if(focus)map.setZoomAndCenter(17,point)
 reverseLookup(point)
}
function clicked(event){choose(event.lnglat)}
function dragged(event){choose(event.lnglat||marker?.getPosition())}
async function open(){
 destroy();opened.value=true;loading.value=true;error.value='';notice.value='';results.value=[];keyword.value=''
 const current=session
 position.value=stationPosition({lat:props.latitude,lng:props.longitude,coordinateType:props.coordinateType})
 address.value=position.value?props.address||'':''
 try{
  sdk=await loadAmap({key:import.meta.env.VITE_AMAP_KEY,securityCode:import.meta.env.VITE_AMAP_SECURITY_CODE})
  await nextTick();if(!isCurrent(current))return
  map=new sdk.Map(container.value,{center:position.value||coordinates(props.fallbackPosition)||[112.489,32.976],zoom:17,viewMode:'2D',resizeEnable:true,dragEnable:true,scrollWheel:true})
  map.addControl(new sdk.Scale());map.on('click',clicked)
  map.on('complete',()=>{if(isCurrent(current)){ready.value=true;loading.value=false;clearTimeout(tileTimer)}})
  tileTimer=setTimeout(()=>{if(isCurrent(current)&&!ready.value){loading.value=false;error.value='地图底图加载超时，请检查网络后重试；也可以手动填写坐标。'}},15000)
  if(position.value){const savedAddress=address.value;choose(position.value);address.value=savedAddress;notice.value=''}
  pluginTimer=setTimeout(()=>{if(isCurrent(current)&&!servicesReady.value)notice.value='地点搜索暂不可用，仍可点击地图选点并手动填写地址。'},10000)
  sdk.plugin(['AMap.PlaceSearch','AMap.Geocoder'],()=>{
   if(!isCurrent(current))return
   clearTimeout(pluginTimer);searchService=new sdk.PlaceSearch({pageSize:5,citylimit:false});geocoder=new sdk.Geocoder({radius:200,extensions:'base'});servicesReady.value=true
  })
 }catch(e){if(isCurrent(current)){error.value=e.message;loading.value=false}}
}
function search(){
 if(!searchService||!keyword.value.trim())return
 const version=++searchVersion,current=session;clearTimeout(searchTimer);searching.value=true;results.value=[];notice.value=''
 searchTimer=setTimeout(()=>{if(isCurrent(current)&&version===searchVersion){searching.value=false;notice.value='地点搜索超时，请重试或直接在地图上选点。'}},10000)
 searchService.search(keyword.value.trim(),(status,result)=>{
  if(!isCurrent(current)||version!==searchVersion)return
  clearTimeout(searchTimer);searching.value=false
  results.value=status==='complete'?(result.poiList?.pois||[]).filter(p=>coordinates(p.location)):[]
  if(!results.value.length)notice.value=['complete','no_data'].includes(status)?'未找到地点，请尝试更具体的名称或城市。':'地点搜索暂不可用，请重试或直接在地图上选点。'
 })
}
function confirm(){
 if(!position.value||!ready.value||props.disabled||resolving.value)return
 emit('select',{longitude:position.value[0],latitude:position.value[1],address:address.value,coordinateType:'GCJ02'})
 close()
}
onBeforeUnmount(close)
</script>

<template>
 <section class="location-picker">
  <div class="location-entry"><button class="outline-button" type="button" :disabled="disabled" :aria-expanded="opened" @click="opened?close():open()">地图选点</button><span>点击地图或拖动标记，确认后回填坐标与地址。</span></div>
  <section v-if="opened" class="location-workspace" aria-label="站点地图选址" @keydown.esc.stop.prevent="close">
   <div class="location-search"><input v-model="keyword" aria-label="搜索选址地点" placeholder="输入学校、小区、园区或详细地点" maxlength="100" @keydown.enter.prevent="search"/><button class="outline-button" type="button" :disabled="!servicesReady||searching||!keyword.trim()" @click="search">{{searching?'搜索中…':'搜索地点'}}</button></div>
   <p v-if="error" class="location-error" role="alert">{{error}} <button class="text-button" type="button" @click="open">重试地图</button></p>
   <div v-if="results.length" class="location-results" aria-label="选址搜索结果"><button v-for="(poi,i) in results" :key="poi.id||i" type="button" @click="choose(poi.location,true)"><strong>{{poi.name}}</strong><small>{{poi.pname}} {{poi.cityname}} {{poi.adname}} {{typeof poi.address==='string'?poi.address:''}}</small></button></div>
   <div class="location-map-stage"><div ref="container" class="location-map" aria-label="选点地图"/><div v-if="loading" class="location-loading" role="status">正在加载高德地图…</div><span v-if="ready" class="location-map-badge">高德地图 · GCJ-02</span></div>
   <div class="location-selection" aria-live="polite"><strong>{{position?'已选位置':'请点击地图选择站点位置'}}</strong><output v-if="position" class="location-coordinates">纬度 {{position[1].toFixed(6)}} · 经度 {{position[0].toFixed(6)}}</output><span v-if="resolving">正在解析附近地址…</span><span v-else-if="address">{{address}}</span><span v-if="notice" class="location-notice">{{notice}}</span></div>
   <div class="location-actions"><button class="outline-button" type="button" @click="close">取消选点</button><button class="soft-button active" type="button" :disabled="!position||!ready||disabled||resolving" @click="confirm">使用此位置</button></div>
  </section>
 </section>
</template>

<style scoped>
.location-picker{grid-column:1/-1;min-width:0}.location-entry{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.location-entry span{font-size:12px;color:#9694a6;line-height:1.7}.location-workspace{margin-top:12px;border:1px solid #dfdced;border-radius:10px;background:#fafaff;overflow:hidden}.location-search{display:flex;gap:8px;padding:12px}.location-search input{flex:1;min-width:0;height:38px;border:1px solid #dedbea;border-radius:5px;padding:0 10px;font:inherit;font-size:13px}.location-search button{font-size:13px}.location-map-stage{height:310px;position:relative;background:#eef0f5}.location-map{position:absolute;inset:0}.location-loading{position:absolute;inset:0;display:grid;place-items:center;background:#f2f2f8ee;color:#80799d;font-size:13px}.location-map-badge{position:absolute;right:10px;bottom:12px;background:#fffffff0;border-radius:5px;padding:5px 8px;color:#7b729a;font-size:11px;pointer-events:none}.location-selection{padding:12px;display:flex;flex-direction:column;gap:7px;font-size:12px;line-height:1.7;color:#777387;overflow-wrap:anywhere}.location-selection strong{font-size:13px;color:#665b8e}.location-coordinates{font-variant-numeric:tabular-nums;color:#6e61c3}.location-notice{color:#a28658}.location-actions{display:flex;justify-content:flex-end;gap:10px;padding:0 12px 12px}.location-actions button{font-size:13px}.location-results{display:grid;gap:5px;padding:0 12px 12px;max-height:160px;overflow:auto}.location-results button{border:1px solid #e5e1ee;border-radius:6px;background:#fff;text-align:left;padding:8px 10px;color:#71658e;font:inherit;cursor:pointer}.location-results strong,.location-results small{display:block;line-height:1.6;font-size:12px}.location-results small{font-size:11px;color:#999}.location-error{padding:0 12px;font-size:12px;line-height:1.7;color:#aa646c}.location-map :deep(.location-pin){width:32px;height:32px;border:3px solid white;background:#7964e5;color:white;border-radius:50%;box-shadow:0 2px 10px #43316b70;display:grid;place-items:center;font-size:15px;cursor:move;box-sizing:border-box}.location-picker button:disabled{opacity:.5;cursor:default}@media(max-width:520px){.location-map-stage{height:260px}.location-search{flex-wrap:wrap}.location-search input{width:100%;flex-basis:100%}.location-search button{width:100%}}
</style>
