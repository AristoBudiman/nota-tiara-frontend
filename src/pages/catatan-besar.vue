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
          <input 
            type="date" 
            v-model="selectedTanggal" 
            class="border-2 border-gray-300 rounded px-4 py-2 font-bold bg-white focus:outline-none focus:border-blue-500"
          />
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

// const filteredTokos = computed(() => {
//   const siklus = targetSiklus.value
//   if (!siklus) return [] 
  
//   const tokosMap = new Map()
//   rawNotas.value.forEach(nota => {
//     let isMatch = false
//     let namaTokoTampil = '(Nama Kosong)'

//     const isTokoHarian = nota.Toko?.IsHarian || false // <--- Deteksi Toko Harian

//     if (nota.SiklusSnapshot) {
//       // Jalur VIP: Lolos jika siklus cocok ATAU jika dia Toko Harian
//       isMatch = (nota.SiklusSnapshot === siklus) || isTokoHarian 
//       namaTokoTampil = nota.NamaTokoSnapshot || '(Nama Kosong)'
//     } else if (nota.Toko) {
//       isMatch = (nota.Toko[siklus] === true) || isTokoHarian
//       namaTokoTampil = nota.Toko.NamaToko
//     }

//     if (isMatch) {
//       tokosMap.set(nota.TokoID, { 
//         ID: nota.TokoID, 
//         NamaToko: namaTokoTampil 
//       })
//     }
//   })
//   return Array.from(tokosMap.values())
// })

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
        IsHarian: isTokoHarian // <--- WAJIB DITAMBAHKAN
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

// === PERBAIKAN LOGIKA: SEKARANG MENGAMBIL BANYAK NOTA SEKALIGUS ===
// const getTargetNotas = (tokoID) => {
//   if (!targetTanggalNota.value) return []
//   const targetTime = new Date(targetTanggalNota.value).getTime()

//   const notasToko = rawNotas.value.filter(n => n.TokoID === tokoID)
  
//   // Filter dan kumpulkan SEMUA nota yang masuk dalam batas toleransi 3 hari
//   return notasToko.filter(n => {
//     const notaTime = new Date(n.TanggalKirim.substring(0, 10)).getTime()
//     const diffDays = Math.abs(notaTime - targetTime) / (1000 * 3600 * 24)
//     return diffDays <= 3
//   })
// }

// === PERBAIKAN LOGIKA: FILTER SIKLUS DI DALAM PENCARIAN NOTA ===
// const getTargetNotas = (tokoID) => {
//   if (!targetTanggalNota.value || !selectedTanggal.value) return []
  
//   const siklusLayar = targetSiklus.value // Cek kita sedang buka siklus apa (misal: KamisSenin)
//   const notasToko = rawNotas.value.filter(n => n.TokoID === tokoID)
  
//   return notasToko.filter(n => {
//     const isTokoHarian = n.IsHarianSnapshot || false
//     const notaTimeStr = n.TanggalKirim.substring(0, 10)
    
//     if (isTokoHarian) {
//       // TOKO HARIAN: Syarat mutlak, tanggal kirim harus sama persis dengan tanggal layar
//       return notaTimeStr === selectedTanggal.value
//     } else {
//       // TOKO REGULER: KUNCI GANDA (Cek Snapshot Dulu!)
//       let isMatchSiklusLayar = false
//       if (n.SiklusSnapshot) {
//         // Hanya izinkan nota yang stempelnya sama dengan layar saat ini
//         isMatchSiklusLayar = (n.SiklusSnapshot === siklusLayar)
//       } else if (n.Toko) {
//         // Fallback untuk nota versi sangat lama yang belum pakai snapshot
//         isMatchSiklusLayar = (n.Toko[siklusLayar] === true)
//       }

//       // JIKA NOTA BEDA SIKLUS (Misal nota Jumat, padahal buka layar Kamis): BUANG!
//       if (!isMatchSiklusLayar) return false

