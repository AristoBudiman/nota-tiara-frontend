<script setup>
import { ref, computed, onMounted } from 'vue'

const rawDataBesar = ref([]) // Data matang dari Backend
const activeTab = ref('REGULER') 
const dataPesanan = ref([])

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
        IsHarian: row.is_harian 
      })
    }
  })
  return Array.from(tokosMap.values())
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
  if (!originalTable) return alert('Tabel belum siap!')

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
  <div class="p-8 bg-gray-50 min-h-screen">
    <div class="flex flex-col lg:flex-row justify-between items-start mb-6 gap-6 lg:gap-0">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Catatan Besar Harian</h1>
        <!-- SWITCH TAB NAVIGASI -->
        <div class="flex flex-col sm:flex-row mt-3 bg-gray-200 p-1 rounded-lg w-full md:w-max gap-1">
          <button @click="activeTab = 'REGULER'; fetchAll()" 
                  class="px-4 py-2 rounded-md font-bold text-sm transition"
                  :class="activeTab === 'REGULER' ? 'bg-white shadow text-blue-800' : 'text-gray-500 hover:text-gray-800'">
            📦 PENGIRIMAN REGULER
          </button>
          <button @click="activeTab = 'PESANAN'; fetchAll()" 
                  class="px-4 py-2 rounded-md font-bold text-sm transition"
                  :class="activeTab === 'PESANAN' ? 'bg-yellow-400 shadow text-yellow-900' : 'text-gray-500 hover:text-gray-800'">
            🎂 PESANAN KHUSUS (PO)
          </button>
        </div>
      </div>
      
      <div class="flex flex-wrap lg:flex-nowrap items-end gap-3 w-full lg:w-auto">
        <div class="flex flex-col">
          <label class="text-xs font-bold text-gray-500 mb-1">Pilih Tanggal Harian</label>
          <div class="flex items-center gap-1">
            <button 
              @click="geserHari(-1)" 
              class="bg-gray-200 text-gray-700 px-3 py-2 rounded shadow-sm hover:bg-gray-300 transition font-black h-10 border border-gray-300"
              title="Hari Sebelumnya"
            >
              ◀
            </button>
            
            <input 
              type="date" 
              v-model="selectedTanggal" 
              @change="fetchAll" 
              class="border-2 border-gray-300 rounded px-4 py-2 font-bold bg-white focus:outline-none focus:border-blue-500 h-10"
            />

            <button 
              @click="geserHari(1)" 
              class="bg-gray-200 text-gray-700 px-3 py-2 rounded shadow-sm hover:bg-gray-300 transition font-black h-10 border border-gray-300"
              title="Hari Berikutnya"
            >
              ▶
            </button>
          </div>
        </div>
        
        <button 
          @click="fetchAll" 
          class="bg-blue-600 text-white px-4 py-2 rounded font-bold shadow hover:bg-blue-700 transition border-2 border-blue-600 flex items-center gap-2 h-10.5"
          title="Tarik data terbaru dari database"
        >
          🔄 Refresh
        </button>
        <button 
          @click="exportToExcel" 
          class="bg-green-600 text-white px-4 py-2 rounded font-bold shadow hover:bg-green-700 transition border-2 border-green-600 flex items-center gap-2 h-10.5"
        >
          📊 Export Excel
        </button>
      </div>
    </div>
    
    <div v-if="activeTab === 'REGULER'">
      <!-- TAMPILAN KHUSUS HARI MINGGU -->
      <div v-if="dayOfWeek === 0" class="bg-blue-100 text-blue-800 p-8 rounded-xl mb-4 text-center border border-blue-200 shadow-sm">
         <h2 class="text-2xl font-black mb-2">🏖️ Hari Minggu Libur</h2>
         <p class="font-medium text-blue-700">Tidak ada jadwal pengiriman atau retur reguler pada hari Minggu. <br> Silakan cek tab <b>Pesanan Khusus (PO)</b> jika ada pesanan masuk.</p>
      </div>

      <div v-else-if="filteredTokos.length === 0" class="bg-yellow-100 text-yellow-800 p-4 rounded mb-4">
        Tidak ada data atau siklus toko yang beroperasi di tanggal ini.
      </div>

      <div v-else class="bg-white rounded border overflow-x-auto shadow-sm">
        <table id="table-catatan-besar" class="w-full text-sm border-collapse">
          <thead class="bg-gray-800 text-white">
            <tr>
              <th class="p-3 border border-gray-700 text-left sticky left-0 bg-gray-800 z-10" rowspan="2">
                Nama Barang
              </th>
              <th v-for="toko in filteredTokos" :key="toko.NamaToko" colspan="2" class="p-2 border border-gray-700 text-center">
                {{ toko.NamaToko }}
              </th>
            </tr>
            <tr class="bg-gray-700 text-[10px] uppercase tracking-widest">
              <template v-for="toko in filteredTokos" :key="'sub-'+toko.NamaToko">
                <th class="p-2 border border-gray-600 text-center w-16">Kirim</th>
                <th class="p-2 border border-gray-600 text-center w-16">Retur</th>
              </template>
            </tr>
          </thead>
          
          <tbody>
            <tr v-for="barang in uniqueBarangs" :key="barang.nama" class="hover:bg-gray-50 border-b">
              
              <td class="p-3 border-r font-bold sticky left-0 bg-white shadow-sm">{{ barang.nama }}</td>
              
              <template v-for="toko in filteredTokos" :key="toko.NamaToko + '-' + barang.nama">
                <td class="p-2 border-r text-center font-semibold text-blue-700">
                  {{ getCellData(toko.NamaToko, barang.nama).kirim }}
                </td>

                <td class="p-2 border-r text-center font-semibold text-red-600">
                  {{ getCellData(toko.NamaToko, barang.nama).retur }}
                </td>
              </template>
            </tr>
          </tbody>

          <tfoot class="bg-gray-100 font-bold border-t-2 border-gray-300">
            <tr>
              <td class="p-3 border-r sticky left-0 bg-gray-100 text-gray-700">Total Kirim (Rp)</td>
              <template v-for="toko in filteredTokos" :key="'totK-'+toko.NamaToko">
                <td colspan="2" class="p-2 border-r text-center text-blue-800">
                  {{ formatRp(getTotals(toko.NamaToko).kirim) }}
                </td>
              </template>
            </tr>
            <tr>
              <td class="p-3 border-r sticky left-0 bg-gray-100 text-gray-700">Total Retur (Rp)</td>
              <template v-for="toko in filteredTokos" :key="'totR-'+toko.NamaToko">
                <td colspan="2" class="p-2 border-r text-center text-red-800">
                  {{ formatRp(getTotals(toko.NamaToko).retur) }}
                </td>
              </template>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- TAMPILAN TAB PESANAN -->
    <div v-if="activeTab === 'PESANAN'">
      <div v-if="dataPesanan.length === 0" class="bg-gray-100 p-4 rounded text-center font-bold text-gray-500">
        Tidak ada pesanan masuk untuk dikirim/diambil pada tanggal ini.
      </div>
      
      <div v-else class="bg-white rounded border overflow-x-auto shadow-sm">
        <table id="table-pesanan" class="w-full text-sm border-collapse">
          <thead class="bg-yellow-500 text-yellow-950">
            <tr>
              <th class="p-3 border-r border-yellow-600 text-left sticky left-0 bg-yellow-500">Roti Pesanan</th>
              <th v-for="toko in rekapPesanan.kolomToko" :key="toko" class="p-3 border-r border-yellow-600 text-center font-black">
                {{ toko }}
              </th>
              <th class="p-3 border-l-4 border-yellow-700 text-center bg-yellow-600 text-white">Total Produksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="[namaBarang, dataToko] in rekapPesanan.barisBarang" :key="namaBarang" class="border-b hover:bg-yellow-50">
              <td class="p-3 border-r font-bold sticky left-0 bg-white">{{ namaBarang }}</td>
              
              <td v-for="toko in rekapPesanan.kolomToko" :key="toko" class="p-3 border-r text-center font-medium">
                {{ dataToko[toko] || '-' }}
              </td>

              <!-- Total Per Baris -->
              <td class="p-3 border-l-4 border-gray-300 text-center font-black text-lg bg-gray-50 text-blue-800">
                {{ rekapPesanan.kolomToko.reduce((sum, t) => sum + (dataToko[t] || 0), 0) }}
              </td>
            </tr>
          </tbody>
          <!-- FOOTER TOTAL OMZET RUPIAH -->
          <tfoot class="bg-yellow-100 font-bold border-t-4 border-yellow-500">
            <tr>
              <td class="p-3 border-r border-yellow-300 sticky left-0 bg-yellow-100 text-yellow-900 uppercase">
                TOTAL OMZET (Rp)
              </td>
              
              <td v-for="toko in rekapPesanan.kolomToko" :key="'tot-'+toko" class="p-3 border-r border-yellow-300 text-right text-yellow-800 text-sm">
                {{ formatRp(dataPesanan.filter(d => d.nama_toko === toko).reduce((sum, d) => sum + d.total_rupiah, 0)) }}
              </td>
              
              <td class="p-3 border-l-4 border-yellow-500 text-right text-lg text-yellow-950 bg-yellow-200 font-black">
                {{ formatRp(dataPesanan.reduce((sum, d) => sum + d.total_rupiah, 0)) }}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

  </div>
</template>