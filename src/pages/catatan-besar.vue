<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Package, Cake, ChevronLeft, ChevronRight, RefreshCw, FileSpreadsheet, Sun, SearchX, ClipboardList } from 'lucide-vue-next'

const router = useRouter()
const rawDataBesar = ref([]) // Data matang dari Backend
const activeTab = ref('REGULER') 
const dataPesanan = ref([])

const checkAuthError = (res) => {
  if (res.status === 401 || res.status === 403) {
    window.$dialog?.alert("Sesi habis atau Akses Ditolak!")
    localStorage.clear()
    router.push('/login')
    return true
  }
  return false
}

const getLocalDateString = (d) => {
  const date = d ? new Date(d) : new Date()
  return date.toLocaleString('en-CA', { 
    timeZone: 'Asia/Jakarta', 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  })
}

const selectedTanggal = ref(getLocalDateString(new Date()))

const dayOfWeek = computed(() => {
  if (!selectedTanggal.value) return -1
  return new Date(selectedTanggal.value).getDay()
})

const getSiklusQuery = () => {
  const d = dayOfWeek.value
  if (d === 1 || d === 4) return 'SiklusKamisSenin'
  if (d === 2 || d === 5) return 'SiklusJumatSelasa'
  if (d === 3 || d === 6) return 'SiklusSabtuRabu'
  return '' 
}

