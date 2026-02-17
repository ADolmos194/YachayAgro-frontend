<script setup lang="ts">
import { computed } from 'vue'
import UHandsontable from './UHandsontable.vue'

const props = defineProps<{
  open: boolean
  title: string
  data: any[]
  headers: string[]
  loading: boolean
  description?: string
}>()

const emit = defineEmits(['update:open', 'confirm'])

const isOpen = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val)
})

const hotSettings = computed(() => ({
  licenseKey: 'non-commercial-and-evaluation',
  data: props.data,
  colHeaders: props.headers,
  columns: props.headers.map(h => ({ 
    data: h, 
    readOnly: true,
    renderer: (_instance: any, td: HTMLElement, row: number, _col: number, prop: string, value: any, _cellProperties: any) => {
      // Clear cell
      td.innerHTML = '';
      
      const rowData = props.data[row];
      const errorMsg = rowData?._errors?.[prop];
      
      // Container
      const container = document.createElement('div');
      container.className = 'cell-container flex flex-col items-center justify-center h-full px-2';
      
      // Value
      const valueSpan = document.createElement('span');
      valueSpan.className = 'font-bold leading-tight';
      valueSpan.textContent = value || '';
      container.appendChild(valueSpan);
      
      // Error handling (Inline Message + Red background)
      if (errorMsg) {
        td.classList.add('error-cell');
        td.title = errorMsg; 
        
        const errorSpan = document.createElement('span');
        errorSpan.className = 'text-[10px] leading-none text-rose-700 font-bold text-center mt-1 truncate w-full px-1';
        errorSpan.textContent = errorMsg;
        container.appendChild(errorSpan);
      } else {
        td.classList.remove('error-cell');
        td.title = '';
      }
      
      td.appendChild(container);
      return td;
    }
  })),
  rowHeaders: (index: number) => {
    return props.data[index]?._row || (index + 2);
  },
  rowHeaderWidth: 50,
  rowHeights: 45,
  columnHeaderHeight: 45,
  height: 500, // Fixed height ensures visibility and internal scroll
  stretchH: 'all',
  autoRowSize: false,
  viewportRowRenderingOffset: 20,
  className: 'ht-theme-main htCenter htMiddle'
}))

const hasErrors = computed(() => props.data.some(d => d._errors && Object.keys(d._errors).length > 0))
const errorCount = computed(() => props.data.filter(d => d._errors && Object.keys(d._errors).length > 0).length)
const validCount = computed(() => props.data.length - errorCount.value)

const onConfirm = () => {
  emit('confirm')
}
</script>

<template>
  <UModal v-model:open="isOpen" :title="title" :description="description" fullscreen>
    <template #body>
      <div class="flex flex-col gap-4 h-full overflow-hidden">
        <!-- Summary Banner -->
        <div class="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <div class="flex gap-6">
            <div class="flex flex-col">
              <span class="text-xs text-zinc-500 uppercase font-bold tracking-wider">Total Filas</span>
              <span class="text-xl font-black text-zinc-900 dark:text-white">{{ data.length }}</span>
            </div>
            <div class="flex flex-col">
              <span class="text-xs text-green-500 uppercase font-bold tracking-wider">Válidas</span>
              <span class="text-xl font-black text-green-600">{{ validCount }}</span>
            </div>
            <div class="flex flex-col">
              <span class="text-xs text-rose-500 uppercase font-bold tracking-wider">Con Errores</span>
              <span class="text-xl font-black text-rose-600">{{ errorCount }}</span>
            </div>
          </div>
          
          <div v-if="hasErrors" class="flex items-center gap-2 text-rose-600 bg-rose-50 dark:bg-rose-900/20 px-4 py-2 rounded-lg border border-rose-200 dark:border-rose-800 shadow-sm">
            <UIcon name="i-lucide-alert-circle" class="w-5 h-5 flex-shrink-0" />
            <span class="text-sm font-bold">Resumiendo {{ errorCount }} filas con errores. Por favor, corrígelos en tu archivo original.</span>
          </div>
          <div v-else-if="data.length > 0" class="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-lg border border-green-200 dark:border-green-800 shadow-sm">
            <UIcon name="i-lucide-check-circle" class="w-5 h-5 flex-shrink-0" />
            <span class="text-sm font-bold">¡Todo correcto! Los datos están listos para ser importados.</span>
          </div>
        </div>

        <!-- Table Preview -->
        <div class="flex-1 min-h-[400px] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-inner bg-white dark:bg-black">
          <UHandsontable :settings="hotSettings" :data="data" />
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3 w-full">
        <UButton 
          label="Cancelar" 
          color="neutral" 
          variant="ghost" 
          class="font-bold rounded-xl"
          @click="isOpen = false" 
        />
        <UButton 
          label="Confirmar e Importar" 
          color="success" 
          variant="solid" 
          icon="i-lucide-check-circle"
          :disabled="hasErrors || data.length === 0"
          :loading="loading"
          class="font-black px-8 rounded-xl shadow-lg transition-all hover:scale-105"
          @click="onConfirm" 
        />
      </div>
    </template>
  </UModal>
</template>

<style>
/* Highlight only the specific cell with error */
.handsontable td.error-cell {
  background-color: #fee2e2 !important;
  color: #991b1b !important;
  box-shadow: inset 0 0 0 1px #fecaca !important;
  font-weight: 600 !important;
}

.dark .handsontable td.error-cell {
  background-color: rgba(239, 68, 68, 0.2) !important;
  color: #fca5a5 !important;
  box-shadow: inset 0 0 0 1px rgba(239, 68, 68, 0.3) !important;
}

/* Ensure tooltip styling for row headers if needed */
.handsontable .rowHeader {
  font-weight: 700 !important;
  color: #71717a !important;
}
</style>
