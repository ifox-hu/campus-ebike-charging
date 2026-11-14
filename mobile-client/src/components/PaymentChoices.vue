<template>
  <view class="payment-choices">
    <button v-for="method in paymentMethods" :key="method.id" :class="['channel-card',{selected:modelValue===method.id}]" :disabled="disabled" :aria-label="method.name+'（模拟）'" @click="$emit('update:modelValue',method.id)">
      <text :class="['channel-icon',method.id]">{{method.id==='wechat'?'微':'支'}}</text>
      <view class="channel-copy"><text class="channel-name">{{method.name}}</text><text class="channel-note">模拟支付 · 不扣款</text></view>
      <text class="channel-check">{{modelValue===method.id?'✓':'○'}}</text>
    </button>
  </view>
</template>
<script setup>
import {paymentMethods} from '../domain/charging.mjs';
defineProps({modelValue:String,disabled:Boolean});
defineEmits(['update:modelValue']);
</script>
<style scoped>
.payment-choices{display:flex;flex-direction:column;gap:10px;margin-top:14px}
.channel-card{display:flex;align-items:center;gap:12px;width:100%;min-height:64px;padding:12px 14px!important;border:1px solid #e8eef0!important;border-radius:12px!important;background:#fff!important;text-align:left;line-height:1.4}
.channel-card.selected{border-color:#20bdc8!important;background:#f0fbfb!important}
.channel-icon{display:flex;align-items:center;justify-content:center;width:36px;height:36px;flex-shrink:0;background:#08b85c;color:#fff;font-size:21px;font-weight:650;border-radius:10px}
.channel-icon.alipay{background:#1677ff}.channel-copy{display:flex;flex:1;min-width:0;flex-direction:column;gap:4px}
.channel-name{font-size:15px;font-weight:600;color:#26383f}.channel-note{font-size:11px;color:#7a8990}.channel-check{font-size:20px;color:#a8b6ba}.selected .channel-check{color:#13b6bf}
</style>
