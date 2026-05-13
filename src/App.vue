<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const role = ref('')
const token = ref('')
const isMenuOpen = ref(false)

// Fungsi untuk mengecek status login terbaru
const updateAuthStatus = () => {
  role.value = localStorage.getItem('admin_role') || ''
  token.value = localStorage.getItem('admin_token') || ''
}

// Pantau setiap kali pindah halaman untuk memastikan menu update (misal setelah login)
watch(() => route.path, () => {
  updateAuthStatus()
  isMenuOpen.value = false
})

onMounted(() => {
  updateAuthStatus()
})

const handleLogout = () => {
  if (confirm("Apakah Anda yakin ingin keluar?")) {
    localStorage.clear()
    updateAuthStatus()
    isMenuOpen.value = false
    router.push('/login')
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <nav v-if="token && route.path !== '/login'" class="bg-blue-900 text-white shadow-lg no-print sticky top-0 z-50">
      <div class="max-w-6xl mx-auto px-4">
        <div class="flex flex-col md:flex-row justify-between md:items-center py-3 md:py-0 md:h-16">
          
          <div class="flex items-center w-full md:w-auto mb-2 md:mb-0">
            
            <button @click="isMenuOpen = !isMenuOpen" class="md:hidden p-1 mr-3 text-blue-200 hover:text-white focus:outline-none">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path v-if="!isMenuOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>

            <div class="flex items-center gap-2">
              <span class="text-xl font-black tracking-tighter">TIARA</span>
              <span class="text-[10px] bg-blue-700 px-2 py-0.5 rounded uppercase font-bold text-blue-200">
                {{ role }}
              </span>
            </div>
            
          </div>

          <div :class="isMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'" 
               class="absolute md:static top-full left-0 w-64 md:w-auto h-screen md:h-auto bg-blue-900 md:bg-transparent p-5 md:p-0 transform md:transform-none transition-transform duration-300 ease-in-out flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-1 shadow-2xl md:shadow-none border-r border-blue-800 md:border-none overflow-y-auto md:overflow-visible">
            
            <template v-if="role === 'superadmin'">
              <div class="hidden md:block h-6 w-px bg-blue-800 mx-2"></div>
              
              <router-link to="/master-toko" class="px-3 py-3 md:py-2 rounded-md text-sm text-blue-100 hover:bg-blue-800 hover:text-white transition-colors">Master Toko</router-link>
              <router-link to="/master-barang" class="px-3 py-3 md:py-2 rounded-md text-sm text-blue-100 hover:bg-blue-800 hover:text-white transition-colors">Master Barang</router-link>
              <router-link to="/sampah" class="px-3 py-3 md:py-2 rounded-md text-sm text-red-200 hover:bg-red-700 hover:text-white transition-colors">🗑️ Sampah</router-link>
              
              <router-link to="/rangkuman" class="px-3 py-3 md:py-2 rounded-md text-sm text-blue-100 hover:bg-blue-800 hover:text-white transition-colors">Rangkuman</router-link>
              <router-link to="/catatan-besar" class="px-3 py-3 md:py-2 rounded-md text-sm text-blue-100 hover:bg-blue-800 hover:text-white transition-colors">Catatan Besar</router-link>
            </template>
            
            <router-link to="/daftar-nota" class="px-3 py-3 md:py-2 rounded-md text-sm text-blue-100 hover:bg-blue-800 hover:text-white transition-colors">
              {{ role === 'sales' ? 'Dashboard Kunjungan' : 'Riwayat Nota' }}
            </router-link>
            <router-link to="/buat-pesanan" class="px-3 py-3 md:py-2 rounded-md text-sm text-blue-100 hover:bg-blue-800 hover:text-white transition-colors">Buat Pesanan</router-link>
            <router-link to="/buat-nota" class="px-3 py-3 md:py-2 rounded-md text-sm text-blue-100 hover:bg-blue-800 hover:text-white transition-colors">Buat Nota</router-link>

            <button @click="handleLogout" class="mt-2 md:mt-0 text-left md:text-center md:ml-4 bg-red-600 hover:bg-red-700 px-4 py-3 md:py-1.5 rounded-lg text-sm font-bold transition">
              Logout
            </button>
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
.router-link-active {
  font-weight: bold;
  text-decoration: underline;
  text-underline-offset: 4px;
  color: white;
}

@media print {
  .no-print { display: none !important; }
}
</style>