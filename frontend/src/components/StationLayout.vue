<script setup>
import { computed } from 'vue'
import { db, rowsView, socketsView, stationsView } from '../domain/store.js'
import StatusTag from './StatusTag.vue'
import {selectLayoutScope} from '../domain/layoutScope.js'
const props=defineProps({stationId:String,keyword:String,status:String})
const emit=defineEmits(['device','edit'])
const scope=computed(()=>selectLayoutScope(stationsView.value,rowsView.value,props.stationId,props.keyword,props.status))
const station=computed(()=>scope.value.summary)
const rows=computed(()=>scope.value.rows)
const ports=id=>socketsView.value.filter(s=>s.deviceId===id).sort((a,b)=>a.number-b.number)
</script>
<template><div class="station-layout"><div class="layout-summary"><div><strong>{{station?.name}}</strong><span>{{station?.rowCount||0}} 排 · {{station?.deviceCount||0}} 台设备 · {{station?.portCount||0}} 个插座</span></div><p>每个方块是一台双插座设备；A、B 插座独立使用。每排按现场顺序横向展示，较长的排可左右滚动。</p></div><section v-for="row in rows" :key="row.id" class="physical-row"><header><div><h2>{{stationId?row.name:row.stationName+' · '+row.name}}</h2><span>{{row.deviceCount}} 台设备 × 2 插座 = {{row.portCount}} 个插座</span><small>空闲 {{row.free}} · 启动中 {{row.starting}} · 充电中 {{row.charging}}</small></div><div class="row-tools"><button class="text-button" @click="emit('edit',{type:'rows',id:row.id,stationId:row.stationId})">编辑排信息</button><button class="soft-button" @click="emit('edit',{type:'batch',rowId:row.id,stationId:row.stationId})">＋ 追加设备</button></div></header><div class="physical-row-track" :aria-label="`${row.name}设备排布`"><button v-for="d in row.visible" :key="d.id" class="physical-device" :class="{'device-offline':!d.online,'device-disabled':!d.enabled}" @click="emit('device',d.id)"><div class="physical-device-position">{{String(d.position).padStart(2,'0')}} 号设备</div><strong>{{d.code}}</strong><StatusTag :text="d.status"/><div class="two-socket-strip"><span v-for="socket in ports(d.id)" :key="socket.id" class="mini-socket" :class="{'socket-idle':socket.status==='空闲','socket-charging':socket.status==='充电中','socket-error':['故障','异常占用'].includes(socket.status),'socket-unavailable':['离线','停用'].includes(socket.status)}"><b>{{socket.number===1?'A':'B'}}</b><small>{{socket.status}}</small></span></div></button></div><p v-if="!row.visible.length" class="layout-empty">本排暂无符合筛选条件的设备</p></section><p v-if="!rows.length" class="layout-empty">{{db.rows.some(r=>!stationId||r.stationId===stationId)?'暂无符合条件的设备':'当前范围还没有设备排，请先新增设备排。'}}</p></div></template>