const fetchDataReguler = async () => {
  // LOGIKA BISNIS: Jika hari Minggu (0), langsung stop dan kosongkan tabel reguler!
  if (dayOfWeek.value === 0) {
    rawDataBesar.value = []
    return
  }

  try {
    const siklusAktif = getSiklusQuery()
    const token = localStorage.getItem('admin_token')
    
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/catatan-besar?siklus=${siklusAktif}&tanggal=${selectedTanggal.value}`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
    if (checkAuthError(res)) return 
    
    if (!res.ok) throw new Error("Akses ditolak")
    const data = await res.json()
    rawDataBesar.value = Array.isArray(data) ? data : []
  } catch (err) {
    console.error("Gagal konek ke Backend:", err)
  }
}

const fetchDataPesanan = async () => {
  try {
    const token = localStorage.getItem('admin_token')
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/pesanan/catatan?tanggal=${selectedTanggal.value}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (checkAuthError(res)) return
    const data = await res.json()
    dataPesanan.value = data || []
  } catch (err) {
    console.error("Gagal narik pesanan:", err)
  }
}

const fetchAll = () => {
  if (activeTab.value === 'REGULER') fetchDataReguler()
  else fetchDataPesanan()
}

// MEMBANGUN HEADER KOLOM TOKO (Dari data matang)
const filteredTokos = computed(() => {
  const tokosMap = new Map()
  rawDataBesar.value.forEach(row => {
    if (!tokosMap.has(row.nama_toko)) {
      tokosMap.set(row.nama_toko, { 
        NamaToko: row.nama_toko,
        IsHarian: row.is_harian,
        Siklus: row.siklus // Pastikan ini ditangkap dari backend
      })
    }
  })

  return Array.from(tokosMap.values()).sort((a, b) => {
    // 1. Tentukan bobot hierarki
    const getPriority = (siklus) => {
      if (siklus === 'HARIAN') return 1
      if (siklus === 'SiklusDua') return 2
      return 3 // Untuk Kamis-Senin, Jumat-Selasa, dsb
    }

    const priorityA = getPriority(a.Siklus)
    const priorityB = getPriority(b.Siklus)

    // 2. Jika beda hierarki, urutkan berdasarkan bobot (1 dulu, lalu 2, dst)
    if (priorityA !== priorityB) {
      return priorityA - priorityB
    }

    // 3. Jika hierarki sama, urutkan A sampai Z berdasarkan nama
    return a.NamaToko.localeCompare(b.NamaToko)
  })
})

// MEMBANGUN BARIS BARANG (Hanya barang yang ada transaksinya hari ini)
const uniqueBarangs = computed(() => {
  const mapBarang = new Map()
  rawDataBesar.value.forEach(row => {
    if (row.qty_kirim > 0 || row.qty_retur > 0) {
      if (!mapBarang.has(row.nama_barang)) {
        mapBarang.set(row.nama_barang, { nama: row.nama_barang })
      }
    }
  })
  return Array.from(mapBarang.values()).sort((a, b) => a.nama.localeCompare(b.nama))
})

// 1. BUAT KAMUS MEMORI (Hanya dihitung 1x oleh Vue)
const cellDictionary = computed(() => {
  const dict = {}
  rawDataBesar.value.forEach(row => {
    // Membuat kunci unik, contoh: "Toko C-Roti Tawar"
    const key = `${row.nama_toko}-${row.nama_barang}`
    
    if (!dict[key]) {
      dict[key] = { kirim: 0, retur: 0 }
    }
    // Jika backend pecah baris, dia akan otomatis dijumlahkan di sini. Sangat aman!
    dict[key].kirim += row.qty_kirim
    dict[key].retur += row.qty_retur
  })
  return dict
})

// 2. FUNGSI PENGAMBILAN DATA INSTAN (Tidak ada looping lagi!)
const getCellData = (namaToko, namaBarang) => {
  const key = `${namaToko}-${namaBarang}`
  return cellDictionary.value[key] || { kirim: 0, retur: 0 }
}

const getTotals = (namaToko) => {
  let sumKirim = 0
  let sumRetur = 0
  rawDataBesar.value.forEach(row => {
    if (row.nama_toko === namaToko) {
      sumKirim += row.harga_kirim
      sumRetur += row.harga_retur
    }
  })
  return { kirim: sumKirim, retur: sumRetur }
}

const formatRp = (val) => {
  if (!val || val === 0) return '-'
  return new Intl.NumberFormat('id-ID').format(val)
}

const rekapPesanan = computed(() => {
  const tokosMap = new Set()
  const barangsMap = new Map()

  dataPesanan.value.forEach(row => {
    tokosMap.add(row.nama_toko) 
    if (!barangsMap.has(row.nama_barang_bebas)) {
      barangsMap.set(row.nama_barang_bebas, {})
    }
    const currentBarang = barangsMap.get(row.nama_barang_bebas)
    currentBarang[row.nama_toko] = (currentBarang[row.nama_toko] || 0) + row.total_banyak
  })

  return {
    kolomToko: Array.from(tokosMap).sort(), 
    barisBarang: Array.from(barangsMap.entries()).sort() 
  }
})

const exportToExcel = () => {
  const targetId = activeTab.value === 'REGULER' ? 'table-catatan-besar' : 'table-pesanan'
  const originalTable = document.getElementById(targetId)
  if (!originalTable) return window.$dialog?.alert('Tabel belum siap!')

  const table = originalTable.cloneNode(true)
  table.setAttribute('border', '1')
  table.style.borderCollapse = 'collapse'
  table.style.fontFamily = 'Calibri, sans-serif'

  const ths = table.querySelectorAll('th')
  ths.forEach(th => {
    th.style.backgroundColor = '#e2e8f0'
    th.style.fontWeight = 'bold'
    th.style.textAlign = 'center'
    th.style.padding = '4px 8px' 
    th.style.whiteSpace = 'nowrap' 
  })

  const tds = table.querySelectorAll('td')
  tds.forEach(td => {
    td.style.padding = '4px 8px'
  })

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
    </head>
    <body>
      <h2>Catatan Besar Tiara Nota</h2>
      <p><b>Tanggal Acuan:</b> ${selectedTanggal.value}</p>
      ${table.outerHTML}
    </body>
    </html>
  `

  const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `Catatan_Besar_${selectedTanggal.value}.xls`
  link.click()
  URL.revokeObjectURL(url)
}

const geserHari = (offset) => {
  if (!selectedTanggal.value) return
  
  const parts = selectedTanggal.value.split('-')
  const year = parseInt(parts[0])
  const month = parseInt(parts[1]) - 1 
  const day = parseInt(parts[2])

  const date = new Date(year, month, day)
  date.setDate(date.getDate() + offset)

  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')

  selectedTanggal.value = `${y}-${m}-${d}`
  fetchAll()
}

onMounted(fetchAll)
</script>

<template>
  <div class="bg-slate-50 min-h-screen">
    
    <!-- Sticky Action Bar (Mengambang di atas layar saat discroll) -->
    <div class="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm px-6 py-4 animate-fade-in">
      <div class="flex flex-col lg:flex-row justify-between items-center gap-4">
        
        <!-- Tab Navigation (Segmented Control) -->
        <div class="inline-flex bg-slate-200/80 p-1 rounded-xl shadow-inner w-full lg:w-max overflow-x-auto">
          <button @click="activeTab = 'REGULER'; fetchAll()" 
                  class="flex-1 px-5 py-2 rounded-lg font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap"
                  :class="activeTab === 'REGULER' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-300/50'">
            <Package :size="16" /> Pengiriman Reguler
          </button>
          <button @click="activeTab = 'PESANAN'; fetchAll()" 
                  class="flex-1 px-5 py-2 rounded-lg font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap"
                  :class="activeTab === 'PESANAN' ? 'bg-yellow-400 text-yellow-950 shadow-sm ring-1 ring-yellow-500' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-300/50'">
            <Cake :size="16" /> Pesanan Khusus (PO)
          </button>
        </div>

        <!-- Filter & Actions -->
        <div class="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button 
              @click="geserHari(-1)" 
              class="bg-white text-slate-700 px-3 py-1.5 rounded-md shadow-sm hover:bg-slate-50 transition font-black flex items-center justify-center"
              title="Hari Sebelumnya"
            >
              <ChevronLeft :size="18" />
            </button>
            <input 
              type="date" 
              v-model="selectedTanggal" 
              @change="fetchAll" 
              class="border-none rounded-md px-3 py-1.5 font-bold bg-transparent focus:ring-0 outline-none text-slate-700 text-sm"
            />
            <button 
              @click="geserHari(1)" 
              class="bg-white text-slate-700 px-3 py-1.5 rounded-md shadow-sm hover:bg-slate-50 transition font-black flex items-center justify-center"
              title="Hari Berikutnya"
            >
              <ChevronRight :size="18" />
            </button>
          </div>
          
          <button 
            @click="fetchAll" 
            class="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow-md hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
          >
            <RefreshCw :size="16" /> Refresh
          </button>
          <button 
            @click="exportToExcel" 
            class="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold shadow-md hover:bg-emerald-700 transition-colors flex items-center gap-2 text-sm"
          >
            <FileSpreadsheet :size="16" /> Export
          </button>
        </div>

      </div>
    </div>
    
    <!-- Konten Utama -->
    <div class="p-6">
      
      <!-- TAB REGULER -->
      <div v-if="activeTab === 'REGULER'" class="animate-slide-up">
        <h1 class="text-2xl font-black text-slate-800 mb-6 flex items-center gap-3">
          <ClipboardList :size="28" class="text-blue-600" /> Catatan Besar (Pengiriman Reguler)
        </h1>
        
        <!-- TAMPILAN KHUSUS HARI MINGGU -->
        <div v-if="dayOfWeek === 0" class="bg-linear-to-br from-amber-50 to-orange-50 p-10 rounded-2xl mb-4 text-center border-2 border-dashed border-amber-200 shadow-sm flex flex-col items-center">
           <Sun class="text-amber-500 mb-4 animate-spin-slow" :size="64" />
           <h2 class="text-2xl font-black text-amber-800 mb-2">Hari Minggu Libur Produksi</h2>
           <p class="font-medium text-amber-700 max-w-md">Tidak ada jadwal pengiriman atau retur reguler pada hari Minggu. Silakan periksa tab <b>Pesanan Khusus (PO)</b> jika ada nota pesanan masuk.</p>
        </div>

        <!-- TAMPILAN KOSONG -->
        <div v-else-if="filteredTokos.length === 0" class="bg-white p-10 rounded-2xl mb-4 text-center border border-slate-200 shadow-sm flex flex-col items-center">
          <SearchX class="text-slate-300 mb-4" :size="64" />
          <h2 class="text-xl font-black text-slate-600 mb-2">Tidak Ada Data</h2>
          <p class="font-medium text-slate-500">Tidak ada siklus pengiriman toko yang beroperasi pada tanggal ini.</p>
        </div>

        <!-- TABEL DATA -->
        <div v-else class="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
          <table id="table-catatan-besar" class="w-full text-sm border-collapse">
            <thead class="text-white bg-slate-800">
              <tr>
                <th class="p-4 border-b border-r border-slate-700 text-left sticky left-0 bg-slate-900 z-10 font-black tracking-wide" rowspan="2">
                  Nama Produk Barang
                </th>
                <th v-for="toko in filteredTokos" :key="toko.NamaToko" colspan="2" class="p-3 border-b border-r border-slate-700 text-center font-bold">
                  {{ toko.NamaToko }}
                </th>
              </tr>
              <tr class="bg-slate-700 text-[10px] uppercase tracking-widest text-slate-300">
                <template v-for="toko in filteredTokos" :key="'sub-'+toko.NamaToko">
                  <th class="p-2 border-b border-r border-slate-600 text-center w-16 bg-slate-700/80">Kirim</th>
                  <th class="p-2 border-b border-r border-slate-600 text-center w-16 bg-slate-700/80">Retur</th>
                </template>
              </tr>
            </thead>
            
            <tbody>
              <tr v-for="barang in uniqueBarangs" :key="barang.nama" class="hover:bg-blue-50/50 even:bg-slate-50 transition-colors">
                
                <td class="p-4 border-r border-b border-slate-100 font-bold sticky left-0 bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-slate-800 z-0">
                  {{ barang.nama }}
                </td>
                
                <template v-for="toko in filteredTokos" :key="toko.NamaToko + '-' + barang.nama">
                  <td class="p-2 border-r border-b border-slate-100 text-center font-bold text-blue-700">
                    {{ getCellData(toko.NamaToko, barang.nama).kirim || '-' }}
                  </td>
                  <td class="p-2 border-r border-b border-slate-100 text-center font-bold text-red-600">
                    {{ getCellData(toko.NamaToko, barang.nama).retur || '-' }}
                  </td>
                </template>
              </tr>
            </tbody>

            <tfoot class="font-bold border-t-2 border-slate-300 bg-slate-100">
              <tr>
                <td class="p-4 border-r border-b border-slate-200 sticky left-0 bg-slate-200/80 text-slate-800 backdrop-blur uppercase tracking-widest text-xs z-0 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Total Kirim (Rp)</td>
                <template v-for="toko in filteredTokos" :key="'totK-'+toko.NamaToko">
                  <td colspan="2" class="p-3 border-r border-b border-slate-200 text-center text-blue-800 text-xs font-black">
                    {{ formatRp(getTotals(toko.NamaToko).kirim) }}
                  </td>
                </template>
              </tr>
              <tr>
                <td class="p-4 border-r border-b border-slate-200 sticky left-0 bg-slate-200/80 text-slate-800 backdrop-blur uppercase tracking-widest text-xs z-0 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Total Retur (Rp)</td>
                <template v-for="toko in filteredTokos" :key="'totR-'+toko.NamaToko">
                  <td colspan="2" class="p-3 border-r border-b border-slate-200 text-center text-red-800 text-xs font-black">
                    {{ formatRp(getTotals(toko.NamaToko).retur) }}
                  </td>
                </template>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- TAB PESANAN -->
      <div v-if="activeTab === 'PESANAN'" class="animate-slide-up">
        <h1 class="text-2xl font-black text-slate-800 mb-6 flex items-center gap-3">
          <ClipboardList :size="28" class="text-yellow-600" /> Catatan Pesanan Khusus (PO)
        </h1>

        <!-- TAMPILAN KOSONG -->
        <div v-if="dataPesanan.length === 0" class="bg-white p-10 rounded-2xl text-center border border-slate-200 shadow-sm flex flex-col items-center">
          <Cake class="text-slate-300 mb-4 opacity-50" :size="64" />
          <h2 class="text-xl font-black text-slate-600 mb-2">Tidak Ada Pesanan</h2>
          <p class="font-medium text-slate-500">Belum ada nota pesanan yang dicetak untuk dikirim atau diambil pada tanggal ini.</p>
        </div>
        
        <!-- TABEL PESANAN -->
        <div v-else class="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
          <table id="table-pesanan" class="w-full text-sm border-collapse">
            <thead class="bg-yellow-500 text-yellow-950">
              <tr>
                <th class="p-4 border-b border-r border-yellow-600 text-left sticky left-0 bg-yellow-600 text-white z-10 font-black tracking-wide">Roti Pesanan</th>
                <th v-for="toko in rekapPesanan.kolomToko" :key="toko" class="p-4 border-b border-r border-yellow-600 text-center font-bold">
                  {{ toko }}
                </th>
                <th class="p-4 border-b border-l-4 border-yellow-700 text-center bg-yellow-700 text-yellow-100 font-black tracking-widest uppercase text-xs">Total Produksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="[namaBarang, dataToko] in rekapPesanan.barisBarang" :key="namaBarang" class="hover:bg-yellow-50/50 even:bg-slate-50 transition-colors">
                <td class="p-4 border-r border-slate-100 font-bold sticky left-0 bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-slate-800 z-0">
                  {{ namaBarang }}
                </td>
                
                <td v-for="toko in rekapPesanan.kolomToko" :key="toko" class="p-4 border-r border-slate-100 text-center font-bold text-slate-600">
                  {{ dataToko[toko] || '-' }}
                </td>

                <!-- Total Per Baris -->
                <td class="p-4 border-l-4 border-slate-200 text-center font-black text-lg bg-slate-100/50 text-blue-800">
                  {{ rekapPesanan.kolomToko.reduce((sum, t) => sum + (dataToko[t] || 0), 0) }}
                </td>
              </tr>
            </tbody>
            <!-- FOOTER TOTAL OMZET RUPIAH -->
            <tfoot class="bg-amber-50 font-bold border-t-4 border-yellow-400">
              <tr>
                <td class="p-4 border-r border-amber-200 sticky left-0 bg-amber-100 text-amber-900 uppercase tracking-widest text-xs z-0 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  Total Omzet (Rp)
                </td>
                
                <td v-for="toko in rekapPesanan.kolomToko" :key="'tot-'+toko" class="p-4 border-r border-amber-200 text-center text-amber-800 font-black text-sm">
                  {{ formatRp(dataPesanan.filter(d => d.nama_toko === toko).reduce((sum, d) => sum + d.total_rupiah, 0)) }}
                </td>
                
                <td class="p-4 border-l-4 border-yellow-500 text-center text-xl text-yellow-900 bg-yellow-200 font-black tracking-tight">
                  {{ formatRp(dataPesanan.reduce((sum, d) => sum + d.total_rupiah, 0)) }}
                </td>
              </tr>
            </tfoot>
          </table>
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
.animate-spin-slow { animation: spin 8s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>