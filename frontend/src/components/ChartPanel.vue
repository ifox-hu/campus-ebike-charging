<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import * as echarts from 'echarts/core'
import { LineChart, BarChart, PieChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, GraphicComponent } from 'echarts/components'
import { SVGRenderer } from 'echarts/renderers'
echarts.use([LineChart, BarChart, PieChart, GridComponent, TooltipComponent, LegendComponent, GraphicComponent, SVGRenderer])
const props = defineProps({ option: Object, label: String, initialTip: Number })
const host = ref(null)
let chart, observer,settingsObserver
function scaled(value,scale,key=''){if(Array.isArray(value))return value.map(v=>scaled(v,scale));if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,scaled(v,scale,k)]));if(key==='fontSize'&&typeof value==='number')return value*scale;if(key==='font'&&typeof value==='string')return value.replace(/(\d+(?:\.\d+)?)px/g,(_,n)=>`${Number(n)*scale}px`);return value}
function apply() { if(chart){const scale=Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui-font-scale'))||1;chart.setOption(scaled(props.option,scale), { notMerge: true });chart.resize()} }
onMounted(() => {
  chart = echarts.init(host.value, null, { renderer: 'svg' })
  apply()
  observer = new ResizeObserver(() => { chart?.resize() })
  observer.observe(host.value)
  settingsObserver=new MutationObserver(apply);settingsObserver.observe(document.documentElement,{attributes:true,attributeFilter:['style','data-font-size']})
})
watch(() => props.option, apply, {deep: true})
onBeforeUnmount(() => { observer?.disconnect();settingsObserver?.disconnect(); chart?.dispose(); chart = null })
</script>
<template><div ref="host" class="chart-canvas" role="img" :aria-label="label"></div></template>
