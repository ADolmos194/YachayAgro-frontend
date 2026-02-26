<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { HotTable } from '@handsontable/vue3'
import { registerAllModules } from 'handsontable/registry'

// Import mandatory Handsontable styles
import 'handsontable/styles/handsontable.css'
import 'handsontable/styles/ht-theme-main.css'

// Register all modules
registerAllModules()

const props = defineProps<{
  settings: any
  data: any[]
}>()

const hotTableRef = ref<InstanceType<typeof HotTable> | null>(null)

// Manually load data on change to ensure reactivity
watch(
  () => props.data,
  (newData) => {
    if (hotTableRef.value?.hotInstance) {
      hotTableRef.value.hotInstance.loadData(newData)
    }
  },
  { deep: true }
)

// Initial load
onMounted(() => {
  if (props.data && props.data.length > 0 && hotTableRef.value?.hotInstance) {
    hotTableRef.value.hotInstance.loadData(props.data)
  }
})

defineExpose({
  getHotInstance: () => hotTableRef.value?.hotInstance
})
</script>

<template>
  <div class="handsontable-wrapper w-full h-full relative overflow-hidden">
    <HotTable ref="hotTableRef" :settings="props.settings" />
  </div>
</template>

<style>
.handsontable {
  font-family: inherit !important;
  font-size: 13px !important;
}

.wtHolder {
  width: 100% !important;
}

.handsontable th {
  font-weight: 600 !important;
}

.dark .handsontable {
  --hot-border-color: #27272a; /* Zinc-800 */
  --hot-bg-color: #09090b; /* Zinc-950 */
  --hot-text-color: #d4d4d8; /* Zinc-300 */
}
/* Fix selection borders in dark mode */
.dark .handsontable .wtBorder {
  background-color: #3b82f6 !important; /* Primary blue for selection */
}

.dark .handsontable .wtBorder.current {
  background-color: #3b82f6 !important;
}

.dark .handsontable .wtBorder.area {
  background-color: #3b82f6 !important;
}

/* Fix for white line in column headers */
.dark .handsontable th {
  background-color: #18181b !important; /* Zinc-900 */
  border-color: #27272a !important;
}
</style>
