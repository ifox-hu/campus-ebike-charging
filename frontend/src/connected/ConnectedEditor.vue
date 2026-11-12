<script setup>
import {computed,reactive,ref} from 'vue'
import StationLocationPicker from '../components/StationLocationPicker.vue'
const props=defineProps({client:Object,type:String,record:Object,stations:Array,stationId:[String,Number]})
const emit=defineEmits(['done','cancel'])
const fields={
 stations:[['name','站点名称','text',50],['address','地址','text',200],['scene','应用场景','scene'],['latitude','纬度 GCJ-02','number'],['longitude','经度 GCJ-02','number'],['description','说明','text',255],['status','运营状态','stationStatus']],
 devices:[['stationId','所属站点','station'],['rowName','设备排号','text',30],['prefix','编号前缀（字母/数字/横线）','text',40],['name','设备名称前缀','text',60],['count','批量数量（1—30）','number']],
 device:[['rowName','设备排号','text',30],['status','通信状态','deviceStatus'],['enabled','管理状态','enabled']],
 socket:[['powerWatts','插座配置功率（W，1—10000）','number']],
 rates:[['stationId','所属站点','station'],['startTime','开始时间（HH:mm:ss）','text',8],['endTime','结束时间（全天末尾23:59:59）','text',8],['electricityPrice','电费（元/kWh）','number'],['servicePrice','服务费（元/kWh）','number']]
}
const form=reactive({name:'',address:'',scene:'未分类',latitude:'',longitude:'',coordinateType:'GCJ02',description:'',status:'OPERATING',stationId:props.stationId||props.stations[0]?.id||'',rowName:'A排',prefix:'',count:1,enabled:true,startTime:'00:00:00',endTime:'23:59:59',electricityPrice:.6,servicePrice:0,...props.record})
const busy=ref(false),error=ref(''),schema=computed(()=>fields[props.type]||[])
const options={scene:[['校园','校园'],['住宅小区','住宅小区'],['医院','医院'],['产业园区','产业园区'],['办公区','办公区'],['商业配套','商业配套'],['园区','园区'],['未分类','未分类']],stationStatus:[['OPERATING','运营中'],['CLOSED','停用']],deviceStatus:[['ONLINE','在线'],['OFFLINE','离线']],enabled:[[true,'启用'],[false,'停用']]}
function selectLocation(point){form.latitude=point.latitude.toFixed(6);form.longitude=point.longitude.toFixed(6);form.coordinateType=point.coordinateType;if(point.address)form.address=point.address.slice(0,200)}
async function save(){
 if(busy.value)return;error.value=''
 try{
  const payload=Object.fromEntries(schema.value.map(([key])=>[key,form[key]]))
  if(props.type==='stations'){
   if(!String(form.name).trim()||!String(form.address).trim())throw Error('请填写站点名称和地址')
   if(form.latitude===''||form.longitude===''||!Number.isFinite(Number(form.latitude))||!Number.isFinite(Number(form.longitude))||Math.abs(Number(form.latitude))>90||Math.abs(Number(form.longitude))>180)throw Error('请填写有效的经纬度')
   Object.assign(payload,{latitude:Number(form.latitude),longitude:Number(form.longitude),coordinateType:form.coordinateType||'GCJ02'})
  }
  if(props.type==='devices'){
   if(!Number.isInteger(Number(form.count))||Number(form.count)<1||Number(form.count)>30||!form.prefix.trim()||!form.name.trim()||!form.rowName.trim())throw Error('请完整填写设备信息，数量须为1—30的整数')
   payload.count=Number(form.count);payload.stationId=Number(form.stationId)
  }
  if(props.type==='rates'){
   for(const key of ['electricityPrice','servicePrice']){if(form[key]===''||!Number.isFinite(Number(form[key]))||Number(form[key])<0)throw Error('费率必须为非负数');payload[key]=Number(form[key])}
   if(!/^\d{2}:\d{2}(:\d{2})?$/.test(form.startTime)||!/^\d{2}:\d{2}(:\d{2})?$/.test(form.endTime))throw Error('请填写HH:mm:ss格式的时间')
   payload.stationId=Number(form.stationId)
  }
  if(props.type==='socket'){
   const watts=Number(form.powerWatts)
   if(!Number.isInteger(watts)||watts<1||watts>10000)throw Error('插座功率须为 1—10000 W 的整数')
   Object.assign(payload,{code:props.record.code,name:props.record.name,ratedPower:props.record.ratedPower,powerWatts:watts})
  }
  busy.value=true
  if(props.type==='stations')await props.client.saveStation(props.record?.id,payload)
  if(props.type==='devices')await props.client.createDevices(payload)
  if(props.type==='device')await props.client.saveDevice(props.record.id,payload)
  if(props.type==='socket')await props.client.saveSocket(props.record.id,payload)
  if(props.type==='rates')await props.client.saveRate(props.record?.id,payload)
  emit('done')
 }catch(e){if(!e.stale)error.value=e.message+'；如请求超时，请先刷新核对结果，不要重复提交。'}finally{busy.value=false}
}
</script>
<template><form class="connected-editor" @submit.prevent="save"><label v-for="[key,label,type,max] in schema" :key="key">{{label}}<select v-if="type==='station'" v-model="form[key]" required :disabled="busy||!!record&&key==='stationId'"><option v-for="site in stations" :key="site.id" :value="site.id">{{site.name}}</option></select><select v-else-if="options[type]" v-model="form[key]" :disabled="busy"><option v-for="[value,text] in options[type]" :key="String(value)" :value="value">{{text}}</option></select><input v-else v-model="form[key]" :type="type" :maxlength="max" :step="type==='number'?'any':undefined" :required="key!=='description'" :disabled="busy"/></label><StationLocationPicker v-if="type==='stations'" :latitude="form.latitude" :longitude="form.longitude" :address="form.address" :coordinate-type="form.coordinateType" :fallback-position="[stations[0]?.longitude,stations[0]?.latitude]" :disabled="busy" @select="selectLocation"/><p v-if="type==='rates'" class="form-hint">费率须覆盖全天且不重叠。修改不影响已启动订单保存的历史费率。</p><p v-if="error" class="remote-error" role="alert">{{error}}</p><footer><button type="button" class="outline-button" :disabled="busy" @click="emit('cancel')">取消</button><button class="soft-button active" :disabled="busy">{{busy?'正在保存…':'保存到服务端'}}</button></footer></form></template>
<style scoped>.connected-editor{padding:1.5rem;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem}.connected-editor label{display:flex;flex-direction:column;gap:.6rem;font-size:.9rem}.connected-editor input,.connected-editor select{padding:.7rem;border:1px solid #ddd8e9;border-radius:6px;color:#5c5470;background:white;min-width:0}.connected-editor p,.connected-editor footer{grid-column:1/-1}.connected-editor footer{display:flex;gap:1rem;justify-content:flex-end}@media(max-width:600px){.connected-editor{grid-template-columns:1fr}}</style>
