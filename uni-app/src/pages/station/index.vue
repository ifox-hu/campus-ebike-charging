<template>
<view class="phone station-page">
 <view class="station-hero"><PageHeader title="站点详情" back transparent/><image class="hero-city" src="/static/station-city.png" mode="aspectFill"/></view>
 <view v-if="station" class="station-content"><ConnectionState/>
  <view class="panel station-info"><view class="station-name">{{station.name}}</view><view class="station-address">{{station.address}}</view><view class="station-small-meta"><text>{{isBackend?(station.enabled?'站点正常运营':'站点已停用'):'站点信息 · 测试数据'}}</text><text class="teal">{{station.area}} ◉</text></view></view>
  <StationMap v-if="isBackend" :stations="[station]" compact/>
  <view class="panel device-panel">
   <view class="socket-summary"><text class="teal-badge">插座</text><text>空闲<text class="summary-number">{{availableCount(station)}}</text>/{{totalCount(station)}} 个插座</text></view>
   <view class="section-row"><text class="section-title">设备排布</text><text class="muted">{{hasRows?rows.length+' 排 · ':''}}共 {{station.devices.length}} 台</text></view>
   <view class="layout-note">每台设备 A、B 两个插座，分别选择和计费。</view>
   <view v-if="hasNonDual" class="layout-warning">部分服务端设备不是双插座配置，以下按真实数量展示，需在后台核对设备配置。</view>
   <scroll-view scroll-x class="row-tabs"><view class="row-tabs-inner"><button v-for="row in rows" :key="row.id" :class="['row-tab',{selected:activeRow?.id===row.id}]" @click="selectedRow=row.id">{{row.name}} · {{row.devices.length}} 台</button></view></scroll-view>
   <view v-if="activeRow" class="row-caption">{{activeRow.name}} · {{activeRow.devices.length}} 台设备 · {{activeRow.devices.reduce((n,d)=>n+d.sockets.length,0)}} 个插座</view>
   <view v-if="activeRow" class="row-device-grid">
    <button v-for="d in activeRow.devices" :key="d.id" :class="['device-card','dual-device',{offline:!d.online}]" :aria-label="'查看设备 '+(d.code||d.id)" @click="openDevice(d)">
     <view class="device-top"><text>{{d.position?'第 '+String(d.position).padStart(2,'0')+' 台':'设备'}}</text><text :class="d.online?'online-status':'offline-status'">● {{d.enabled===false?'停用':d.online?'在线':'离线'}}</text></view>
     <text class="device-id">{{d.code||d.id}}</text>
     <view class="two-socket-view"><view v-for="(p,i) in d.sockets" :key="p.code" :class="['mini-socket',isDeviceAvailable(station,d)?p.status:'offline']"><text>{{p.label||String.fromCharCode(65+i)}}</text><text>{{socketStatus(d,p)}}</text></view></view>
     <view class="device-footer"><text>{{isDeviceAvailable(station,d)?d.sockets.filter(p=>p.status==='idle').length:0}} 空闲 / {{d.sockets.length}} 插座</text><text>选择 ›</text></view>
    </button>
   </view>
   <view v-if="!station.devices.length" class="muted">本站点暂未配置设备。</view>
  </view>
  <view v-if="!isBackend" class="panel fee-preview"><view class="section-row"><text class="section-title">收费说明</text><text class="teal">按电量计费</text></view><view class="rate-columns"><view><text>电费</text><text class="rate-value">¥{{yuan(station.rates.electricity)}}<text>/度</text></text></view><view><text>服务费</text><text class="rate-value">¥{{yuan(station.rates.service)}}<text>/度</text></text></view></view><view class="muted small">费率在启动时保存，本页面为模拟收费规则。</view></view>
  <view v-if="isBackend" class="panel"><BackendRates :station="station"/></view><DemoNotice/>
 </view>
 <view v-else class="empty-state">站点不存在<button class="primary" @click="go('/pages/home/index')">返回找站</button></view>
 <view class="action-bar"><button class="customer-service" @click="service"><image src="/static/service.png"/><text>帮助</text></button><button class="primary turquoise" @click="scan(openSocket)">扫码充电</button><button class="entry-code" @click="enterCode(openSocket)">输入编号</button></view>
