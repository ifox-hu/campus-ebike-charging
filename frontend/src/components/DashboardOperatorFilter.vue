<script setup>
defineProps({
  modelValue: { type: String, default: '' },
  operators: { type: Array, default: () => [] },
  label: { type: String, default: '运营商' },
  disabled: Boolean,
});
const emit = defineEmits(['update:modelValue']);
</script>
<template>
  <label class="dashboard-operator-filter"
    ><span>{{ label }}</span
    ><select
      :value="modelValue"
      :aria-label="label"
      :disabled="disabled"
      @change="emit('update:modelValue', $event.target.value)"
    >
      <option value="">全部运营商</option>
      <option v-for="item in operators" :key="item.id" :value="item.id">{{ item.name }}</option>
    </select></label
  >
</template>
<style scoped>
.dashboard-operator-filter {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  font-size: 12px;
  color: #777;
  flex-wrap: wrap;
}
.dashboard-operator-filter select {
  min-width: 150px;
  max-width: 240px;
  padding: 9px 30px 9px 12px;
  border: 1px solid #e3e1ed;
  border-radius: 9px;
  background: #fff;
  color: #514c67;
  font: inherit;
  cursor: pointer;
}
.dashboard-operator-filter select:focus {
  outline: 2px solid #bdb5f6;
  outline-offset: 2px;
}
</style>
