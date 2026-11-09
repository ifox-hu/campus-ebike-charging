<template>
  <view class="phone report-page">
    <PageHeader :title="history ? '我的报修' : '故障报修'" back/>
    <view class="padded-content"><ConnectionState/><view v-if="isBackend&&!connection.user?.features?.repairs" class="panel"><text class="section-title">在线报修暂未开放</text><text class="block muted small">暂时无法提交或查询在线报修，请稍后再试。</text><button class="text-button" @click="go('/pages/home/index')">返回找站</button></view><template v-else>
      <template v-if="!history">
        <view v-if="submitted" class="panel report-success">
          <text class="section-title teal">报修已记录</text>
          <text class="block muted small">编号 {{submitted.id}}</text>
          <text class="block">{{submitted.socketCode}} · {{submitted.description}}</text>
          <button class="primary turquoise" @click="history=true">查看我的报修</button>
          <button class="text-button" @click="newReport">继续反馈其他问题</button>
        </view>
        <template v-else>
          <view class="panel">
            <view class="accent-title">设备问题反馈</view>
            <text class="field-label">{{isBackend?'设备或插座编号':'插座编号'}}</text>
            <view class="report-code-row">
              <input v-model="code" class="form-input" maxlength="255" :disabled="submitting" :placeholder="isBackend?'请输入设备或插座编号':'例如 14500006-01'" aria-label="报修插座编号"/>
              <button class="text-button" @click="scan(setCode)">扫码/输入</button>
            </view>
            <text v-if="resource" class="block muted small">{{resource.station.name}} · {{resource.device.online?'在线设备':'离线设备'}}</text>
            <text v-else-if="code.trim()" class="field-error">未找到该插座，请核对编号</text>
            <text class="field-label">问题说明</text>
            <textarea v-model="description" class="form-textarea" maxlength="300" :disabled="submitting" :adjust-position="true" :cursor-spacing="24" placeholder="请描述遇到的问题（5—300字）" aria-label="问题说明"/>
            <text class="muted small">{{description.length}}/300 · 请勿填写电话、密码等个人信息</text>
          </view>
          <button class="primary turquoise" :disabled="!canSubmit || submitting" :loading="submitting" @click="submit">{{submitting?'正在提交':isBackend?'提交报修':'提交模拟报修'}}</button>
          <button class="text-button" @click="history=true">查看我的报修（{{state.reports.length}}）</button>
        </template>
      </template>
      <template v-else>
        <view v-if="!state.reports.length" class="empty-state">暂无报修记录<text>遇到插座问题时，可以在这里反馈</text></view>
        <view v-for="report in state.reports" :key="report.id" class="panel report-record">
          <view class="section-row"><text>{{report.socketCode}}</text><text class="tag">{{reportStatus(report.status)}}</text></view>
          <text class="block report-description">{{report.description}}</text><view v-for="(event,i) in report.timeline||[]" :key="i" class="report-response"><text class="block muted small">{{event.at?.replace('T',' ')}} · {{event.status==='RESOLVED'?'已处理':'处理中'}}</text><text class="block">{{event.note||'已受理'}}</text></view><view v-if="report.resolution" class="report-response"><text class="block teal small">处理反馈</text><text class="block">{{report.resolution}}</text><text class="block muted small">{{formatTime(report.updatedAt)}}</text></view>
          <text class="block muted small">{{formatTime(report.createdAt)}}</text>
          <text class="block muted small">{{report.id}}</text>
        </view>
        <button class="primary turquoise" @click="newReport">新增故障反馈</button>
      </template>
      <view class="panel report-explanation"><text class="muted small">{{isBackend?'报修由平台管理员处理，刷新记录可查看反馈。报修不会自动改变插座状态。':'本地演示仅记录反馈，不会发送给运营商。报修不会自动改变插座状态。'}}</text></view>
      </template><DemoNotice/>
    </view>
  </view>
</template>
<script setup>
import { ref, computed } from 'vue';
import { onLoad,onShow } from '@dcloudio/uni-app';
import PageHeader from '../../components/PageHeader.vue';
import DemoNotice from '../../components/DemoNotice.vue';
import { state, action, scan, isBackend, go,connection,refreshData,reportBackend } from '../../store.js';
import { submitReport, findSocket, parseSocketCode } from '../../domain/charging.mjs';
import ConnectionState from '../../components/ConnectionState.vue';
import {resolveBackendSocket} from '../../api/mapping.mjs';
const requestKey=()=> 'repair-'+Date.now()+'-'+Math.random().toString(36).slice(2);
const code=ref(''), description=ref(''), history=ref(false), submitting=ref(false), submitted=ref(null),key=ref(requestKey());
onLoad(q=>{code.value=q.code||'';history.value=q.history==='1';});
const resource=computed(()=>{
  if(!isBackend)return findSocket(state,code.value.trim());
  try{return resolveBackendSocket(state.stations,code.value);}catch{
    const matches=state.stations.flatMap(station=>station.devices.filter(device=>device.code===code.value.trim()).map(device=>({station,device,socket:null})));
    return matches.length===1?matches[0]:null;
  }
});
const canSubmit=computed(()=>resource.value&&description.value.trim().length>=5&&description.value.trim().length<=300&&(!isBackend||connection.user?.features?.repairs&&!connection.loading&&!connection.operation));
const setCode=value=>{
  if(!isBackend)return action(()=>{code.value=parseSocketCode(value);});
  try{code.value=resolveBackendSocket(state.stations,value).socket.code;}catch(error){uni.showToast({title:error.message,icon:'none'});}
};
const newReport=()=>{history.value=false;submitted.value=null;description.value='';key.value=requestKey();};
const reportStatus=status=>({pending:'待处理',processing:'处理中',resolved:'已处理',unknown:'状态待确认'}[status]||'已记录');
onShow(()=>refreshData());
const formatTime=value=>{if(!Number.isFinite(value))return '—';const d=new Date(value);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;};
const submit=async()=>{
  if(!canSubmit.value||submitting.value||submitted.value)return;
  submitting.value=true;
  try {
    submitted.value=isBackend?await reportBackend({...((resource.value.socket)?{connectorId:resource.value.socket.id}:{chargerId:resource.value.device.id}),description:description.value.trim(),requestKey:key.value}):action(()=>submitReport(state,code.value.trim(),description.value));
  }
  finally { submitting.value=false; }
};
</script>
