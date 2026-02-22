<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import UHandsontable from './UHandsontable.vue'

const props = defineProps<{
  open: boolean
  title: string
  data: any[]
  headers: string[]
  validating: boolean // External control for validation phase
  validatingMessage?: string
  importing: boolean // For final confirm button
  description?: string
}>()

const emit = defineEmits(['update:open', 'confirm', 'file-selected'])

const isOpen = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val)
})

const fileInput = ref<HTMLInputElement | null>(null)

// Current internal step: 'upload' | 'preview'
const currentStep = ref<'upload' | 'preview'>('upload')

// If we receive data, move to preview (unless we are validating)
watch(
  () => props.data,
  (newData) => {
    if (newData && newData.length > 0) {
      currentStep.value = 'preview'
    } else if (!props.validating) {
      currentStep.value = 'upload'
    }
  }
)

// If modal closes, reset to upload step
watch(isOpen, (val) => {
  if (!val) {
    setTimeout(() => {
      currentStep.value = 'upload'
    }, 300)
  }
})

const triggerFileSelect = () => {
  fileInput.value?.click()
}

const onFileChanged = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    emit('file-selected', file)
    target.value = '' // Reset
  }
}

const hotSettings = computed(() => ({
  licenseKey: 'non-commercial-and-evaluation',
  data: props.data,
  colHeaders: props.headers,
  columns: props.headers.map((h) => ({
    data: h,
    readOnly: true,
    renderer: (
      _instance: any,
      td: HTMLElement,
      row: number,
      _col: number,
      prop: string,
      value: any,
      _cellProperties: any
    ) => {
      td.innerHTML = ''
      const rowData = props.data[row]
      const errorMsg = rowData?._errors?.[prop]

      const container = document.createElement('div')
      container.className = 'cell-container flex flex-col items-center justify-center h-full px-2'

      const valueSpan = document.createElement('span')
      valueSpan.className = 'font-bold leading-tight'
      valueSpan.textContent = value || ''
      container.appendChild(valueSpan)

      if (errorMsg) {
        td.classList.add('error-cell')
        td.title = errorMsg
        const errorSpan = document.createElement('span')
        errorSpan.className =
          'text-[10px] leading-none text-rose-700 font-bold text-center mt-1 truncate w-full px-1'
        errorSpan.textContent = errorMsg
        container.appendChild(errorSpan)
      } else {
        td.classList.remove('error-cell')
      }
      td.appendChild(container)
      return td
    }
  })),
  rowHeaders: (index: number) => props.data[index]?._row || index + 2,
  rowHeaderWidth: 50,
  rowHeights: 45,
  columnHeaderHeight: 45,
  height: 500,
  stretchH: 'all',
  autoRowSize: false,
  viewportRowRenderingOffset: 20,
  className: 'ht-theme-main htCenter htMiddle'
}))

const hasErrors = computed(() =>
  props.data.some((d) => d._errors && Object.keys(d._errors).length > 0)
)
const errorCount = computed(
  () => props.data.filter((d) => d._errors && Object.keys(d._errors).length > 0).length
)
const validCount = computed(() => props.data.length - errorCount.value)

const onConfirm = () => {
  emit('confirm')
}
</script>

