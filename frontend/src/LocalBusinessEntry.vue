<script setup>
import {ref} from 'vue'
const help=ref(false)
</script>
<template>
 <main class="local-business-entry"><section class="entry-card">
  <div class="entry-brand">ϟ 电动自行车智慧充电</div>
  <span class="entry-tag">统一业务数据 · 本机演示</span>
  <h1>进入正在运行的充电系统</h1>
  <p>管理端、H5 和小程序使用同一个业务后端。站点、插座功率、充电时长与订单状态同步更新。</p>
  <div class="entry-actions"><a class="entry-primary" href="http://127.0.0.1:5207/">进入本机管理端</a><a href="http://127.0.0.1:5197/">打开 H5 用户端</a></div>
  <p class="entry-note">请在运行项目的这台电脑上打开。GitHub 页面仅提供入口，业务数据保存在本机后端，不上传到 GitHub。</p>
  <button type="button" :aria-expanded="help" @click="help=!help">{{help?'收起说明':'页面打不开？查看启动说明'}}</button>
  <div v-if="help" class="entry-help"><p>先启动现有的 8081 业务后端，再在管理端项目运行 <code>npm run dev:pages</code>，用户端运行 <code>npm run dev:sandbox</code>。</p><p>本机管理端地址：<code>http://127.0.0.1:5207/</code>。使用业务后端管理员账号登录，不能使用旧静态演示账号。</p><p>如果换一台电脑访问，需先部署可访问的业务后端；当前入口不会连接另一台电脑上的数据库。</p></div>
 </section></main>
</template>
<style scoped>
.local-business-entry{min-height:100vh;display:grid;place-items:center;padding:32px 20px;box-sizing:border-box;background:linear-gradient(135deg,#f7f6fc,#eef8f7);color:#514663}.entry-card{width:min(100%,700px);box-sizing:border-box;padding:48px;background:#fff;border:1px solid #eee9f5;border-radius:20px;box-shadow:0 18px 65px #70608b12}.entry-brand{font-size:20px;font-weight:600;color:#8976ae;margin-bottom:32px}.entry-tag{font-size:13px;color:#428f83;background:#eef9f5;border-radius:20px;padding:8px 13px}.entry-card h1{font-size:30px;line-height:1.4;margin:24px 0 16px}.entry-card p{line-height:1.9;color:#81748e}.entry-actions{display:flex;gap:14px;flex-wrap:wrap;margin:28px 0}.entry-actions a{padding:13px 20px;border:1px solid #d9cfe7;border-radius:8px;color:#81669e;text-decoration:none;font-weight:600}.entry-actions .entry-primary{background:#957bb3;color:white;border-color:#957bb3}.entry-card .entry-note{font-size:13px;color:#91849b}.entry-card button{font:inherit;font-size:13px;border:0;background:none;padding:12px 0;color:#81669e;cursor:pointer}.entry-help{border-top:1px solid #eee7f2;font-size:13px;padding-top:10px}.entry-help code{overflow-wrap:anywhere}@media(max-width:600px){.entry-card{padding:28px 22px}.entry-card h1{font-size:25px}.entry-actions{flex-direction:column}.entry-actions a{text-align:center}}
</style>
