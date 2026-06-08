<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Package, Cake, Calculator, Store, Search, MapPin, Factory } from 'lucide-vue-next'

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
    alert("Sesi habis atau Akses Ditolak!")
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
  if (!filter.value.start || !filter.value.end) return alert("Pilih tanggal!")
  
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
  if (!selectedTokoDetail.value) return alert("Pilih toko terlebih dahulu!")
  
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
  <div class="p-8 bg-gray-50 min-h-screen">
    <div class="max-w-6xl mx-auto">
      <h1 class="text-3xl font-bold text-gray-900 mb-8">Rangkuman Keuangan (Basis Catatan Besar)</h1>

      <div class="flex flex-col sm:flex-row mb-8 bg-gray-200 p-1 rounded-lg w-full md:w-max shadow-sm gap-1">
        <button @click="activeTab = 'REGULER'" 
                class="px-5 py-2.5 rounded-md font-bold text-sm transition flex items-center justify-center gap-2"
                :class="activeTab === 'REGULER' ? 'bg-white shadow-md text-blue-800' : 'text-gray-500 hover:text-gray-800'">
          <Package :size="16" /> OMZET REGULER
        </button>
        <button @click="activeTab = 'PESANAN'" 
                class="px-5 py-2.5 rounded-md font-bold text-sm transition flex items-center justify-center gap-2"
                :class="activeTab === 'PESANAN' ? 'bg-yellow-400 shadow-md text-yellow-900' : 'text-gray-500 hover:text-gray-800'">
          <Cake :size="16" /> OMZET PESANAN (PO)
        </button>
      </div>
      
      <div v-if="activeTab === 'REGULER'">
        <div class="bg-white p-6 rounded-xl shadow-sm border border-blue-200 mb-8">
          <h2 class="text-sm font-bold text-blue-600 uppercase tracking-widest mb-4">Total Siklus Bulan Ini ({{ namaBulanInI }})</h2>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div class="p-4 bg-blue-50 rounded-lg">
              <p class="text-xs text-blue-700 font-bold uppercase">Total Kirim</p>
              <p class="text-xl font-black text-blue-900">Rp {{ formatRp(summaryBulanIni.kirim) }}</p>
            </div>
            <div class="p-4 bg-red-50 rounded-lg">
              <p class="text-xs text-red-700 font-bold uppercase">Total Retur</p>
              <div class="flex items-baseline gap-2">
                <p class="text-xl font-black text-red-900">Rp {{ formatRp(summaryBulanIni.retur) }}</p>
                <span class="text-xs font-bold text-red-600">({{ (summaryBulanIni.persentase || 0).toFixed(1) }}%)</span>
              </div>
            </div>
            <div class="p-4 bg-orange-50 border border-orange-100 rounded-lg">
              <p class="text-xs text-orange-700 font-bold uppercase">Diskon & Voucher</p>
              <p class="text-xl font-black text-orange-900">Rp {{ formatRp(summaryBulanIni.diskon) }}</p>
            </div>
            <div class="p-4 bg-green-100 rounded-lg border-2 border-green-200">
              <p class="text-xs text-green-700 font-bold uppercase">Pendapatan Bersih</p>
              <p class="text-2xl font-black text-green-900">Rp {{ formatRp(summaryBulanIni.pendapatan) }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 class="text-lg font-bold text-gray-800 mb-4">Filter Tanggal Harian Catatan Besar</h2>
          
          <div class="flex flex-wrap gap-4 items-end mb-8">
            <div>
              <label class="block text-xs font-bold text-gray-500 mb-1">Dari Tanggal</label>
              <input type="date" v-model="filter.start" class="border rounded-lg p-2 focus:border-blue-500 outline-none font-bold">
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-500 mb-1">Sampai Tanggal</label>
              <input type="date" v-model="filter.end" class="border rounded-lg p-2 focus:border-blue-500 outline-none font-bold">
            </div>
            <button @click="fetchCustomSummary" class="bg-gray-800 text-white px-6 py-2 rounded-lg font-bold hover:bg-black transition flex items-center gap-2">
              <Calculator :size="18" /> Kalkulasi Catatan Besar
            </button>
          </div>

          <div v-if="customSummary" class="border-t pt-6 grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div class="p-4 border rounded-lg bg-gray-50">
              <p class="text-xs text-gray-500 font-bold">TOTAL KIRIM</p>
              <p class="text-lg font-black text-gray-800">Rp {{ formatRp(customSummary.kirim) }}</p>
            </div>
            <div class="p-4 border rounded-lg bg-gray-50">
              <p class="text-xs text-gray-500 font-bold">TOTAL RETUR</p>
              <div class="flex items-baseline gap-2">
                <p class="text-lg font-black text-gray-800">Rp {{ formatRp(customSummary.retur) }}</p>
                <span class="text-xs font-bold text-red-600">({{ (customSummary.persentase || 0).toFixed(1) }}%)</span>
              </div>
            </div>
            <div class="p-4 border rounded-lg bg-orange-50">
              <p class="text-xs text-orange-700 font-bold">DISKON & VOUCHER</p>
              <p class="text-lg font-black text-orange-900">Rp {{ formatRp(customSummary.diskon) }}</p>
            </div>
            <div class="p-4 bg-gray-900 text-white rounded-lg shadow-md">
              <p class="text-xs font-bold opacity-70">PENDAPATAN BERSIH</p>
              <p class="text-xl font-black text-green-400">Rp {{ formatRp(customSummary.pendapatan) }}</p>
            </div>
          </div>

          <div v-if="customSummary && customSummary.perToko.length > 0" class="border-t pt-6">
            <h3 class="text-md font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Store :size="20" class="text-blue-600" /> Rincian Pendapatan Tiap Mitra
            </h3>
            <div class="overflow-x-auto border border-gray-200 rounded-lg">
              <table class="w-full text-sm text-left">
                <thead class="bg-gray-100 text-gray-700">
                  <tr>
                    <th class="p-3 border-b border-r font-bold">Nama Toko / Mitra</th>
                    <th class="p-3 border-b border-r text-right font-bold w-32">Kirim (Rp)</th>
                    <th class="p-3 border-b border-r text-right font-bold w-32 text-red-600">Retur (Rp)</th>
                    <th class="p-3 border-b border-r text-center font-bold w-24 text-orange-600">% Retur</th>
                    <th class="p-3 border-b border-r text-right font-bold w-32 text-orange-600">Diskon (Rp)</th>
                    <th class="p-3 border-b text-right font-bold w-40 text-green-700">Net Income</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="toko in customSummary.perToko" :key="toko.id" class="hover:bg-blue-50 border-b last:border-b-0 transition">
                    <td class="p-3 border-r font-bold text-gray-800">{{ toko.nama }}</td>
                    <td class="p-3 border-r text-right text-blue-700 font-medium">{{ formatRp(toko.kirim) }}</td>
                    <td class="p-3 border-r text-right text-red-600 font-medium">{{ formatRp(toko.retur) }}</td>
                    <td class="p-3 border-r text-center font-bold" :class="toko.persentase > 20 ? 'text-red-600' : 'text-orange-600'">
                      {{ (toko.persentase || 0).toFixed(1) }}%
                    </td>
                    <td class="p-3 border-r text-right text-orange-600 font-medium">{{ formatRp(toko.diskon) }}</td>
                    <td class="p-3 text-right font-black text-gray-900">
                      {{ formatRp(toko.pendapatan) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <div v-if="customSummary && customSummary.perBarang && customSummary.perBarang.length > 0" class="border-t pt-6 mt-8">
            <h3 class="text-md font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Package :size="20" class="text-blue-600" /> Rincian Penjualan Tiap Produk
            </h3>
            <div class="overflow-x-auto border border-gray-200 rounded-lg">
              <table class="w-full text-sm text-left">
                <thead class="bg-gray-100 text-gray-700">
                  <tr>
                    <th class="p-3 border-b border-r font-bold">Nama Produk</th>
                    <th class="p-3 border-b border-r text-center font-bold w-24 text-blue-700">Qty Kirim</th>
                    <th class="p-3 border-b border-r text-center font-bold w-24 text-red-600">Qty Retur</th>
                    <th class="p-3 border-b border-r text-center font-bold w-24 text-orange-600">% Retur</th>
                    <th class="p-3 border-b text-center font-bold w-24 text-green-700">Qty Laku</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(brg, idx) in customSummary.perBarang" :key="idx" class="hover:bg-blue-50 border-b last:border-b-0 transition">
                    <td class="p-3 border-r font-bold text-gray-800">{{ brg.nama }}</td>
                    <td class="p-3 border-r text-center font-medium">{{ brg.qty_kirim }}</td>
                    <td class="p-3 border-r text-center text-red-600 font-medium">{{ brg.qty_retur }}</td>
                    <td class="p-3 border-r text-center font-bold" :class="brg.persentase > 20 ? 'text-red-600' : 'text-orange-600'">
                      {{ (brg.persentase || 0).toFixed(1) }}%
                    </td>
                    <td class="p-3 text-center font-black text-green-700 bg-green-50">
                      {{ brg.qty_laku }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <div class="border-t pt-8 mt-10">
            <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Search :size="20" class="text-blue-600" /> Analisis Detail Produk per Toko
            </h3>
            
            <div class="flex gap-3 mb-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
              <div class="flex-1">
                <label class="block text-xs font-bold text-blue-700 mb-1">Pilih Toko untuk Dilihat Detailnya:</label>
                <select v-model="selectedTokoDetail" class="w-full p-2 border rounded font-bold outline-none">
                  <option value="" disabled>-- Pilih Toko --</option>
                  <option v-for="t in customSummary?.perToko" :key="t.id" :value="t.id">
                    {{ t.nama }}
                  </option>
                </select>
              </div>
              <button 
                @click="fetchDetailBarangPerToko" 
                :disabled="!customSummary || isLoadingDetail"
                class="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition self-end disabled:bg-gray-400"
              >
                {{ isLoadingDetail ? 'Loading...' : 'Lihat Rincian' }}
              </button>
            </div>

            <div v-if="barangPerTokoSelected.length > 0" class="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
              <table class="w-full text-sm text-left">
                <thead class="bg-blue-600 text-white">
                  <tr>
                    <th class="p-3 border-b font-bold">Nama Produk di Toko Terpilih</th>
                    <th class="p-3 border-b text-center font-bold w-24">Kirim</th>
                    <th class="p-3 border-b text-center font-bold w-24 text-red-200">Retur</th>
                    <th class="p-3 border-b text-center font-bold w-24 text-orange-200">% Retur</th> <th class="p-3 border-b text-center font-bold w-28 text-green-200">Laku</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, idx) in barangPerTokoSelected" :key="idx" class="hover:bg-gray-50 border-b last:border-b-0 transition">
                    <td class="p-3 font-bold text-gray-800">{{ item.nama_barang }}</td>
                    <td class="p-3 text-center font-medium">{{ item.total_kirim }}</td>
                    <td class="p-3 text-center text-red-600 font-medium">{{ item.total_retur }}</td>
                    <td class="p-3 text-center font-bold" 
                        :class="item.persentase > 20 ? 'text-red-600' : 'text-orange-600'">
                      {{ (item.persentase || 0).toFixed(1) }}%
                    </td>
                    <td class="p-3 text-center font-black text-green-700 bg-green-50">
                      {{ item.total_laku }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'PESANAN'">
        <div class="bg-white p-6 rounded-xl shadow-sm border border-yellow-200 mb-8">
          <h2 class="text-sm font-bold text-yellow-700 uppercase tracking-widest mb-4">Omzet Pesanan Bulan Ini ({{ namaBulanInI }})</h2>
          <!-- UBAH GRID MENJADI 3 KOLOM -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6" v-if="summaryPesananBulanIni">
            <div class="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
              <p class="text-xs text-yellow-700 font-bold uppercase">Total SPK / Nota Selesai</p>
              <p class="text-2xl font-black text-yellow-900">{{ summaryPesananBulanIni.total_pesanan }} Nota</p>
            </div>
            <div class="p-4 bg-orange-50 border border-orange-100 rounded-lg">
              <p class="text-xs text-orange-700 font-bold uppercase">Total Voucher Diskon</p>
              <p class="text-xl font-black text-orange-900">Rp {{ formatRp(summaryPesananBulanIni.total_diskon) }}</p>
            </div>
            <div class="p-4 bg-green-100 rounded-lg border-2 border-green-200">
              <p class="text-xs text-green-700 font-bold uppercase">Pendapatan Bersih (PO)</p>
              <p class="text-2xl font-black text-green-900">Rp {{ formatRp(summaryPesananBulanIni.total_pendapatan) }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 class="text-lg font-bold text-gray-800 mb-4">Filter Tanggal Omzet Pesanan</h2>
          
          <div class="flex flex-wrap gap-4 items-end mb-8">
            <div>
              <label class="block text-xs font-bold text-gray-500 mb-1">Dari Tanggal</label>
              <input type="date" v-model="filter.start" class="border rounded-lg p-2 focus:border-yellow-500 outline-none font-bold">
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-500 mb-1">Sampai Tanggal</label>
              <input type="date" v-model="filter.end" class="border rounded-lg p-2 focus:border-yellow-500 outline-none font-bold">
            </div>
            <button @click="fetchCustomSummary" class="bg-yellow-500 text-yellow-950 px-6 py-2 rounded-lg font-bold hover:bg-yellow-400 transition shadow">
              Kalkulasi Omzet PO
            </button>
          </div>

          <div v-if="customSummaryPesanan" class="border-t pt-6">
            <!-- UBAH GRID BAWAH MENJADI 3 KOLOM JUGA -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div class="p-4 border rounded-lg bg-gray-50 text-center">
                <p class="text-xs text-gray-500 font-bold">NOTA PESANAN TERCETAK</p>
                <p class="text-xl font-black text-gray-800">{{ customSummaryPesanan.total_pesanan }}</p>
              </div>
              <div class="p-4 border rounded-lg bg-orange-50 text-center border-b-4 border-orange-400">
                <p class="text-xs font-bold opacity-70 uppercase tracking-widest text-orange-800">Total Voucher Diskon</p>
                <p class="text-2xl font-black text-orange-700">Rp {{ formatRp(customSummaryPesanan.total_diskon) }}</p>
              </div>
              <div class="p-4 bg-gray-900 text-white rounded-lg shadow-md text-center border-b-4 border-yellow-500">
                <p class="text-xs font-bold opacity-70 uppercase tracking-widest">Pendapatan PO (Custom)</p>
                <p class="text-2xl font-black text-green-400">Rp {{ formatRp(customSummaryPesanan.total_pendapatan) }}</p>
              </div>
            </div>

            <h3 class="text-md font-bold text-gray-800 mb-4 flex items-center gap-2">
              <MapPin :size="20" class="text-yellow-600" /> Rincian Omzet Berdasarkan Titik Ambil / Mitra
            </h3>
            <div class="overflow-x-auto border border-yellow-200 rounded-lg">
              <table class="w-full text-sm text-left">
                <thead class="bg-yellow-100 text-yellow-900">
                  <tr>
                    <th class="p-3 border-b border-r border-yellow-200 font-bold">Titik Pengambilan</th>
                    <th class="p-3 border-b border-r border-yellow-200 text-center font-bold w-32">Total SPK/Nota</th>
                    <th class="p-3 border-b border-r border-yellow-200 text-right font-bold w-32 text-orange-600">Diskon (Rp)</th>
                    <th class="p-3 border-b text-right font-bold w-48 text-green-700">Total Omzet (Rp)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(titik, idx) in customSummaryPesanan.per_titik" :key="idx" class="hover:bg-yellow-50 border-b last:border-b-0 transition">
                    <td class="p-3 border-r font-bold text-gray-800">
                      <span v-if="titik.nama_titik === 'PABRIK'" class="flex items-center gap-2"><Factory :size="16" class="text-gray-500" /> PABRIK (Direct)</span>
                      <span v-else class="flex items-center gap-2"><Store :size="16" class="text-blue-600" /> {{ titik.nama_titik }}</span>
                    </td>
                    <td class="p-3 border-r text-center font-medium">{{ titik.total_nota }}</td>
                    <td class="p-3 border-r text-right font-medium text-orange-600">{{ formatRp(titik.diskon) }}</td>
                    <td class="p-3 text-right font-black text-green-700">
                      {{ formatRp(titik.pendapatan) }}
                    </td>
                  </tr>
                  <tr v-if="customSummaryPesanan.per_titik.length === 0">
                    <td colspan="3" class="p-4 text-center text-gray-500 italic">Tidak ada data pesanan di rentang tanggal ini.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div class="border-t border-yellow-300 pt-8 mt-10">
              <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Search :size="20" class="text-yellow-600" /> Analisis Roti Pesanan per Mitra / Titik
              </h3>
              
              <div class="flex gap-3 mb-6 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div class="flex-1">
                  <label class="block text-xs font-bold text-yellow-800 mb-1">Pilih Titik Pengambilan:</label>
                  <select v-model="selectedTokoPO" class="w-full p-2 border border-yellow-300 rounded font-bold outline-none">
                    <option value="" disabled>-- Pilih Titik Ambil --</option>
                    <option v-for="t in customSummaryPesanan.per_titik" :key="t.nama_titik" :value="t.nama_titik">
                      <span v-if="t.nama_titik === 'PABRIK'">PABRIK (Direct)</span>
                      <span v-else>{{ t.nama_titik }}</span>
                    </option>
                  </select>
                </div>
              </div>

              <div v-if="selectedTokoPO && detailBarangPO.length > 0" class="overflow-x-auto border border-yellow-300 rounded-lg shadow-sm">
                <table class="w-full text-sm text-left">
                  <thead class="bg-yellow-600 text-white">
                    <tr>
                      <th class="p-3 border-b border-yellow-700 font-bold">Roti yang Dipesan</th>
                      <th class="p-3 border-b border-yellow-700 text-center font-bold w-32">Total Qty (Pcs)</th>
                      <th class="p-3 border-b border-yellow-700 text-right font-bold w-48 text-yellow-100">Nilai Rupiah</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(item, idx) in detailBarangPO" :key="idx" class="hover:bg-yellow-50 border-b border-yellow-100 transition">
                      <td class="p-3 font-bold text-gray-800">{{ item.nama_barang }}</td>
                      <td class="p-3 text-center font-medium">{{ item.total_qty }}</td>
                      <td class="p-3 text-right font-black text-green-700">
                        {{ formatRp(item.total_rupiah) }}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot class="bg-yellow-100">
                     <tr>
                        <td class="p-3 text-right font-bold text-yellow-900">TOTAL:</td>
                        <td class="p-3 text-center font-black text-yellow-900">{{ detailBarangPO.reduce((s, i) => s + i.total_qty, 0) }}</td>
                        <td class="p-3 text-right font-black text-green-800">{{ formatRp(detailBarangPO.reduce((s, i) => s + i.total_rupiah, 0)) }}</td>
                     </tr>
                  </tfoot>
                </table>
              </div>
              <div v-else-if="selectedTokoPO" class="p-4 text-center bg-gray-100 text-gray-500 rounded font-bold">
                 Tidak ada detail barang pesanan ditemukan.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>