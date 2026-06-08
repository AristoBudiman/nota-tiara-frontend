<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Package, Cake, Calculator, Store, Search, MapPin, Factory, LineChart } from 'lucide-vue-next'

const router = useRouter()
const summaryBulanIni = ref({ kirim: 0, retur: 0, diskon: 0, pendapatan: 0, persentase: 0, perToko: [], perBarang: [] })
const customSummary = ref(null)
const barangPerToko = ref([]) 

const activeTab = ref('REGULER')
const summaryPesananBulanIni = ref(null)
const customSummaryPesanan = ref(null)
const selectedTokoPO = ref('')

const checkAuthError = (res) => {
  if (res.status === 401 || res.status === 403) {
    window.$dialog?.alert("Sesi habis atau Akses Ditolak!")
    localStorage.clear()
    router.push('/login')
    return true
  }
  return false
}

const fetchSummaryPesananAPI = async (startDate, endDate) => {
  try {
    const token = localStorage.getItem('admin_token')
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/pesanan/rangkuman-bulanan?start=${startDate}&end=${endDate}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (checkAuthError(res)) return null
    if (!res.ok) throw new Error("Gagal mengambil data rangkuman pesanan")
    return await res.json()
  } catch (e) {
    console.error(e)
    return null
  }
}

const toYMD = (date) => {
  return date.toLocaleString('en-CA', { 
    timeZone: 'Asia/Jakarta', 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  })
}

const filter = ref({
  start: '',
  end: toYMD(new Date())
})

const namaBulanInI = computed(() => {
  return new Date().toLocaleDateString('id-ID', { 
    timeZone: 'Asia/Jakarta',
    month: 'long', 
    year: 'numeric' 
  })
})

const formatRp = (val) => new Intl.NumberFormat('id-ID').format(val || 0)

const fetchSummaryAPI = async (startDate, endDate) => {
  try {
    const token = localStorage.getItem('admin_token')
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/rangkuman?start=${startDate}&end=${endDate}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (checkAuthError(res)) return null
    if (!res.ok) throw new Error("Gagal mengambil data rangkuman")
    return await res.json()
  } catch (e) {
    console.error(e)
    return null
  }
}

const loadDataBulanIni = async () => {
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  
  const dataReg = await fetchSummaryAPI(toYMD(firstDay), toYMD(now))
  if (dataReg) {
    dataReg.perToko = dataReg.perToko || []
    dataReg.perBarang = dataReg.perBarang || []
    summaryBulanIni.value = dataReg
  }
  
  const dataPO = await fetchSummaryPesananAPI(toYMD(firstDay), toYMD(now))
  if (dataPO) {
    dataPO.per_titik = dataPO.per_titik || []
    dataPO.detail_barang = dataPO.detail_barang || []
    summaryPesananBulanIni.value = dataPO
  }
}

const fetchCustomSummary = async () => {
  if (!filter.value.start || !filter.value.end) return window.$dialog?.alert("Pilih tanggal!")
  
  if (activeTab.value === 'REGULER') {
    const dataReg = await fetchSummaryAPI(filter.value.start, filter.value.end)
    if (dataReg) {
      dataReg.perToko = dataReg.perToko || []
      dataReg.perBarang = dataReg.perBarang || []
      customSummary.value = dataReg
    }
  } else if (activeTab.value === 'PESANAN') {
    const dataPO = await fetchSummaryPesananAPI(filter.value.start, filter.value.end)
    if (dataPO) {
      dataPO.per_titik = dataPO.per_titik || []
      dataPO.detail_barang = dataPO.detail_barang || []
      customSummaryPesanan.value = dataPO
    }
  }
}

const selectedTokoDetail = ref('')
const barangPerTokoSelected = ref([])
const isLoadingDetail = ref(false)

const fetchDetailBarangPerToko = async () => {
  if (!selectedTokoDetail.value) return window.$dialog?.alert("Pilih toko terlebih dahulu!")
  
  isLoadingDetail.value = true
  
  try {
    const token = localStorage.getItem('admin_token')
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/rangkuman-per-toko?start=${filter.value.start}&end=${filter.value.end}&toko_id=${selectedTokoDetail.value}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (checkAuthError(res)) return null
    
    if (res.ok) {
      const data = await res.json()
      barangPerTokoSelected.value = data || []
    } else {
      barangPerTokoSelected.value = []
    }
  } catch (err) {
    console.error(err)
    barangPerTokoSelected.value = []
  } finally {
    isLoadingDetail.value = false 
  }
}

