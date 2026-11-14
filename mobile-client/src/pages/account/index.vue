<template>
  <view class="phone account-page">
    <PageHeader :title="register?'注册平台账号':'账号登录'" back/>
    <view class="padded-content">
      <view v-if="!isBackend" class="panel"><text>当前为本地体验，无需登录。</text><button class="primary turquoise" @click="go('/pages/home/index')">返回体验</button></view>
      <template v-else>
        <view class="panel">
          <text class="section-title">{{register?'创建普通用户账号':'登录后同步站点与本人订单'}}</text>
          <text class="field-label">账号</text>
          <input v-model="username" class="form-input account-username" maxlength="30" :disabled="connection.authenticating" placeholder="请输入账号" autocomplete="username"/>
          <template v-if="register"><text class="field-label">昵称</text><input v-model="displayName" class="form-input" maxlength="50" placeholder="请输入昵称"/></template>
          <text class="field-label">密码</text>
          <input v-model="password" class="form-input account-password" :password="true" maxlength="72" :disabled="connection.authenticating" placeholder="请输入密码" @confirm="submit"/>
          <text v-if="error||connection.error" class="field-error">{{error||connection.error}}</text>
          <button class="primary turquoise account-submit" :disabled="!ready||connection.authenticating" :loading="connection.authenticating" @click="submit">{{connection.authenticating?'正在验证':register?'注册并登录':'登录'}}</button>
          <button class="text-button" :disabled="connection.authenticating" @click="toggle">{{register?'已有账号，前往登录':'没有账号？创建普通用户账号'}}</button>
        </view>
        <DemoNotice/>
      </template>
    </view>
  </view>
</template>
<script setup>
import {ref,computed} from 'vue';
import PageHeader from '../../components/PageHeader.vue';
import DemoNotice from '../../components/DemoNotice.vue';
import {isBackend,connection,authenticate,go} from '../../store.js';
const username=ref(''),password=ref(''),displayName=ref(''),register=ref(false),error=ref('');
const ready=computed(()=>username.value.trim()&&password.value&&(!register.value||displayName.value.trim()));
const toggle=()=>{register.value=!register.value;error.value='';connection.error='';password.value='';};
const submit=async()=>{
  if(!ready.value||connection.authenticating)return;
  error.value='';
  if(register.value&&(!/^[a-zA-Z0-9_]{3,30}$/.test(username.value.trim())||password.value.length<6)){error.value='账号需为3—30位字母、数字或下划线，密码至少6位';return;}
  const success=await authenticate({username:username.value.trim(),password:password.value,...(register.value?{displayName:displayName.value.trim()}:{})},register.value);
  password.value='';
  if(success)uni.reLaunch({url:'/pages/home/index'});
};
</script>
