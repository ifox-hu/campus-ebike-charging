<template>
  <view class="phone home-page" :class="{'has-session':active,'map-mode':mapMode}">
    <PageHeader :title="mapMode?'地图模式':'智慧充电'"/><ConnectionState/>
    <view class="searchbar" :class="{floating:mapMode}"><text class="city"><text class="location-symbol">●</text>{{isBackend?'站点':'深圳市'}}</text><view class="search-field"><text class="search-icon"/><input v-model="query" placeholder="查找地点/充电站" confirm-type="search" aria-label="搜索充电站"/></view><button v-if="!isBackend" class="mode-toggle" :aria-label="mapMode?'切换列表':'切换地图'" @click="mapMode=!mapMode"><image :src="mapMode?'/static/list.png':'/static/navigation.png'"/></button></view>
    <view v-if="active&&!mapMode" class="panel task-card" @click="go('/pages/session/index?id='+active.id)"><text class="section-title">{{active.status==='starting'?'正在启动':'正在充电'}} · 查看当前任务 ›</text><text class="block muted small">{{active.stationName}} · {{active.socketCode}}</text><text class="block muted small">费用以服务端结束结算为准</text></view>
    <view v-if="unpaid&&!active&&!mapMode" class="panel task-card" @click="go('/pages/session/index?id='+unpaid.id)"><text class="section-title">有待支付账单 · 查看详情 ›</text><text class="block muted small">{{unpaid.stationName}} · {{unpaid.socketCode}}</text></view>
    <view v-if="!mapMode" class="list-head">
      <view class="station-heading"><text class="station-heading-title">充电站点</text><text class="station-heading-description">{{isBackend?'站点信息以平台数据为准':'电动自行车插座充电'}}</text></view>
      <view class="sorts"><button :class="{chosen:sort==='default'}" :aria-pressed="sort==='default'" @click="sort='default'">全部站点</button><button :class="{chosen:sort==='free'}" :aria-pressed="sort==='free'" @click="sort='free'">空闲较多</button></view>
      <view class="sorts discovery-tabs"><button v-for="t in tabs" :key="t.id" :class="{chosen:tab===t.id}" @click="tab=t.id">{{t.label}}</button></view>
      <scroll-view scroll-x class="scene-scroll"><view class="scene-options"><button :class="{chosen:!scene}" @click="scene=''">全部场景</button><button v-for="item in scenes" :key="item" :class="{chosen:scene===item}" @click="scene=item">{{item}}</button></view></scroll-view>
      <text class="sort-explanation" role="status" aria-live="polite">{{sort==='free'?'按空闲插座从多到少排序':'全部站点，按默认顺序显示'}} · {{filtered.length}} 个站点</text>
    </view>
    <view v-if="mapMode" class="map-scene"><view class="water"/><view class="park park-a"/><view class="park park-b"/><view class="road road-a"/><view class="road road-b"/><view class="road road-c"/><view class="road road-d"/><text class="map-label label-a">新安街道</text><text class="map-label label-b">海滨片区</text><text class="map-label label-c">校园东区</text><text class="river-name">演示区域</text><view class="map-tools"><button class="bike-mode" aria-label="电单车站点"><image src="/static/bike-white.png"/></button><button class="locate" aria-label="查看地图说明" @click="mapInfo"><image src="/static/location.png"/></button></view><button v-for="s in filtered" :key="s.id" class="map-pin" :class="{selected:s.id===selectedId}" :style="{left:s.x+'%',top:s.y+'%'}" :aria-label="'选择'+s.name" @click="selectedId=s.id"><view class="pin-bubble">闲 <text>{{availableCount(s)}}</text> / {{totalCount(s)}}</view><image src="/static/pin.png"/></button><view class="map-disclaimer">地图布局示意 · 非真实定位</view></view>
    <view v-if="mapMode&&!filtered.length" class="map-empty panel">没有找到相关站点<button class="text-button" @click="query=''">清空搜索</button></view>
    <view v-if="mapMode&&selected" class="station-sheet"><button class="sheet-close" aria-label="收起站点卡片" @click="selectedId=''">×</button><view class="station-name">{{selected.name}}</view><view class="station-address">{{selected.address}}</view><view class="station-meta"><view><text class="free-count">空闲{{availableCount(selected)}}个插座</text><text class="total-text">/总共{{totalCount(selected)}}个插座</text></view><text class="area-pill">{{selected.area}}</text></view><button class="primary turquoise" @click="openStation(selected)">查看站点</button></view>
    <view v-if="!mapMode" class="station-list"><view v-for="s in filtered" :key="s.id" class="station-card" @click="openStation(s)"><view class="station-name">{{s.name}}</view><view class="station-address">{{s.address}}</view><text class="muted small">{{s.scene||'未分类'}} · {{s.enabled===false?'暂停运营':'站点目录'}}</text><view class="station-meta"><view><text class="free-count">空闲{{availableCount(s)}}个插座</text><text class="total-text">/总共{{totalCount(s)}}个插座</text></view><button class="direction-button" :aria-label="'查看'+s.name" @click.stop="openStation(s)">➜ <text>查看</text></button></view></view><view v-if="!filtered.length&&(!isBackend||connection.user)" class="empty-state">没有找到相关站点<text>换个名称或地址试试</text><button class="text-button" @click="resetFilters">重置筛选</button></view><DemoNotice/><button class="text-button" @click="enterCode(openSocket)">输入设备插座编号</button></view>
    <view v-if="active" class="active-banner" @click="go('/pages/session/index?id='+active.id)"><view class="pulse-dot"/><text>{{active?.status==='starting'?'有一笔订单正在启动':'有一笔订单正在充电'}}</text><text>查看 ›</text></view>
    <BottomNav current="home"/>
  </view>
