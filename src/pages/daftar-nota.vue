<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const role = ref(localStorage.getItem('admin_role') || 'superadmin')

// Data Superadmin
const listNota = ref([])

// Data Sales
const notaAktif = ref([])
const notaTugas = ref([])
const daftarToko = ref([])
const selectedTokoID = ref('')
const notaKunjungan = ref([])
const poTugas = ref([])

const activeTab = ref(sessionStorage.getItem('tab_nota') || 'REGULER') // Kontrol Tab
const listPesanan = ref([])      // Wadah data pesanan

const checkAuthError = (res) => {
  if (res.status === 401 || res.status === 403) {
    alert("Sesi habis atau Akses Ditolak!")
    localStorage.clear()
    router.push('/login')
    return true
  }
  return false
}

// Fungsi tarik data riwayat pesanan
const fetchRiwayatPesanan = async () => {
  try {
    const token = localStorage.getItem('admin_token')
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/pesanan/riwayat`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (checkAuthError(res)) return
    if (res.ok) listPesanan.value = await res.json()
  } catch (err) {
    console.error("Gagal tarik riwayat PO", err)
  }
}

const fetchSuperadminData = async (token) => {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/notas`, {
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

const filterSiklus = ref(sessionStorage.getItem('filter_siklus') || 'semua')
const filterTokoSuperadmin = ref(sessionStorage.getItem('filter_toko') || 'semua')
const filterWaktu = ref(sessionStorage.getItem('filter_waktu') || '14')

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
  const now = new Date().getTime()
  return listNota.value.filter(n => {
    // Filter Siklus
    if (filterSiklus.value !== 'semua' && n.SiklusSnapshot !== filterSiklus.value) return false

    // Filter Toko 
    const valToko = filterTokoSuperadmin.value
    if (valToko !== 'semua' && valToko !== '' && valToko !== null) {
      if (n.TokoID !== Number(valToko)) return false
    }

    // Filter Waktu
    if (filterWaktu.value !== 'semua') {
      const notaTime = new Date(n.TanggalKirim).getTime()
      const daysDiff = (now - notaTime) / (1000 * 3600 * 24)
      if (filterWaktu.value === '14' && daysDiff > 14) return false
      if (filterWaktu.value === '30' && daysDiff > 30) return false
    }
    return true
  })
})

// Filter khusus untuk Dashboard Sales: Sembunyikan yang sudah SELESAI
const filteredNotaAktifSales = computed(() => {
  return notaAktif.value.filter(n => n.Status !== 'SELESAI')
})

const filterWaktuPO = ref(sessionStorage.getItem('filter_waktu_po') || '14')
const filterTokoPO = ref(sessionStorage.getItem('filter_toko_po') || 'semua')

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
  const now = new Date().getTime()
  return listPesanan.value.filter(po => {
    // Filter Toko
    if (filterTokoPO.value !== 'semua') {
      const targetId = Number(filterTokoPO.value)
      const poId = po.TokoID || 0
      if (poId !== targetId) return false
    }
    // Filter Waktu
    if (filterWaktuPO.value !== 'semua') {
      const poTime = new Date(po.TanggalKirim).getTime()
      const daysDiff = (now - poTime) / (1000 * 3600 * 24)
      if (filterWaktuPO.value === '14' && daysDiff > 14) return false
      if (filterWaktuPO.value === '30' && daysDiff > 30) return false
    }
    return true
  })
})

// SIMPAN OTOMATIS KE SESSION STORAGE
watch(activeTab, (val) => sessionStorage.setItem('tab_nota', val))
watch(filterSiklus, (val) => sessionStorage.setItem('filter_siklus', val))
watch(filterTokoSuperadmin, (val) => sessionStorage.setItem('filter_toko', val))
watch(filterWaktu, (val) => sessionStorage.setItem('filter_waktu', val))
watch(filterWaktuPO, (val) => sessionStorage.setItem('filter_waktu_po', val))
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
</script>

