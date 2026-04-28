<script setup>
import { ref, computed, onMounted } from 'vue'

const rawNotas = ref([])

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

const isFaseRetur = computed(() => {
  const d = dayOfWeek.value
  return d === 1 || d === 2 || d === 3 
})

const targetSiklus = computed(() => {
  const d = dayOfWeek.value
  if (d === 1 || d === 4) return 'SiklusKamisSenin'
  if (d === 2 || d === 5) return 'SiklusJumatSelasa'
  if (d === 3 || d === 6) return 'SiklusSabtuRabu'
  return ''
})

const targetTanggalNota = computed(() => {
  if (!selectedTanggal.value) return ''
  const tgl = new Date(selectedTanggal.value)

  if (isFaseRetur.value) {
    tgl.setDate(tgl.getDate() - 4)
  }
  
  return getLocalDateString(tgl)
})

const penjelasanTanggal = computed(() => {
  if (isFaseRetur.value) {
    return `Sistem otomatis menarik sisa nota pengiriman di sekitar tanggal ${targetTanggalNota.value} (Toleransi 3 Hari).`
  }
  return `Menarik data pengiriman aktual di sekitar tanggal ${targetTanggalNota.value} (Toleransi 3 Hari).`
})

const fetchData = async () => {
  try {
    const token = localStorage.getItem('admin_token')
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/notas`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }) 
    
    if (!res.ok) throw new Error("Akses ditolak")
    const data = await res.json()
    rawNotas.value = Array.isArray(data) ? data : (data.data ? data.data : [])
  } catch (err) {
    console.error("Gagal konek ke Backend:", err)
  }
}

const filteredTokos = computed(() => {
  const siklus = targetSiklus.value
  if (!siklus) return [] 
  
  const tokosMap = new Map()
  rawNotas.value.forEach(nota => {
    const isTokoHarian = (nota.SiklusSnapshot === 'HARIAN') // <--- CEK STRING
    let isMatch = false

    if (isTokoHarian) {
      isMatch = true // Toko Harian selalu dapat VIP Pass masuk ke layar hari apa saja
    } else if (nota.SiklusSnapshot) {
      isMatch = (nota.SiklusSnapshot === siklus)
    } else if (nota.Toko) {
      isMatch = (nota.Toko[siklus] === true)
    }

    if (isMatch) {
      tokosMap.set(nota.TokoID, { 
        ID: nota.TokoID, 
        NamaToko: nota.NamaTokoSnapshot || nota.Toko?.NamaToko || '(Nama Kosong)',
        IsHarian: isTokoHarian 
      })
    }
  })
  return Array.from(tokosMap.values())
})

const uniqueBarangs = computed(() => {
  const mapBarang = new Map()

  rawNotas.value.forEach(nota => {
    if (nota.Details) {
      nota.Details.forEach(det => {
        // PRIORITAS NAMA: 
        // 1. Ambil nama Master terbaru (jika relasinya ada)
        // 2. Jika Master sudah dihapus (Soft Delete), pakai Snapshot sebagai cadangan
        const namaTampil = (det.Barang && det.Barang.NamaBarang) 
          ? det.Barang.NamaBarang 
          : (det.NamaBarangSnapshot || 'Barang Tidak Diketahui')

        // Jika barang belum masuk ke daftar, masukkan beserta ID-nya
        if (!mapBarang.has(det.BarangID)) {
          mapBarang.set(det.BarangID, {
            id: det.BarangID,
            nama: namaTampil
          })
        } else {
          // Pastikan nama selalu ter-update dengan nama Master terbaru jika ditemukan
          if (det.Barang && det.Barang.NamaBarang) {
            mapBarang.get(det.BarangID).nama = det.Barang.NamaBarang
          }
        }
      })
    }
  })

  // Kembalikan sebagai array Object dan urutkan sesuai abjad namanya
  return Array.from(mapBarang.values()).sort((a, b) => a.nama.localeCompare(b.nama))
})

const getTargetNotas = (tokoID) => {
  if (!targetTanggalNota.value || !selectedTanggal.value) return []
  
  const siklusLayar = targetSiklus.value
  const notasToko = rawNotas.value.filter(n => n.TokoID === tokoID)
  
  return notasToko.filter(n => {
    // KEMBALI KE DATA LIVE: Gunakan status Toko saat ini, bukan snapshot
    const isTokoHarian = (n.SiklusSnapshot === 'HARIAN') 
    const notaTimeStr = n.TanggalKirim.substring(0, 10)
    
    if (isTokoHarian) {
      // Logika Toko Harian: Kirim & Retur di hari yang sama
      return notaTimeStr === selectedTanggal.value
    } else {
      // Logika Siklus: Gunakan Snapshot Siklus untuk menentukan kolom
      let isMatchSiklusLayar = false
      if (n.SiklusSnapshot) {
        isMatchSiklusLayar = (n.SiklusSnapshot === siklusLayar)
      } else if (n.Toko) {
        isMatchSiklusLayar = (n.Toko[siklusLayar] === true)
      }

      if (!isMatchSiklusLayar) return false

      const targetTime = new Date(targetTanggalNota.value).getTime()
      const notaTime = new Date(notaTimeStr).getTime()
      // const diffDays = Math.abs(notaTime - targetTime) / (1000 * 3600 * 24)
      
      // return diffDays <= 3
      
      // LOGIKA PAKSA "MINGGU INI" UNTUK SEMUA SIKLUS
      // Fungsi pintar untuk mencari tanggal "Hari Senin" dari suatu tanggal
      const getSenin = (dateMs) => {
        const d = new Date(dateMs)
        const day = d.getDay()
        // Jika hari Minggu (0), mundur 6 hari. Jika hari lain, mundur ke Senin (1)
        const diff = d.getDate() - day + (day === 0 ? -6 : 1)
        return new Date(d.getFullYear(), d.getMonth(), diff).getTime()
      }

      // Asal Nota dan Target berada di minggu yang sama (Seninnya sama), pasti masuk!
      return getSenin(notaTime) === getSenin(targetTime)
    }
  })
}

const formatRp = (val) => {
  if (!val || val === 0) return '-'
  return new Intl.NumberFormat('id-ID').format(val)
}

const getCellData = (tokoID, barangID) => {
  const notas = getTargetNotas(tokoID)
  let sumKirim = 0
  let sumRetur = 0

  notas.forEach(nota => {
    const detail = nota.Details?.find(d => d.BarangID === barangID)
    if (detail) {
      // CEK STATUS PER NOTA
      const isNotaHarian = (nota.SiklusSnapshot === 'HARIAN')
      
      if (isNotaHarian) {
        // Jika nota HARIAN, tampilkan kirim & retur sekaligus
        sumKirim += detail.BanyakKirim || 0
        sumRetur += detail.BanyakRetur || 0
      } else {
        // Jika nota SIKLUS, patuhi aturan siklus
        if (isFaseRetur.value) {
          sumRetur += detail.BanyakRetur || 0
        } else {
          sumKirim += detail.BanyakKirim || 0
        }
      }
    }
  })

  return { kirim: sumKirim, retur: sumRetur }
}

const getTotals = (tokoID) => {
  const notas = getTargetNotas(tokoID)
  let totalNominalKirim = 0
  let totalNominalRetur = 0

  notas.forEach(nota => {
    // CEK STATUS PER NOTA
    const isNotaHarian = (nota.SiklusSnapshot === 'HARIAN')
    
    if (isNotaHarian) {
      totalNominalKirim += nota.JumlahKirim || 0
      totalNominalRetur += nota.JumlahRetur || 0
    } else {
      if (isFaseRetur.value) {
        totalNominalRetur += nota.JumlahRetur || 0
      } else {
        totalNominalKirim += nota.JumlahKirim || 0
      }
    }
  })

  return { kirim: totalNominalKirim, retur: totalNominalRetur }
}

const exportToExcel = () => {
  const originalTable = document.getElementById('table-catatan-besar')
  if (!originalTable) return alert('Tabel belum siap!')

  const table = originalTable.cloneNode(true)

  // 1. Suntikkan atribut kuno untuk Excel
  table.setAttribute('border', '1')
  table.style.borderCollapse = 'collapse'
  table.style.fontFamily = 'Calibri, sans-serif'

  // 2. Warnai header tabel secara paksa
  const ths = table.querySelectorAll('th')
  ths.forEach(th => {
    th.style.backgroundColor = '#e2e8f0'
    th.style.fontWeight = 'bold'
    th.style.textAlign = 'center'
    th.style.padding = '4px 8px' // Padding dirapatkan
    th.style.whiteSpace = 'nowrap' // Mencegah teks turun berantakan
  })

  // 3. Rapikan jarak cell data
  const tds = table.querySelectorAll('td')
  tds.forEach(td => {
    td.style.padding = '4px 8px'
  })

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      </x:WorksheetOptions>
         </x:ExcelWorksheet>
        </x:ExcelWorksheets>
       </x:ExcelWorkbook>
      </xml>
      <![endif]-->
    </head>
    <body>
      <h2>Catatan Besar Tiara Nota</h2>
      <p><b>Tanggal Acuan:</b> ${selectedTanggal.value} | <b>Fase:</b> ${isFaseRetur.value ? 'RETUR' : 'KIRIM'}</p>
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
  
  // 1. Pecah teks YYYY-MM-DD secara manual agar tidak kena bug Timezone browser
  const parts = selectedTanggal.value.split('-')
  const year = parseInt(parts[0])
  const month = parseInt(parts[1]) - 1 // Bulan di Javascript mulai dari 0
  const day = parseInt(parts[2])

  // 2. Set tanggal yang baru
  const date = new Date(year, month, day)
  date.setDate(date.getDate() + offset)

  // 3. Rakit kembali ke format YYYY-MM-DD untuk input kalender
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')

  selectedTanggal.value = `${y}-${m}-${d}`
  
  // 4. Tarik data dari database
  fetchData()
}

onMounted(fetchData)
</script>

<template>
  <div class="p-8 bg-gray-50 min-h-screen">
    <div class="flex justify-between items-start mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Catatan Besar Harian</h1>
        <p class="text-sm font-medium text-blue-600 mt-1">
          Fase: <span class="uppercase font-bold">{{ isFaseRetur ? 'Fokus Retur' : 'Fokus Kirim' }}</span>
        </p>
        <p class="text-xs text-gray-500 mt-1 italic">
          * {{ penjelasanTanggal }}
        </p>
      </div>
      
      <div class="flex items-end gap-3">
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
              @change="fetchData" 
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
          @click="fetchData" 
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

    <div v-if="filteredTokos.length === 0" class="bg-yellow-100 text-yellow-800 p-4 rounded mb-4">
      Tidak ada siklus toko yang jadwalnya beroperasi di tanggal ini.
    </div>

    <div v-else class="bg-white rounded border overflow-x-auto shadow-sm">
      <table id="table-catatan-besar" class="w-full text-sm border-collapse">
        <thead class="bg-gray-800 text-white">
          <tr>
            <th class="p-3 border border-gray-700 text-left sticky left-0 bg-gray-800 z-10" rowspan="2">
              Nama Barang
            </th>
            <th v-for="toko in filteredTokos" :key="toko.ID" colspan="2" class="p-2 border border-gray-700 text-center">
              {{ toko.NamaToko }}
            </th>
          </tr>
          <tr class="bg-gray-700 text-[10px] uppercase tracking-widest">
            <template v-for="toko in filteredTokos" :key="'sub-'+toko.ID">
              <th class="p-2 border border-gray-600 text-center w-16" :class="{'text-gray-400': isFaseRetur}">Kirim</th>
              <th class="p-2 border border-gray-600 text-center w-16" :class="{'text-gray-400': !isFaseRetur}">Retur</th>
            </template>
          </tr>
        </thead>
        
        <tbody>
          <tr v-for="barang in uniqueBarangs" :key="barang.id" class="hover:bg-gray-50 border-b">
            
            <td class="p-3 border-r font-bold sticky left-0 bg-white shadow-sm">{{ barang.nama }}</td>
            
            <template v-for="toko in filteredTokos" :key="toko.ID + '-' + barang.id">
              <td class="p-2 border-r text-center font-semibold text-blue-700" 
                  :class="{'opacity-20': isFaseRetur && !toko.IsHarian}">
                {{ getCellData(toko.ID, barang.id).kirim }}
              </td>

              <td class="p-2 border-r text-center font-semibold text-red-600" 
                  :class="{'opacity-20': !isFaseRetur && !toko.IsHarian}">
                {{ getCellData(toko.ID, barang.id).retur }}
              </td>
            </template>
          </tr>
        </tbody>

        <tfoot class="bg-gray-100 font-bold border-t-2 border-gray-300">
          <tr>
            <td class="p-3 border-r sticky left-0 bg-gray-100 text-gray-700">Total Kirim (Rp)</td>
            <template v-for="toko in filteredTokos" :key="'totK-'+toko.ID">
              <td colspan="2" class="p-2 border-r text-center text-blue-800">
                {{ formatRp(getTotals(toko.ID).kirim) }}
              </td>
            </template>
          </tr>
          <tr>
            <td class="p-3 border-r sticky left-0 bg-gray-100 text-gray-700">Total Retur (Rp)</td>
            <template v-for="toko in filteredTokos" :key="'totR-'+toko.ID">
              <td colspan="2" class="p-2 border-r text-center text-red-800">
                {{ formatRp(getTotals(toko.ID).retur) }}
              </td>
            </template>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
</template>