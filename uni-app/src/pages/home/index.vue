<template>
  <view class="phone home-page" :class="{'has-session':active,'map-mode':mapMode}">
    <PageHeader :title="mapMode?'充电站点地图':'电动自行车智能充电'"/><ConnectionState/>
    <view class="searchbar"><text class="city"><text class="location-symbol">●</text>{{isBackend?'校园':'南阳市'}}</text><view class="search-field"><text class="search-icon"/><input v-model="query" placeholder="查找地点/充电站" confirm-type="search" aria-label="搜索充电站"/></view><button class="mode-toggle" :aria-label="mapMode?'切换列表':'切换地图'" @click="mapMode=!mapMode"><image :src="mapMode?'/static/list.png':'/static/navigation.png'"/></button></view>
    <view v-if="!mapMode" class="list-head"><view class="station-heading"><text class="station-heading-title">充电站点</text><text class="station-heading-description">{{isBackend?'校园站点信息以平台数据为准':'电动自行车插座充电'}}</text></view><view class="sorts"><button :class="{chosen:sort==='default'}" @click="sort='default'">全部站点</button><button :class="{chosen:sort==='free'}" @click="sort='free'">空闲较多</button></view></view>
    <StationMap v-if="mapMode" :stations="filtered" @open="openStation"/>
    <view v-if="!mapMode" class="station-list"><view v-for="s in filtered" :key="s.id" class="station-card" @click="openStation(s)"><view class="station-name">{{s.name}}</view><view class="station-address">{{s.address}}</view><view class="station-layout-summary">{{groupStationRows(s).length}}排 · 每排{{groupStationRows(s).map(r=>r.devices.length).join('、')}}台 · 每台A/B双插座</view><view class="station-meta"><view><text class="free-count">空闲{{availableCount(s)}}个插座</text><text class="total-text">/总共{{totalCount(s)}}个插座</text></view><button class="direction-button" :aria-label="'查看'+s.name" @click.stop="openStation(s)">➜ <text>查看</text></button></view></view><view v-if="!filtered.length&&(!isBackend||connection.user)" class="empty-state">没有找到相关站点<text>换个名称或地址试试</text><button class="text-button" @click="query=''">清空搜索</button></view><DemoNotice/><button class="text-button" @click="enterCode(openSocket)">输入设备插座编号</button></view>
    <view v-if="active" class="active-banner" @click="go('/pages/session/index?id='+active.id)"><view class="pulse-dot"/><text>{{active?.status==='starting'?'有一笔订单正在启动':'有一笔订单正在模拟充电'}}</text><text>查看 ›</text></view>
    <BottomNav current="home"/>
  </view>
</template>
<script setup>
import {ref,computed} from 'vue';import {onShow} from '@dcloudio/uni-app';import ConnectionState from '../../components/ConnectionState.vue';import {isCurrentOrder} from '../../domain/order-status.mjs';
import StationMap from '../../components/StationMap.vue';
import {groupStationRows} from '../../domain/dual-socket-layout.mjs';
import PageHeader from '../../components/PageHeader.vue';import BottomNav from '../../components/BottomNav.vue';import DemoNotice from '../../components/DemoNotice.vue';
import {state,go,enterCode,openSocket,isBackend,connection,refreshData} from '../../store.js';import {availableCount,totalCount} from '../../domain/charging.mjs';
const query=ref(''),mapMode=ref(false),sort=ref('default'),selectedId=ref('baoan');
const filtered=computed(()=>{const found=state.stations.filter(s=>(s.name+s.address).includes(query.value.trim()));return sort.value==='free'?[...found].sort((a,b)=>availableCount(b)-availableCount(a)):found;});
const selected=computed(()=>filtered.value.find(s=>s.id===selectedId.value));const active=computed(()=>state.orders.find(isCurrentOrder));
const openStation=s=>go('/pages/station/index?id='+s.id);
onShow(()=>refreshData());
</script>
<style scoped>
.station-layout-summary{margin:7px 0 3px;color:#658183;font-size:12px;line-height:1.7}
</style>
