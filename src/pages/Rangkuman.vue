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
    timeZone: 'Asia/Jakarta', // <--- TAMBAHKAN KUNCI INI
    month: 'long', 
    year: 'numeric' 
  })
})

const formatRp = (val) => new Intl.NumberFormat('id-ID').format(val || 0)

// FUNGSI BARU: Langsung menembak endpoint agregasi di Go
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

const fetchCustomSummary = async () => {
  if (!filter.value.start || !filter.value.end) return alert("Pilih tanggal!")
  const data = await fetchSummaryAPI(filter.value.start, filter.value.end)
  if (data) customSummary.value = data
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
      </div>
    </div>
  </div>
</template>

<!-- <script setup>
import { ref, onMounted, computed } from 'vue'

const allNotas = ref([])
const daftarToko = ref([])

const summaryBulanIni = ref({ kirim: 0, retur: 0, pendapatan: 0, persentase: 0, perToko: [] })
const customSummary = ref(null)

const toYMD = (date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const filter = ref({
  start: '',
  end: toYMD(new Date())
})

const namaBulanInI = computed(() => {
  return new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
})

const formatRp = (val) => new Intl.NumberFormat('id-ID').format(val || 0)

const fetchMasterToko = async () => {
  try {
    const token = localStorage.getItem('admin_token')
    const res = await fetch('http://localhost:3000/api/tokos', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    daftarToko.value = await res.json()
  } catch (e) { console.error(e) }
}

const fetchSemuaNota = async () => {
  try {
    const token = localStorage.getItem('admin_token')
    const res = await fetch('http://localhost:3000/api/notas', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    allNotas.value = Array.isArray(data) ? data : (data.data ? data.data : [])
  } catch (e) { console.error(e) }
}

const hitungCatatanBesar = (startDateStr, endDateStr) => {
  let totalKirim = 0
  let totalRetur = 0
  let rekapToko = {}

  daftarToko.value.forEach(toko => {
    rekapToko[toko.ID] = { id: toko.ID, nama: toko.NamaToko, kirim: 0, retur: 0, pendapatan: 0, persentase: 0 }
  })

  const start = new Date(startDateStr)
  const end = new Date(endDateStr)

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay()
    if (dayOfWeek === 0) continue

    const isFaseRetur = (dayOfWeek === 1 || dayOfWeek === 2 || dayOfWeek === 3)
    let siklus = ''
    if (dayOfWeek === 1 || dayOfWeek === 4) siklus = 'SiklusKamisSenin'
    else if (dayOfWeek === 2 || dayOfWeek === 5) siklus = 'SiklusJumatSelasa'
    else if (dayOfWeek === 3 || dayOfWeek === 6) siklus = 'SiklusSabtuRabu'

    const targetTanggal = new Date(d)
    if (isFaseRetur) targetTanggal.setDate(targetTanggal.getDate() - 4)
    const targetTime = new Date(toYMD(targetTanggal)).getTime()

    // Rangkuman.vue -> hitungCatatanBesar
    allNotas.value.forEach(nota => {
      // 🔓 GUNAKAN DATA LIVE
      const isTokoHarian = (nota.SiklusSnapshot === 'HARIAN')
      const notaTimeStr = nota.TanggalKirim.substring(0, 10)
      const loopTimeStr = toYMD(d)

      if (isTokoHarian) {
        if (notaTimeStr === loopTimeStr) {
          const tID = nota.TokoID
          if (!rekapToko[tID]) {
            rekapToko[tID] = { id: tID, nama: nota.NamaTokoSnapshot || 'Toko Harian', kirim: 0, retur: 0, pendapatan: 0, persentase: 0 }
          }
          rekapToko[tID].kirim += nota.JumlahKirim || 0
          rekapToko[tID].retur += nota.JumlahRetur || 0
          totalKirim += nota.JumlahKirim || 0
          totalRetur += nota.JumlahRetur || 0
        }
      } else {
        // LOGIKA REGULER (Tetap pakai sistem Siklus + Mundur 4 Hari)
        let isMatchSiklus = false
        if (nota.SiklusSnapshot) isMatchSiklus = (nota.SiklusSnapshot === siklus)
        else if (nota.Toko) isMatchSiklus = (nota.Toko[siklus] === true)

        if (isMatchSiklus) {
          // ✅ LANGSUNG CEK NOTA TIME (targetTime sudah dihitung di baris 131)
          const notaTime = new Date(notaTimeStr).getTime()
          const diffDays = Math.abs(notaTime - targetTime) / (1000 * 3600 * 24)

          if (diffDays <= 3) {
            const tID = nota.TokoID
            if (!rekapToko[tID]) {
              rekapToko[tID] = { id: tID, nama: nota.NamaTokoSnapshot || 'Toko Reguler', kirim: 0, retur: 0, pendapatan: 0, persentase: 0 }
            }

            if (isFaseRetur) {
              totalRetur += nota.JumlahRetur || 0
              rekapToko[tID].retur += nota.JumlahRetur || 0
            } else {
              totalKirim += nota.JumlahKirim || 0
              rekapToko[tID].kirim += nota.JumlahKirim || 0
            }
          }
        }
      }
    })
  }

  // Hitung persentase tiap toko
  Object.values(rekapToko).forEach(t => {
    t.pendapatan = t.kirim - t.retur
    t.persentase = t.kirim > 0 ? (t.retur / t.kirim) * 100 : 0
  })

  return {
    kirim: totalKirim,
    retur: totalRetur,
    pendapatan: totalKirim - totalRetur,
    persentase: totalKirim > 0 ? (totalRetur / totalKirim) * 100 : 0,
    perToko: Object.values(rekapToko).sort((a, b) => a.nama.localeCompare(b.nama))
  }
}

const loadDataBulanIni = () => {
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  summaryBulanIni.value = hitungCatatanBesar(toYMD(firstDay), toYMD(now))
}

const fetchCustomSummary = () => {
  if (!filter.value.start || !filter.value.end) return alert("Pilih tanggal!")
  customSummary.value = hitungCatatanBesar(filter.value.start, filter.value.end)
}

onMounted(async () => {
  await fetchMasterToko()
  await fetchSemuaNota()
  loadDataBulanIni()
})
</script> -->