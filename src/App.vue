<template>
  <div v-if="!isLoginPage">
    <nav class="p-4 bg-blue-600 text-white flex justify-between items-center shadow-md no-print">
      <div class="flex gap-6">
        <router-link to="/buat-nota" class="hover:text-blue-200 transition font-medium">Tambah Nota</router-link>
        <router-link to="/daftar-nota" class="hover:text-blue-200 transition font-medium">Riwayat Nota</router-link> 
        <router-link to="/catatan-besar" class="hover:text-blue-200 transition font-medium">Catatan Besar</router-link>
        <router-link to="/rangkuman" class="hover:text-blue-200 transition font-medium">📊 Rangkuman</router-link>
        
        <div class="border-l border-blue-400 mx-2"></div>
        
        <router-link to="/master-toko" class="hover:text-blue-200 transition font-medium">🏪 Master Toko</router-link>
        <router-link to="/master-barang" class="hover:text-blue-200 transition font-medium">📦 Master Barang</router-link>
      </div>

      <button 
        @click="handleLogout" 
        class="bg-red-500 hover:bg-red-700 px-4 py-1.5 rounded-lg text-sm font-bold transition flex items-center gap-2"
      >
        <span>🚪</span> Keluar
      </button>
    </nav>

    <main class="bg-gray-100 min-h-screen">
      <router-view :key="$route.fullPath" />
    </main>
  </div>

  <div v-else>
    <router-view :key="$route.fullPath" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

// Cek apakah sekarang sedang di halaman login agar navbar bisa disembunyikan
const isLoginPage = computed(() => route.path === '/login')

const handleLogout = () => {
  if (confirm('Apakah Anda yakin ingin keluar?')) {
    // 1. Hapus Token
    localStorage.removeItem('admin_token')
    // 2. Tendang ke halaman login
    router.push('/login')
  }
}
</script>

<style scoped>
.router-link-active {
  font-weight: bold;
  text-decoration: underline;
  text-underline-offset: 4px;
}
</style>