//       // Jika siklus sudah cocok, baru cek toleransi 3 harinya
//       const targetTime = new Date(targetTanggalNota.value).getTime()
//       const notaTime = new Date(notaTimeStr).getTime()
//       const diffDays = Math.abs(notaTime - targetTime) / (1000 * 3600 * 24)
      
//       return diffDays <= 3
//     }
//   })
// }

// catatan-besar.vue -> getTargetNotas
const getTargetNotas = (tokoID) => {
  if (!targetTanggalNota.value || !selectedTanggal.value) return []
  
  const siklusLayar = targetSiklus.value
  const notasToko = rawNotas.value.filter(n => n.TokoID === tokoID)
  
  return notasToko.filter(n => {
    // 🔓 KEMBALI KE DATA LIVE: Gunakan status Toko saat ini, bukan snapshot
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
      const diffDays = Math.abs(notaTime - targetTime) / (1000 * 3600 * 24)
      
      return diffDays <= 3
    }
  })
}

// Di dalam fungsi getCellData, ubah pencarian find()-nya:
// UBAH PARAMETER KEDUA MENJADI barangID
// const getCellData = (tokoID, barangID) => {
//   const notas = getTargetNotas(tokoID)
//   let sumKirim = 0
//   let sumRetur = 0

//   notas.forEach(nota => {
//     if (nota.Details) {
//       // CARI BERDASARKAN ID BARANG, BUKAN NAMA SNAPSHOT
//       const detail = nota.Details.find(d => d.BarangID === barangID)
      
//       if (detail) {
//         sumKirim += detail.BanyakKirim || 0
//         sumRetur += detail.BanyakRetur || 0
//       }
//     }
//   })

//   if (isFaseRetur.value) {
//     return { kirim: 0, retur: sumRetur }
//   } else {
//     return { kirim: sumKirim, retur: 0 }
//   }
// }

// const getTotals = (tokoID) => {
//   const notas = getTargetNotas(tokoID)
  
//   let totalNominalKirim = 0
//   let totalNominalRetur = 0

//   // Menjumlahkan total Rupiah dari semua nota gabungan tersebut
//   notas.forEach(nota => {
//     totalNominalKirim += nota.JumlahKirim || 0
//     totalNominalRetur += nota.JumlahRetur || 0
//   })

//   if (isFaseRetur.value) {
//     return { kirim: 0, retur: totalNominalRetur }
//   } else {
//     return { kirim: totalNominalKirim, retur: 0 }
//   }
// }

const formatRp = (val) => {
  if (!val || val === 0) return '-'
  return new Intl.NumberFormat('id-ID').format(val)
}

// === GANTI KEDUA FUNGSI INI ===

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
        // Jika nota ini HARIAN, tampilkan kirim & retur sekaligus
        sumKirim += detail.BanyakKirim || 0
        sumRetur += detail.BanyakRetur || 0
      } else {
        // Jika nota ini SIKLUS, patuhi aturan fase layar
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
  // KITA HAPUS table.style.width = '100%' AGAR TIDAK MELAR!

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

const exportToCSV = () => {
  const table = document.getElementById('table-catatan-besar');
  if (!table) return alert('Tabel belum siap!');

  let csvContent = "";
  const rows = table.querySelectorAll("tr");

  rows.forEach(row => {
    const cols = row.querySelectorAll("th, td");
    const rowData = Array.from(cols).map(col => {
      // Bersihkan teks dari baris baru atau koma agar tidak merusak format CSV
      let text = col.innerText.replace(/\n/g, " ").replace(/,/g, ".");
      return `"${text}"`; // Bungkus dengan kutipan agar aman
    }).join(",");
    csvContent += rowData + "\r\n";
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute("href", url);
  link.setAttribute("download", `Catatan_Besar_${selectedTanggal.value}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

onMounted(fetchData)
</script>