<template>
  <div class="p-8 max-w-6xl mx-auto">
    <h1 class="text-2xl font-bold mb-6 text-blue-900 border-b-2 pb-2">
      {{ role === 'superadmin' ? 'Riwayat Nota Keseluruhan' : 'Dashboard Pengiriman' }}
    </h1>

    <!-- TAB NAVIGASI KHUSUS SUPERADMIN -->
    <div v-if="role === 'superadmin'" class="flex flex-col sm:flex-row mb-6 bg-gray-200 p-1 rounded-lg w-full md:w-max shadow-sm gap-1">
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
    
    <div v-if="role === 'superadmin'" class="bg-white shadow-md rounded-lg p-6">
      <div v-if="activeTab === 'REGULER'">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-gray-50 p-4 border rounded-lg">
          
          <div>
            <label class="block text-xs font-bold text-gray-600 mb-1">Filter Waktu</label>
            <select v-model="filterWaktu" class="w-full border rounded p-2 outline-none font-semibold">
              <option value="14">2 Minggu Terakhir</option>
              <option value="30">1 Bulan Terakhir</option>
              <option value="semua">Semua Riwayat</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-600 mb-1">Filter Siklus</label>
            <select v-model="filterSiklus" class="w-full border rounded p-2 outline-none font-semibold text-blue-700">
              <option value="semua">-- Semua Siklus --</option>
              <option value="HARIAN">HARIAN</option>
              <option value="SiklusKamisSenin">Kamis - Senin</option>
              <option value="SiklusJumatSelasa">Jumat - Selasa</option>
              <option value="SiklusSabtuRabu">Sabtu - Rabu</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-600 mb-1">Pilih Toko</label>
            <select 
              v-model="filterTokoSuperadmin" 
              class="w-full border rounded p-2 outline-none font-semibold cursor-pointer"
            >
              <option value="semua">-- Tampilkan Semua Toko --</option>
              <option v-for="t in filteredUniqueTokos" :key="t.id" :value="t.id">
                {{ t.nama }}
              </option>
            </select>
            <p class="text-[10px] text-gray-400 mt-1 italic">* Pilihan menyesuaikan filter siklus</p>
          </div>

        </div>

        <div class="overflow-x-auto rounded border border-gray-200">
          <table class="w-full text-left border-collapse text-sm min-w-200">
            <thead class="bg-blue-600 text-white uppercase text-xs">
              <tr>
                <th class="p-3 border">Tanggal</th>
                <th class="p-3 border">No. Nota</th>
                <th class="p-3 border">Nama Toko</th>
                <th class="p-3 border text-right">Total Kirim</th>
                <th class="p-3 border text-center">Status Bayar</th>
                <th class="p-3 border text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="nota in filteredListNota" :key="nota.ID" class="hover:bg-gray-50">
                <td class="p-3 border font-medium">{{ formatTanggal(nota.TanggalKirim) }}</td>
                <td class="p-3 border font-mono font-bold">{{ nota.NoNota }}</td>
                <td class="p-3 border">{{ nota.NamaTokoSnapshot || nota.Toko?.NamaToko }}</td>
                <td class="p-3 border text-right">Rp {{ nota.JumlahKirim.toLocaleString() }}</td>
                <td class="p-3 border text-center whitespace-nowrap">
                  <span v-if="nota.Status === 'DIBATALKAN'" class="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold shadow-sm border border-red-200">DIBATALKAN</span>
                  <span v-else-if="nota.is_lunas" class="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold shadow-sm border border-green-200">✅ LUNAS</span>
                  <span v-else class="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold shadow-sm border border-orange-200">⏳ PIUTANG</span>
                </td>
                <td class="p-3 border text-center whitespace-nowrap">
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
                <td colspan="5" class="p-6 text-center text-gray-500 italic">Tidak ada nota yang cocok dengan filter.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="activeTab === 'PESANAN'">
        
        <!-- KOTAK FILTER PO -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-yellow-50 p-4 border border-yellow-200 rounded-lg">
          <div>
            <label class="block text-xs font-bold text-yellow-800 mb-1">Filter Waktu</label>
            <select v-model="filterWaktuPO" class="w-full border border-yellow-300 rounded p-2 outline-none font-semibold bg-white">
              <option value="14">2 Minggu Terakhir</option>
              <option value="30">1 Bulan Terakhir</option>
              <option value="semua">Semua Riwayat</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-yellow-800 mb-1">Pilih Titik Ambil</label>
            <select v-model="filterTokoPO" class="w-full border border-yellow-300 rounded p-2 outline-none font-semibold cursor-pointer bg-white">
              <option value="semua">-- Tampilkan Semua Titik --</option>
              <option v-for="t in filteredUniqueTokosPO" :key="t.id" :value="t.id">
                {{ t.nama }}
              </option>
            </select>
          </div>
        </div>

        <div class="overflow-x-auto rounded border border-yellow-200">
          <table class="w-full text-left border-collapse text-sm min-w-225">
            <thead class="bg-yellow-500 text-yellow-950 uppercase text-xs">
              <tr>
                <th class="p-3 border-r border-yellow-600">Jadwal Kirim</th>
                <th class="p-3 border-r border-yellow-600">No. PO & Pemesan</th>
                <th class="p-3 border-r border-yellow-600">Titik Ambil</th>
                <th class="p-3 border-r border-yellow-600 text-right">Total Tagihan</th>
                <th class="p-3 border-r border-yellow-600 text-center">Status</th>
                <th class="p-3 border text-center">Status Bayar</th>
                <th class="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <!-- UBAH listPesanan MENJADI filteredListPesanan DI SINI -->
              <tr v-for="po in filteredListPesanan" :key="po.ID" class="hover:bg-yellow-50 border-b">
                <td class="p-3 border-r font-medium text-gray-800">{{ formatTanggal(po.TanggalKirim) }}</td>
                <td class="p-3 border-r">
                  <p class="font-mono font-bold text-blue-800">{{ po.NoNota }}</p>
                  <p class="text-xs font-bold text-gray-600">👤 {{ po.NamaPemesan }}</p>
                </td>
                <td class="p-3 border-r font-bold text-gray-700">
                  <span v-if="po.JenisPengambilan === 'PABRIK'" class="bg-gray-200 px-2 py-1 rounded text-xs">🏢 PABRIK</span>
                  <span v-else class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">🏪 {{ po.NamaTokoSnapshot }}</span>
                </td>
                <td class="p-3 border-r text-right font-black text-green-700">Rp {{ po.TotalBayar.toLocaleString() }}</td>
                <td class="p-3 border-r text-center" whitespace-nowrap>
                  <span v-if="po.Status === 'DIBATALKAN'" class="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">DIBATALKAN</span>
                  <span v-else class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-bold">{{ po.Status }}</span>
                </td>
                <td class="p-3 border text-center" whitespace-nowrap>
                  <span v-if="po.is_lunas" class="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold shadow-sm border border-green-200">✅ LUNAS</span>
                  <span v-else class="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold shadow-sm border border-red-200">⏳ PIUTANG</span>
                </td>
                <td class="p-3 border text-center whitespace-nowrap">
                  <div class="flex justify-center gap-2">
                    <template v-if="po.Status !== 'DIBATALKAN'">
                      <button @click="batalkanPO(po.ID, po.NoNota)" class="bg-red-500 text-white px-3 py-1 rounded text-xs font-bold hover:bg-red-600 shadow-sm">
                        Batal
                      </button>
                      <router-link :to="'/buat-pesanan?edit=' + po.ID" class="bg-green-500 text-white px-3 py-1 rounded text-xs font-bold hover:bg-green-600 shadow-sm">
                        Lihat / Edit
                      </router-link>
                    </template>
                    <template v-else>
                      <button @click="pulihkanPO(po.ID, po.NoNota)" class="bg-blue-600 text-white px-4 py-1 rounded text-xs font-bold hover:bg-blue-700 transition shadow-md flex items-center gap-1">
                        🔄 Pulihkan
                      </button>
                    </template>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredListPesanan.length === 0">
                <td colspan="6" class="p-6 text-center text-gray-500 italic">Belum ada riwayat pesanan (PO) yang sesuai filter.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div v-else class="space-y-8 max-w-2xl mx-auto">
      
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