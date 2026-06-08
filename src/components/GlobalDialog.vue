<script setup>
import { ref, onMounted } from 'vue'
import { Info, HelpCircle } from 'lucide-vue-next'

const isOpen = ref(false)
const title = ref('')
const message = ref('')
const type = ref('info') // 'info', 'confirm'
const resolvePromise = ref(null)

const show = (options) => {
  title.value = options.title || (options.type === 'confirm' ? 'Konfirmasi' : 'Informasi')
  message.value = options.message || ''
  type.value = options.type || 'info'
  isOpen.value = true
  
  // Mencegah scroll di background
  document.body.style.overflow = 'hidden'

  return new Promise((resolve) => {
    resolvePromise.value = resolve
  })
}

const close = (result) => {
  isOpen.value = false
  document.body.style.overflow = ''
  if (resolvePromise.value) {
    resolvePromise.value(result)
    resolvePromise.value = null
  }
}

// Injeksi ke global window agar bisa dipanggil dari mana saja
onMounted(() => {
  window.$dialog = {
    alert: (msg) => show({ type: 'info', message: msg }),
    confirm: (msg) => show({ type: 'confirm', message: msg })
  }
})
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in custom-scrollbar">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up border-t-8 border-blue-500">
      
      <div class="p-6 text-center">
        <div class="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-blue-100 text-blue-600">
           <HelpCircle v-if="type === 'confirm'" :size="32" />
           <Info v-else :size="32" />
        </div>
        
        <h3 class="text-xl font-black text-gray-800 mb-2">{{ title }}</h3>
        <p class="text-sm text-gray-600 font-medium whitespace-pre-line">{{ message }}</p>
      </div>
      
      <div class="p-4 bg-gray-50 flex gap-3 justify-center border-t border-gray-100">
        <template v-if="type === 'confirm'">
          <button @click="close(false)" class="px-5 py-2.5 rounded-xl font-bold text-gray-600 bg-gray-200 hover:bg-gray-300 transition-colors w-full">Batal</button>
          <button @click="close(true)" class="px-5 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-all active:scale-95 w-full">Ya, Lanjutkan</button>
        </template>
        <template v-else>
          <button @click="close(true)" class="px-5 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-all active:scale-95 w-full">Mengerti</button>
        </template>
      </div>

    </div>
  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.2s ease-out; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
</style>
