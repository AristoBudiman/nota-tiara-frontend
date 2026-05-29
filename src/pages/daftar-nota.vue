<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const role = ref(localStorage.getItem('admin_role') || 'superadmin')

// Data Superadmin
const listNota = ref([])
const listPesanan = ref([])

// Data Sales
const notaAktif = ref([])
const notaTugas = ref([])
const daftarToko = ref([])
const selectedTokoID = ref('')
const notaKunjungan = ref([])
const poTugas = ref([])

const activeTab = ref(sessionStorage.getItem('tab_nota') || 'REGULER') // Kontrol Tab

const checkAuthError = (res) => {
  if (res.status === 401 || res.status === 403) {
    alert("Sesi habis atau Akses Ditolak!")
    localStorage.clear()
    router.push('/login')
    return true
  }
  return false
}

// Helper untuk Tanggal Default (1 Bulan Lalu & Hari Ini)
const getTanggalWIB = (isPastMonth = false) => {
  const d = new Date()
  if (isPastMonth) {
    d.setMonth(d.getMonth() - 1) // Mundur tepat 1 bulan dari hari ini
  }
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
}

// ----------------------------------------------------
// STATE FILTER REGULER
// ----------------------------------------------------
const filterStartDate = ref(sessionStorage.getItem('filter_start') || getTanggalWIB(true))
const filterEndDate = ref(sessionStorage.getItem('filter_end') || getTanggalWIB())
const filterSiklus = ref(sessionStorage.getItem('filter_siklus') || 'semua')
const filterTokoSuperadmin = ref(sessionStorage.getItem('filter_toko') || 'semua')

// ----------------------------------------------------
// STATE FILTER PESANAN (PO)
// ----------------------------------------------------
const filterStartDatePO = ref(sessionStorage.getItem('filter_start_po') || getTanggalWIB(true))
const filterEndDatePO = ref(sessionStorage.getItem('filter_end_po') || getTanggalWIB())
const filterTokoPO = ref(sessionStorage.getItem('filter_toko_po') || 'semua')

// Fungsi tarik data riwayat pesanan
const fetchRiwayatPesanan = async () => {
  try {
    const token = localStorage.getItem('admin_token')
    const start = filterStartDatePO.value
    const end = filterEndDatePO.value
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/pesanan/riwayat?start_date=${start}&end_date=${end}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (checkAuthError(res)) return
    if (res.ok) listPesanan.value = await res.json()
  } catch (err) {
    console.error("Gagal tarik riwayat PO", err)
  }
}

const fetchSuperadminData = async (token) => {
  const start = filterStartDate.value
  const end = filterEndDate.value
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/notas?start_date=${start}&end_date=${end}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (checkAuthError(res)) return
  if (res.ok) listNota.value = await res.json()
}

