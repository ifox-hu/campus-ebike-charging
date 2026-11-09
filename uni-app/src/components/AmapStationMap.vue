<template>
 <view class="amap-station-map">
  <view :id="containerId" class="amap-canvas" role="region" aria-label="高德站点地图"/>
  <view v-if="loading||error" class="amap-status"><text>{{error||'正在加载高德地图…'}}</text><button v-if="error" class="amap-retry" @click="initialize">重新加载地图</button></view>
 </view>
</template>
<script>
let nextMapId=0;
</script>
<script setup>
import {onMounted,onBeforeUnmount,ref,watch} from 'vue';
import {createStationMap,loadAmap} from '../domain/amap.mjs';
const props=defineProps({station:{type:Object,required:true},resetVersion:Number});
const containerId=`amap-station-${++nextMapId}`,loading=ref(true),error=ref('');
let view=null,disposed=false,attempt=0;
async function initialize(){
 const request=++attempt;loading.value=true;error.value='';
 try{
  const AMap=await loadAmap(import.meta.env.VITE_AMAP_WEB_KEY);
  if(disposed||request!==attempt)return;
  view?.destroy();view=createStationMap(AMap,containerId,props.station);
 }catch{if(!disposed&&request===attempt)error.value='高德地图加载失败，请检查网络和地图配置，可使用下方导航入口。';}
 finally{if(!disposed&&request===attempt)loading.value=false;}
}
watch(()=>props.station,s=>{if(view)view.select(s);},{deep:true});
watch(()=>props.resetVersion,()=>{if(view&&!error.value)view.recenter();else initialize();});
onMounted(initialize);
onBeforeUnmount(()=>{disposed=true;attempt++;view?.destroy();view=null;});
</script>
<style scoped>
.amap-station-map,.amap-canvas{width:100%;height:100%}.amap-station-map{position:relative;background:#edf3f3}.amap-status{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;padding:20px;text-align:center;font-size:13px;color:#52676b;background:#f0f5f5}.amap-retry{font-size:13px;color:#167b85;background:#fff;padding:0 14px}
</style>