<template>
  <UModal v-model:open="isOpen" :title="title" :description="description" fullscreen>
    <template #body>
      <div class="flex flex-col gap-4 h-full overflow-hidden relative">
        <input
          ref="fileInput"
          type="file"
          class="hidden"
          accept=".xlsx, .xls"
          @change="onFileChanged"
        />

        <!-- Phase 2: Premium Validation Loader Overlay -->
        <Transition name="fade">
          <div
            v-if="validating"
            class="absolute inset-0 bg-white/60 dark:bg-black/60 z-[200] flex items-center justify-center backdrop-blur-sm"
          >
            <div
              class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-10 shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full"
            >
              <div class="relative">
                <div
                  class="w-20 h-20 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"
                />
                <UIcon
                  name="i-lucide-file-search"
                  class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-primary-500"
                />
              </div>
              <div class="flex flex-col items-center gap-2 text-center">
                <span
                  class="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-tighter"
                >
                  {{ validatingMessage || 'Procesando archivo' }}
                </span>
                <p class="text-xs text-zinc-500 font-bold uppercase tracking-widest animate-pulse">
                  Verificando estructura y datos...
                </p>
              </div>
            </div>
          </div>
        </Transition>

        <!-- Phase 1: File Selection -->
        <div
          v-if="currentStep === 'upload' && !validating"
          class="flex-1 flex flex-col items-center justify-center p-8"
        >
          <div
            class="max-w-md w-full border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl p-12 flex flex-col items-center gap-8 bg-zinc-50/50 dark:bg-zinc-900/50 transition-all hover:border-primary-500/50"
          >
            <div
              class="w-24 h-24 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center shadow-xl ring-8 ring-zinc-100 dark:ring-zinc-800/50"
            >
              <UIcon name="i-lucide-upload-cloud" class="w-10 h-10 text-primary-500" />
            </div>
            <div class="text-center flex flex-col gap-2">
              <h3 class="text-xl font-black text-zinc-900 dark:text-white tracking-tight">
                Cargar documento para la importación
              </h3>
              <p class="text-sm text-zinc-500 font-medium">
                Sube tu archivo Excel (.xlsx) para validar los registros antes de integrarlos al
                sistema.
              </p>
            </div>
            <UButton
              label="Seleccionar Archivo"
              color="primary"
              size="xl"
              variant="solid"
              icon="i-lucide-file-plus"
              class="font-black px-10 rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all"
              @click="triggerFileSelect"
            />
          </div>
        </div>

        <!-- Phase 3: Preview -->
        <div
          v-if="currentStep === 'preview'"
          class="flex flex-col gap-4 h-full animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          <div
            class="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
          >
            <div class="flex gap-6">
              <div class="flex flex-col">
                <span class="text-xs text-zinc-500 uppercase font-bold tracking-wider"
                  >Total Filas</span
                >
                <span class="text-xl font-black text-zinc-900 dark:text-white">{{
                  data.length
                }}</span>
              </div>
              <div class="flex flex-col">
                <span class="text-xs text-green-500 uppercase font-bold tracking-wider"
                  >Válidas</span
                >
                <span class="text-xl font-black text-green-600">{{ validCount }}</span>
              </div>
              <div class="flex flex-col">
                <span class="text-xs text-rose-500 uppercase font-bold tracking-wider"
                  >Con Errores</span
                >
                <span class="text-xl font-black text-rose-600">{{ errorCount }}</span>
              </div>
            </div>

            <div
              v-if="hasErrors"
              class="flex items-center gap-2 text-rose-600 bg-rose-50 dark:bg-rose-900/20 px-4 py-2 rounded-lg border border-rose-200 dark:border-rose-800 shadow-sm"
            >
              <UIcon name="i-lucide-alert-circle" class="w-5 h-5 flex-shrink-0" />
              <span class="text-sm font-bold uppercase"
                >Se encontraron {{ errorCount }} errores. Corrígelos en el archivo original y vuelve
                a cargarlo.</span
              >
            </div>
            <div
              v-else-if="data.length > 0"
              class="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-lg border border-green-200 dark:border-green-800 shadow-sm"
            >
              <UIcon name="i-lucide-check-circle" class="w-5 h-5 flex-shrink-0" />
              <span class="text-sm font-bold uppercase"
                >¡Validación exitosa! Presiona confirmar para procesar la importación.</span
              >
            </div>
          </div>

          <div
            class="flex-1 min-h-[400px] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-black"
          >
            <UHandsontable :settings="hotSettings" :data="data" />
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3 w-full">
        <UButton
          v-if="currentStep === 'preview'"
          label="Cargar otro archivo"
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          class="font-bold rounded-xl px-6"
          @click="currentStep = 'upload'"
        />
        <UButton
          label="Cancelar"
          color="neutral"
          variant="ghost"
          class="font-bold rounded-xl"
          @click="isOpen = false"
        />
        <UButton
          v-if="currentStep === 'preview'"
          label="Confirmar e Importar"
          color="success"
          variant="solid"
          icon="i-lucide-check-circle"
          :disabled="hasErrors || data.length === 0"
          :loading="importing"
          class="font-black px-8 rounded-xl shadow-lg transition-all hover:scale-105"
          @click="onConfirm"
        />
      </div>
    </template>
  </UModal>
</template>

<style>
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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
