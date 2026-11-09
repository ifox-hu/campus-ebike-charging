<script setup>
import { computed } from 'vue'
const props=defineProps({text:String})
const tone=computed(()=>['正常','在线','空闲','启用','已结束','已处理','已模拟支付','无需支付'].includes(props.text)?'success':['故障','异常占用','异常待处理','启动失败','部分插座故障'].includes(props.text)?'danger':['启动中','充电中'].includes(props.text)?'primary':['离线','待处理','待支付'].includes(props.text)?'warning':'muted')
</script>
<template><span class="status-tag" :class="tone">{{text}}</span></template>