const fetchSalesData = async (token) => {
  try {
    // 1. Ambil Dashboard Sales
    const resDash = await fetch(`${import.meta.env.VITE_API_URL}/api/sales/dashboard`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (checkAuthError(resDash)) return
    if (resDash.ok) {
      const dash = await resDash.json()
      notaAktif.value = dash.aktif || []
      notaTugas.value = dash.tugas || []
      poTugas.value = dash.tugas_po || []
    }

    // 2. Ambil Dropdown Toko
    const resToko = await fetch(`${import.meta.env.VITE_API_URL}/api/tokos`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (checkAuthError(resToko)) return
    
    if (resToko.ok) {
      daftarToko.value = await resToko.json()
      console.log("✅ SUKSES Tarik Data Toko:", daftarToko.value) // Sensor sukses
    } else {
      console.error("❌ GAGAL Tarik Toko. Status HTTP:", resToko.status) // Sensor gagal
    }
  } catch (err) {
    console.error("💥 ERROR Jaringan / Server Down:", err) // Sensor putus koneksi
  }
}

const fetchKunjungan = async () => {
  if (!selectedTokoID.value) return
  const token = localStorage.getItem('admin_token')
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/sales/kunjungan/${selectedTokoID.value}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (checkAuthError(res)) return
  if (res.ok) notaKunjungan.value = await res.json()
}

const buatNotaBaru = () => {
  router.push(`/buat-nota?toko_id=${selectedTokoID.value}`)
}

// ----------------------------------------------------
// LOGIKA FILTER REGULER
// ----------------------------------------------------
// Ambil daftar toko unik berdasarkan SIKLUS TERAKHIRNYA saja
const filteredUniqueTokos = computed(() => {
  const map = new Map()

  listNota.value.forEach(n => {
    // Karena listNota sudah diurutkan dari terbaru (DESC) oleh Golang,
    // data pertama yang ditemukan adalah status TERAKHIR dari toko tersebut.
    if (!map.has(n.TokoID)) {
      map.set(n.TokoID, {
        id: n.TokoID,
        nama: n.NamaTokoSnapshot || n.Toko?.NamaToko || 'Unknown',
        siklusTerbaru: n.SiklusSnapshot || 'Lainnya'
      })
    }
  })

  // Ubah map jadi array
  let listToko = Array.from(map.values())

  // Saring dropdown hanya untuk toko yang SIKLUS TERAKHIRNYA cocok
  if (filterSiklus.value !== 'semua') {
    listToko = listToko.filter(t => t.siklusTerbaru === filterSiklus.value)
  }

  // Urutkan berdasarkan abjad agar rapi
  return listToko.sort((a, b) => a.nama.localeCompare(b.nama))
})

// Filter Riwayat Nota
const filteredListNota = computed(() => {
  return listNota.value.filter(n => {
    // Filter Siklus
    if (filterSiklus.value !== 'semua' && n.SiklusSnapshot !== filterSiklus.value) return false

    // Filter Toko 
    const valToko = filterTokoSuperadmin.value
    if (valToko !== 'semua' && valToko !== '' && valToko !== null) {
      if (n.TokoID !== Number(valToko)) return false
    }

    return true
  })
})

// Filter khusus untuk Dashboard Sales: Sembunyikan yang sudah SELESAI
const filteredNotaAktifSales = computed(() => {
  return notaAktif.value.filter(n => n.Status !== 'SELESAI')
})

// ----------------------------------------------------
// LOGIKA FILTER PESANAN (PO)
// ----------------------------------------------------
// Ambil titik unik untuk Dropdown Filter Toko PO
const filteredUniqueTokosPO = computed(() => {
  const map = new Map()
  listPesanan.value.forEach(p => {
    const id = p.TokoID || 0
    const nama = p.JenisPengambilan === 'PABRIK' ? 'PABRIK (Direct)' : p.NamaTokoSnapshot
    if (!map.has(id)) map.set(id, { id, nama })
  })
  return Array.from(map.values()).sort((a, b) => a.nama.localeCompare(b.nama))
})

// Fungsi memfilter List PO berdasarkan Toko dan Waktu
const filteredListPesanan = computed(() => {
  return listPesanan.value.filter(po => {
    // Filter Toko
    if (filterTokoPO.value !== 'semua') {
      const targetId = Number(filterTokoPO.value)
      const poId = po.TokoID || 0
      if (poId !== targetId) return false
    }

    return true
  })
})

// SIMPAN OTOMATIS KE SESSION STORAGE
watch(activeTab, (val) => sessionStorage.setItem('tab_nota', val))
// --- SATPAM VALIDASI TANGGAL REGULER ---
watch([filterStartDate, filterEndDate], ([newStart, newEnd], [oldStart, oldEnd]) => {
  if (newStart > newEnd) {
    alert("⚠️ Tanggal Mulai tidak boleh lebih besar dari Tanggal Akhir!")
    // Auto-koreksi dikembalikan ke tanggal sebelumnya
    filterStartDate.value = oldStart || newEnd
    filterEndDate.value = oldEnd || newStart
    return // Stop, jangan nge-fetch ke backend
  }
  
  sessionStorage.setItem('filter_start', newStart)
  sessionStorage.setItem('filter_end', newEnd)
  if (role.value === 'superadmin') fetchSuperadminData(localStorage.getItem('admin_token'))
})

// --- SATPAM VALIDASI TANGGAL PO ---
watch([filterStartDatePO, filterEndDatePO], ([newStart, newEnd], [oldStart, oldEnd]) => {
  if (newStart > newEnd) {
    alert("⚠️ Tanggal Mulai tidak boleh lebih besar dari Tanggal Akhir!")
    // Auto-koreksi
    filterStartDatePO.value = oldStart || newEnd
    filterEndDatePO.value = oldEnd || newStart
    return // Stop, jangan nge-fetch ke backend
  }
  
  sessionStorage.setItem('filter_start_po', newStart)
  sessionStorage.setItem('filter_end_po', newEnd)
  if (role.value === 'superadmin') fetchRiwayatPesanan()
})
watch(filterSiklus, (val) => sessionStorage.setItem('filter_siklus', val))
watch(filterTokoSuperadmin, (val) => sessionStorage.setItem('filter_toko', val))
watch(filterStartDatePO, (val) => { 
  sessionStorage.setItem('filter_start_po', val); 
  if (role.value === 'superadmin') fetchRiwayatPesanan() 
})
watch(filterEndDatePO, (val) => { 
  sessionStorage.setItem('filter_end_po', val); 
  if (role.value === 'superadmin') fetchRiwayatPesanan() 
})
watch(filterTokoPO, (val) => sessionStorage.setItem('filter_toko_po', val))

onMounted(() => {
  const token = localStorage.getItem('admin_token')
  if (role.value === 'superadmin') {
    fetchSuperadminData(token)
    fetchRiwayatPesanan()
  } else {
    fetchSalesData(token)
  }
})

// Fungsi membatalkan pesanan
const batalkanPO = async (id, noNota) => {
  if (!confirm(`Yakin ingin membatalkan pesanan ${noNota}?`)) return
  
  try {
    const token = localStorage.getItem('admin_token')
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/pesanan/${id}/batal`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (checkAuthError(res)) return
    if (res.ok) {
      alert("Pesanan dibatalkan!")
      fetchRiwayatPesanan() // Refresh tabel
    }
  } catch (err) {
    alert("Gagal membatalkan pesanan.")
  }
}

// Fungsi membatalkan Nota Reguler
const batalkanNota = async (id, noNota) => {
  if (!confirm(`Yakin ingin membatalkan nota reguler ${noNota}? Uang di kasir akan otomatis ditarik kembali.`)) return
  
  try {
    const token = localStorage.getItem('admin_token')
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/notas/${id}/batal`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (checkAuthError(res)) return
    if (res.ok) {
      alert("Nota berhasil dibatalkan!")
      fetchSuperadminData(token) // Refresh tabel
    }
  } catch (err) {
    alert("Gagal membatalkan nota.")
  }
}

const pulihkanNota = async (id, noNota) => {
  if (!confirm(`Kembalikan nota reguler ${noNota} ke status aktif? Uang kas akan kembali tercatat otomatis.`)) return
  
  try {
    const token = localStorage.getItem('admin_token')
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/notas/${id}/pulihkan`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (checkAuthError(res)) return
    if (res.ok) {
      alert("✅ Nota berhasil dipulihkan!")
      fetchSuperadminData(token) // Refresh tabel
    }
  } catch (err) {
    alert("Gagal memulihkan nota.")
  }
}

const pulihkanPO = async (id, noNota) => {
  if (!confirm(`Kembalikan pesanan ${noNota} ke status aktif? Uang kas (DP) akan kembali tercatat otomatis.`)) return
  
  try {
    const token = localStorage.getItem('admin_token')
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/pesanan/${id}/pulihkan`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (checkAuthError(res)) return
    if (res.ok) {
      alert("✅ Pesanan berhasil dipulihkan!")
      fetchRiwayatPesanan() // Refresh tabel
    }
  } catch (err) {
    alert("Gagal memulihkan pesanan.")
  }
}

const formatTanggal = (tgl) => {
  return new Date(tgl).toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta', day: '2-digit', month: 'long', year: 'numeric'
  })
}

