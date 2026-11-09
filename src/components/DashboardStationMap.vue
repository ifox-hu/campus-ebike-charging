<script setup>
import {computed,nextTick,onMounted,onBeforeUnmount,ref,watch} from 'vue'
import {buildStationMapRows,filterMapStations,projectMapStations} from '../domain/stationMap.js'
import {loadAmap} from '../services/amap.js'

const props=defineProps({source:{type:Object,required:true}})
const emit=defineEmits(['navigate'])
const query=ref(''),status=ref('all'),selectedId=ref(''),container=ref(null),loading=ref(false),mode=ref('diagram'),error=ref('')
const rows=computed(()=>buildStationMapRows(props.source))
const visible=computed(()=>filterMapStations(rows.value,query.value,status.value))
const located=computed(()=>visible.value.filter(s=>s.position)),diagram=computed(()=>projectMapStations(visible.value))
const selected=computed(()=>visible.value.find(s=>s.id===selectedId.value))
const total=key=>visible.value.reduce((n,s)=>n+s[key],0)
const stateText=s=>({idle:'运行正常',charging:'正在充电',alert:'有异常待关注',disabled:'站点已停用'})[s.tone]
let map=null,sdk=null,markers=[],disposed=false,version=0,tileTimer=null
function destroyMap(){
 clearTimeout(tileTimer);tileTimer=null
 for(const item of markers)item.button.onclick=null
 markers=[]
 if(map){map.destroy();map=null}
}
function fallback(message,token){
 if(disposed||token!==version)return
 destroyMap();mode.value='diagram';loading.value=false;error.value=message
}
function updateSelection(focus=true){
 for(const item of markers){const active=item.id===selectedId.value;item.button.classList.toggle('is-selected',active);item.button.setAttribute('aria-pressed',String(active))}
 if(focus&&map&&selected.value?.position)map.setZoomAndCenter(16,selected.value.position)
}
function fitAll(){if(map&&markers.length)map.setFitView(markers.map(m=>m.marker),true,[65,55,65,55],16)}
function redraw(){
 if(!map||!sdk)return
 if(markers.length){map.remove(markers.map(m=>m.marker));for(const item of markers)item.button.onclick=null}
 markers=located.value.map(s=>{
  const button=document.createElement('button');button.type='button';button.className=`station-marker tone-${s.tone}`
  button.setAttribute('aria-label',`选择站点 ${s.name}`)
  const name=document.createElement('strong');name.textContent=s.name
  const count=document.createElement('span');count.textContent=`空闲 ${s.free} / ${s.socketCount}`
  button.append(name,count);button.onclick=()=>{selectedId.value=s.id}
  const marker=new sdk.Marker({position:s.position,anchor:'bottom-center',content:button,title:s.name})
  map.add(marker);return {id:s.id,marker,button}
 })
 updateSelection(!!selected.value);if(!selected.value)fitAll()
}
async function initialize(){
 const token=++version;destroyMap();error.value=''
 if(!located.value.length){mode.value='diagram';loading.value=false;return}
 loading.value=true;mode.value='map'
 try{
  sdk=await loadAmap({key:import.meta.env.VITE_AMAP_KEY,securityCode:import.meta.env.VITE_AMAP_SECURITY_CODE})
  await nextTick();if(disposed||token!==version)return
  map=new sdk.Map(container.value,{center:located.value[0].position,zoom:15,viewMode:'2D',resizeEnable:true})
  map.addControl(new sdk.Scale());map.addControl(new sdk.ToolBar({position:'LB'}))
  tileTimer=setTimeout(()=>fallback('地图底图暂未加载，已保留站点分布示意与详情操作',token),15000)
  map.on('complete',()=>{if(disposed||token!==version)return;clearTimeout(tileTimer);loading.value=false;error.value=''})
  redraw()
 }catch(e){fallback(e.message||'地图暂不可用',token)}
}
async function showAll(){query.value='';status.value='all';selectedId.value='';await nextTick();fitAll()}
function navigate(page){if(selected.value)emit('navigate',{page,stationId:selected.value.id})}
watch(selectedId,()=>updateSelection())
watch(visible,()=>{if(selectedId.value&&!selected.value)selectedId.value='';redraw()})
onMounted(initialize)
onBeforeUnmount(()=>{disposed=true;version++;destroyMap()})
</script>

