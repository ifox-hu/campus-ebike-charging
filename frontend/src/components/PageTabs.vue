<script setup>
import { nextTick, ref, watch } from 'vue'
import { navigation } from '../data.js'
import UiIcon from './UiIcon.vue'

const props = defineProps({ tabs: { type: Array, required: true }, currentPage: { type: String, required: true } })
const emit = defineEmits(['select', 'close'])
const list = ref(null)
const label = page => navigation.find(item => item.id === page)?.label || page

watch(() => [props.currentPage, props.tabs.length], async () => {
  await nextTick()
  list.value?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
})
</script>

<template>
  <nav ref="list" class="page-tabs" aria-label="已打开的页面">
    <div v-for="tab in tabs" :key="tab.page" class="page-tab" :class="{ 'is-active': currentPage === tab.page }">
      <button type="button" class="page-tab-link" :aria-current="currentPage === tab.page ? 'page' : undefined" @click="emit('select', tab)">
        <i aria-hidden="true"></i><span>{{ label(tab.page) }}</span>
      </button>
      <button v-if="tabs.length > 1" type="button" class="page-tab-close" :aria-label="`关闭${label(tab.page)}页面`" :title="`关闭${label(tab.page)}`" @click="emit('close', tab.page)"><UiIcon name="close" size=".85rem"/></button>
    </div>
  </nav>
</template>

<style scoped>
.page-tabs{display:flex;align-items:center;gap:.5rem;flex:1;min-width:0;overflow-x:auto;overscroll-behavior-x:contain;scrollbar-width:thin;padding:.35rem .15rem}
.page-tab{display:flex;align-items:center;flex-shrink:0;border-radius:2rem;background:#ffffff80;color:#70758a;transition:background-color .15s,color .15s}
.page-tab:hover{background:#ededff;color:#5555d8}
.page-tab.is-active{background:#6263ff;color:white}
.page-tab-link{display:flex;align-items:center;gap:.5rem;min-height:2rem;padding:.37rem .65rem;font-size:.9rem;white-space:nowrap;border-radius:2rem}
.page-tab-link i{width:.4rem;height:.4rem;background:currentColor;border-radius:50%;flex-shrink:0;opacity:.5}
.is-active .page-tab-link i{opacity:1}
.page-tab-close{display:flex;align-items:center;justify-content:center;width:1.55rem;height:1.55rem;margin-right:.3rem;border-radius:50%;color:inherit;flex-shrink:0}
.page-tab-close:hover{background:#6263ff20}
.is-active .page-tab-close:hover{background:#ffffff40}
.page-tab-link:focus-visible,.page-tab-close:focus-visible{outline:2px solid #3131a0;outline-offset:1px}
@media(max-width:700px){.page-tabs{width:100%}}
</style>