// 🖨️ FUNGSI PRINT
const cetakLaporan = () => { window.print() }

// Helpers untuk Kop Surat
const namaTokoPrint = computed(() => {
  if (filterTokoSuperadmin.value === 'semua' || !filterTokoSuperadmin.value) return 'Semua Mitra/Toko'
  const t = filteredUniqueTokos.value.find(x => x.id === Number(filterTokoSuperadmin.value))
  return t ? t.nama : 'Unknown'
})

const namaTokoPOPrint = computed(() => {
  if (filterTokoPO.value === 'semua' || !filterTokoPO.value) return 'Semua Titik Ambil'
  const t = filteredUniqueTokosPO.value.find(x => x.id === Number(filterTokoPO.value))
  return t ? t.nama : 'Unknown'
})
</script>

<template>
  <div class="p-8 max-w-6xl mx-auto print:p-0 print:max-w-full">
    <!-- JUDUL HALAMAN -->
    <h1 class="text-2xl font-bold mb-6 text-blue-900 border-b-2 pb-2 print:hidden">
      {{ role === 'superadmin' ? 'Riwayat Nota Keseluruhan' : 'Dashboard Pengiriman' }}
    </h1>

    <!-- TAB NAVIGASI KHUSUS SUPERADMIN -->
    <div v-if="role === 'superadmin'" class="flex flex-col sm:flex-row mb-6 bg-gray-200 p-1 rounded-lg w-full md:w-max shadow-sm gap-1 print:hidden">
      <button @click="activeTab = 'REGULER'" 
              class="px-5 py-2.5 rounded-md font-bold text-sm transition"
              :class="activeTab === 'REGULER' ? 'bg-white shadow-md text-blue-800' : 'text-gray-500 hover:text-gray-800'">
        📦 RIWAYAT REGULER
      </button>
      <button @click="activeTab = 'PESANAN'" 
              class="px-5 py-2.5 rounded-md font-bold text-sm transition"
              :class="activeTab === 'PESANAN' ? 'bg-yellow-400 shadow-md text-yellow-900' : 'text-gray-500 hover:text-gray-800'">
        🎂 RIWAYAT PESANAN (PO)
      </button>
    </div>
    
    <div v-if="role === 'superadmin'" class="bg-white shadow-md rounded-lg p-6 print:shadow-none print:p-0">
      
      <!-- ============================================== -->
      <!-- TABEL RIWAYAT REGULER                          -->
      <!-- ============================================== -->
      <div v-if="activeTab === 'REGULER'">
        
        <!-- HEADER KERTAS PRINT -->
        <div class="hidden print:block mb-6 text-center border-b-2 border-black pb-4">
          <h1 class="text-2xl font-black uppercase">LAPORAN RIWAYAT PENGIRIMAN REGULER</h1>
          <p class="mt-1 text-sm font-bold">Mitra: {{ namaTokoPrint }}</p>
          <p class="text-sm font-medium">Periode: {{ formatTanggal(filterStartDate) }} - {{ formatTanggal(filterEndDate) }}</p>
        </div>

        <!-- FILTER & TOMBOL PRINT (RESPONSIVE) -->
        <div class="flex flex-col xl:flex-row items-stretch gap-4 mb-6 print:hidden">
          <button @click="cetakLaporan" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-lg shadow-md font-bold transition flex items-center justify-center gap-2 shrink-0">
            🖨️ Cetak Riwayat Reguler
          </button>
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 border rounded-lg flex-1">
            <div>
              <label class="block text-xs font-bold text-gray-600 mb-1">Mulai Tanggal</label>
              <input type="date" v-model="filterStartDate" class="w-full border rounded p-2 outline-none font-semibold text-blue-800">
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-600 mb-1">Sampai Tanggal</label>
              <input type="date" v-model="filterEndDate" class="w-full border rounded p-2 outline-none font-semibold text-blue-800">
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-600 mb-1">Filter Siklus</label>
              <select v-model="filterSiklus" class="w-full border rounded p-2 outline-none font-semibold text-gray-700">
                <option value="semua">-- Semua Siklus --</option>
                <option value="HARIAN">HARIAN</option>
                <option value="SiklusKamisSenin">Kamis - Senin</option>
                <option value="SiklusJumatSelasa">Jumat - Selasa</option>
                <option value="SiklusSabtuRabu">Sabtu - Rabu</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-600 mb-1">Pilih Toko</label>
              <select v-model="filterTokoSuperadmin" class="w-full border rounded p-2 outline-none font-semibold cursor-pointer text-gray-700">
                <option value="semua">-- Semua Toko --</option>
                <option v-for="t in filteredUniqueTokos" :key="t.id" :value="t.id">{{ t.nama }}</option>
              </select>
            </div>
          </div>
        </div>

        <div class="overflow-x-auto rounded border border-gray-200 print:border-none">
          <table class="w-full text-left border-collapse text-sm min-w-200 print:w-full print:text-black">
            <thead class="bg-blue-600 text-white uppercase text-xs print:bg-gray-200 print:text-black">
              <tr>
                <th class="p-3 border print:border-black">Tanggal</th>
                <th class="p-3 border print:border-black">No. Nota</th>
                <th class="p-3 border print:border-black">Nama Toko</th>
                <th class="p-3 border text-right print:border-black">Total Kirim</th>
                <th class="p-3 border text-right print:border-black print:bg-transparent">Total Bayar</th>
                <th class="p-3 border text-center print:border-black">Status Bayar</th>
                <th class="p-3 border text-center print:hidden">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="nota in filteredListNota" :key="nota.ID" class="hover:bg-gray-50 print:hover:bg-transparent">
                <td class="p-3 border print:border-black font-medium">{{ formatTanggal(nota.TanggalKirim) }}</td>
                <td class="p-3 border print:border-black font-mono font-bold text-blue-800 print:text-black">{{ nota.NoNota }}</td>
                <td class="p-3 border print:border-black">{{ nota.NamaTokoSnapshot || nota.Toko?.NamaToko }}</td>
                <!-- KOLOM TOTAL KIRIM -->
                <td class="p-3 border print:border-black text-right font-semibold text-gray-700">
                  Rp {{ (nota.JumlahKirim || 0).toLocaleString() }}
                </td>
                <!-- KOLOM TOTAL BAYAR -->
                <td class="p-3 border print:border-black text-right font-black text-blue-800 print:text-black bg-blue-50/50 print:bg-transparent">
                  Rp {{ (nota.TotalBayar || 0).toLocaleString() }}
                </td>
                <td class="p-3 border print:border-black text-center whitespace-nowrap">
                  <span v-if="nota.Status === 'DIBATALKAN'" class="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold print:border-none print:text-black">DIBATALKAN</span>
                  <span v-else-if="nota.is_lunas" class="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold print:border-none print:text-black">✅ LUNAS</span>
                  <span v-else class="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold print:border-none print:text-black">⏳ PIUTANG</span>
                </td>
                <td class="p-3 border text-center whitespace-nowrap print:hidden">
                  <div class="flex justify-center gap-2">
                    <template v-if="nota.Status !== 'DIBATALKAN'">
                      <button @click="batalkanNota(nota.ID, nota.NoNota)" class="bg-red-500 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-red-600 transition shadow-sm">
                          Batal
                      </button>
                      <router-link :to="'/buat-nota?edit=' + nota.ID" class="bg-green-500 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-green-600 transition shadow-sm">
                          Lihat / Edit
                      </router-link>
                    </template>
                    <template v-else>
                      <button @click="pulihkanNota(nota.ID, nota.NoNota)" class="bg-blue-600 text-white px-4 py-1.5 rounded text-xs font-bold hover:bg-blue-700 transition shadow-md flex items-center gap-1">
                        🔄 Pulihkan
                      </button>
                    </template>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredListNota.length === 0">
                <td colspan="7" class="p-6 text-center text-gray-500 italic print:border-black">Tidak ada nota yang cocok dengan rentang tanggal ini.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ============================================== -->
      <!-- TABEL RIWAYAT PESANAN (PO)                     -->
      <!-- ============================================== -->
      <div v-if="activeTab === 'PESANAN'">
        
        <!-- HEADER KERTAS PRINT (PO) -->
        <div class="hidden print:block mb-6 text-center border-b-2 border-black pb-4">
          <h1 class="text-2xl font-black uppercase">LAPORAN RIWAYAT PESANAN KHUSUS (PO)</h1>
          <p class="mt-1 text-sm font-bold">Titik Ambil: {{ namaTokoPOPrint }}</p>
          <p class="text-sm font-medium">Periode: {{ formatTanggal(filterStartDatePO) }} - {{ formatTanggal(filterEndDatePO) }}</p>
        </div>

        <!-- FILTER & TOMBOL PRINT PO -->
        <div class="flex flex-col lg:flex-row items-stretch gap-4 mb-6 print:hidden">
          <!-- TOMBOL PRINT PO -->
          <button @click="cetakLaporan" class="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-4 rounded-lg shadow-md font-bold transition flex items-center justify-center gap-2 shrink-0">
            🖨️ Cetak Riwayat PO
          </button>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-yellow-50 p-4 border border-yellow-200 rounded-lg flex-1">
            <div>
              <label class="block text-xs font-bold text-yellow-800 mb-1">Mulai Tanggal</label>
              <input type="date" v-model="filterStartDatePO" class="w-full border border-yellow-300 rounded p-2 outline-none font-semibold bg-white text-yellow-900">
            </div>
            <div>
              <label class="block text-xs font-bold text-yellow-800 mb-1">Sampai Tanggal</label>
              <input type="date" v-model="filterEndDatePO" class="w-full border border-yellow-300 rounded p-2 outline-none font-semibold bg-white text-yellow-900">
            </div>
            <div>
              <label class="block text-xs font-bold text-yellow-800 mb-1">Pilih Titik Ambil</label>
              <select v-model="filterTokoPO" class="w-full border border-yellow-300 rounded p-2 outline-none font-semibold cursor-pointer bg-white text-yellow-900">
                <option value="semua">-- Semua Titik --</option>
                <option v-for="t in filteredUniqueTokosPO" :key="t.id" :value="t.id">{{ t.nama }}</option>
              </select>
            </div>
          </div>
        </div>

        <div class="overflow-x-auto rounded border border-yellow-200 print:border-none">
          <table class="w-full text-left border-collapse text-sm min-w-225 print:w-full print:text-black">
            <thead class="bg-yellow-500 text-yellow-950 uppercase text-xs print:bg-gray-200 print:text-black">
              <tr>
                <th class="p-3 border-r border-yellow-600 print:border-black text-center">Jadwal Kirim</th>
                <th class="p-3 border-r border-yellow-600 print:border-black">No. PO & Pemesan</th>
                <th class="p-3 border-r border-yellow-600 print:border-black text-center">Titik Ambil</th>
                <th class="p-3 border-r border-yellow-600 print:border-black text-right">Total Tagihan</th>
                <th class="p-3 border-r border-yellow-600 print:border-black print:bg-transparent text-right print:text-black">Total Bayar</th>
                <th class="p-3 border-r border-yellow-600 print:border-black text-center print:hidden">Status</th>
                <th class="p-3 border print:border-black text-center">Status Bayar</th>
                <th class="p-3 text-center print:hidden border">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="po in filteredListPesanan" :key="po.ID" class="hover:bg-yellow-50 border-b print:hover:bg-transparent">
                <td class="p-3 border-r print:border-black font-medium text-gray-800 text-center whitespace-nowrap">{{ formatTanggal(po.TanggalKirim) }}</td>
                <td class="p-3 border-r print:border-black">
                  <p class="font-mono font-bold text-yellow-700 print:text-black">{{ po.NoNota }}</p>
                  <p class="text-xs font-bold text-gray-600 print:text-gray-800">👤 {{ po.NamaPemesan }}</p>
                </td>
                <td class="p-3 border-r print:border-black font-bold text-gray-700 text-center whitespace-nowrap">
                  <span v-if="po.JenisPengambilan === 'PABRIK'" class="inline-block bg-gray-200 px-2 py-1 rounded-md text-[11px] uppercase tracking-wider print:bg-transparent print:p-0">🏢 PABRIK</span>
                  <span v-else class="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-[11px] uppercase tracking-wider print:bg-transparent print:p-0">🏪 {{ po.NamaTokoSnapshot }}</span>
                </td>
                
                <!-- KOLOM TOTAL TAGIHAN PO -->
                <td class="p-3 border-r print:border-black text-right font-semibold text-gray-700 whitespace-nowrap">
                  Rp {{ (po.TotalHarga || po.TotalBayar || 0).toLocaleString() }}
                </td>
                <!-- KOLOM TOTAL BAYAR PO -->
                <td class="p-3 border-r print:border-black text-right font-black text-yellow-700 print:text-black bg-yellow-50/50 print:bg-transparent whitespace-nowrap">
                  Rp {{ ((po.TotalBayar || 0) + (po.Ongkir || po.ongkir || 0) - (po.TotalVoucher || po.total_voucher || 0)).toLocaleString() }}
                </td>

                <td class="p-3 border-r print:border-black text-center whitespace-nowrap print:hidden">
                  <span v-if="po.Status === 'DIBATALKAN'" class="inline-block bg-red-100 text-red-700 px-2 py-1 rounded text-[11px] uppercase font-bold print:border-none print:text-black">BATAL</span>
                  <span v-else class="inline-block bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-[11px] uppercase font-bold print:border-none print:text-black">{{ po.Status }}</span>
                </td>
                <td class="p-3 border print:border-black text-center whitespace-nowrap">
                  <span v-if="po.is_lunas" class="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-[11px] font-bold print:border-none print:text-black">✅ LUNAS</span>
                  <span v-else class="inline-block bg-red-100 text-red-700 px-2 py-1 rounded text-[11px] font-bold print:border-none print:text-black">⏳ PIUTANG</span>
                </td>
                <td class="p-3 border text-center whitespace-nowrap print:hidden">
                  <div class="flex justify-center gap-1.5">
                    <template v-if="po.Status !== 'DIBATALKAN'">
                      <router-link :to="'/buat-pesanan?edit=' + po.ID" title="Lihat / Edit Pesanan" class="bg-green-50 text-green-600 border border-green-200 w-7 h-7 flex items-center justify-center rounded hover:bg-green-500 hover:text-white transition-colors shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-3.5 h-3.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                        </svg>
                      </router-link>
                      
                      <button @click="batalkanPO(po.ID, po.NoNota)" title="Batalkan Pesanan" class="bg-red-50 text-red-600 border border-red-200 w-7 h-7 flex items-center justify-center rounded hover:bg-red-500 hover:text-white transition-colors shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-3.5 h-3.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </template>
                    <template v-else>
                      <button @click="pulihkanPO(po.ID, po.NoNota)" title="Pulihkan Pesanan" class="bg-blue-50 text-blue-600 border border-blue-200 w-7 h-7 flex items-center justify-center rounded hover:bg-blue-500 hover:text-white transition-colors shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-3.5 h-3.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                      </button>
                    </template>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredListPesanan.length === 0">
                <td colspan="8" class="p-6 text-center text-gray-500 italic print:border-black">Belum ada riwayat pesanan (PO) pada rentang tanggal ini.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ============================================== -->
    <!-- SALES DASHBOARD (Sembunyi saat print)          -->
    <!-- ============================================== -->
    <div v-else class="space-y-8 max-w-2xl mx-auto print:hidden">
      
      <!-- KOTAK KUNJUNGAN TOKO -->
      <div class="bg-white p-6 rounded-lg shadow-sm border-t-4 border-blue-600">
        <h2 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><span>🏪</span> Mulai Kunjungan Toko</h2>
        
        <select v-model="selectedTokoID" @change="fetchKunjungan" class="w-full p-3 border-2 border-gray-300 rounded focus:border-blue-500 font-bold mb-4 outline-none">
          <option value="" disabled>-- Pilih Toko Yang Sedang Dikunjungi --</option>
          <option v-for="t in daftarToko" :key="t.ID" :value="t.ID">{{ t.NamaToko }}</option>
        </select>

        <div v-if="selectedTokoID">
          <button @click="buatNotaBaru" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded shadow transition mb-6">
            ➕ BUAT NOTA KIRIMAN HARI INI
          </button>

          <div v-if="notaKunjungan.length > 0" class="bg-red-50 p-4 rounded border border-red-200">
            <p class="font-bold text-red-700 mb-3 text-sm">⚠️ Ditemukan {{ notaKunjungan.length }} Nota Belum Diisi Retur:</p>
            <div v-for="nota in notaKunjungan" :key="nota.ID" class="bg-white p-3 border border-red-300 rounded mb-2 flex justify-between items-center shadow-sm">
              <div>
                <p class="font-bold font-mono">{{ nota.NoNota }}</p>
                <p class="text-xs text-gray-600">{{ formatTanggal(nota.TanggalKirim) }}</p>
              </div>
              <router-link :to="'/buat-nota?edit=' + nota.ID" class="bg-red-600 text-white px-4 py-2 rounded font-bold text-sm hover:bg-red-700 shadow-sm">
                ISI RETUR
              </router-link>
            </div>
          </div>
          <div v-else class="bg-green-50 p-4 rounded border border-green-200 text-center">
            <p class="font-bold text-green-700">✅ Retur Lunas! Tidak ada tagihan retur tertunda di toko ini.</p>
          </div>
        </div>
      </div>

      <!-- KOTAK TUGAS REGULER / RETUR -->
      <div class="bg-white p-6 rounded-lg shadow-sm border-t-4 border-orange-500 mb-8">
        <h2 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><span>🔔</span> Tugas Retur / Reguler</h2>
        
        <div v-if="notaTugas.length === 0" class="text-center p-4 text-gray-500 italic text-sm border border-dashed rounded">
          Belum ada tugas retur khusus dari Superadmin.
        </div>

        <div v-for="nota in notaTugas" :key="'t-'+nota.ID" class="bg-orange-50 p-3 border border-orange-200 rounded mb-2 flex justify-between items-center">
          <div>
            <p class="font-bold font-mono">{{ nota.NoNota }}</p>
            <p class="text-xs text-gray-600">{{ nota.NamaTokoSnapshot }}</p>
          </div>
          <router-link 
            :to="'/buat-nota?edit=' + nota.ID" 
            :class="nota.JumlahRetur > 0 ? 'bg-blue-600' : 'bg-orange-600'"
            class="text-white px-4 py-2 rounded font-bold text-sm shadow-sm transition"
          >
            {{ nota.JumlahRetur > 0 ? 'Perbaiki Retur' : 'Selesaikan' }}
          </router-link>
        </div>
      </div>

      <!-- KOTAK TUGAS PO / PESANAN -->
      <div class="bg-white p-6 rounded-lg shadow-sm border-t-4 border-yellow-500">
        <h2 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><span>🎂</span> Tugas Antar Pesanan (PO)</h2>
        
        <div v-if="poTugas.length === 0" class="text-center p-4 text-gray-500 italic text-sm border border-dashed rounded">
          Belum ada tugas antar PO dari Superadmin.
        </div>

        <div v-for="po in poTugas" :key="'po-'+po.ID" class="bg-yellow-50 p-3 border border-yellow-400 rounded mb-2 flex justify-between items-center shadow-sm">
          <div>
            <p class="font-bold font-mono text-yellow-900">{{ po.NoNota }}</p>
            <p class="text-xs text-yellow-800">👤 {{ po.NamaPemesan }} | 📍 {{ po.NamaTokoSnapshot }}</p>
          </div>
          <router-link 
            :to="'/buat-pesanan?edit=' + po.ID" 
            class="bg-yellow-600 text-white px-4 py-2 rounded font-bold text-sm shadow-sm transition hover:bg-yellow-700"
          >
            Lihat Detail PO
          </router-link>
        </div>
      </div>

      <!-- KOTAK NOTA BARU DIBUAT (8 JAM) -->
      <div class="bg-white p-6 rounded-lg shadow-sm border-t-4 border-green-500">
        <h2 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><span>⏱️</span> Nota Yang Baru Saja Anda Buat (8 Jam)</h2>
        
        <div v-if="notaAktif.length === 0" class="text-center p-4 text-gray-500 italic text-sm border border-dashed rounded">
          Anda belum membuat nota kiriman hari ini.
        </div>

        <div v-for="nota in filteredNotaAktifSales" :key="'a-'+nota.ID" class="border p-3 rounded mb-2 flex justify-between items-center hover:bg-gray-50">
          <div>
            <p class="font-bold font-mono">{{ nota.NoNota }}</p>
            <p class="text-xs text-gray-600">{{ nota.NamaTokoSnapshot }} ({{ formatTanggal(nota.TanggalKirim) }})</p>
          </div>
          <router-link :to="'/buat-nota?edit=' + nota.ID" class="text-blue-600 font-bold text-sm hover:underline">Perbaiki Typo</router-link>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
@media print {
  @page { margin: 10mm; } 
  body { background-color: white !important; margin: 0; padding: 0; }
  .shadow-md { box-shadow: none !important; }
  .overflow-x-auto { overflow: visible !important; }
  table { border: 2px solid black !important; }
  th, td { border: 1px solid black !important; }
  /* Atur warna tinta teks untuk tabel print */
  .text-gray-500, .text-gray-600, .text-gray-700, .text-gray-800 { color: black !important; }
}
</style>