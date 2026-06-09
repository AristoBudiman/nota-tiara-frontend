<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { FileText, AlertCircle, Loader2, Server } from 'lucide-vue-next'

const router = useRouter()
const username = ref('')
const password = ref('')
const errorMsg = ref('')
const isLoading = ref(false)

// Ping server di awal agar Render mulai bangun lebih cepat
onMounted(() => {
  fetch(`${import.meta.env.VITE_API_URL}/`).catch(() => {})
})

const handleLogin = async () => {
  isLoading.value = true
  errorMsg.value = ''

  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.value, password: password.value })
    })
    const data = await res.json()

    if (res.ok) {
      if (data.role !== 'Superadmin' && (!data.permissions || !data.permissions.includes('app_nota'))) {
        errorMsg.value = "Akses Ditolak! Anda tidak memiliki izin ke Sistem Nota."
        return
      }
      
      localStorage.setItem('admin_token', data.token)
      localStorage.setItem('admin_role', data.role)
      localStorage.setItem('admin_permissions', JSON.stringify(data.permissions || []))
      
      // Arahkan sesuai jabatan
      if (data.role === 'Sales') {
        router.push('/dashboard-sales')
      } else {
        router.push('/dashboard')
      }
    } else {
      errorMsg.value = data.error || 'Username atau Password salah!'
    }
  } catch (err) {
    errorMsg.value = "Gagal terhubung. Pastikan server aktif atau periksa internet Anda."
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 md:pt-4 pb-4">
    
    <div class="bg-white min-h-[85vh] w-full rounded-2xl border border-gray-200 shadow-sm flex items-center justify-center font-sans text-slate-900">
      
      <div class="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100">
        
        <div class="text-center mb-8">
          <div class="mx-auto bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mb-4 border border-blue-100 shadow-sm">
            <FileText :size="32" class="text-blue-800" stroke-width="1.5" />
          </div>
          <h1 class="text-2xl font-black text-blue-900 tracking-tight">Tiara Bakery</h1>
          <p class="text-slate-500 text-sm font-medium mt-1">Sistem Nota & Penjualan</p>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-5">
          
          <div v-if="errorMsg" class="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start">
            <AlertCircle :size="20" class="text-red-500 mr-2 shrink-0" stroke-width="2.5" />
            <p class="text-sm text-red-700 font-bold">{{ errorMsg }}</p>
          </div>
          
          <div>
            <label class="block text-slate-700 text-sm font-bold mb-1.5">Username</label>
            <input 
              v-model="username" 
              type="text" 
              class="w-full bg-white text-slate-900 border border-slate-300 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 transition-shadow font-medium" 
              placeholder="Masukkan username"
              required
              :disabled="isLoading"
            >
          </div>
          
          <div>
            <label class="block text-slate-700 text-sm font-bold mb-1.5">Password</label>
            <input 
              v-model="password" 
              type="password" 
              class="w-full bg-white text-slate-900 border border-slate-300 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 transition-shadow font-medium" 
              placeholder="••••••••"
              required
              :disabled="isLoading"
            >
          </div>

          <div v-if="isLoading" class="bg-blue-50 border border-blue-200 p-3 rounded-lg flex items-start gap-3 mt-2">
              <Server :size="24" class="text-blue-500 animate-pulse shrink-0" stroke-width="2" />
              <div>
                 <p class="text-sm font-bold text-blue-900">Membangunkan server...</p>
                 <p class="text-[10px] font-medium text-blue-700 leading-tight mt-0.5">Mohon tunggu sekitar 50 detik jika ini login pertama. Sistem sedang menyiapkan database.</p>
              </div>
          </div>

          <button 
            type="submit" 
            :disabled="isLoading"
            class="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-bold text-white bg-blue-900 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-900 transition-colors disabled:opacity-70 disabled:cursor-not-allowed mt-6 active:scale-[0.98]"
          >
            <span v-if="isLoading" class="flex items-center">
              <Loader2 :size="16" class="animate-spin -ml-1 mr-2 text-white" stroke-width="3" />
              Memverifikasi...
            </span>
            <span v-else>Masuk Sistem</span>
          </button>
        </form>
        
      </div>
    </div>
  </div>
</template>