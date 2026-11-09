<template>
 <view class="real-station-map" :class="{compact}">
  <view v-if="locations.length" class="map-picker"><picker :range="locations" range-key="name" :value="index" @change="index=Number($event.detail.value)"><view class="map-picker-label">{{selected.name}} <text>切换站点 ▾</text></view></picker></view>
  <view v-if="!selected" class="map-unavailable">暂无可显示的站点坐标<text>请在后台填写经纬度和坐标系；不会用虚构位置代替。</text></view>
  <template v-else>
   <view class="map-viewport">
   <!-- #ifdef H5 -->
   <view class="station-map-frame"><AmapStationMap :station="selected" :reset-version="resetVersion"/></view>
   <button class="map-recenter" aria-label="回到当前站点" title="回到当前站点" @click.stop="recenter"><text class="recenter-icon">◎</text><text>回到站点</text></button>
   <!-- #endif -->
   <!-- #ifdef MP-WEIXIN -->
   <map v-if="nativeMounted" :key="mapKey" class="station-native-map" :latitude="nativePosition.latitude" :longitude="nativePosition.longitude" :markers="markers" :scale="17" @markertap="selectMarker" @error="failed=true">
    <cover-view class="map-recenter" aria-label="回到当前站点" @tap.stop="recenter">◎ 回到站点</cover-view>
   </map>
   <view v-if="failed" class="map-unavailable">地图加载失败，请检查小程序地图配置。</view>
   <!-- #endif -->
   </view>
   <view class="map-location-card"><text class="station-name">{{selected.name}}</text><text class="block muted small">{{selected.address}}</text><text class="block muted small">{{selected.coordinateType}} · {{Number(selected.longitude).toFixed(6)}}, {{Number(selected.latitude).toFixed(6)}}</text>
    <view class="map-location-actions"><button v-if="!compact" class="primary turquoise" @click="$emit('open',selected)">查看站点</button>
     <!-- #ifdef H5 -->
     <a class="map-navigation-link" :href="navigation" target="_blank" rel="noopener noreferrer">查看位置 / 导航</a>
     <!-- #endif -->
     <!-- #ifdef MP-WEIXIN -->
     <button class="text-button" @click="navigate">查看位置 / 导航</button>
     <!-- #endif -->
    </view>
   </view>
  </template>
  <text class="map-source-note">底图为真实地理信息，站点以平台维护坐标为准。演示站点不代表实际安装设备。底图未显示时可打开导航查看。</text>
 </view>
</template>
<script setup>
import {computed,nextTick,ref,watch} from 'vue';
import {stationPosition,navigationUrl,wgsToGcj} from '../domain/location.mjs';
// #ifdef H5
import AmapStationMap from './AmapStationMap.vue';
// #endif
const props=defineProps({stations:{type:Array,default:()=>[]},compact:Boolean});defineEmits(['open']);
const index=ref(0),failed=ref(false);
const locations=computed(()=>props.stations.filter(s=>stationPosition(s)));
const selected=computed(()=>locations.value[index.value]||locations.value[0]);
const resetVersion=ref(0),nativeMounted=ref(true);
const mapKey=computed(()=>`${selected.value?.id}:${selected.value?.latitude}:${selected.value?.longitude}:${resetVersion.value}`);
const recenter=async()=>{failed.value=false;resetVersion.value++;nativeMounted.value=false;await nextTick();nativeMounted.value=true;};
watch(selected,()=>{failed.value=false;});watch(()=>locations.value.length,n=>{if(index.value>=n)index.value=0;});
const navigation=computed(()=>selected.value?navigationUrl(selected.value):null);
const asNative=s=>{const p=stationPosition(s);return p.type==='WGS84'?wgsToGcj(p):p;};
const nativePosition=computed(()=>selected.value?asNative(selected.value):null);
const markers=computed(()=>locations.value.map((s,i)=>({id:i+1,...asNative(s),title:s.name,width:30,height:38,iconPath:'/static/pin.png'})));
const selectMarker=e=>{index.value=Math.max(0,Number(e.detail.markerId)-1);};
const navigate=()=>{const s=selected.value,p=nativePosition.value;if(p)uni.openLocation({latitude:p.latitude,longitude:p.longitude,name:s.name,address:s.address,fail:()=>uni.showToast({title:'未能打开地图，请检查配置',icon:'none'})});};
</script>
<style scoped>
.map-viewport{position:relative}.map-recenter{position:absolute;right:12px;bottom:42px;z-index:2;display:flex;align-items:center;justify-content:center;gap:5px;height:40px;line-height:40px;margin:0;padding:0 12px;background:#fff;color:#167b85;border:1px solid #d9e5e7;border-radius:8px;box-shadow:0 2px 8px #22334426;font-size:12px;font-weight:600;cursor:pointer}.map-recenter::after{border:0}.recenter-icon{font-size:23px;font-weight:400}.map-recenter:active{background:#edf8f8}
.real-station-map{background:#fff;margin:10px 12px 24px;border-radius:12px;overflow:hidden}.map-picker{padding:14px;border-bottom:1px solid #eee}.map-picker-label{font-size:15px;line-height:1.7}.map-picker-label text{float:right;color:#169ea7;font-size:12px}.station-map-frame,.station-native-map{display:block;width:100%;height:340px;border:0;background:#edf3f3}.compact .station-map-frame,.compact .station-native-map{height:230px}.map-unavailable{padding:35px 15px;text-align:center;color:#777;line-height:1.8}.map-unavailable text{display:block;font-size:12px}.map-location-card{padding:16px;line-height:1.8}.map-location-card .station-name{display:block;font-size:16px}.map-location-actions{display:flex;align-items:center;gap:14px;margin-top:12px;flex-wrap:wrap}.map-location-actions .primary{font-size:14px;min-height:40px;padding:8px 18px}.map-navigation-link{color:#118c98;font-size:14px;text-decoration:none}.map-source-note{display:block;padding:0 14px 14px;font-size:11px;line-height:1.7;color:#888}
</style>