<template>
 <section class="plot-card station-map-card" aria-label="首页站点分布">
  <header class="plot-heading map-heading"><div><h2>站点分布</h2><p>从站点位置查看设备运行情况，再进入设备排布和报修处理。</p></div><span class="map-source">本地模拟数据</span></header>
  <div class="map-toolbar">
   <label class="map-search"><span>查找站点</span><input v-model="query" type="search" placeholder="站点名称、地址或编号" aria-label="地图搜索站点"/></label>
   <select v-model="status" aria-label="地图筛选状态"><option value="all">全部状态</option><option value="idle">有空闲插座</option><option value="alert">有异常</option><option value="disabled">已停用</option></select>
   <button class="outline-button" type="button" @click="showAll">查看全部站点</button>
   <span class="map-result-count" role="status">{{visible.length}} 个站点 · {{located.length}} 个可定位</span>
  </div>
  <div class="station-map-workspace">
   <div class="map-stage">
    <div ref="container" v-show="mode==='map'" class="amap-stage" aria-label="站点位置地图"/>
    <div v-if="mode==='diagram'" class="map-diagram" aria-label="站点坐标分布示意">
     <div class="diagram-grid"/><div class="diagram-water"/><div class="diagram-road road-one"/><div class="diagram-road road-two"/>
     <span class="diagram-area">站点分布示意</span>
     <button v-for="s in diagram" :key="s.id" type="button" :class="['station-marker',`tone-${s.tone}`,{'is-selected':s.id===selectedId}]" :style="{left:s.x+'%',top:s.y+'%'}" :aria-label="'选择站点 '+s.name" :aria-pressed="s.id===selectedId" @click="selectedId=s.id"><strong>{{s.name}}</strong><span>空闲 {{s.free}} / {{s.socketCount}}</span></button>
     <small class="diagram-caption">按已保存坐标绘制 · 非地图底图</small>
    </div>
    <div v-if="loading" class="map-loading" role="status"><span/>正在加载地图…</div>
    <div v-if="!visible.length" class="map-empty"><strong>{{rows.length?'没有匹配站点':'暂无站点'}}</strong><span>{{rows.length?'请更换关键词或筛选条件':'新增站点后将显示在这里'}}</span><button v-if="rows.length" class="text-button" @click="showAll">清空筛选</button></div>
    <div v-else-if="!located.length" class="map-empty"><strong>当前站点暂无有效坐标</strong><span>仍可在右侧选择站点查看设备与报修</span></div>
    <div class="map-legend" aria-label="站点状态图例"><span><i class="idle"/>正常</span><span><i class="charging"/>充电中</span><span><i class="alert"/>有异常</span><span><i class="disabled"/>停用</span></div>
   </div>
   <aside class="station-map-details" aria-label="地图站点详情">
    <label class="map-station-picker">查看站点<select v-model="selectedId" aria-label="选择地图站点"><option value="">全部站点概况</option><option v-for="s in visible" :key="s.id" :value="s.id">{{s.name}}{{s.position?'':'（未定位）'}}</option></select></label>
    <template v-if="selected">
     <div class="selected-station-heading"><span :class="['map-state',selected.tone]">{{stateText(selected)}}</span><h3>{{selected.name}}</h3><p>{{selected.address||'尚未填写地址'}}</p></div>
     <dl class="station-map-numbers"><div><dt>设备总数</dt><dd>{{selected.deviceCount}}<small>台</small></dd></div><div><dt>插座总数</dt><dd>{{selected.socketCount}}<small>个</small></dd></div><div><dt>空闲插座</dt><dd class="free-number">{{selected.free}}<small>个</small></dd></div><div><dt>充电中</dt><dd>{{selected.charging}}<small>个</small></dd></div></dl>
     <div class="station-attention"><span>启动中 <b>{{selected.starting}}</b></span><span>故障插座 <b>{{selected.fault}}</b></span><span>异常占用 <b>{{selected.abnormal}}</b></span><span>离线设备 <b>{{selected.offlineDevices}}</b></span><span>待处理报修 <b>{{selected.pendingRepairs}}</b></span></div>
     <p class="station-map-position">{{selected.position?'GCJ-02 · '+selected.position[0].toFixed(5)+', '+selected.position[1].toFixed(5):'坐标缺失或坐标系未确认，请在站点管理中核对。'}}</p>
     <div class="station-map-actions"><button class="soft-button active" @click="navigate('devices')">查看设备排布</button><button class="outline-button" @click="navigate('reports')">查看报修 <span v-if="selected.pendingRepairs">({{selected.pendingRepairs}})</span></button></div>
    </template>
    <template v-else>
     <div class="selected-station-heading"><span class="map-state idle">当前筛选范围</span><h3>全部站点概况</h3><p>点击地图标记或选择站点，查看运行情况。</p></div>
     <dl class="station-map-numbers"><div><dt>站点数量</dt><dd>{{visible.length}}<small>个</small></dd></div><div><dt>设备数量</dt><dd>{{total('deviceCount')}}<small>台</small></dd></div><div><dt>空闲插座</dt><dd class="free-number">{{total('free')}}<small>个</small></dd></div><div><dt>充电中</dt><dd>{{total('charging')}}<small>个</small></dd></div></dl>
     <div class="station-attention"><span>故障插座 <b>{{total('fault')}}</b></span><span>离线设备 <b>{{total('offlineDevices')}}</b></span><span>待处理报修 <b>{{total('pendingRepairs')}}</b></span></div>
     <p class="map-selection-help">选中站点后，可直接进入该站点的设备排布和报修记录。</p>
    </template>
   </aside>
  </div>
  <footer class="map-footnote"><span>示例站点及坐标仅用于软件演示，不代表实际部署。<template v-if="visible.length>located.length"> {{visible.length-located.length}} 个站点暂无有效坐标。</template></span><span v-if="error" class="map-error" role="status">{{error}} <button type="button" :disabled="loading" @click="initialize">重试地图</button></span></footer>
 </section>
