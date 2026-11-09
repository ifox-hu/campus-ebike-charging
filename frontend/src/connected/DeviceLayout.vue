<script setup>
import {computed,ref,watch} from 'vue'
import {statusLabel} from './platformClient.js'
const props=defineProps({data:Object}),emit=defineEmits(['open'])
const stationId=ref(''),rowName=ref('')
watch(()=>props.data.stations,sites=>{if(!sites.some(s=>String(s.id)===stationId.value))stationId.value=String(sites[0]?.id||'')},{immediate:true})
const devices=computed(()=>props.data.devices.filter(d=>String(d.stationId)===stationId.value))
const rows=computed(()=>[...new Set(devices.value.map(d=>d.rowName||'未分排'))].sort((a,b)=>a.localeCompare(b,'zh-CN',{numeric:true})))
watch(rows,items=>{if(!items.includes(rowName.value))rowName.value=items[0]||''},{immediate:true})
const visible=computed(()=>devices.value.filter(d=>(d.rowName||'未分排')===rowName.value))
const sockets=id=>props.data.sockets.filter(s=>s.chargerId===id)
</script>
<template><section class="connected-layout"><div class="filter-bar"><label>站点设备排布 <select v-model="stationId" aria-label="设备排布站点"><option v-for="s in data.stations" :key="s.id" :value="String(s.id)">{{s.name}}</option></select></label><button v-for="name in rows" :key="name" class="outline-button" :class="{selected:name===rowName}" @click="rowName=name">{{name}} · {{devices.filter(d=>(d.rowName||'未分排')===name).length}} 台</button></div><div class="physical-devices"><button v-for="device in visible" :key="device.id" class="physical-device" @click="emit('open',device.id)"><strong>{{device.code}}</strong><small>{{device.enabled===false?'停用':statusLabel(device.status,'device')}}</small><span class="ports"><span v-for="(socket,i) in sockets(device.id)" :key="socket.id" :class="socket.status">{{sockets(device.id).length===2?String.fromCharCode(65+i):socket.name}}<br/>{{statusLabel(socket.status,'socket')}}</span></span></button><p v-if="!visible.length">此站点暂未配置设备。</p></div></section></template>
<style scoped>.connected-layout{margin:1rem 0;border:1px solid #e7e2ee;border-radius:10px;background:#fcfbfe}.physical-devices{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;padding:16px}.physical-device{padding:12px;background:white;border:1px solid #ddd7eb;border-radius:8px;color:#625876;cursor:pointer;text-align:left}.physical-device strong,.physical-device small{display:block;overflow-wrap:anywhere}.physical-device small{margin:8px 0}.ports{display:flex;gap:5px}.ports>span{flex:1;font-size:11px;padding:8px 3px;text-align:center;border-radius:5px;background:#f0eff5}.ports .IDLE{background:#def4ed;color:#207657}.ports .CHARGING{background:#fff0d7;color:#8c5d12}.ports .FAULT{background:#fde6e9;color:#a33649}.selected{border-color:#7768cf;background:#f0edff}.filter-bar label{font-size:.9rem}</style>
