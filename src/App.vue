<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { 
  Store, Package, Trash2, PieChart, BookOpen, 
  History as HistoryIcon, MapPin, ShoppingCart, Receipt, Crown, LogOut, Menu, X
} from 'lucide-vue-next'
import GlobalDialog from './components/GlobalDialog.vue'

const router = useRouter()
const route = useRoute()

const role = ref('')
const token = ref('')
const isMenuOpen = ref(false)
const isSidebarMinimized = ref(false)

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

const handleLogout = async () => {
  if (window.$dialog && await window.$dialog.confirm("Apakah Anda yakin ingin keluar?")) {
    localStorage.clear()
    updateAuthStatus()
    isMenuOpen.value = false
    router.push('/login')
  }
}
</script>

<template>
  <div class="h-screen w-full bg-slate-50 flex font-sans selection:bg-blue-200 overflow-hidden">
    <GlobalDialog />
    
    <!-- Sidebar -->
    <aside v-if="token && route.path !== '/login'" 
           :class="[
             isMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
             isSidebarMinimized ? 'md:w-20' : 'md:w-64'
           ]"
           class="fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transition-all duration-300 ease-in-out md:static md:flex md:flex-col shadow-xl overflow-hidden shrink-0">
        
        <div class="h-16 flex items-center px-4 border-b border-slate-800 shrink-0 transition-all duration-300" :class="isSidebarMinimized ? 'justify-center' : 'gap-3'">
            
            <!-- Brand Icon / Toggle Button -->
            <button @click="isSidebarMinimized = !isSidebarMinimized" class="bg-linear-to-br from-blue-400 to-blue-600 p-2 rounded-lg shadow-lg flex items-center justify-center shrink-0 hover:scale-105 active:scale-95 transition-transform" title="Toggle Menu">
                <Crown :size="20" class="text-white" />
            </button>

            <!-- Brand Text -->
            <router-link to="/dashboard" v-if="!isSidebarMinimized" class="whitespace-nowrap overflow-hidden transition-all duration-300 opacity-100 flex flex-col justify-center hover:opacity-80">
                <h1 class="font-black text-lg tracking-[0.2em] text-white leading-tight">
                    TIARA
                </h1>
                <p class="text-[10px] font-black tracking-[0.3em] text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-blue-200 uppercase">
                    Nota System
                </p>
            </router-link>

            <!-- Close button for mobile -->
            <button @click="isMenuOpen = false" class="md:hidden ml-auto text-slate-400 hover:text-white p-2">
                <X :size="24" />
            </button>
        </div>

        <div class="flex-1 overflow-y-auto overflow-x-hidden py-5 space-y-8 custom-scrollbar transition-all duration-300" :class="isSidebarMinimized ? 'px-2' : 'px-3'">
            
            <template v-if="role === 'superadmin'">
              <div class="space-y-1.5">
                  <span v-if="!isSidebarMinimized" class="text-[10px] font-black text-slate-500 uppercase tracking-wider px-3 mb-2 block whitespace-nowrap overflow-hidden">Master Data</span>
                  
                  <router-link to="/master-toko" title="Master Toko" class="py-2.5 rounded-xl text-sm font-bold flex items-center text-slate-300 hover:bg-slate-800 hover:text-white transition-colors" :class="isSidebarMinimized ? 'justify-center px-0' : 'px-3 gap-3'" active-class="!bg-blue-600 !text-white shadow-lg">
                      <Store :size="20" class="shrink-0" />
                      <span v-if="!isSidebarMinimized" class="whitespace-nowrap">Master Toko</span>
                  </router-link>
                  
                  <router-link to="/master-barang" title="Master Barang" class="py-2.5 rounded-xl text-sm font-bold flex items-center text-slate-300 hover:bg-slate-800 hover:text-white transition-colors" :class="isSidebarMinimized ? 'justify-center px-0' : 'px-3 gap-3'" active-class="!bg-blue-600 !text-white shadow-lg">
                      <Package :size="20" class="shrink-0" />
                      <span v-if="!isSidebarMinimized" class="whitespace-nowrap">Master Barang</span>
                  </router-link>
                  
                  <router-link to="/sampah" title="Sampah" class="py-2.5 rounded-xl text-sm font-bold flex items-center text-slate-300 hover:bg-slate-800 hover:text-white transition-colors" :class="isSidebarMinimized ? 'justify-center px-0' : 'px-3 gap-3'" exact-active-class="!bg-rose-600 !text-white shadow-md">
                      <Trash2 :size="20" class="shrink-0" />
                      <span v-if="!isSidebarMinimized" class="whitespace-nowrap">Sampah</span>
                  </router-link>
              </div>

              <div class="space-y-1.5">
                  <span v-if="!isSidebarMinimized" class="text-[10px] font-black text-slate-500 uppercase tracking-wider px-3 mb-2 block whitespace-nowrap overflow-hidden">Laporan</span>
                  
                  <router-link to="/rangkuman" title="Rangkuman" class="py-2.5 rounded-xl text-sm font-bold flex items-center text-slate-300 hover:bg-slate-800 hover:text-white transition-colors" :class="isSidebarMinimized ? 'justify-center px-0' : 'px-3 gap-3'" active-class="!bg-blue-600 !text-white shadow-lg">
                      <PieChart :size="20" class="shrink-0" />
                      <span v-if="!isSidebarMinimized" class="whitespace-nowrap">Rangkuman</span>
                  </router-link>
                  
                  <router-link to="/catatan-besar" title="Catatan Besar" class="py-2.5 rounded-xl text-sm font-bold flex items-center text-slate-300 hover:bg-slate-800 hover:text-white transition-colors" :class="isSidebarMinimized ? 'justify-center px-0' : 'px-3 gap-3'" active-class="!bg-blue-600 !text-white shadow-lg">
                      <BookOpen :size="20" class="shrink-0" />
                      <span v-if="!isSidebarMinimized" class="whitespace-nowrap">Catatan Besar</span>
                  </router-link>
              </div>
            </template>

            <div class="space-y-1.5">
                <span v-if="!isSidebarMinimized" class="text-[10px] font-black text-slate-500 uppercase tracking-wider px-3 mb-2 block whitespace-nowrap overflow-hidden">Operasional</span>
                
                <router-link to="/daftar-nota" :title="role === 'sales' ? 'Dashboard Kunjungan' : 'Riwayat Nota'" class="py-2.5 rounded-xl text-sm font-bold flex items-center text-slate-300 hover:bg-slate-800 hover:text-white transition-colors" :class="isSidebarMinimized ? 'justify-center px-0' : 'px-3 gap-3'" active-class="!bg-blue-600 !text-white shadow-lg">
                    <HistoryIcon v-if="role !== 'sales'" :size="20" class="shrink-0" />
                    <MapPin v-else :size="20" class="shrink-0" />
                    <span v-if="!isSidebarMinimized" class="whitespace-nowrap">{{ role === 'sales' ? 'Kunjungan' : 'Riwayat Nota' }}</span>
                </router-link>
                
                <router-link to="/buat-pesanan" title="Buat Pesanan" class="py-2.5 rounded-xl text-sm font-bold flex items-center text-slate-300 hover:bg-slate-800 hover:text-white transition-colors" :class="isSidebarMinimized ? 'justify-center px-0' : 'px-3 gap-3'" active-class="!bg-blue-600 !text-white shadow-lg">
                    <ShoppingCart :size="20" class="shrink-0" />
                    <span v-if="!isSidebarMinimized" class="whitespace-nowrap">Buat Pesanan</span>
                </router-link>
                
                <router-link to="/buat-nota" title="Buat Nota" class="py-2.5 rounded-xl text-sm font-bold flex items-center text-slate-300 hover:bg-slate-800 hover:text-white transition-colors" :class="isSidebarMinimized ? 'justify-center px-0' : 'px-3 gap-3'" active-class="!bg-blue-600 !text-white shadow-lg">
                    <Receipt :size="20" class="shrink-0" />
                    <span v-if="!isSidebarMinimized" class="whitespace-nowrap">Buat Nota</span>
                </router-link>
            </div>
        </div>

        <div class="p-4 border-t border-slate-800 shrink-0 transition-all duration-300 flex flex-col gap-3" :class="isSidebarMinimized ? 'p-2' : 'p-4'">
            <div v-if="!isSidebarMinimized" class="px-2 flex items-center gap-3">
               <div class="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-primary font-bold shadow-inner shrink-0">
                 {{ role ? role.charAt(0).toUpperCase() : '?' }}
               </div>
               <div class="overflow-hidden">
                 <p class="text-xs font-bold text-slate-200 capitalize truncate">{{ role }}</p>
                 <p class="text-[10px] text-slate-500 font-medium">Logged In</p>
               </div>
            </div>
            <button @click="handleLogout" title="Keluar Sistem" class="w-full flex items-center justify-center bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white rounded-xl text-sm font-bold transition-all shadow-sm group" :class="isSidebarMinimized ? 'py-3 px-0' : 'py-3 px-4 gap-2'">
                <LogOut :size="20" class="group-hover:-translate-x-1 transition-transform shrink-0" />
                <span v-if="!isSidebarMinimized" class="whitespace-nowrap">Keluar Sistem</span>
            </button>
        </div>
    </aside>

    <!-- Overlay for mobile when sidebar is open -->
    <div v-if="token && route.path !== '/login' && isMenuOpen" 
         @click="isMenuOpen = false" 
         class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300">
    </div>

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-slate-50">
        <!-- Mobile Header (Visible only on small screens) -->
        <header v-if="token && route.path !== '/login'" class="md:hidden h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0 shadow-sm sticky top-0 z-30">
            <div class="flex items-center gap-3">
                <button @click="isMenuOpen = true" class="text-slate-700 hover:text-primary transition-colors p-1">
                    <Menu :size="28" />
                </button>
                <div class="flex items-center gap-2">
                    <Crown :size="20" class="text-primary" />
                    <span class="font-black text-lg tracking-tight text-slate-800">TIARA <span class="text-xs text-primary bg-primary-light px-2 py-0.5 rounded uppercase font-bold ml-1">{{ role }}</span></span>
                </div>
            </div>
        </header>

        <!-- Main Scrollable Content -->
        <main class="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-4 md:p-8">
            <router-view v-slot="{ Component }">
                <transition name="fade" mode="out-in">
                    <component :is="Component" />
                </transition>
            </router-view>
        </main>
    </div>
  </div>
</template>

<style>
/* Custom Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
@media print {
  aside, header { display: none !important; }
  .overflow-hidden, .overflow-y-auto { overflow: visible !important; height: auto !important; }
}
</style>