<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Package, Cake, Printer, Factory, Store, CheckCircle2, Bell, AlertTriangle, Plus, Clock, RefreshCw, XCircle, SearchX, History } from 'lucide-vue-next'

const router = useRouter()

// Data Sales
const notaAktif = ref([])
const notaTugas = ref([])
const daftarToko = ref([])
const selectedTokoID = ref('')
const notaKunjungan = ref([])
const poTugas = ref([])

const checkAuthError = (res) => {
  if (res.status === 401 || res.status === 403) {
    window.$dialog?.alert("Sesi habis atau Akses Ditolak!")
    localStorage.clear()
    router.push('/login')
    return true
  }
  return false
}

const formatTanggal = (tgl) => {
  return new Date(tgl).toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', year: 'numeric'
  })
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

const filteredNotaAktifSales = computed(() => {
  return notaAktif.value.filter(n => n.Status !== 'SELESAI')
})

onMounted(() => {
  const token = localStorage.getItem('admin_token')
  fetchSalesData(token)
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
          Dashboard Pengiriman
        </h1>
        <p class="text-sm font-medium text-slate-500">Pusat monitoring seluruh transaksi dan jadwal pengiriman.</p>
      </div>
    </div>

    <!-- SALES DASHBOARD -->
    <div class="max-w-2xl mx-auto print:hidden space-y-6">
      
      <!-- KOTAK KUNJUNGAN TOKO -->
      <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 border-l-4 border-l-blue-500 transition-all hover:shadow-md">
        <h2 class="text-lg font-black text-slate-800 mb-5 flex items-center gap-2.5"><Store :size="24" class="text-blue-500" /> Mulai Kunjungan Toko</h2>
        
        <select v-model="selectedTokoID" @change="fetchKunjungan" class="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-bold mb-5 outline-none text-slate-700 transition-all cursor-pointer">
          <option value="" disabled>-- Pilih Toko Yang Sedang Dikunjungi --</option>
          <option v-for="t in daftarToko" :key="t.ID" :value="t.ID">{{ t.NamaToko }}</option>
        </select>

        <div v-if="selectedTokoID" class="animate-in fade-in duration-300">
          <button @click="buatNotaBaru" class="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-sm transition-all mb-5 hover:-translate-y-0.5">
            <Plus :size="20" /> BUAT NOTA KIRIMAN HARI INI
          </button>

          <div v-if="notaKunjungan.length > 0" class="bg-rose-50 p-5 rounded-xl border border-rose-100">
            <p class="font-bold text-rose-700 mb-4 text-sm flex items-center gap-2"><AlertTriangle :size="18" /> Ditemukan {{ notaKunjungan.length }} Nota Belum Diisi Retur:</p>
            <div v-for="nota in notaKunjungan" :key="nota.ID" class="bg-white p-4 border border-rose-100 rounded-xl mb-3 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
              <div>
                <p class="font-bold font-mono text-slate-800 text-lg">{{ nota.NoNota }}</p>
                <p class="text-xs font-semibold text-slate-500 mt-0.5">{{ formatTanggal(nota.TanggalKirim) }}</p>
              </div>
              <router-link :to="'/buat-nota?edit=' + nota.ID" class="bg-rose-600 text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-rose-700 shadow-sm transition-colors">
                ISI RETUR
              </router-link>
            </div>
          </div>
          <div v-else class="bg-emerald-50 p-6 rounded-xl border border-emerald-100 text-center">
            <p class="font-bold text-emerald-700 flex items-center justify-center gap-2"><CheckCircle2 :size="22" /> Retur Lunas! Tidak ada tagihan tertunda.</p>
          </div>
        </div>
      </div>

      <!-- KOTAK TUGAS REGULER / RETUR -->
      <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 border-l-4 border-l-orange-500 transition-all hover:shadow-md">
        <h2 class="text-lg font-black text-slate-800 mb-5 flex items-center gap-2.5"><Bell :size="24" class="text-orange-500" /> Tugas Retur / Reguler</h2>
        
        <div v-if="notaTugas.length === 0" class="text-center p-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center gap-2">
          <CheckCircle2 :size="32" class="text-emerald-400" />
          <span class="font-medium text-sm">Belum ada tugas retur khusus.</span>
        </div>

        <div v-for="nota in notaTugas" :key="'t-'+nota.ID" class="bg-white p-4 border border-slate-200 rounded-xl mb-3 flex justify-between items-center shadow-sm hover:border-orange-200 transition-colors">
          <div>
            <p class="font-bold font-mono text-slate-800">{{ nota.NoNota }}</p>
            <p class="text-xs font-semibold text-slate-500 mt-0.5">{{ nota.NamaTokoSnapshot }}</p>
          </div>
          <router-link 
            :to="'/buat-nota?edit=' + nota.ID" 
            :class="nota.JumlahRetur > 0 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-500 hover:bg-orange-600'"
            class="text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow-sm transition-colors"
          >
            {{ nota.JumlahRetur > 0 ? 'Perbaiki Retur' : 'Selesaikan' }}
          </router-link>
        </div>
      </div>

      <!-- KOTAK TUGAS PO / PESANAN -->
      <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 border-l-4 border-l-yellow-400 transition-all hover:shadow-md">
        <h2 class="text-lg font-black text-slate-800 mb-5 flex items-center gap-2.5"><Cake :size="24" class="text-yellow-500" /> Tugas Antar Pesanan (PO)</h2>
        
        <div v-if="poTugas.length === 0" class="text-center p-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center gap-2">
          <CheckCircle2 :size="32" class="text-emerald-400" />
          <span class="font-medium text-sm">Belum ada tugas antar PO.</span>
        </div>

        <div v-for="po in poTugas" :key="'po-'+po.ID" class="bg-white p-4 border border-slate-200 rounded-xl mb-3 flex justify-between items-center shadow-sm hover:border-yellow-300 transition-colors">
          <div>
            <p class="font-bold font-mono text-yellow-700">{{ po.NoNota }}</p>
            <p class="text-xs font-semibold text-slate-600 mt-1 flex items-center gap-1.5"><Store :size="12" class="text-slate-400"/> {{ po.NamaTokoSnapshot }}</p>
            <p class="text-xs font-semibold text-slate-600 mt-0.5 flex items-center gap-1.5"><CheckCircle2 :size="12" class="text-slate-400"/> {{ po.NamaPemesan }}</p>
          </div>
          <router-link 
            :to="'/buat-pesanan?edit=' + po.ID" 
            class="bg-yellow-500 text-yellow-950 px-5 py-2.5 rounded-lg font-bold text-sm shadow-sm transition-colors hover:bg-yellow-600"
          >
            Lihat Detail
          </router-link>
        </div>
      </div>

      <!-- KOTAK NOTA BARU DIBUAT (8 JAM) -->
      <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 border-l-4 border-l-emerald-500 transition-all hover:shadow-md">
        <h2 class="text-lg font-black text-slate-800 mb-5 flex items-center gap-2.5"><History :size="24" class="text-emerald-500" /> Riwayat Hari Ini (8 Jam)</h2>
        
        <div v-if="notaAktif.length === 0" class="text-center p-6 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <span class="font-medium text-sm">Anda belum membuat nota kiriman hari ini.</span>
        </div>

        <div v-for="nota in filteredNotaAktifSales" :key="'a-'+nota.ID" class="border border-slate-200 p-4 rounded-xl mb-3 flex justify-between items-center hover:bg-slate-50 transition-colors">
          <div>
            <p class="font-bold font-mono text-slate-700">{{ nota.NoNota }}</p>
            <p class="text-xs font-medium text-slate-500 mt-0.5">{{ nota.NamaTokoSnapshot }} &bull; {{ formatTanggal(nota.TanggalKirim) }}</p>
          </div>
          <router-link :to="'/buat-nota?edit=' + nota.ID" class="text-blue-600 font-bold text-sm hover:underline bg-blue-50 px-3 py-1.5 rounded-lg">Perbaiki Typo</router-link>
        </div>
      </div>

    </div>
  </div>
</template>
