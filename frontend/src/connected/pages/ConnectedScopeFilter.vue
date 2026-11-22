<script setup>
defineProps({ scope: Object, stationName: String });
defineEmits(['clear']);
</script>

<template>
  <p
    v-if="scope.stationId || scope.abnormalOnly || scope.date"
    class="remote-message scope-indicator"
  >
    当前范围：{{ scope.stationId ? stationName : '全部站点' }}
    {{ scope.abnormalOnly ? '· 异常设备' : '' }}
    {{ scope.date ? '· 开始日期 ' + scope.date : '' }}
    <button class="text-button" @click="$emit('clear')">清除关联筛选</button>
  </p>
</template>