</template>

<style scoped>
.station-map-card{height:auto;display:block;margin:0 0 1.7rem;overflow:hidden}.map-heading{height:auto;min-height:4.5rem;padding:1rem 1.4rem;display:flex;justify-content:space-between;align-items:center;gap:1rem}.map-heading p{margin:.35rem 0 0;color:#999;font-size:.78rem;line-height:1.6}.map-source{white-space:nowrap;background:#f0edff;color:#8881d7;border-radius:1rem;padding:.35rem .7rem;font-size:.72rem}.map-toolbar{display:flex;align-items:center;flex-wrap:wrap;gap:.7rem;padding:1rem 1.4rem;border-bottom:1px solid #eeedf6}.map-search{display:flex;align-items:center;gap:.7rem;font-size:.78rem;color:#888}.map-toolbar input,.map-toolbar select,.map-station-picker select{font:inherit;color:#666;border:1px solid #e8e6f2;border-radius:.45rem;background:#fff;min-height:2.25rem;padding:.4rem .65rem;outline:none}.map-toolbar input{width:15rem;font-size:.78rem}.map-toolbar input:focus,.map-toolbar select:focus,.map-station-picker select:focus{border-color:#9288ff}.map-toolbar select{font-size:.78rem}.map-result-count{margin-left:auto;font-size:.75rem;color:#999}.station-map-workspace{display:grid;grid-template-columns:minmax(0,7fr) minmax(260px,3fr)}.map-stage{position:relative;min-width:0;height:430px;overflow:hidden;background:#f1f4f7}.amap-stage,.map-diagram{position:absolute;inset:0}.map-diagram{overflow:hidden;background:#eef2f1}.diagram-grid{position:absolute;inset:0;background-image:linear-gradient(#fff9 1px,transparent 1px),linear-gradient(90deg,#fff9 1px,transparent 1px);background-size:36px 36px;transform:rotate(-12deg) scale(1.3)}.diagram-water{position:absolute;inset:-50% auto -50% 14%;width:12%;background:#d8eaf2;transform:rotate(28deg);border-left:5px solid #f9fcfb;border-right:5px solid #f9fcfb}.diagram-road{position:absolute;width:140%;height:12px;background:#fff9;box-shadow:0 0 0 1px #e3e7e4;left:-20%;top:46%;transform:rotate(-20deg)}.road-two{top:70%;transform:rotate(25deg)}.diagram-area{position:absolute;left:1rem;top:.8rem;color:#899c98;font-size:.72rem;letter-spacing:.1rem}.diagram-caption{position:absolute;left:1rem;bottom:.9rem;color:#7c898c;font-size:.65rem}.station-marker,.map-stage :deep(.station-marker){position:absolute;display:flex;flex-direction:column;align-items:flex-start;gap:.22rem;min-width:140px;max-width:190px;padding:.65rem .8rem;border:1px solid #ddd9f7;border-radius:.65rem;background:#fff;color:#5855ab;box-shadow:0 3px 14px #6877a21a;cursor:pointer;font:inherit;line-height:1.35;transform:translate(-50%,-100%);text-align:left;z-index:2}.map-stage :deep(.amap-stage .station-marker){position:relative;transform:none}.station-marker::after,.map-stage :deep(.station-marker::after){content:'';position:absolute;left:50%;bottom:-6px;width:10px;height:10px;transform:rotate(45deg);background:inherit;border-right:1px solid #ddd9f7;border-bottom:1px solid #ddd9f7}.station-marker strong,.map-stage :deep(.station-marker strong){font-size:12px;font-weight:600;overflow-wrap:anywhere}.station-marker span,.map-stage :deep(.station-marker span){font-size:11px;opacity:.8}.station-marker.is-selected,.map-stage :deep(.station-marker.is-selected){background:#7770ed;color:#fff;border-color:#7770ed;box-shadow:0 4px 16px #7568ed44;z-index:5}.station-marker.tone-alert:not(.is-selected),.map-stage :deep(.station-marker.tone-alert:not(.is-selected)){border-color:#edcea8;color:#ad7a38;background:#fffaf2}.station-marker.tone-disabled:not(.is-selected),.map-stage :deep(.station-marker.tone-disabled:not(.is-selected)){color:#93929b;background:#f7f7f9}.map-legend{position:absolute;bottom:.65rem;right:.7rem;display:flex;gap:.75rem;flex-wrap:wrap;background:#fffffff2;padding:.45rem .65rem;border-radius:.5rem;color:#888;font-size:.65rem;z-index:6}.map-legend span{display:flex;align-items:center;gap:.3rem}.map-legend i{width:7px;height:7px;border-radius:50%}.idle{background:#e9f8f3;color:#479a84}.charging{background:#f0edff;color:#8172d2}.alert{background:#fff3df;color:#b68b40}.disabled{background:#eeeef2;color:#92929c}.map-legend .idle{background:#50bea0}.map-legend .charging{background:#8a7df0}.map-legend .alert{background:#edb35e}.map-legend .disabled{background:#aba8b9}.station-map-details{border-left:1px solid #eeedf6;background:#ffffffb8;padding:1.1rem 1.3rem;min-width:0}.map-station-picker{display:flex;flex-direction:column;gap:.45rem;font-size:.72rem;color:#999}.map-station-picker select{width:100%;font-size:.76rem}.selected-station-heading{margin:1rem 0 .8rem}.map-state{display:inline-block;font-size:.66rem;padding:.2rem .5rem;border-radius:.25rem}.selected-station-heading h3{font-size:1.05rem;line-height:1.5;margin:.5rem 0 .3rem;color:#49465f;overflow-wrap:anywhere}.selected-station-heading p{font-size:.75rem;color:#999;line-height:1.6;margin:0}.station-map-numbers{display:grid;grid-template-columns:1fr 1fr;gap:.9rem;margin:.85rem 0}.station-map-numbers div{min-width:0}.station-map-numbers dt{font-size:.73rem;color:#999}.station-map-numbers dd{font-size:1.35rem;font-weight:600;color:#605e7b;margin:.2rem 0 0}.station-map-numbers dd.free-number{color:#6daea1}.station-map-numbers small{font-size:.65rem;font-weight:400;margin-left:.3rem;color:#aaa}.station-attention{display:flex;flex-wrap:wrap;gap:.45rem .75rem;font-size:.7rem;color:#9c9693;line-height:1.8}.station-attention b{font-weight:500;color:#ac8753;margin-left:.2rem}.station-map-position,.map-selection-help{font-size:.68rem;color:#aaa;line-height:1.7;margin:.6rem 0;overflow-wrap:anywhere}.station-map-actions{display:flex;gap:.55rem;flex-wrap:wrap;margin-top:.75rem}.station-map-actions button{font-size:.75rem}.map-footnote{padding:.7rem 1.4rem;display:flex;justify-content:space-between;gap:.6rem;flex-wrap:wrap;color:#aaa;font-size:.68rem;line-height:1.7;border-top:1px solid #f0eff7}.map-error{color:#ad946e}.map-error button{border:0;background:transparent;text-decoration:underline;color:#8c81dc;font:inherit;cursor:pointer}.map-loading,.map-empty{position:absolute;inset:0;display:flex;flex-direction:column;gap:.7rem;align-items:center;justify-content:center;background:#f3f5f8e6;color:#9594a4;font-size:.8rem;z-index:7}.map-empty{z-index:4}.map-empty strong{font-weight:500;color:#777}.map-empty span{font-size:.72rem;padding:0 1rem;text-align:center}.map-loading span{width:24px;height:24px;border:2px solid #e0dcfa;border-top-color:#8a7bdb;border-radius:50%;animation:map-spin 1s linear infinite}@keyframes map-spin{to{transform:rotate(360deg)}}.station-map-card button:focus-visible,.map-stage :deep(button:focus-visible){outline:2px solid #8b7df0;outline-offset:3px}@media(max-width:1150px){.station-map-workspace{grid-template-columns:minmax(0,6fr) minmax(250px,4fr)}.map-toolbar input{width:12rem}.map-result-count{margin-left:0}.map-heading{align-items:flex-start}}@media(max-width:820px){.station-map-workspace{grid-template-columns:1fr}.station-map-details{border-left:0;border-top:1px solid #eeedf6}.map-stage{height:350px}.map-toolbar{padding:1rem;gap:.6rem}.map-search{width:100%}.map-toolbar input{flex:1;width:0;min-width:0}.map-source{display:none}.station-map-numbers{grid-template-columns:repeat(4,minmax(0,1fr))}.map-legend{max-width:90%}.map-heading p{font-size:.72rem}}
.station-marker.tone-idle:not(.is-selected),.map-stage :deep(.station-marker.tone-idle:not(.is-selected)){border-color:#c9e8dc;color:#458b77;background:#f7fdf9}.station-marker.tone-charging:not(.is-selected),.map-stage :deep(.station-marker.tone-charging:not(.is-selected)){border-color:#d8d1fc;color:#8172c5;background:#faf8ff}
</style>
