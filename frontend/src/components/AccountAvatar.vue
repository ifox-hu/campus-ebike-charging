<script setup>
import {computed,ref,watch} from 'vue'
const props=defineProps({src:String,name:String})
const failed=ref(false),initial=computed(()=>Array.from(props.name||'管')[0])
watch(()=>props.src,()=>{failed.value=false})
</script>
<template><span class="account-avatar"><img v-if="src&&!failed" :src="src" alt="管理员头像" @error="failed=true"/><span v-else>{{initial}}</span></span></template>
<style scoped>.account-avatar{display:inline-flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0}.account-avatar img{width:100%;height:100%;object-fit:cover;display:block}.account-avatar>span{line-height:1}</style>
