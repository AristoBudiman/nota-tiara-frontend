<script setup>
import { ref, onMounted, computed } from 'vue'

const summaryBulanIni = ref({ kirim: 0, retur: 0, pendapatan: 0, persentase: 0, perToko: [], perBarang: [] })
const customSummary = ref(null)

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
  const data = await fetchSummaryAPI(toYMD(firstDay), toYMD(now))
  if (data) summaryBulanIni.value = data
}

// const fetchCustomSummary = async () => {
//   if (!filter.value.start || !filter.value.end) return alert("Pilih tanggal!")
//   const data = await fetchSummaryAPI(filter.value.start, filter.value.end)
//   if (data) customSummary.value = data
// }

const barangPerToko = ref([]) // Variabel penampung baru

const fetchCustomSummary = async () => {
  if (!filter.value.start || !filter.value.end) return alert("Pilih tanggal!")
  
  // 1. Tarik Data Rangkuman Utama
  const data = await fetchSummaryAPI(filter.value.start, filter.value.end)
  if (data) customSummary.value = data

  // 2. Tarik Data Spesifik: Barang per Toko
  const token = localStorage.getItem('admin_token')
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/rangkuman-per-toko?start=${filter.value.start}&end=${filter.value.end}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (res.ok) barangPerToko.value = await res.json()
}

const selectedTokoDetail = ref('')
const barangPerTokoSelected = ref([])
const isLoadingDetail = ref(false)

// Fungsi khusus untuk menarik detail barang di satu toko tertentu
const fetchDetailBarangPerToko = async () => {
  if (!selectedTokoDetail.value) return alert("Pilih toko terlebih dahulu!")
  
  isLoadingDetail.value = true
  const token = localStorage.getItem('admin_token')
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/rangkuman-per-toko?start=${filter.value.start}&end=${filter.value.end}&toko_id=${selectedTokoDetail.value}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  
  if (res.ok) {
    barangPerTokoSelected.value = await res.json()
  }
  isLoadingDetail.value = false
}

onMounted(() => {
  loadDataBulanIni()
})
</script>


<template>
  <div class="p-8 bg-gray-50 min-h-screen">
    <div class="max-w-6xl mx-auto">
      <h1 class="text-3xl font-bold text-gray-900 mb-8">Rangkuman Keuangan (Basis Catatan Besar)</h1>

      <div class="bg-white p-6 rounded-xl shadow-sm border border-blue-200 mb-8">
        <h2 class="text-sm font-bold text-blue-600 uppercase tracking-widest mb-4">Total Siklus Bulan Ini ({{ namaBulanInI }})</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="p-4 bg-blue-50 rounded-lg">
            <p class="text-xs text-blue-700 font-bold uppercase">Total Kirim</p>
            <p class="text-xl font-black text-blue-900">Rp {{ formatRp(summaryBulanIni.kirim) }}</p>
          </div>
          <div class="p-4 bg-red-50 rounded-lg">
            <p class="text-xs text-red-700 font-bold uppercase">Total Retur</p>
            <div class="flex items-baseline gap-2">
              <p class="text-xl font-black text-red-900">Rp {{ formatRp(summaryBulanIni.retur) }}</p>
              <span class="text-xs font-bold text-red-600">({{ summaryBulanIni.persentase.toFixed(1) }}%)</span>
            </div>
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
            <span>⚙️</span> Kalkulasi Catatan Besar
          </button>
        </div>

        <div v-if="customSummary" class="border-t pt-6 grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
           <div class="p-4 border rounded-lg bg-gray-50">
            <p class="text-xs text-gray-500 font-bold">TOTAL KIRIM</p>
            <p class="text-lg font-black text-gray-800">Rp {{ formatRp(customSummary.kirim) }}</p>
          </div>
          <div class="p-4 border rounded-lg bg-gray-50">
            <p class="text-xs text-gray-500 font-bold">TOTAL RETUR</p>
            <div class="flex items-baseline gap-2">
              <p class="text-lg font-black text-gray-800">Rp {{ formatRp(customSummary.retur) }}</p>
              <span class="text-xs font-bold text-red-600">({{ customSummary.persentase.toFixed(1) }}%)</span>
            </div>
          </div>
          <div class="p-4 bg-gray-900 text-white rounded-lg shadow-md">
            <p class="text-xs font-bold opacity-70">PENDAPATAN BERSIH</p>
            <p class="text-xl font-black text-green-400">Rp {{ formatRp(customSummary.pendapatan) }}</p>
          </div>
        </div>

        <div v-if="customSummary && customSummary.perToko.length > 0" class="border-t pt-6">
          <h3 class="text-md font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>🏪</span> Rincian Pendapatan Tiap Mitra
          </h3>
          <div class="overflow-x-auto border border-gray-200 rounded-lg">
            <table class="w-full text-sm text-left">
              <thead class="bg-gray-100 text-gray-700">
                <tr>
                  <th class="p-3 border-b border-r font-bold">Nama Toko / Mitra</th>
                  <th class="p-3 border-b border-r text-right font-bold w-32">Kirim (Rp)</th>
                  <th class="p-3 border-b border-r text-right font-bold w-32 text-red-600">Retur (Rp)</th>
                  <th class="p-3 border-b border-r text-center font-bold w-24 text-orange-600">% Retur</th>
                  <th class="p-3 border-b text-right font-bold w-40 text-green-700">Net Income</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="toko in customSummary.perToko" :key="toko.id" class="hover:bg-blue-50 border-b last:border-b-0 transition">
                  <td class="p-3 border-r font-bold text-gray-800">{{ toko.nama }}</td>
                  <td class="p-3 border-r text-right text-blue-700 font-medium">{{ formatRp(toko.kirim) }}</td>
                  <td class="p-3 border-r text-right text-red-600 font-medium">{{ formatRp(toko.retur) }}</td>
                  <td class="p-3 border-r text-center font-bold" :class="toko.persentase > 20 ? 'text-red-600' : 'text-orange-600'">
                    {{ toko.persentase.toFixed(1) }}%
                  </td>
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
            <span>📦</span> Rincian Penjualan Tiap Produk
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
                    {{ brg.persentase.toFixed(1) }}%
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
            <span>🔍</span> Analisis Detail Produk per Toko
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
                      :class="(item.total_retur / item.total_kirim * 100) > 20 ? 'text-red-600' : 'text-orange-600'">
                    {{ item.total_kirim > 0 ? (item.total_retur / item.total_kirim * 100).toFixed(1) : 0 }}%
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
  </div>
</template>