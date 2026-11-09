<script setup>
import {ref,watch} from 'vue'
import QRCode from 'qrcode'
const props=defineProps({code:{type:String,required:true},label:String})
const image=ref(''),error=ref('');let revision=0
watch(()=>props.code,async code=>{const version=++revision;image.value='';error.value='';try{const url=await QRCode.toDataURL(code,{width:256,margin:4,errorCorrectionLevel:'M'});if(version===revision)image.value=url}catch{if(version===revision)error.value='二维码生成失败，请重试'}},{immediate:true})
</script>
<template><details class="socket-qr"><summary>插座二维码</summary><p>{{label||code}}</p><img v-if="image" :src="image" :alt="'插座二维码 '+code" width="192" height="192"/><p v-if="error" role="alert">{{error}}</p><a v-if="image" :href="image" :download="code.replace(/[^a-zA-Z0-9_-]/g,'_')+'.png'">下载二维码 PNG</a></details></template>
<style scoped>.socket-qr{margin-top:12px;border-top:1px solid #e7e3ef;padding-top:10px}.socket-qr summary{cursor:pointer;color:#685bc7}.socket-qr img{display:block;background:#fff;max-width:100%;height:auto}.socket-qr p{font-size:12px;overflow-wrap:anywhere}.socket-qr a{font-size:13px;color:#685bc7}</style>