const detailBarangPO = computed(() => {
  if (!customSummaryPesanan.value || !selectedTokoPO.value || !customSummaryPesanan.value.detail_barang) {
    return []
  }
  return customSummaryPesanan.value.detail_barang.filter(b => b.nama_titik === selectedTokoPO.value)
})

onMounted(() => {
  loadDataBulanIni()
})
</script>

<template>
  <div class="p-4 md:p-8 bg-slate-50 min-h-screen animate-fade-in">
    <div class="max-w-6xl mx-auto space-y-8">
      <!-- Header -->
      <div>
        <h1 class="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <LineChart :size="36" class="text-blue-600" /> Rangkuman Keuangan
        </h1>
        <p class="text-sm text-slate-500 font-medium mt-1">Laporan kinerja finansial harian hingga bulanan.</p>
      </div>

      <!-- Segmented Tab Nav -->
      <div class="inline-flex bg-slate-200/80 p-1.5 rounded-xl shadow-inner w-full md:w-max overflow-x-auto">
        <button @click="activeTab = 'REGULER'" 
                class="flex-1 px-6 py-2.5 rounded-lg font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap"
                :class="activeTab === 'REGULER' ? 'bg-white text-blue-700 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-300/50'">
          <Package :size="18" /> Omzet Reguler
        </button>
        <button @click="activeTab = 'PESANAN'" 
                class="flex-1 px-6 py-2.5 rounded-lg font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap"
                :class="activeTab === 'PESANAN' ? 'bg-yellow-400 text-yellow-950 shadow-md ring-1 ring-yellow-500' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-300/50'">
          <Cake :size="18" /> Omzet Pesanan (PO)
        </button>
      </div>
      
      <!-- TAB: REGULER -->
      <div v-if="activeTab === 'REGULER'" class="space-y-8 animate-slide-up">
        
        <!-- Summary Bulan Ini -->
        <div>
          <h2 class="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-blue-500"></span> Total Siklus Bulan Ini ({{ namaBulanInI }})
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <!-- Card Kirim -->
            <div class="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-blue-500 relative overflow-hidden group">
              <Package class="absolute -right-4 -bottom-4 text-blue-50 opacity-50 group-hover:scale-110 transition-transform duration-500" :size="100" />
              <div class="relative z-10">
                <p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Total Kirim</p>
                <p class="text-2xl font-black text-slate-800">Rp {{ formatRp(summaryBulanIni.kirim) }}</p>
              </div>
            </div>
            
            <!-- Card Retur -->
            <div class="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-red-500 relative overflow-hidden group">
              <Store class="absolute -right-4 -bottom-4 text-red-50 opacity-50 group-hover:scale-110 transition-transform duration-500" :size="100" />
              <div class="relative z-10">
                <p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Total Retur</p>
                <div class="flex items-center gap-2">
                  <p class="text-2xl font-black text-slate-800">Rp {{ formatRp(summaryBulanIni.retur) }}</p>
                  <span class="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-[10px] font-black tracking-widest">{{ (summaryBulanIni.persentase || 0).toFixed(1) }}%</span>
                </div>
              </div>
            </div>

            <!-- Card Diskon -->
            <div class="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-amber-500 relative overflow-hidden group">
              <Calculator class="absolute -right-4 -bottom-4 text-amber-50 opacity-50 group-hover:scale-110 transition-transform duration-500" :size="100" />
              <div class="relative z-10">
                <p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Diskon & Voucher</p>
                <p class="text-2xl font-black text-slate-800">Rp {{ formatRp(summaryBulanIni.diskon) }}</p>
              </div>
            </div>

            <!-- Card Pendapatan Bersih (Premium) -->
            <div class="p-5 rounded-2xl shadow-xl shadow-emerald-500/20 bg-linear-to-br from-emerald-500 to-emerald-700 text-white relative overflow-hidden group">
              <div class="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div class="relative z-10">
                <p class="text-[10px] text-emerald-100 font-bold uppercase tracking-wider mb-1">Pendapatan Bersih</p>
                <p class="text-3xl font-black tracking-tight">Rp {{ formatRp(summaryBulanIni.pendapatan) }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Filter Custom -->
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 class="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
            <Calculator :size="20" class="text-blue-500" /> Filter Kalkulasi Kustom
          </h2>
          
          <div class="flex flex-wrap md:flex-nowrap gap-4 items-end bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div class="w-full md:w-auto">
              <label class="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Dari Tanggal</label>
              <input type="date" v-model="filter.start" class="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-slate-700 bg-white transition-all">
            </div>
            <div class="w-full md:w-auto">
              <label class="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Sampai Tanggal</label>
              <input type="date" v-model="filter.end" class="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-slate-700 bg-white transition-all">
            </div>
            <button @click="fetchCustomSummary" class="w-full md:w-auto bg-slate-800 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-900 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 shrink-0">
              <Search :size="18" /> Proses Data
            </button>
          </div>

          <!-- Hasil Filter (Jika Ada) -->
          <div v-if="customSummary" class="mt-8 animate-fade-in">
            <!-- Custom Summary Cards -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div class="p-4 border-2 border-slate-100 rounded-xl bg-white shadow-sm flex flex-col justify-center">
                <p class="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Total Kirim</p>
                <p class="text-lg font-black text-slate-800">Rp {{ formatRp(customSummary.kirim) }}</p>
              </div>
              <div class="p-4 border-2 border-slate-100 rounded-xl bg-white shadow-sm flex flex-col justify-center">
                <p class="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Total Retur</p>
                <div class="flex items-center gap-2">
                  <p class="text-lg font-black text-slate-800">Rp {{ formatRp(customSummary.retur) }}</p>
                  <span class="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-[10px] font-black">{{ (customSummary.persentase || 0).toFixed(1) }}%</span>
                </div>
              </div>
              <div class="p-4 border-2 border-slate-100 rounded-xl bg-white shadow-sm flex flex-col justify-center">
                <p class="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Diskon & Voucher</p>
                <p class="text-lg font-black text-slate-800">Rp {{ formatRp(customSummary.diskon) }}</p>
              </div>
              <div class="p-4 bg-slate-900 text-white rounded-xl shadow-lg flex flex-col justify-center relative overflow-hidden">
                <div class="absolute right-0 top-0 w-16 h-16 bg-emerald-500 rounded-bl-full opacity-20"></div>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest relative z-10">Net Income</p>
                <p class="text-xl font-black text-emerald-400 relative z-10">Rp {{ formatRp(customSummary.pendapatan) }}</p>
              </div>
            </div>

            <!-- Tabel Rincian Toko -->
            <div v-if="customSummary.perToko.length > 0" class="mb-10">
              <h3 class="text-md font-black text-slate-800 mb-4 flex items-center gap-2">
                <Store :size="20" class="text-blue-500" /> Rincian Pendapatan Tiap Mitra
              </h3>
              <div class="overflow-x-auto rounded-xl ring-1 ring-slate-200 shadow-sm bg-white">
                <table class="w-full text-sm text-left">
                  <thead class="bg-slate-800 text-white font-bold tracking-wide">
                    <tr>
                      <th class="p-4">Nama Toko / Mitra</th>
                      <th class="p-4 text-right w-32">Kirim (Rp)</th>
                      <th class="p-4 text-right w-32 text-red-300">Retur (Rp)</th>
                      <th class="p-4 text-center w-24 text-amber-300">% Retur</th>
                      <th class="p-4 text-right w-32 text-amber-300">Diskon (Rp)</th>
                      <th class="p-4 text-right w-40 text-emerald-400">Net Income</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    <tr v-for="toko in customSummary.perToko" :key="toko.id" class="hover:bg-blue-50/50 even:bg-slate-50 transition-colors">
                      <td class="p-4 font-bold text-slate-800">{{ toko.nama }}</td>
                      <td class="p-4 text-right font-medium text-slate-600">{{ formatRp(toko.kirim) }}</td>
                      <td class="p-4 text-right font-medium text-red-600">{{ formatRp(toko.retur) }}</td>
                      <td class="p-4 text-center">
                        <span class="px-2 py-1 rounded-full text-xs font-bold" :class="toko.persentase > 20 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'">
                            {{ (toko.persentase || 0).toFixed(1) }}%
                        </span>
                      </td>
                      <td class="p-4 text-right font-medium text-amber-600">{{ formatRp(toko.diskon) }}</td>
                      <td class="p-4 text-right font-black text-slate-800">
                        {{ formatRp(toko.pendapatan) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            <!-- Tabel Rincian Barang -->
            <div v-if="customSummary.perBarang && customSummary.perBarang.length > 0" class="mb-10">
              <h3 class="text-md font-black text-slate-800 mb-4 flex items-center gap-2">
                <Package :size="20" class="text-blue-500" /> Rincian Penjualan Tiap Produk
              </h3>
              <div class="overflow-x-auto rounded-xl ring-1 ring-slate-200 shadow-sm bg-white">
                <table class="w-full text-sm text-left">
                  <thead class="bg-slate-800 text-white font-bold tracking-wide">
                    <tr>
                      <th class="p-4">Nama Produk</th>
                      <th class="p-4 text-center w-28">Qty Kirim</th>
                      <th class="p-4 text-center w-28 text-red-300">Qty Retur</th>
                      <th class="p-4 text-center w-28 text-amber-300">% Retur</th>
                      <th class="p-4 text-center w-32 text-emerald-400">Qty Laku</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    <tr v-for="(brg, idx) in customSummary.perBarang" :key="idx" class="hover:bg-blue-50/50 even:bg-slate-50 transition-colors">
                      <td class="p-4 font-bold text-slate-800">{{ brg.nama }}</td>
                      <td class="p-4 text-center font-medium text-slate-600">{{ brg.qty_kirim }}</td>
                      <td class="p-4 text-center font-medium text-red-600">{{ brg.qty_retur }}</td>
                      <td class="p-4 text-center">
                        <span class="px-2 py-1 rounded-full text-xs font-bold" :class="brg.persentase > 20 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'">
                            {{ (brg.persentase || 0).toFixed(1) }}%
                        </span>
                      </td>
                      <td class="p-4 text-center font-black text-emerald-700 bg-emerald-50/50">
                        {{ brg.qty_laku }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            <!-- Analisis Spesifik per Toko -->
            <div class="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-200">
              <h3 class="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                <Search :size="20" class="text-blue-500" /> Analisis Produk Spesifik per Mitra
              </h3>
              
              <div class="flex flex-col md:flex-row gap-4 mb-6">
                <div class="flex-1">
                  <label class="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Pilih Mitra Toko:</label>
                  <select v-model="selectedTokoDetail" class="w-full p-3 border-2 border-slate-200 rounded-xl font-bold outline-none focus:border-blue-500 bg-white text-slate-700 cursor-pointer">
                    <option value="" disabled>-- Klik untuk Pilih Mitra --</option>
                    <option v-for="t in customSummary?.perToko" :key="t.id" :value="t.id">
                      {{ t.nama }}
                    </option>
                  </select>
                </div>
                <button 
                  @click="fetchDetailBarangPerToko" 
                  :disabled="!customSummary || isLoadingDetail || !selectedTokoDetail"
                  class="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-md md:self-end disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  {{ isLoadingDetail ? 'Loading...' : 'Lihat Rincian' }}
                </button>
              </div>

              <div v-if="barangPerTokoSelected.length > 0" class="overflow-x-auto rounded-xl ring-1 ring-slate-200 shadow-sm bg-white animate-fade-in">
                <table class="w-full text-sm text-left">
                  <thead class="bg-slate-800 text-white font-bold tracking-wide">
                    <tr>
                      <th class="p-4">Nama Produk di Mitra Terpilih</th>
                      <th class="p-4 text-center w-24">Kirim</th>
                      <th class="p-4 text-center w-24 text-red-300">Retur</th>
                      <th class="p-4 text-center w-24 text-amber-300">% Retur</th>
                      <th class="p-4 text-center w-28 text-emerald-400">Laku</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    <tr v-for="(item, idx) in barangPerTokoSelected" :key="idx" class="hover:bg-blue-50/50 even:bg-slate-50 transition-colors">
                      <td class="p-4 font-bold text-slate-800">{{ item.nama_barang }}</td>
                      <td class="p-4 text-center font-medium text-slate-600">{{ item.total_kirim }}</td>
                      <td class="p-4 text-center font-medium text-red-600">{{ item.total_retur }}</td>
                      <td class="p-4 text-center">
                        <span class="px-2 py-1 rounded-full text-[10px] font-bold" :class="item.persentase > 20 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'">
                            {{ (item.persentase || 0).toFixed(1) }}%
                        </span>
                      </td>
                      <td class="p-4 text-center font-black text-emerald-700 bg-emerald-50/50">
                        {{ item.total_laku }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB: PESANAN -->
      <div v-if="activeTab === 'PESANAN'" class="space-y-8 animate-slide-up">
        
        <!-- Summary PO Bulan Ini -->
        <div>
          <h2 class="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-yellow-500"></span> Omzet Pesanan Bulan Ini ({{ namaBulanInI }})
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4" v-if="summaryPesananBulanIni">
            <div class="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-slate-300 relative overflow-hidden group">
              <Package class="absolute -right-4 -bottom-4 text-slate-50 opacity-50 group-hover:scale-110 transition-transform duration-500" :size="100" />
              <div class="relative z-10">
                <p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Total Nota Selesai</p>
                <p class="text-2xl font-black text-slate-800">{{ summaryPesananBulanIni.total_pesanan }} <span class="text-sm font-medium text-slate-500">Nota</span></p>
              </div>
            </div>
            
            <div class="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-amber-500 relative overflow-hidden group">
              <Calculator class="absolute -right-4 -bottom-4 text-amber-50 opacity-50 group-hover:scale-110 transition-transform duration-500" :size="100" />
              <div class="relative z-10">
                <p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Total Voucher Diskon</p>
                <p class="text-2xl font-black text-slate-800">Rp {{ formatRp(summaryPesananBulanIni.total_diskon) }}</p>
              </div>
            </div>

            <div class="p-5 rounded-2xl shadow-xl shadow-yellow-500/20 bg-linear-to-br from-yellow-500 to-amber-600 text-white relative overflow-hidden group">
              <div class="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div class="relative z-10">
                <p class="text-[10px] text-yellow-100 font-bold uppercase tracking-wider mb-1">Pendapatan Bersih (PO)</p>
                <p class="text-3xl font-black tracking-tight">Rp {{ formatRp(summaryPesananBulanIni.total_pendapatan) }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Filter Custom PO -->
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 class="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
            <Cake :size="20" class="text-yellow-500" /> Filter Kalkulasi Omzet PO
          </h2>
          
          <div class="flex flex-wrap md:flex-nowrap gap-4 items-end bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div class="w-full md:w-auto">
              <label class="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Dari Tanggal</label>
              <input type="date" v-model="filter.start" class="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 focus:ring-4 focus:ring-yellow-500/10 outline-none font-bold text-slate-700 bg-white transition-all">
            </div>
            <div class="w-full md:w-auto">
              <label class="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Sampai Tanggal</label>
              <input type="date" v-model="filter.end" class="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 focus:border-yellow-500 focus:ring-4 focus:ring-yellow-500/10 outline-none font-bold text-slate-700 bg-white transition-all">
            </div>
            <button @click="fetchCustomSummary" class="w-full md:w-auto bg-slate-800 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-900 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 shrink-0">
              <Search :size="18" /> Proses Data PO
            </button>
          </div>

          <div v-if="customSummaryPesanan" class="mt-8 animate-fade-in">
            <!-- Summary PO Custom -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div class="p-4 border-2 border-slate-100 rounded-xl bg-white shadow-sm flex flex-col items-center justify-center text-center">
                <p class="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Nota Selesai</p>
                <p class="text-2xl font-black text-slate-800">{{ customSummaryPesanan.total_pesanan }}</p>
              </div>
              <div class="p-4 border-2 border-amber-100 bg-amber-50 rounded-xl shadow-sm flex flex-col items-center justify-center text-center">
                <p class="text-[10px] text-amber-600 font-bold tracking-widest uppercase">Total Voucher Diskon</p>
                <p class="text-2xl font-black text-amber-700">Rp {{ formatRp(customSummaryPesanan.total_diskon) }}</p>
              </div>
              <div class="p-4 bg-slate-900 text-white rounded-xl shadow-lg flex flex-col items-center justify-center text-center relative overflow-hidden">
                <div class="absolute inset-0 bg-yellow-500/10"></div>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest relative z-10">Pendapatan PO Terpilih</p>
                <p class="text-2xl font-black text-yellow-400 relative z-10">Rp {{ formatRp(customSummaryPesanan.total_pendapatan) }}</p>
              </div>
            </div>

            <!-- Tabel PO per Titik -->
            <div class="mb-10">
              <h3 class="text-md font-black text-slate-800 mb-4 flex items-center gap-2">
                <MapPin :size="20" class="text-yellow-600" /> Rincian Omzet Berdasarkan Titik Ambil
              </h3>
              <div class="overflow-x-auto rounded-xl ring-1 ring-slate-200 shadow-sm bg-white">
                <table class="w-full text-sm text-left">
                  <thead class="bg-slate-800 text-white font-bold tracking-wide">
                    <tr>
                      <th class="p-4">Titik Pengambilan</th>
                      <th class="p-4 text-center w-32">Total SPK/Nota</th>
                      <th class="p-4 text-right w-40 text-amber-300">Diskon (Rp)</th>
                      <th class="p-4 text-right w-48 text-emerald-400">Total Omzet (Rp)</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    <tr v-for="(titik, idx) in customSummaryPesanan.per_titik" :key="idx" class="hover:bg-yellow-50/50 even:bg-slate-50 transition-colors">
                      <td class="p-4 font-bold text-slate-800">
                        <span v-if="titik.nama_titik === 'PABRIK'" class="flex items-center gap-2 text-slate-600"><Factory :size="16" /> PABRIK (Direct)</span>
                        <span v-else class="flex items-center gap-2"><Store :size="16" class="text-blue-500" /> {{ titik.nama_titik }}</span>
                      </td>
                      <td class="p-4 text-center font-medium text-slate-600">{{ titik.total_nota }}</td>
                      <td class="p-4 text-right font-medium text-amber-600">{{ formatRp(titik.diskon) }}</td>
                      <td class="p-4 text-right font-black text-slate-800">
                        {{ formatRp(titik.pendapatan) }}
                      </td>
                    </tr>
                    <tr v-if="customSummaryPesanan.per_titik.length === 0">
                      <td colspan="4" class="p-8 text-center text-slate-400 italic font-medium">Tidak ada data pesanan di rentang tanggal ini.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            <!-- Analisis Produk PO -->
            <div class="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-200">
              <h3 class="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                <Search :size="20" class="text-yellow-600" /> Rincian Item Roti Pesanan
              </h3>
              
              <div class="mb-6">
                <label class="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Pilih Titik Pengambilan:</label>
                <select v-model="selectedTokoPO" class="w-full md:w-1/2 p-3 border-2 border-slate-200 rounded-xl font-bold outline-none focus:border-yellow-500 bg-white text-slate-700 cursor-pointer">
                  <option value="" disabled>-- Klik untuk Pilih Titik --</option>
                  <option v-for="t in customSummaryPesanan.per_titik" :key="t.nama_titik" :value="t.nama_titik">
                    {{ t.nama_titik === 'PABRIK' ? 'PABRIK (Direct)' : t.nama_titik }}
                  </option>
                </select>
              </div>

              <div v-if="selectedTokoPO && detailBarangPO.length > 0" class="overflow-x-auto rounded-xl ring-1 ring-slate-200 shadow-sm bg-white animate-fade-in">
                <table class="w-full text-sm text-left">
                  <thead class="bg-slate-800 text-white font-bold tracking-wide">
                    <tr>
                      <th class="p-4">Roti yang Dipesan</th>
                      <th class="p-4 text-center w-32 text-blue-300">Total Qty (Pcs)</th>
                      <th class="p-4 text-right w-48 text-emerald-400">Nilai Rupiah</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    <tr v-for="(item, idx) in detailBarangPO" :key="idx" class="hover:bg-yellow-50/50 even:bg-slate-50 transition-colors">
                      <td class="p-4 font-bold text-slate-800">{{ item.nama_barang }}</td>
                      <td class="p-4 text-center font-medium text-slate-600">{{ item.total_qty }}</td>
                      <td class="p-4 text-right font-black text-slate-800">
                        {{ formatRp(item.total_rupiah) }}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot class="bg-slate-100 border-t-2 border-slate-200">
                     <tr>
                        <td class="p-4 text-right font-black text-slate-600 uppercase tracking-widest text-xs">TOTAL KESELURUHAN</td>
                        <td class="p-4 text-center font-black text-blue-700 text-lg">{{ detailBarangPO.reduce((s, i) => s + i.total_qty, 0) }}</td>
                        <td class="p-4 text-right font-black text-emerald-700 text-lg">{{ formatRp(detailBarangPO.reduce((s, i) => s + i.total_rupiah, 0)) }}</td>
                     </tr>
                  </tfoot>
                </table>
              </div>
              <div v-else-if="selectedTokoPO" class="p-8 text-center bg-white border border-slate-100 text-slate-400 rounded-xl font-medium shadow-sm">
                 <Search :size="32" class="mx-auto mb-2 opacity-50" />
                 Tidak ada detail barang pesanan ditemukan.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.4s ease-out; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes slideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
</style>