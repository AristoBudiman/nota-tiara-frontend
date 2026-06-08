<script setup>
import { ref, onMounted } from 'vue'
import { LayoutDashboard, Receipt, ShoppingCart, TrendingUp, Clock, AlertCircle, Award, Calendar } from 'lucide-vue-next'

const totalPendapatanBulanIni = ref(0)
const totalPendapatanHariIni = ref(0)
const jumlahNotaHariIni = ref(0)
const jumlahPesananAktif = ref(0)
const recentNota = ref([])
const topProduk = ref([])
const isFetching = ref(false)

const getLocalDateString = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0]
const todayStr = getLocalDateString(new Date())
const monthStr = todayStr.substring(0, 7) // 'YYYY-MM'

const fetchDashboardData = async () => {
  isFetching.value = true
  try {
    const token = localStorage.getItem('admin_token')
    const headers = { 'Authorization': `Bearer ${token}` }
    
    // Get last day of month
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const firstDayStr = getLocalDateString(firstDay)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const lastDayStr = getLocalDateString(lastDay)

    const [resNota, resPesanan, resRangkumanBulan, resRangkumanHari] = await Promise.all([
      fetch(`${import.meta.env.VITE_API_URL}/api/notas`, { headers }),
      fetch(`${import.meta.env.VITE_API_URL}/api/pesanan/riwayat`, { headers }),
      fetch(`${import.meta.env.VITE_API_URL}/api/rangkuman?start=${firstDayStr}&end=${lastDayStr}`, { headers }),
      fetch(`${import.meta.env.VITE_API_URL}/api/rangkuman?start=${todayStr}&end=${todayStr}`, { headers })
    ])
    
    if (resNota.ok) {
       const data = await resNota.json() || []
       
       const notaBulanIni = data.filter(n => n.TanggalKirim && n.TanggalKirim.startsWith(monthStr))
       const notaHariIni = data.filter(n => n.TanggalKirim && n.TanggalKirim.startsWith(todayStr))
       
       if (resRangkumanBulan.ok) {
         const dataBulan = await resRangkumanBulan.json()
         totalPendapatanBulanIni.value = dataBulan.kirim || 0
       }
       if (resRangkumanHari.ok) {
         const dataHari = await resRangkumanHari.json()
         totalPendapatanHariIni.value = dataHari.kirim || 0
       }
       jumlahNotaHariIni.value = notaHariIni.length
       
       // Sort descending by ID to get the newest
       recentNota.value = notaHariIni.sort((a,b) => b.ID - a.ID).slice(0, 5)

       // Calculate Top 5 Products this month
       const produkMap = {}
       notaBulanIni.forEach(nota => {
         if (nota.Details) {
           nota.Details.forEach(d => {
             const key = d.NamaBarangSnapshot || (d.Barang && d.Barang.NamaBarang) || 'Barang'
             if (!produkMap[key]) produkMap[key] = { nama: key, qty: 0, omzet: 0 }
             produkMap[key].qty += d.BanyakKirim
             produkMap[key].omzet += d.HargaKirim
           })
         }
       })
       topProduk.value = Object.values(produkMap).sort((a,b) => b.qty - a.qty).slice(0, 5)
    }
    
    if (resPesanan.ok) {
       const data = await resPesanan.json() || []
       const pesananAktif = Array.isArray(data) ? data.filter(p => p.Status !== 'DIAMBIL' && p.Status !== 'DIBATALKAN') : []
       jumlahPesananAktif.value = pesananAktif.length
    }
  } catch (err) {
    console.error(err)
  } finally {
    isFetching.value = false
  }
}

const formatRp = (val) => new Intl.NumberFormat('id-ID').format(val || 0)