</view>
</template>
<script setup>
import StationMap from '../../components/StationMap.vue';
import {ref,computed} from 'vue';import {onLoad,onShow} from '@dcloudio/uni-app';import PageHeader from '../../components/PageHeader.vue';import DemoNotice from '../../components/DemoNotice.vue';import {state,go,scan,openSocket,enterCode,isBackend,refreshData,loadRates} from '../../store.js';import {availableCount,totalCount,yuan,isDeviceAvailable} from '../../domain/charging.mjs';
import {groupStationRows} from '../../domain/dual-socket-layout.mjs';import ConnectionState from '../../components/ConnectionState.vue';import BackendRates from '../../components/BackendRates.vue';
const id=ref('baoan'),selectedRow=ref('');const station=computed(()=>state.stations.find(s=>s.id===id.value));
const rows=computed(()=>groupStationRows(station.value)),activeRow=computed(()=>rows.value.find(r=>r.id===selectedRow.value)||rows.value[0]);
const hasRows=computed(()=>rows.value.some(r=>r.id!=='unassigned')),hasNonDual=computed(()=>station.value?.devices.some(d=>d.sockets.length!==2));
const socketStatus=(d,p)=>!isDeviceAvailable(station.value,d)?(d.online?'停用':'离线'):({idle:'空闲',charging:'充电中',fault:'故障',disabled:'停用'}[p.status]||'不可用');
onLoad(q=>{id.value=q.id||(isBackend?'':'baoan');if(q.socket&&station.value){const d=station.value.devices.find(d=>d.sockets.some(p=>p.code===q.socket));if(d)go('/pages/start/index?station='+encodeURIComponent(id.value)+'&device='+encodeURIComponent(d.id)+'&socket='+encodeURIComponent(q.socket));}});
const openDevice=d=>{if(!isDeviceAvailable(station.value,d))return uni.showToast({title:station.value.enabled===false||d.enabled===false?'站点或设备已停用，暂时无法充电':'设备离线，暂时无法充电',icon:'none'});go('/pages/start/index?station='+encodeURIComponent(id.value)+'&device='+encodeURIComponent(d.id));};
onShow(async()=>{await refreshData();if(isBackend&&station.value)await loadRates(id.value);});
const service=()=>uni.showModal({title:'充电帮助',content:'先选择设备排，再选择已连接的设备和 A/B 插座。H5 可输入编号，小程序可扫码。设备与支付均为软件模拟。',showCancel:false});
</script>
<style scoped>
.layout-note{font-size:23rpx;color:#8b9b9b;line-height:1.7;margin:10rpx 0 20rpx}.layout-warning{font-size:23rpx;color:#af813d;background:#fff7e7;padding:16rpx;border-radius:10rpx;margin-bottom:16rpx}.row-tabs{white-space:nowrap;width:100%;margin-bottom:20rpx}.row-tabs-inner{display:flex;gap:14rpx;padding:4rpx 0}.row-tab{margin:0;flex-shrink:0;padding:0 26rpx;height:62rpx;line-height:62rpx;font-size:24rpx;background:#f0f5f5;color:#7b9190;border-radius:10rpx}.row-tab.selected{background:#e2f6f1;color:#0d9f87}.row-caption{font-size:24rpx;color:#819694;margin:12rpx 0 20rpx}.row-device-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16rpx}.dual-device.device-card{margin:0;padding:18rpx 16rpx;text-align:left;min-width:0;border:1px solid #e7efed;border-radius:12rpx;background:#fff}.dual-device .device-top{font-size:20rpx;gap:6rpx;display:flex;justify-content:space-between;white-space:nowrap}.device-id{display:block;font-size:24rpx;color:#384b49;font-weight:600;margin:16rpx 0;overflow:hidden;text-overflow:ellipsis}.two-socket-view{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8rpx}.mini-socket{display:flex;align-items:center;justify-content:space-between;padding:12rpx 10rpx;border-radius:8rpx;background:#eef8f4;color:#20a589;font-size:20rpx}.mini-socket.charging{background:#fff5df;color:#d99a32}.mini-socket.fault,.mini-socket.disabled,.mini-socket.offline,.mini-socket.unknown{background:#f0f2f2;color:#a4adad}.device-footer{display:flex;justify-content:space-between;font-size:19rpx;color:#92a3a1;margin-top:16rpx}.device-footer>text:last-child{color:#16a68d}.dual-device.offline{opacity:.65}
</style>
