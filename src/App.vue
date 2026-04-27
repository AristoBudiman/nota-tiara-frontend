<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const role = ref('')
const token = ref('')

// Fungsi untuk mengecek status login terbaru
const updateAuthStatus = () => {
  role.value = localStorage.getItem('admin_role') || ''
  token.value = localStorage.getItem('admin_token') || ''
}

// Pantau setiap kali pindah halaman untuk memastikan menu update (misal setelah login)
watch(() => route.path, () => {
  updateAuthStatus()
})

onMounted(() => {
  updateAuthStatus()
})

const handleLogout = () => {
  if (confirm("Apakah Anda yakin ingin keluar?")) {
    localStorage.clear()
    updateAuthStatus()
    router.push('/login')
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <nav v-if="token && route.path !== '/login'" class="bg-blue-900 text-white shadow-lg no-print">
      <div class="max-w-6xl mx-auto px-4">
        <div class="flex justify-between items-center h-16">
          
          <div class="flex items-center gap-2">
            <span class="text-xl font-black tracking-tighter">TIARA NOTA</span>
            <span class="text-[10px] bg-blue-700 px-2 py-0.5 rounded uppercase font-bold text-blue-200">
              {{ role }}
            </span>
          </div>

          <div class="hidden md:flex items-center gap-1">
            
            <template v-if="role === 'superadmin'">
              <router-link to="/catatan-besar" class="px-3 py-2 rounded-md text-sm text-blue-100 hover:bg-blue-800 hover:text-white transition-colors">Catatan Besar</router-link>
              <router-link to="/rangkuman" class="px-3 py-2 rounded-md text-sm text-blue-100 hover:bg-blue-800 hover:text-white transition-colors">Rangkuman</router-link>
              
              <div class="h-6 w-px bg-blue-800 mx-2"></div> <router-link to="/master-toko" class="px-3 py-2 rounded-md text-sm text-blue-100 hover:bg-blue-800 hover:text-white transition-colors">Master Toko</router-link>
              <router-link to="/master-barang" class="px-3 py-2 rounded-md text-sm text-blue-100 hover:bg-blue-800 hover:text-white transition-colors">Master Barang</router-link>
            </template>

            <router-link to="/daftar-nota" class="px-3 py-2 rounded-md text-sm text-blue-100 hover:bg-blue-800 hover:text-white transition-colors">
              {{ role === 'sales' ? 'Dashboard Kunjungan' : 'Riwayat Nota' }}
            </router-link>
            <router-link to="/buat-nota" class="px-3 py-2 rounded-md text-sm text-blue-100 hover:bg-blue-800 hover:text-white transition-colors">Buat Nota</router-link>

            <button @click="handleLogout" class="ml-4 bg-red-600 hover:bg-red-700 px-4 py-1.5 rounded-lg text-sm font-bold transition">
              Logout
            </button>
          </div>

          <div class="md:hidden text-xs italic opacity-70">
            Mode {{ role }}
          </div>
        </div>
      </div>
    </nav>

    <main class="py-4">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
/* CSS standar sesuai permintaanmu, tanpa @apply */
.router-link-active {
  font-weight: bold;
  text-decoration: underline;
  text-underline-offset: 4px;
  color: white; /* Memastikan teks menjadi terang putih saat aktif */
}

@media print {
  .no-print { display: none !important; }
}
</style>