onMounted(() => {
  fetchDashboardData()
})
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-6 animate-fade-in">
    
    <!-- Header Section -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 gap-6">
      <div class="flex items-center gap-5">
        <div class="bg-linear-to-br from-blue-400 to-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 shrink-0 text-white">
          <LayoutDashboard :size="32" />
        </div>
        <div>
          <h1 class="text-3xl font-black text-slate-800 tracking-tight">Dashboard Penjualan</h1>
          <p class="text-sm text-slate-500 font-medium mt-1.5 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-blue-500"></span>
            Ringkasan transaksi dan analitik penjualan
          </p>
        </div>
      </div>
      <div class="text-right hidden md:block">
        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal Laporan</p>
        <p class="text-sm font-bold text-slate-700 mt-0.5">{{ new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) }}</p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isFetching" class="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
      <p class="text-slate-500 font-medium">Memuat data analitik...</p>
    </div>

    <div v-else class="space-y-6">
      
      <!-- Highlight Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <!-- Total Pendapatan Bulanan (Besar) -->
        <div class="bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-800 flex flex-col justify-center relative overflow-hidden shadow-xl lg:col-span-2">
          <div class="absolute -right-10 -top-10 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl"></div>
          <div class="absolute -left-10 -bottom-10 w-48 h-48 bg-sky-500/20 rounded-full blur-3xl"></div>
          <div class="relative z-10 flex justify-between items-start">
            <div>
              <p class="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Omzet Bulan Ini</p>
              <div class="mt-2 flex items-baseline gap-2">
                <span class="text-2xl font-black text-blue-400/80">Rp</span>
                <span class="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-md">
                  {{ formatRp(totalPendapatanBulanIni) }}
                </span>
              </div>
            </div>
            <div class="p-3 bg-white/10 rounded-2xl backdrop-blur-md hidden sm:block">
              <TrendingUp :size="32" class="text-blue-300" />
            </div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <Calendar :size="20" />
            </div>
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hari Ini</p>
          </div>
          <div>
            <p class="text-2xl font-black text-slate-800">Rp {{ formatRp(totalPendapatanHariIni) }}</p>
            <p class="text-xs font-bold text-slate-400 mt-1">Dari <span class="text-blue-600">{{ jumlahNotaHariIni }}</span> Nota Baru</p>
          </div>
        </div>
        
        <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
              <ShoppingCart :size="20" />
            </div>
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pesanan</p>
          </div>
          <div>
            <p class="text-3xl font-black text-slate-800">{{ jumlahPesananAktif }} <span class="text-sm font-bold text-slate-400">PO Aktif</span></p>
            <p class="text-[10px] font-bold text-amber-500 mt-1 uppercase tracking-wider">Belum Diambil</p>
          </div>
        </div>

      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <!-- Recent Transactions Table -->
        <div class="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm flex flex-col">
          <div class="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
            <h3 class="text-sm font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Clock :size="18" class="text-slate-400" />
              5 Nota Terakhir (Hari Ini)
            </h3>
            <router-link to="/daftar-nota" class="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors uppercase tracking-wider">
              Lihat
            </router-link>
          </div>
          
          <div class="overflow-x-auto flex-1">
            <table class="w-full text-left text-sm whitespace-nowrap h-full">
              <thead class="bg-white border-b border-slate-100 text-[10px] uppercase font-black text-slate-400 tracking-wider">
                <tr>
                  <th class="px-6 py-4">No. Nota</th>
                  <th class="px-6 py-4">Pelanggan</th>
                  <th class="px-6 py-4 text-center">Status</th>
                  <th class="px-6 py-4 text-right">Nilai</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">
                <tr v-if="recentNota.length === 0">
                  <td colspan="4" class="px-6 py-12 text-center h-full">
                    <div class="flex flex-col items-center justify-center h-full text-slate-400">
                      <AlertCircle :size="32" class="mb-3 opacity-50" />
                      <p class="font-medium">Belum ada penjualan hari ini.</p>
                    </div>
                  </td>
                </tr>
                <tr v-for="nota in recentNota" :key="nota.ID" class="hover:bg-slate-50/50 transition-colors">
                  <td class="px-6 py-4 font-bold text-slate-700">#{{ nota.NoNota }}</td>
                  <td class="px-6 py-4 font-medium text-slate-600">{{ nota.Toko ? nota.Toko.NamaToko : 'Umum' }}</td>
                  <td class="px-6 py-4 text-center">
                    <span v-if="nota.is_lunas" class="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border border-emerald-200/50">Lunas</span>
                    <span v-else class="bg-rose-50 text-rose-600 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border border-rose-200/50">Hutang</span>
                  </td>
                  <td class="px-6 py-4 text-right font-black text-slate-800">Rp {{ formatRp(nota.TotalBayar) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Top Products -->
        <div class="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm flex flex-col">
          <div class="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
            <h3 class="text-sm font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Award :size="18" class="text-yellow-500" />
              5 Produk Terlaris Bulan Ini
            </h3>
          </div>
          
          <div class="overflow-x-auto flex-1">
            <table class="w-full text-left text-sm whitespace-nowrap h-full">
              <thead class="bg-white border-b border-slate-100 text-[10px] uppercase font-black text-slate-400 tracking-wider">
                <tr>
                  <th class="px-6 py-4">Nama Produk</th>
                  <th class="px-6 py-4 text-center">Terjual</th>
                  <th class="px-6 py-4 text-right">Sumbangan Omzet</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">
                <tr v-if="topProduk.length === 0">
                  <td colspan="3" class="px-6 py-12 text-center h-full">
                    <div class="flex flex-col items-center justify-center h-full text-slate-400">
                      <AlertCircle :size="32" class="mb-3 opacity-50" />
                      <p class="font-medium">Belum ada data penjualan bulan ini.</p>
                    </div>
                  </td>
                </tr>
                <tr v-for="(prod, idx) in topProduk" :key="prod.nama" class="hover:bg-slate-50/50 transition-colors">
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <span class="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-black shrink-0">{{ idx + 1 }}</span>
                      <span class="font-bold text-slate-700">{{ prod.nama }}</span>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-center">
                    <span class="font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">{{ prod.qty }}</span>
                  </td>
                  <td class="px-6 py-4 text-right font-black text-slate-800">Rp {{ formatRp(prod.omzet) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes fadeIn { 
  from { opacity: 0; transform: translateY(10px); } 
  to { opacity: 1; transform: translateY(0); } 
}
</style>
