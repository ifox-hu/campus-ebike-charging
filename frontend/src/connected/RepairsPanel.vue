<script setup>
import {ref,onMounted,onBeforeUnmount} from 'vue'
import {statusLabel} from './platformClient.js'
const props=defineProps({client:Object,enabled:Boolean})
const rows=ref([]),filter=ref(''),busy=ref(false),saving=ref(false),error=ref(''),message=ref(''),selected=ref(null),nextStatus=ref('PROCESSING'),resolution=ref('')
let active=true
async function reload(){
 if(!props.enabled||busy.value||saving.value)return
 busy.value=true;error.value=''
 try{const result=await props.client.repairs(filter.value);if(active)rows.value=result}
 catch(e){if(active&&!e.stale)error.value=e.message}
 finally{if(active)busy.value=false}
}
function open(row){selected.value=row;nextStatus.value=row.status==='OPEN'?'PROCESSING':'RESOLVED';resolution.value=row.resolution||'';error.value='';message.value=''}
async function save(){
 if(saving.value||!selected.value)return
 if(nextStatus.value==='RESOLVED'&&resolution.value.trim().length<2){error.value='请填写处理结果';return}
 saving.value=true;error.value=''
 try{await props.client.handleRepair(selected.value.id,{status:nextStatus.value,resolution:resolution.value.trim()});if(!active)return;selected.value=null;message.value='处理结果已保存，用户刷新报修记录即可查看'}
 catch(e){if(active&&!e.stale)error.value=e.message}
 finally{if(active)saving.value=false}
 if(active&&!error.value)await reload()
}
onMounted(reload);onBeforeUnmount(()=>{active=false})
defineExpose({reload})
</script>
<template>
 <section class="management-page repair-management">
  <header class="management-heading"><div><h1>故障报修</h1><p>查看用户反馈，记录处理进展与结果。处理报修不会自动更改插座状态。</p></div></header>
  <p v-if="!enabled" class="remote-error">当前后端版本尚未提供在线报修，请更新后端后重试。</p>
  <template v-else>
   <div class="filter-bar"><select v-model="filter" aria-label="报修状态筛选" :disabled="busy||saving" @change="reload"><option value="">全部报修</option><option value="OPEN">待处理</option><option value="PROCESSING">处理中</option><option value="RESOLVED">已处理</option></select><button class="outline-button" :disabled="busy||saving" @click="reload">刷新报修</button></div>
   <p v-if="error" class="remote-error" role="alert">{{error}}</p><p v-if="message" class="remote-message" role="status">{{message}}</p>
   <div class="management-table-wrap"><table class="management-table repair-table"><thead><tr><th>编号</th><th>用户</th><th>站点 / 设备</th><th>问题说明</th><th>状态</th><th>提交时间</th><th>操作</th></tr></thead><tbody>
    <tr v-for="row in rows" :key="row.id"><td>{{row.id}}</td><td>{{row.ownerUsername}}</td><td>{{row.stationName}}<br/>{{row.socketCode||row.deviceCode}}</td><td class="repair-description">{{row.description}}</td><td>{{statusLabel(row.status,'repair')}}</td><td>{{row.createdAt?.replace('T',' ').slice(0,19)}}</td><td><button class="table-link repair-open" @click="open(row)">{{row.status==='RESOLVED'?'查看结果':'处理'}}</button></td></tr>
    <tr v-if="!rows.length"><td colspan="7" class="empty-table">{{busy?'正在读取报修…':'暂无报修记录'}}</td></tr>
   </tbody></table></div>
  </template>
  <div v-if="selected" class="modal-shade"><section class="modal-card repair-dialog" role="dialog" aria-modal="true" aria-label="报修处理"><header><h2>报修 #{{selected.id}}</h2><button class="icon-button" :disabled="saving" aria-label="关闭报修" @click="selected=null">×</button></header><div class="remote-detail">
   <p>{{selected.stationName}} · {{selected.socketCode||selected.deviceCode}}</p><p class="repair-description">{{selected.description}}</p>
   <template v-if="selected.status!=='RESOLVED'"><label class="repair-field">处理状态<select v-model="nextStatus" :disabled="saving"><option value="PROCESSING">处理中</option><option value="RESOLVED">已处理</option></select></label><label class="repair-field">处理反馈<textarea v-model="resolution" maxlength="500" :disabled="saving" placeholder="记录进展；完成时填写处理结果"/></label><p v-if="error" class="remote-error" role="alert">{{error}}</p><button class="soft-button active repair-save" :disabled="saving" @click="save">{{saving?'正在保存…':'保存处理结果'}}</button></template>
   <template v-else><p>处理人：{{selected.handlerUsername}}</p><p class="repair-description">{{selected.resolution}}</p><p>{{selected.updatedAt?.replace('T',' ').slice(0,19)}}</p></template>
  </div></section></div>
 </section>
</template>
<style scoped>
.repair-description{white-space:pre-wrap;overflow-wrap:anywhere;max-width:28rem;line-height:1.7}.repair-field{display:flex;flex-direction:column;gap:.6rem;margin:1rem 0}.repair-field select,.repair-field textarea{border:1px solid #e3dcea;border-radius:.4rem;padding:.7rem;font:inherit;color:inherit;background:#fff}.repair-field textarea{height:9rem;resize:vertical}.repair-dialog{max-height:85vh;overflow:auto}.repair-table{min-width:850px}
</style>
