<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { hasPermission } from '../utils/permission'
import { Package, Cake, Printer, Factory, Store, CheckCircle2, Bell, AlertTriangle, Plus, Clock, RefreshCw, XCircle, SearchX, History } from 'lucide-vue-next'

const router = useRouter()
const role = ref(localStorage.getItem('admin_role') || 'Superadmin')

// Data Keseluruhan
const listNota = ref([])
const listPesanan = ref([])

const activeTab = ref(sessionStorage.getItem('tab_nota') || 'REGULER') // Kontrol Tab

const checkAuthError = (res) => {
  if (res.status === 401 || res.status === 403) {
    window.$dialog?.alert("Sesi habis atau Akses Ditolak!")
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

// ----------------------------------------------------
// LOGIKA FILTER REGULER
// ----------------------------------------------------
// Ambil daftar toko unik berdasarkan SIKLUS TERAKHIRNYA saja
const filteredUniqueTokos = computed(() => {
  const map = new Map()

  listNota.value.forEach(n => {
    if (!map.has(n.TokoID)) {
      map.set(n.TokoID, {
        id: n.TokoID,
        nama: n.NamaTokoSnapshot || n.Toko?.NamaToko || 'Unknown',
        siklusTerbaru: n.SiklusSnapshot || 'Lainnya'
      })
    }
  })

  let listToko = Array.from(map.values())
  if (filterSiklus.value !== 'semua') {
    listToko = listToko.filter(t => t.siklusTerbaru === filterSiklus.value)
  }
  return listToko.sort((a, b) => a.nama.localeCompare(b.nama))
})

// Filter Riwayat Nota
const filteredListNota = computed(() => {
  return listNota.value.filter(n => {
    if (filterSiklus.value !== 'semua' && n.SiklusSnapshot !== filterSiklus.value) return false
    const valToko = filterTokoSuperadmin.value
    if (valToko !== 'semua' && valToko !== '' && valToko !== null) {
      if (n.TokoID !== Number(valToko)) return false
    }
    return true
  })
})

// ----------------------------------------------------
// LOGIKA FILTER PESANAN (PO)
// ----------------------------------------------------
const filteredUniqueTokosPO = computed(() => {
  const map = new Map()
  listPesanan.value.forEach(p => {
    const id = p.TokoID || 0
    const nama = p.JenisPengambilan === 'PABRIK' ? 'PABRIK (Direct)' : p.NamaTokoSnapshot
    if (!map.has(id)) map.set(id, { id, nama })
  })
  return Array.from(map.values()).sort((a, b) => a.nama.localeCompare(b.nama))
})

const filteredListPesanan = computed(() => {
  return listPesanan.value.filter(po => {
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
watch([filterStartDate, filterEndDate], ([newStart, newEnd], [oldStart, oldEnd]) => {
  if (newStart > newEnd) {
    window.$dialog?.alert("⚠️ Tanggal Mulai tidak boleh lebih besar dari Tanggal Akhir!")
    filterStartDate.value = oldStart || newEnd
    filterEndDate.value = oldEnd || newStart
    return 
  }
  sessionStorage.setItem('filter_start', newStart)
  sessionStorage.setItem('filter_end', newEnd)
  if (role.value === 'superadmin') fetchSuperadminData(localStorage.getItem('admin_token'))
})
watch([filterStartDatePO, filterEndDatePO], ([newStart, newEnd], [oldStart, oldEnd]) => {
  if (newStart > newEnd) {
    alert("⚠️ Tanggal Mulai tidak boleh lebih besar dari Tanggal Akhir!")
    filterStartDatePO.value = oldStart || newEnd
    filterEndDatePO.value = oldEnd || newStart
    return 
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
  fetchSuperadminData(token)
  fetchRiwayatPesanan()
})

// Fungsi membatalkan pesanan
const batalkanPO = async (id, noNota) => {
  if (!(window.$dialog && await window.$dialog.confirm(`Yakin ingin membatalkan pesanan ${noNota}?`))) return
  
  try {
    const token = localStorage.getItem('admin_token')
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/pesanan/${id}/batal`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (checkAuthError(res)) return
    if (res.ok) {
      window.$dialog?.alert("Pesanan dibatalkan!")
      fetchRiwayatPesanan() // Refresh tabel
    }
  } catch (err) {
    window.$dialog?.alert("Gagal membatalkan pesanan.")
  }
}

// Fungsi membatalkan Nota Reguler
const batalkanNota = async (id, noNota) => {
  if (!(window.$dialog && await window.$dialog.confirm(`Yakin ingin membatalkan nota reguler ${noNota}? Uang di kasir akan otomatis ditarik kembali.`))) return
  
  try {
    const token = localStorage.getItem('admin_token')
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/notas/${id}/batal`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (checkAuthError(res)) return
    if (res.ok) {
      window.$dialog?.alert("Nota berhasil dibatalkan!")
      fetchSuperadminData(token) // Refresh tabel
    }
  } catch (err) {
    window.$dialog?.alert("Gagal membatalkan nota.")
  }
}

const pulihkanNota = async (id, noNota) => {
  if (!(window.$dialog && await window.$dialog.confirm(`Kembalikan nota reguler ${noNota} ke status aktif? Uang kas akan kembali tercatat otomatis.`))) return
  
  try {
    const token = localStorage.getItem('admin_token')
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/notas/${id}/pulihkan`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (checkAuthError(res)) return
    if (res.ok) {
      window.$dialog?.alert("Nota berhasil dipulihkan!")
      fetchSuperadminData(token) // Refresh tabel
    }
  } catch (err) {
    window.$dialog?.alert("Gagal memulihkan nota.")
  }
}

const pulihkanPO = async (id, noNota) => {
  if (!(window.$dialog && await window.$dialog.confirm(`Kembalikan pesanan ${noNota} ke status aktif? Uang kas (DP) akan kembali tercatat otomatis.`))) return
  
  try {
    const token = localStorage.getItem('admin_token')
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/pesanan/${id}/pulihkan`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (checkAuthError(res)) return
    if (res.ok) {
      window.$dialog?.alert("Pesanan berhasil dipulihkan!")
      fetchRiwayatPesanan() // Refresh tabel
    }
  } catch (err) {
    window.$dialog?.alert("Gagal memulihkan pesanan.")
  }
}

const formatTanggal = (tgl) => {
  return new Date(tgl).toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', year: 'numeric'
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
  <div class="p-4 md:p-8 max-w-7xl mx-auto print:p-0 print:max-w-full">
    <!-- JUDUL HALAMAN -->
    <div class="flex items-center gap-3 mb-6 print:hidden border-b pb-4 border-gray-200">
      <div class="bg-blue-100 p-2 rounded-xl text-blue-700">
        <Package :size="28" />
      </div>
      <div>
        <h1 class="text-2xl font-black text-slate-800 tracking-tight">
          Riwayat Keseluruhan
        </h1>
        <p class="text-sm font-medium text-slate-500">Pusat monitoring seluruh transaksi dan jadwal pengiriman.</p>
      </div>
    </div>

    <!-- TAB NAVIGASI KHUSUS SUPERADMIN -->
    <div class="overflow-x-auto print:hidden mb-6">
      <div class="flex bg-slate-100/80 p-1.5 rounded-2xl w-max shadow-inner ring-1 ring-slate-900/5">
        <button @click="activeTab = 'REGULER'" 
                class="px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2"
                :class="activeTab === 'REGULER' ? 'bg-white shadow-sm text-blue-700 ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'">
          <Package :size="18" /> REGULER
        </button>
        <button @click="activeTab = 'PESANAN'" 
                class="px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2"
                :class="activeTab === 'PESANAN' ? 'bg-white shadow-sm text-yellow-700 ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'">
          <Cake :size="18" /> PESANAN (PO)
        </button>
      </div>
    </div>
    
    <div class="print:p-0">
      
      <!-- ============================================== -->
      <!-- TABEL RIWAYAT REGULER                          -->
      <!-- ============================================== -->
      <div v-if="activeTab === 'REGULER'" class="animate-in fade-in slide-in-from-bottom-2 duration-500">
        
        <!-- HEADER KERTAS PRINT -->
        <div class="hidden print:block mb-6 text-center border-b-2 border-black pb-4">
          <h1 class="text-2xl font-black uppercase">LAPORAN RIWAYAT PENGIRIMAN REGULER</h1>
          <p class="mt-1 text-sm font-bold">Mitra: {{ namaTokoPrint }}</p>
          <p class="text-sm font-medium">Periode: {{ formatTanggal(filterStartDate) }} - {{ formatTanggal(filterEndDate) }}</p>
        </div>

        <!-- FILTER & TOMBOL PRINT (RESPONSIVE) -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-6 print:hidden">
          <div class="flex flex-col lg:flex-row gap-5">
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 flex-1">
              <div>
                <label class="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Mulai Tanggal</label>
                <input type="date" v-model="filterStartDate" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Sampai Tanggal</label>
                <input type="date" v-model="filterEndDate" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Filter Siklus</label>
                <select v-model="filterSiklus" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer">
                  <option value="semua">Semua Siklus</option>
                  <option value="HARIAN">Harian</option>
                  <option value="SiklusKamisSenin">Kamis - Senin</option>
                  <option value="SiklusJumatSelasa">Jumat - Selasa</option>
                  <option value="SiklusSabtuRabu">Sabtu - Rabu</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Pilih Toko</label>
                <select v-model="filterTokoSuperadmin" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer">
                  <option value="semua">Semua Toko</option>
                  <option v-for="t in filteredUniqueTokos" :key="t.id" :value="t.id">{{ t.nama }}</option>
                </select>
              </div>
            </div>
            <div class="flex items-end">
              <button @click="cetakLaporan" class="w-full lg:w-auto bg-slate-800 hover:bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold shadow-sm transition-all flex items-center justify-center gap-2 group">
                <Printer :size="18" class="group-hover:-translate-y-0.5 transition-transform" /> Cetak Reguler
              </button>
            </div>
          </div>
        </div>

        <div class="bg-white overflow-x-auto rounded-2xl border border-slate-200 shadow-sm print:border-none print:shadow-none">
          <table class="w-full text-left border-collapse text-sm print:w-full print:text-black">
            <thead class="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider font-bold print:bg-transparent print:text-black border-b border-slate-200 print:border-b-2 print:border-black">
              <tr>
                <th class="p-4 border-r border-slate-200 last:border-0 print:border-black">Tanggal</th>
                <th class="p-4 border-r border-slate-200 last:border-0 print:border-black">No. Nota</th>
                <th class="p-4 border-r border-slate-200 last:border-0 print:border-black">Nama Toko</th>
                <th class="p-4 border-r border-slate-200 last:border-0 text-right print:border-black">Total Kirim</th>
                <th class="p-4 border-r border-slate-200 last:border-0 text-right print:border-black">Total Bayar</th>
                <th class="p-4 border-r border-slate-200 last:border-0 text-center print:border-black">Status Bayar</th>
                <th v-if="hasPermission('manage_nota_jual')" class="p-4 text-center print:hidden">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="nota in filteredListNota" :key="nota.ID" class="hover:bg-blue-50/50 even:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0 print:border-b print:border-black print:hover:bg-transparent print:even:bg-transparent">
                <td class="p-4 border-r border-slate-200 print:border-black text-slate-600 font-medium whitespace-nowrap">{{ formatTanggal(nota.TanggalKirim) }}</td>
                <td class="p-4 border-r border-slate-200 print:border-black font-mono font-bold text-blue-700 print:text-black whitespace-nowrap">{{ nota.NoNota }}</td>
                <td class="p-4 border-r border-slate-200 print:border-black font-semibold text-slate-800">{{ nota.NamaTokoSnapshot || nota.Toko?.NamaToko }}</td>
                <td class="p-4 border-r border-slate-200 print:border-black text-right text-slate-600 whitespace-nowrap">
                  Rp {{ (nota.JumlahKirim || 0).toLocaleString() }}
                </td>
                <td class="p-4 border-r border-slate-200 print:border-black text-right font-black text-slate-800 bg-slate-50 print:bg-transparent whitespace-nowrap">
                  Rp {{ (nota.TotalBayar || 0).toLocaleString() }}
                </td>
                <td class="p-4 border-r border-slate-200 print:border-black text-center whitespace-nowrap">
                  <span v-if="nota.Status === 'DIBATALKAN'" class="inline-flex items-center gap-1.5 bg-rose-100 text-rose-700 px-2.5 py-1 rounded-full text-xs font-bold ring-1 ring-inset ring-rose-200/50 print:ring-0 print:text-black mx-auto"><XCircle :size="14" /> DIBATALKAN</span>
                  <span v-else-if="nota.is_lunas" class="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-xs font-bold ring-1 ring-inset ring-emerald-200/50 print:ring-0 print:text-black mx-auto"><CheckCircle2 :size="14" /> LUNAS</span>
                  <span v-else class="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-xs font-bold ring-1 ring-inset ring-amber-200/50 print:ring-0 print:text-black mx-auto"><Clock :size="14" /> PIUTANG</span>
                </td>
                <td v-if="hasPermission('manage_nota_jual')" class="p-4 text-center whitespace-nowrap print:hidden">
                  <div class="flex justify-center gap-1.5">
                    <template v-if="nota.Status !== 'DIBATALKAN'">
                      <router-link :to="'/buat-nota?edit=' + nota.ID" title="Lihat / Edit Nota" class="bg-slate-100 text-slate-600 border border-slate-200 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                        </svg>
                      </router-link>
                      
                      <button @click="batalkanNota(nota.ID, nota.NoNota)" title="Batalkan Nota" class="bg-rose-50 text-rose-600 border border-rose-200 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-rose-600 hover:text-white transition-all shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </template>
                    <template v-else>
                      <button @click="pulihkanNota(nota.ID, nota.NoNota)" title="Pulihkan Nota" class="bg-slate-100 text-slate-600 border border-slate-200 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 hover:text-white transition-all shadow-sm">
                        <RefreshCw :size="16" />
                      </button>
                    </template>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredListNota.length === 0">
                <td colspan="7" class="p-12 text-center text-slate-500 print:border-black">
                  <div class="flex flex-col items-center justify-center print:hidden">
                    <SearchX :size="48" class="text-slate-300 mb-4" />
                    <p class="font-bold text-slate-600 text-lg">Nota Tidak Ditemukan</p>
                    <p class="text-sm mt-1">Coba sesuaikan tanggal atau filter toko Anda.</p>
                  </div>
                  <span class="hidden print:inline font-bold">Tidak ada nota yang cocok dengan rentang tanggal ini.</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ============================================== -->
      <!-- TABEL RIWAYAT PESANAN (PO)                     -->
      <!-- ============================================== -->
      <div v-if="activeTab === 'PESANAN'" class="animate-in fade-in slide-in-from-bottom-2 duration-500">
        
        <!-- HEADER KERTAS PRINT (PO) -->
        <div class="hidden print:block mb-6 text-center border-b-2 border-black pb-4">
          <h1 class="text-2xl font-black uppercase">LAPORAN RIWAYAT PESANAN KHUSUS (PO)</h1>
          <p class="mt-1 text-sm font-bold">Titik Ambil: {{ namaTokoPOPrint }}</p>
          <p class="text-sm font-medium">Periode: {{ formatTanggal(filterStartDatePO) }} - {{ formatTanggal(filterEndDatePO) }}</p>
        </div>

        <!-- FILTER & TOMBOL PRINT PO -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-6 print:hidden">
          <div class="flex flex-col lg:flex-row gap-5">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
              <div>
                <label class="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Mulai Tanggal</label>
                <input type="date" v-model="filterStartDatePO" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-semibold text-slate-800 focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Sampai Tanggal</label>
                <input type="date" v-model="filterEndDatePO" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-semibold text-slate-800 focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Pilih Titik Ambil</label>
                <select v-model="filterTokoPO" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-semibold text-slate-800 focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all cursor-pointer">
                  <option value="semua">Semua Titik Ambil</option>
                  <option v-for="t in filteredUniqueTokosPO" :key="t.id" :value="t.id">{{ t.nama }}</option>
                </select>
              </div>
            </div>
            <div class="flex items-end">
              <button @click="cetakLaporan" class="w-full lg:w-auto bg-slate-800 hover:bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold shadow-sm transition-all flex items-center justify-center gap-2 group">
                <Printer :size="18" class="group-hover:-translate-y-0.5 transition-transform" /> Cetak PO
              </button>
            </div>
          </div>
        </div>

        <div class="bg-white overflow-x-auto rounded-2xl border border-slate-200 shadow-sm print:border-none print:shadow-none">
          <table class="w-full text-left border-collapse text-sm print:w-full print:text-black">
            <thead class="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider font-bold print:bg-transparent print:text-black border-b border-slate-200 print:border-b-2 print:border-black">
              <tr>
                <th class="p-4 border-r border-slate-200 last:border-0 print:border-black text-center">Jadwal Kirim</th>
                <th class="p-4 border-r border-slate-200 last:border-0 print:border-black">No. PO & Pemesan</th>
                <th class="p-4 border-r border-slate-200 last:border-0 print:border-black text-center">Titik Ambil</th>
                <th class="p-4 border-r border-slate-200 last:border-0 text-right print:border-black">Total Tagihan</th>
                <th class="p-4 border-r border-slate-200 last:border-0 text-right print:border-black">Total Bayar</th>
                <th class="p-4 border-r border-slate-200 last:border-0 text-center print:hidden">Status</th>
                <th class="p-4 border-r border-slate-200 last:border-0 text-center print:border-black">Status Bayar</th>
                <th v-if="hasPermission('manage_nota_jual')" class="p-4 text-center print:hidden">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="po in filteredListPesanan" :key="po.ID" class="hover:bg-yellow-50/50 even:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0 print:border-b print:border-black print:hover:bg-transparent print:even:bg-transparent">
                <td class="p-4 border-r border-slate-200 print:border-black font-medium text-slate-600 text-center whitespace-nowrap">{{ formatTanggal(po.TanggalKirim) }}</td>
                <td class="p-4 border-r border-slate-200 print:border-black">
                  <p class="font-mono font-bold text-yellow-700 print:text-black whitespace-nowrap">{{ po.NoNota }}</p>
                  <p class="text-xs font-bold text-slate-500 print:text-slate-800 flex items-center gap-1 mt-0.5"><CheckCircle2 :size="10" class="hidden print:inline" /> {{ po.NamaPemesan }}</p>
                </td>
                <td class="p-4 border-r border-slate-200 print:border-black font-bold text-slate-700 text-center whitespace-nowrap">
                  <span v-if="po.JenisPengambilan === 'PABRIK'" class="inline-flex items-center justify-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg text-xs uppercase tracking-wider print:bg-transparent print:p-0"><Factory :size="14" class="text-slate-500" /> PABRIK</span>
                  <span v-else class="inline-flex items-center justify-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-lg text-xs text-blue-700 uppercase tracking-wider print:bg-transparent print:p-0"><Store :size="14" class="text-blue-500" /> {{ po.NamaTokoSnapshot }}</span>
                </td>
                
                <td class="p-4 border-r border-slate-200 print:border-black text-right font-semibold text-slate-600 whitespace-nowrap">
                  Rp {{ (po.TotalHarga || po.TotalBayar || 0).toLocaleString() }}
                </td>
                <td class="p-4 border-r border-slate-200 print:border-black text-right font-black text-slate-800 bg-slate-50 print:bg-transparent whitespace-nowrap">
                  Rp {{ ((po.TotalBayar || 0) + (po.Ongkir || po.ongkir || 0) - (po.TotalVoucher || po.total_voucher || 0)).toLocaleString() }}
                </td>

                <td class="p-4 border-r border-slate-200 print:border-black text-center whitespace-nowrap print:hidden">
                  <span v-if="po.Status === 'DIBATALKAN'" class="inline-block bg-rose-100 text-rose-700 px-2.5 py-1 rounded-full text-[10px] uppercase font-bold ring-1 ring-inset ring-rose-200/50 print:ring-0 print:text-black">BATAL</span>
                  <span v-else class="inline-block bg-yellow-100 text-yellow-800 px-2.5 py-1 rounded-full text-[10px] uppercase font-bold ring-1 ring-inset ring-yellow-200/50 print:ring-0 print:text-black">{{ po.Status }}</span>
                </td>
                <td class="p-4 border-r border-slate-200 print:border-black text-center whitespace-nowrap">
                  <span v-if="po.is_lunas" class="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-[11px] font-bold ring-1 ring-inset ring-emerald-200/50 print:ring-0 print:text-black mx-auto"><CheckCircle2 :size="12" /> LUNAS</span>
                  <span v-else class="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-[11px] font-bold ring-1 ring-inset ring-amber-200/50 print:ring-0 print:text-black mx-auto"><Clock :size="12" /> PIUTANG</span>
                </td>
                <td v-if="hasPermission('manage_nota_jual')" class="p-4 text-center whitespace-nowrap print:hidden">
                  <div class="flex justify-center gap-1.5">
                    <template v-if="po.Status !== 'DIBATALKAN'">
                      <router-link :to="'/buat-pesanan?edit=' + po.ID" title="Lihat / Edit Pesanan" class="bg-slate-100 text-slate-600 border border-slate-200 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-yellow-500 hover:text-white hover:border-yellow-500 transition-all shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                        </svg>
                      </router-link>
                      
                      <button v-if="hasPermission('manage_nota_pesanan')" @click="batalkanPO(po.ID, po.NoNota)" title="Batalkan Pesanan" class="bg-rose-50 text-rose-600 border border-rose-200 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-rose-600 hover:text-white transition-all shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </template>
                    <template v-else>
                      <button v-if="hasPermission('manage_nota_pesanan')" @click="pulihkanPO(po.ID, po.NoNota)" title="Pulihkan Pesanan" class="bg-slate-100 text-slate-600 border border-slate-200 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 hover:text-white transition-all shadow-sm">
                        <RefreshCw :size="16" />
                      </button>
                    </template>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredListPesanan.length === 0">
                <td colspan="8" class="p-12 text-center text-slate-500 print:border-black">
                  <div class="flex flex-col items-center justify-center print:hidden">
                    <SearchX :size="48" class="text-slate-300 mb-4" />
                    <p class="font-bold text-slate-600 text-lg">Pesanan Tidak Ditemukan</p>
                    <p class="text-sm mt-1">Coba sesuaikan tanggal atau titik ambil.</p>
                  </div>
                  <span class="hidden print:inline font-bold">Belum ada riwayat pesanan (PO) pada rentang tanggal ini.</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media print {
  @page { margin: 10mm; } 
  body { background-color: white !important; margin: 0; padding: 0; }
  .shadow-sm, .shadow-md { box-shadow: none !important; }
  .overflow-x-auto { overflow: visible !important; }
  table { border: 2px solid black !important; }
  th, td { border: 1px solid black !important; }
  /* Atur warna tinta teks untuk tabel print */
  .text-slate-500, .text-slate-600, .text-slate-700, .text-slate-800 { color: black !important; }
}
</style>