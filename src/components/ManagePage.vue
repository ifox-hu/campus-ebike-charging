<script setup>
import { computed, reactive, ref, watch } from 'vue'
import UiIcon from './UiIcon.vue'
import StatusTag from './StatusTag.vue'
import StationLayout from './StationLayout.vue'
import { db, stationsView, devicesView, ordersView, reportsView } from '../domain/store.js'
import { money, orderLabels, payLabels } from '../domain/service.js'
const props=defineProps({page:String,stationScope:String})
const emit=defineEmits(['edit','device','order','confirm','navigate'])
const draft=reactive({keyword:'',station:'',status:'',pay:'',start:'',end:''}),query=ref({...draft}),pageNumber=ref(1),pageSize=ref(10),filterError=ref(''),layout=ref(true)
const definitions={
 stations:{title:'站点管理',note:'每个集中停车点可有多排设备；每台设备包含 A、B 两个独立插座。',add:'新增站点',columns:[['name','站点名称'],['scene','应用场景'],['address','位置与地址'],['rowCount','设备排数'],['deviceCount','设备数'],['portCount','插座数'],['free','空闲插座'],['status','启停状态']],statuses:['启用','停用']},
 devices:{title:'设备与插座',note:'站点 → 多排设备 → 每排若干台双插座设备；可调整排数和每排设备数量。',add:'新增设备',columns:[['code','设备编号'],['stationName','所属站点'],['rowName','设备排'],['position','排内序号'],['portCount','独立插座'],['free','空闲'],['starting','启动中'],['charging','充电中'],['status','设备状态']],statuses:['正常','离线','停用','部分插座故障']},
 rates:{title:'收费规则',note:'按度收取电费与服务费；订单保存启动时费率，修改规则不影响旧订单。',columns:[['stationName','站点名称'],['electricRate','电费（元/度）'],['serviceRate','服务费（元/度）'],['totalRate','合计（元/度）'],['updatedAt','最近修改时间']],statuses:[]},
 orders:{title:'充电订单',note:'充电与支付状态分开；异常任务在管理员核验停止之前，继续占用插座。',columns:[['number','订单编号'],['userName','用户'],['stationName','站点'],['socketCode','插座编号'],['startedAt','开始时间'],['energyText','模拟电量（度）'],['amountText','费用（元）'],['status','充电状态'],['payment','支付状态']],statuses:Object.values(orderLabels)},
 users:{title:'用户管理',note:'仅管理普通用户启停；停用阻止新建任务，不直接中断已开始的充电。',columns:[['account','账号'],['name','用户名称'],['createdAt','注册时间'],['orderCount','订单数'],['status','账号状态']],statuses:['启用','停用']},
 reports:{title:'故障报修',note:'报修处理与插座故障恢复分别维护，填写处理说明不会自动解除故障。',columns:[['code','报修编号'],['userName','提交用户'],['stationName','站点'],['socketCode','插座编号'],['description','问题说明'],['createdAt','提交时间'],['status','处理状态']],statuses:['待处理','已处理']},
}
const definition=computed(()=>definitions[props.page])
const source=computed(()=>{
 switch(props.page){
  case 'stations':return stationsView.value.map(s=>({...s,status:s.enabled?'启用':'停用'}))
  case 'devices':return devicesView.value.map(d=>({...d,stationName:d.station?.name,rowName:d.row?.name}))
  case 'rates':return stationsView.value.map(s=>({...s,id:s.id,stationName:s.name,electricRate:money(s.rate.electricRate),serviceRate:money(s.rate.serviceRate),totalRate:money(s.rate.electricRate+s.rate.serviceRate),updatedAt:s.rate.updatedAt}))
  case 'orders':return [...ordersView.value].sort((a,b)=>b.startedAt.localeCompare(a.startedAt)).map(o=>({...o,statusCode:o.status,status:orderLabels[o.status],payment:payLabels[o.payStatus],userName:o.user?.name||o.userId,account:o.user?.account,energyText:o.energy.toFixed(3),amountText:money(o.total)}))
  case 'users':return db.users.map(u=>({...u,orderCount:db.orders.filter(o=>o.userId===u.id).length,status:u.enabled?'启用':'停用'}))
  case 'reports':return reportsView.value.map(r=>({...r,code:r.id,userName:r.user?.name,stationId:r.socket?.station?.id,stationName:r.socket?.station?.name,socketCode:r.socket?.code,statusCode:r.status,status:r.status==='pending'?'待处理':'已处理'}))
  default:return []
 }
})
const filtered=computed(()=>source.value.filter(r=>{
 const q=query.value,key=q.keyword.trim().toLowerCase()
 if(key&&!['name','code','number','userName','account','stationName','socketCode','description','address'].some(k=>String(r[k]||'').toLowerCase().includes(key)))return false
 const station=r.stationId||r.id
 return (!q.station||station===q.station)&&(!q.status||r.status===q.status)&&(!q.pay||r.payStatus===q.pay)&&(!q.start||String(r.startedAt||r.createdAt||'').slice(0,10)>=q.start)&&(!q.end||String(r.startedAt||r.createdAt||'').slice(0,10)<=q.end)
}))
const pages=computed(()=>Math.max(1,Math.ceil(filtered.value.length/pageSize.value)))
const visible=computed(()=>filtered.value.slice((pageNumber.value-1)*pageSize.value,pageNumber.value*pageSize.value))
watch(filtered,()=>{pageNumber.value=Math.min(pageNumber.value,pages.value)})
function apply(){filterError.value='';if(draft.start&&draft.end&&draft.start>draft.end){filterError.value='开始日期不能晚于结束日期。';return}query.value={...draft};pageNumber.value=1}
function reset(){Object.assign(draft,{keyword:'',station:props.page==='devices'?db.stations[0]?.id||'':'',status:'',pay:'',start:'',end:''});apply()}
function setLayout(value){layout.value=value;if(value){draft.station=draft.station||query.value.station||db.stations[0]?.id||'';apply()}}
// The visible site selector and physical layout must always refer to the same
// station. Text/status searches keep their existing explicit query behavior.
watch(()=>draft.station,value=>{if(props.page==='devices'&&layout.value){query.value={...query.value,station:value};pageNumber.value=1}})
watch(()=>[props.page,props.stationScope],()=>{reset();if(props.stationScope){draft.station=props.stationScope;apply()}},{immediate:true})
function confirmToggle(row,type){emit('confirm',{kind:type,id:row.id,enabled:!row.enabled,title:row.enabled?'确认停用':'确认启用',description:row.enabled?'停用后禁止新建充电任务，保留已有订单和关联信息。存在活动任务的站点或设备不能停用。':'启用后仍需设备在线、插座无故障才能启动充电。'})}
</script>
<template>
 <section class="management-glass">
  <header class="management-heading"><div><h1>{{definition.title}}</h1><p>{{definition.note}}</p></div><div class="management-add-actions"><button v-if="page==='devices'" class="outline-button" @click="emit('edit',{type:'rows',stationId:query.station})">＋ 新增设备排</button><button v-if="definition.add" class="soft-button active" @click="emit('edit',{type:page,stationId:draft.station})">＋ {{definition.add}}</button></div></header>
  <div v-if="page==='devices'" class="device-view-tabs"><button :class="{active:layout}" @click="setLayout(true)">现场排布</button><button :class="{active:!layout}" @click="setLayout(false)">设备列表</button></div><form class="filter-bar" @submit.prevent="apply"><input v-model="draft.keyword" :placeholder="page==='orders'?'订单号 / 用户 / 插座编号':'输入名称、编号或关键字'" aria-label="搜索关键字"/><select v-if="['devices','rates','orders','reports'].includes(page)" v-model="draft.station" aria-label="筛选站点"><option v-if="page!=='devices'||!layout" value="">全部站点</option><option v-for="s in db.stations" :key="s.id" :value="s.id">{{s.name}}</option></select><select v-if="definition.statuses.length" v-model="draft.status" aria-label="筛选状态"><option value="">全部状态</option><option v-for="s in definition.statuses" :key="s">{{s}}</option></select><select v-if="page==='orders'" v-model="draft.pay" aria-label="筛选支付状态"><option value="">全部支付状态</option><option v-for="(label,key) in payLabels" :key="key" :value="key">{{label}}</option></select><template v-if="page==='orders'"><input type="date" v-model="draft.start" aria-label="开始日期范围起"/><span>至</span><input type="date" v-model="draft.end" aria-label="开始日期范围止"/></template><button class="soft-button active" type="submit"><UiIcon name="search"/> 查询</button><button class="outline-button" type="button" @click="reset">重置</button></form>
  <p v-if="filterError" class="form-error" role="alert">{{filterError}}</p>
  <StationLayout v-if="page==='devices'&&layout" :station-id="query.station" :keyword="query.keyword" :status="query.status" @device="emit('device',$event)" @edit="emit('edit',$event)"/><div v-else class="management-table-wrap"><table class="management-table" :class="{'orders-table':page==='orders'}"><thead><tr><th class="index-column">序号</th><th v-for="[key,label] in definition.columns" :key="key">{{label}}</th><th class="actions-column">操作</th></tr></thead><tbody><tr v-for="(row,i) in visible" :key="row.id"><td>{{(pageNumber-1)*pageSize+i+1}}</td><td v-for="[key] in definition.columns" :key="key" :class="{'long-cell':['description','address'].includes(key)}" :title="String(row[key]??'')"><StatusTag v-if="['status','payment'].includes(key)" :text="row[key]"/><span v-else-if="key==='address'" class="station-address">{{row.address}}<small>{{row.lat}}, {{row.lng}} · GCJ-02</small></span><span v-else>{{row[key]}}</span></td><td><div class="row-actions"><template v-if="page==='stations'"><button @click="emit('edit',{type:page,id:row.id})">编辑</button><button @click="emit('navigate',{page:'devices',stationId:row.id})">查看排布</button><button :class="{danger:row.enabled}" @click="confirmToggle(row,'station')">{{row.enabled?'停用':'启用'}}</button></template><template v-else-if="page==='devices'"><button @click="emit('device',row.id)">插座 / 模拟</button><button @click="emit('edit',{type:page,id:row.id})">编辑</button><button :class="{danger:row.enabled}" @click="confirmToggle(row,'device')">{{row.enabled?'停用':'启用'}}</button></template><button v-else-if="page==='rates'" @click="emit('edit',{type:'rates',id:row.id})">修改费率</button><button v-else-if="page==='orders'" @click="emit('order',row.id)">{{row.statusCode==='abnormal'?'核验处理':'详情'}}</button><button v-else-if="page==='users'" :class="{danger:row.enabled}" @click="confirmToggle(row,'user')">{{row.enabled?'停用':'启用'}}</button><button v-else-if="page==='reports'" @click="emit('edit',{type:'reports',id:row.id})">{{row.statusCode==='pending'?'处理报修':'处理详情'}}</button></div></td></tr><tr v-if="!visible.length"><td :colspan="definition.columns.length+2" class="empty-table">暂无符合条件的记录</td></tr></tbody></table></div>
  <footer v-if="page!=='devices'||!layout" class="table-pagination"><span>共 {{filtered.length}} 条记录</span><select v-model.number="pageSize" @change="pageNumber=1" aria-label="每页条数"><option :value="10">10 条 / 页</option><option :value="20">20 条 / 页</option></select><button :disabled="pageNumber<=1" @click="pageNumber--">上一页</button><span class="current-page">{{pageNumber}}</span><button :disabled="pageNumber>=pages" @click="pageNumber++">下一页</button><span>共 {{pages}} 页</span></footer>
 </section>
 <footer class="page-footer">非机动车充电管理平台 · 本地前端演示 · 数据保存在当前浏览器</footer>
</template>