</template>
<script setup>
import {ref,computed} from 'vue';import {useCatalogSync} from '../../use-catalog-sync.js';import ConnectionState from '../../components/ConnectionState.vue';import {isCurrentOrder} from '../../domain/order-status.mjs';
import PageHeader from '../../components/PageHeader.vue';import BottomNav from '../../components/BottomNav.vue';import DemoNotice from '../../components/DemoNotice.vue';
import {discovery,rememberStation} from '../../discovery.js';import {filterStations} from '../../domain/experience.mjs';
import {state,go,enterCode,openSocket,isBackend,connection,refreshData} from '../../store.js';import {availableCount,totalCount} from '../../domain/charging.mjs';
const query=ref(''),mapMode=ref(false),sort=ref('default'),selectedId=ref('baoan');
const tab=ref('all'),scene=ref('');const tabs=[{id:'all',label:'全部'},{id:'favorites',label:'收藏'},{id:'recent',label:'最近浏览'}];
const scenes=computed(()=>[...new Set(state.stations.map(s=>s.scene||'未分类'))]);
const resetFilters=()=>{query.value='';scene.value='';tab.value='all';};
const unpaid=computed(()=>state.orders.find(o=>o.status==='ended'&&o.payment==='unpaid'));
const filtered=computed(()=>{const found=filterStations(state.stations,{query:query.value,scene:scene.value,tab:tab.value,...discovery});return sort.value==='free'?[...found].sort((a,b)=>availableCount(b)-availableCount(a)):found;});
const selected=computed(()=>filtered.value.find(s=>s.id===selectedId.value));const active=computed(()=>state.orders.find(isCurrentOrder));
const openStation=s=>{rememberStation(s.id);go('/pages/station/index?id='+encodeURIComponent(s.id));};
useCatalogSync(()=>refreshData());
const mapInfo=()=>uni.showModal({title:'地图演示说明',content:'当前地图只用于比对云创的找站交互，不采集定位，也不提供真实距离或导航。真实地图将在后端联调阶段接入。',showCancel:false});
</script>

<style scoped>
.task-card{margin:20rpx 28rpx;border-left:6rpx solid #17a88e;line-height:1.8}.discovery-tabs{margin-top:16rpx}.scene-scroll{white-space:nowrap;margin-top:18rpx}.scene-options{display:flex;gap:12rpx}.scene-options button{flex-shrink:0;font-size:23rpx;margin:0;padding:0 20rpx;line-height:56rpx;background:#f0f5f5;color:#6c8581}.scene-options button.chosen{background:#dff6ef;color:#0a967d}
</style>
