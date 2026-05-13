<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const username = ref('')
const password = ref('')
const errorMsg = ref('')
const isLoading = ref(false) // Variabel baru untuk mengunci tombol

const handleLogin = async () => {
  isLoading.value = true // Kunci layar dan tampilkan pesan pemanasan server
  errorMsg.value = ''

  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.value, password: password.value })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)

    if (data.role !== 'superadmin' && data.role !== 'sales') {
      throw new Error(`Akses Ditolak! Kasta '${data.role}' tidak memiliki akses ke Sistem Nota.`)
    }
    
    localStorage.setItem('admin_token', data.token)
    localStorage.setItem('admin_role', data.role)
    
    // Arahkan sesuai jabatan
    if (data.role === 'sales') {
      router.push('/daftar-nota')
    } else {
      router.push('/catatan-besar')
    }
  } catch (err) {
    errorMsg.value = "Gagal terhubung. Pastikan server aktif atau periksa internet Anda."
  } finally {
    isLoading.value = false // Buka kembali kunci layar jika selesai/gagal
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100">
    <div class="bg-white p-8 rounded-lg shadow-md w-96">
      <h1 class="text-2xl font-bold mb-6 text-center">Login Tiara</h1>
      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Username</label>
          <input v-model="username" type="text" required class="w-full border p-2 rounded mt-1" :disabled="isLoading">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Password</label>
          <input v-model="password" type="password" required class="w-full border p-2 rounded mt-1" :disabled="isLoading">
        </div>
        
        <div v-if="isLoading" class="text-sm font-bold text-blue-600 bg-blue-50 p-3 rounded border border-blue-200">
          ⏳ Membangunkan server database...<br>
          <span class="text-xs text-gray-600 font-normal">Mohon tunggu sekitar 50 detik. Ini hanya terjadi pada login pertama.</span>
        </div>

        <p v-if="errorMsg" class="text-red-500 text-sm font-bold">{{ errorMsg }}</p>
        
        <button type="submit" :disabled="isLoading" class="w-full text-white p-2 rounded font-bold transition" :class="isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'">
          {{ isLoading ? 'Menghubungkan...' : 'Login' }}
        </button>
      </form>
    </div>
  </div>
</template>