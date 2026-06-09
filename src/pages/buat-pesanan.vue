<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { XCircle, PenTool, Package, Layers, PackageOpen, X, Save, Printer } from 'lucide-vue-next'
import { hasPermission } from '../utils/permission'
import logoTiara from '../assets/logo_tiara.png'

const route = useRoute()
const router = useRouter()

const profil = ref({ Alamat: '', NoTelp: '', NoHP: '' })
const role = ref(localStorage.getItem('admin_role') || '')
const canManagePO = computed(() => hasPermission('manage_nota_pesanan'))

const barangsMaster = ref([])
const tokosMaster = ref([])
const resepsMaster = ref([]) // <--- State untuk katalog resep
const bahansMaster = ref([]) // Katalog Dus/Kemasan
const kompositMaster = ref([]) // <--- State untuk katalog komposit
const showModalKemasan = ref(false)
const showModalKomposit = ref(false) // <--- State untuk modal komposit
const activeIdx = ref(null)
const isEdit = ref(false)

const form = ref({
  no_nota: '',
  tanggal_kirim: '',
  nama_pemesan: '',
  jenis_pengambilan: 'PABRIK',
  toko_id: '',
  assigned_to: 0,
  status: 'BELUM DIAMBIL',
  is_lunas: false,
  ongkir: 0,
  uang_muka: 0,
  total_voucher: 0
})

const details = ref([
  { isKustom: false, idBarangM: '', namaKustom: '', banyak: 1, hargaJual: 0, idResep: '', gramasi: 0, kemasan_detail: [], komposit_detail: [] }
])

const daftarSales = ref([])

const checkAuthError = (res) => {
  if (res.status === 401 || res.status === 403) {
    window.$dialog?.alert("Sesi habis atau Akses Ditolak!")
    localStorage.clear()
    router.push('/login')
    return true
  }
  return false
}

const fetchSales = async () => {
  const token = localStorage.getItem('admin_token')
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admins`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (checkAuthError(res)) return
  if (res.ok) {
    const admins = await res.json()
    daftarSales.value = admins.filter(a => a.role?.nama_role === 'Sales' || a.Role === 'Sales')
  }
}

const fetchProfil = async () => {
  const token = localStorage.getItem('admin_token')
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/profil`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (checkAuthError(res)) return
  if (res.ok) profil.value = await res.json()
}

const fetchData = async () => {
  try {
    const token = localStorage.getItem('admin_token')
    const headers = { 'Authorization': `Bearer ${token}` }

    if (canManagePO.value) {
      const resB = await fetch(`${import.meta.env.VITE_API_URL}/api/barangs`, { headers })
      if (resB.ok) barangsMaster.value = await resB.json()

      const resR = await fetch(`${import.meta.env.VITE_API_URL}/api/resep`, { headers })
      if (resR.ok) resepsMaster.value = await resR.json()
    }

    const resT = await fetch(`${import.meta.env.VITE_API_URL}/api/tokos`, { headers })
    if (resT.ok) tokosMaster.value = await resT.json()

    const resBhn = await fetch(`${import.meta.env.VITE_API_URL}/api/bahan`, { headers })
    if (resBhn.ok) bahansMaster.value = await resBhn.json()

    // Ambil Data Komposit
    const resKomp = await fetch(`${import.meta.env.VITE_API_URL}/api/komposit`, { headers })
    if (resKomp.ok) kompositMaster.value = await resKomp.json()

  } catch (err) { console.error("Gagal tarik master data", err) }
}

const penugasanDanStatus = computed({
  get() {
    if (form.value.status === 'DIAMBIL') return 'DIAMBIL'
    return form.value.assigned_to
  },
  set(val) {
    if (val === 'DIAMBIL') {
      form.value.status = 'DIAMBIL'
      form.value.assigned_to = 0
    } else {
      form.value.status = 'BELUM DIAMBIL'
      form.value.assigned_to = Number(val)
    }
  }
})

watch([() => form.value.tanggal_kirim, () => form.value.toko_id, () => form.value.jenis_pengambilan], () => {
  if (form.value.jenis_pengambilan === 'PABRIK') form.value.toko_id = ''
  generateNoNota()
})

const generateNoNota = async () => {
  if (isEdit.value || !form.value.tanggal_kirim || !canManagePO.value) return
  try {
    const token = localStorage.getItem('admin_token')
    const url = `${import.meta.env.VITE_API_URL}/api/pesanan/next-number?tanggal=${form.value.tanggal_kirim}&toko_id=${form.value.toko_id || ''}`
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
    if (checkAuthError(res)) return
    const data = await res.json()
    form.value.no_nota = data.no_nota
  } catch (err) { console.error(err) }
}

const resetForm = () => {
  form.value = {
    no_nota: '',
    tanggal_kirim: new Date().toISOString().split('T')[0],
    nama_pemesan: '',
    jenis_pengambilan: 'PABRIK',
    toko_id: '',
    assigned_to: 0,
    status: 'BELUM DIAMBIL',
    is_lunas: false,
    ongkir: 0,
    uang_muka: 0,
    total_voucher: 0, 
    kemasan_detail: []
  }
  details.value = [{ isKustom: false, idBarangM: '', namaKustom: '', banyak: 1, hargaJual: 0, idResep: '', gramasi: 0, kemasan_detail: [], komposit_detail: [] }]
  isEdit.value = false
  generateNoNota()
}

watch(() => route.query.edit, (newVal) => {
  if (!newVal) resetForm()
})

onMounted(async () => {
  const today = new Date().toISOString().split('T')[0]
  form.value.tanggal_kirim = today
  
  await fetchProfil()
  await fetchSales()
  await fetchData()

  if (route.query.edit) {
    isEdit.value = true
    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/pesanan/${route.query.edit}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (checkAuthError(res)) return
      const poLama = await res.json()
      
      form.value = {
        no_nota: poLama.NoNota,
        tanggal_kirim: poLama.TanggalKirim.split('T')[0],
        nama_pemesan: poLama.NamaPemesan,
        jenis_pengambilan: poLama.JenisPengambilan,
        toko_id: poLama.TokoID || '',
        assigned_to: poLama.assigned_to,
        status: poLama.Status,
        is_lunas: poLama.is_lunas || false,
        ongkir: poLama.ongkir || poLama.Ongkir || 0,
        uang_muka: poLama.uang_muka || 0,
        total_voucher: poLama.total_voucher || 0
      }

      details.value = poLama.Details.map(d => ({
        isKustom: d.BarangID === null,
        idBarangM: d.BarangID || '',
        namaKustom: d.BarangID === null ? d.NamaBarangBebas : (d.Barang?.NamaBarang || d.Barang?.nama_barang || ''),
        banyak: d.Banyak,
        hargaJual: d.HargaJual,
        idResep: d.ResepID || d.resep_id || '', // Adaptasi aman dari JSON Golang
        gramasi: d.Gramasi || d.gramasi || 0,
        kemasan_detail: (d.KemasanDetail || d.kemasan_detail || []).map(k => ({ bahan_id: k.bahan_id || k.BahanID, kebutuhan: k.kebutuhan || k.Kebutuhan })),
        komposit_detail: (d.KompositDetail || d.komposit_detail || []).map(k => ({ resep_komposit_id: k.resep_komposit_id || k.ResepKompositID, kebutuhan: k.kebutuhan || k.Kebutuhan }))
      }))

    } catch (e) {
      console.error("Gagal sinkronisasi data pesanan lama:", e)
    }
  } else {
    generateNoNota()
  }
})

const tambahBaris = () => details.value.push({ isKustom: false, idBarangM: '', namaKustom: '', banyak: 1, hargaJual: 0, idResep: '', gramasi: 0, kemasan_detail: [], komposit_detail: [] })
const hapusBaris = (index) => details.value.splice(index, 1)

const gantiMode = (index) => {
  const row = details.value[index]
  row.isKustom = !row.isKustom
  row.idBarangM = ''; row.namaKustom = ''; row.hargaJual = 0; row.idResep = ''; row.gramasi = 0; row.kemasan_detail = []; row.komposit_detail = []
}

const onPilihBarangMaster = (index) => {
  const row = details.value[index]
  const brg = barangsMaster.value.find(b => b.ID === row.idBarangM)
  if (brg) row.hargaJual = brg.HargaDefault
}

const formatRp = (val) => new Intl.NumberFormat('id-ID').format(val || 0)

const totalBayar = computed(() => details.value.reduce((sum, row) => sum + (row.banyak * row.hargaJual), 0))
const sisaTagihan = computed(() => totalBayar.value + (form.value.ongkir || 0) - (form.value.uang_muka || 0) - (form.value.total_voucher || 0))

const simpanPesanan = async () => {
  if (!form.value.nama_pemesan) return window.$dialog?.alert("Nama pemesan wajib diisi!")
  if (form.value.jenis_pengambilan === 'MITRA' && !form.value.toko_id) return window.$dialog?.alert("Pilih toko penitipan!")

  const payloadDetails = []
  for (const d of details.value) {
    if (d.banyak <= 0) continue
    let bID = null; let namaBebas = ""

    if (d.isKustom) {
      if (!d.namaKustom) return window.$dialog?.alert("Nama barang kustom tidak boleh kosong!")
      namaBebas = d.namaKustom
    } else {
      if (!d.idBarangM) return window.$dialog?.alert("Pilih barang master terlebih dahulu!")
      const brg = barangsMaster.value.find(b => b.ID === d.idBarangM)
      bID = d.idBarangM
      namaBebas = brg.NamaBarang
    }

    payloadDetails.push({
      barang_id: bID,
      nama_barang_bebas: namaBebas,
      banyak: d.banyak,
      harga_jual: Number(d.hargaJual),
      resep_id: d.isKustom && d.idResep ? Number(d.idResep) : null,
      gramasi: d.isKustom ? Number(d.gramasi) : 0,
      kemasan_detail: d.isKustom && d.kemasan_detail ? d.kemasan_detail.map(k => ({ bahan_id: Number(k.bahan_id), kebutuhan: Number(k.kebutuhan) })) : [],
      komposit_detail: d.isKustom && d.komposit_detail ? d.komposit_detail.map(k => ({ resep_komposit_id: Number(k.resep_komposit_id), kebutuhan: Number(k.kebutuhan) })) : []
    })
  }

  if (payloadDetails.length === 0) return window.$dialog?.alert("Tambahkan minimal 1 pesanan!")

  const payload = {
    no_nota: String(form.value.no_nota),
    nama_pemesan: form.value.nama_pemesan,
    tanggal_kirim: form.value.tanggal_kirim,
    jenis_pengambilan: form.value.jenis_pengambilan,
    toko_id: form.value.jenis_pengambilan === 'MITRA' ? Number(form.value.toko_id) : null,
    assigned_to: Number(form.value.assigned_to || 0),
    status: form.value.status, 
    is_lunas: form.value.is_lunas,
    ongkir: Number(form.value.ongkir || 0),
    uang_muka: Number(form.value.uang_muka || 0),
    total_voucher: Number(form.value.total_voucher || 0),
    details: payloadDetails
  }

  const url = isEdit.value ? `${import.meta.env.VITE_API_URL}/api/pesanan/${route.query.edit}` : `${import.meta.env.VITE_API_URL}/api/pesanan`
  
  try {
    const token = localStorage.getItem('admin_token')
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload)
    })
    if (checkAuthError(res)) return
    if (!res.ok) throw new Error(await res.text())
    
    window.$dialog?.alert(isEdit.value ? "Pesanan berhasil diupdate!" : "Pesanan berhasil dibuat!")
    if (isEdit.value) {
      router.push('/daftar-nota')
    } else {
      resetForm()
    }
  } catch (err) { window.$dialog?.alert("Gagal: " + err.message) }
}

const bukaModalKemasan = (idx) => { activeIdx.value = idx; showModalKemasan.value = true }
const tambahKemasanKustom = () => details.value[activeIdx.value].kemasan_detail.push({ bahan_id: '', kebutuhan: 1 })
const hapusKemasanKustom = (kIdx) => details.value[activeIdx.value].kemasan_detail.splice(kIdx, 1)

const bukaModalKomposit = (idx) => { activeIdx.value = idx; showModalKomposit.value = true }
const tambahKompositKustom = () => details.value[activeIdx.value].komposit_detail.push({ resep_komposit_id: '', kebutuhan: 1 })
const hapusKompositKustom = (kIdx) => details.value[activeIdx.value].komposit_detail.splice(kIdx, 1)

const cetakPDF = () => window.print()
</script>

<template>
  <div class="nota-container p-4 md:p-8 max-w-5xl mx-auto my-4">
    <div class="bg-white shadow-sm border border-slate-200 rounded-2xl overflow-hidden print:shadow-none print:border-none print:rounded-none">
    <fieldset :disabled="!canManagePO" class="border-0 p-0 m-0 w-full min-w-0">
      
      <!-- HEADER COMPACT -->
      <div class="bg-slate-50 p-4 md:p-6 border-b border-slate-200 print:bg-white print:p-0 print:border-none print:mb-4">
        <!-- flex-col on screen, flex-row on print -->
        <div class="flex flex-col print:flex-row justify-between items-stretch print:items-start gap-5 print:gap-0">
          
          <!-- PROFIL -->
          <!-- On screen: flex-row, center aligned items. On print: flex-col, items-start -->
          <div class="flex flex-col sm:flex-row print:flex-col items-center print:items-start gap-4 print:gap-1 print:pr-4">
            <div class="shrink-0">
              <img :src="logoTiara" alt="Logo" class="w-32 sm:w-40 max-h-16 object-contain print:hidden mx-auto sm:mx-0" />
              <img :src="logoTiara" alt="Logo" class="w-48 max-h-24 object-contain hidden print:block" style="filter: grayscale(100%);" />
            </div>
            <div class="text-center sm:text-left print:text-left mt-2 sm:mt-0">
              <p class="text-sm md:text-base print:text-[12px] text-slate-800 font-bold leading-tight">{{ profil.Alamat }}</p>
              <p class="text-xs md:text-sm print:text-[11px] text-slate-500 font-medium mt-0.5">
                <span v-if="profil.NoTelp">Telp: {{ profil.NoTelp }}</span>
                <span v-if="profil.NoTelp && profil.NoHP" class="mx-1">|</span>
                <span v-if="profil.NoHP">HP/WA: {{ profil.NoHP }}</span>
              </p>
            </div>
          </div>

          <!-- FORM INPUTS -->
          <!-- On screen: w-full, stretches to fill. On print: w-72 fixed width -->
          <div class="w-full print:w-72 print:flex-none bg-white print:bg-transparent rounded-xl border border-slate-200 print:border-none p-4 print:p-0 shadow-sm print:shadow-none shrink-0 mt-2 print:mt-0">
            <div class="flex flex-col sm:flex-row justify-between sm:items-center text-left mb-4 print:mb-2 border-b border-slate-100 print:border-none pb-3 print:pb-0 gap-2">
              <div class="hidden md:block print:hidden text-slate-400 text-xs font-medium">Rincian Nota Pesanan</div>
              <div class="inline-flex items-center bg-amber-100 print:bg-slate-800 text-amber-800 print:text-white px-3 py-1.5 print:px-2.5 print:py-1 rounded-md ml-auto">
                <h2 class="text-sm font-black tracking-wide">NOTA PESANAN (PO)</h2>
              </div>
            </div>
            
            <div class="grid grid-cols-[90px_1fr] md:grid-cols-[90px_1fr_90px_1fr] lg:grid-cols-[90px_1fr_90px_1fr_90px_1fr] print:grid-cols-[80px_1fr] gap-x-4 print:gap-x-2 gap-y-3 print:gap-y-1.5 text-xs print:text-xs items-center">
              
              <span class="font-bold text-slate-600">Pemesan:</span>
              <input type="text" v-model="form.nama_pemesan" class="bg-slate-50 print:bg-transparent border border-slate-200 rounded px-2.5 py-1.5 print:border-none print:p-0 font-bold text-slate-800 w-full focus:ring-1 focus:ring-amber-500 outline-none transition-all" placeholder="Nama Pemesan" />
              
              <span class="font-bold text-slate-600">Tgl Selesai:</span>
              <input type="date" v-model="form.tanggal_kirim" class="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 font-bold text-slate-800 w-full focus:ring-1 focus:ring-amber-500 outline-none transition-all print:hidden" />
              <span class="hidden print:block font-bold text-slate-800">{{ form.tanggal_kirim.split('-').reverse().join('/') }}</span>
              
              <span class="font-bold text-slate-600 whitespace-nowrap">Titik Ambil:</span>
              <div class="flex gap-1.5 w-full min-w-0 print:hidden">
                <select v-model="form.jenis_pengambilan" class="bg-slate-50 border border-slate-200 rounded px-2 py-1.5 font-bold text-slate-800 outline-none focus:ring-1 focus:ring-amber-500 flex-1 min-w-0 truncate">
                  <option value="PABRIK">PABRIK</option>
                  <option value="MITRA">MITRA</option>
                </select>
                <select v-if="form.jenis_pengambilan === 'MITRA'" v-model="form.toko_id" class="bg-slate-50 border border-slate-200 rounded px-2 py-1.5 font-bold text-slate-800 outline-none focus:ring-1 focus:ring-amber-500 flex-1 min-w-0 truncate">
                  <option value="" disabled>Pilih</option>
                  <option v-for="t in tokosMaster" :key="t.ID" :value="t.ID">{{ t.NamaToko }}</option>
                </select>
              </div>
              <div class="hidden print:block font-bold text-slate-800">
                <span v-if="form.jenis_pengambilan === 'PABRIK'">PABRIK</span>
                <span v-else>MITRA - {{ tokosMaster.find(t => t.ID === form.toko_id)?.NamaToko || '?' }}</span>
              </div>
              
              <span class="font-bold text-slate-600">No. PO:</span>
              <input v-model="form.no_nota" class="bg-slate-100 border border-slate-200 rounded px-2.5 py-1.5 font-mono text-xs text-slate-600 print:bg-transparent w-full print:border-none print:p-0 font-bold" readonly />
              
              <template v-if="role === 'Superadmin'">
                <span class="font-bold text-orange-600 print:hidden whitespace-nowrap">Tugaskan:</span>
                <select v-model="penugasanDanStatus" class="bg-orange-50 border border-orange-200 rounded px-2.5 py-1.5 font-bold text-orange-800 w-full outline-none focus:ring-1 focus:ring-orange-500 print:hidden">
                  <option :value="0">-- Belum Ditugaskan--</option>
                  <option v-for="s in daftarSales" :key="s.id || s.ID" :value="s.id || s.ID">Ke: {{ s.username || s.Username }}</option>
                  <option value="DIAMBIL" class="bg-emerald-100 text-emerald-800">[SELESAI] DIAMBIL</option>
                </select>

                <span class="font-bold text-emerald-600 print:hidden whitespace-nowrap">Pembayaran:</span>
                <label class="flex items-center justify-start gap-2 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded border border-emerald-200 w-full print:hidden cursor-pointer hover:bg-emerald-100 transition shadow-sm">
                  <input type="checkbox" v-model="form.is_lunas" class="w-4 h-4 accent-emerald-600 cursor-pointer rounded" />
                  Tandai Lunas
                </label>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- BODY: TABEL -->
      <div class="p-6 print:p-0 w-full overflow-x-auto print:overflow-visible">
        <div class="rounded-xl border border-slate-200 overflow-hidden print:border-none min-w-[800px] md:min-w-full">
          <table class="w-full text-sm border-collapse">
            <thead class="bg-slate-800 text-white print:bg-transparent print:text-black print:border-y-2 print:border-slate-800">
              <tr class="tracking-wide">
                <th v-if="canManagePO" class="p-3 text-center w-12 print:hidden font-bold">Mode</th>
                <th class="p-3 text-left font-bold">Barang Pesanan</th>
                <th class="p-3 w-20 text-center font-bold">Qty</th>
                <th class="p-3 w-32 text-right font-bold">Harga/Pcs</th>
                <th class="p-3 w-36 text-right font-bold">Subtotal (Rp)</th>
                <th class="p-3 w-10 print:hidden text-center"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 print:divide-slate-400">
              <tr v-for="(row, idx) in details" :key="idx" class="hover:bg-amber-50/50 even:bg-slate-50 transition-colors print:even:bg-transparent">
                
                <td v-if="canManagePO" class="p-2 text-center print:hidden align-top pt-3">
                  <button @click="gantiMode(idx)" class="p-1.5 rounded-lg shadow-sm border transition-all hover:scale-105 active:scale-95"
                          :class="row.isKustom ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-amber-100 text-amber-700 border-amber-200'">
                      <PenTool v-if="row.isKustom" :size="16" />
                      <Package v-else :size="16" />
                  </button>
                </td>

                <td class="p-2 align-top pt-3">
                  <template v-if="canManagePO">
                    <div v-if="row.isKustom">
                        <input type="text" v-model="row.namaKustom" placeholder="Ketik kue kustom..." class="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg outline-none font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 transition-shadow print:border-none print:p-0 print:bg-transparent" />
                        
                        <div class="flex flex-wrap items-center gap-2 mt-2 print:hidden">
                            <select v-model="row.idResep" class="flex-1 min-w-[140px] outline-none text-xs font-bold text-slate-600 bg-slate-100 rounded-lg border border-slate-200 px-2 py-1.5 cursor-pointer focus:ring-2 focus:ring-amber-500">
                                <option value="">- Potong Resep Apa? -</option>
                                <option v-for="r in resepsMaster" :key="r.ID" :value="r.ID">{{ r.nama_resep }}</option>
                            </select>
                            <div class="flex items-center bg-slate-100 border border-slate-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-amber-500">
                              <input type="number" v-model.number="row.gramasi" placeholder="0" class="w-14 outline-none text-xs font-bold text-center text-slate-700 bg-transparent py-1.5 hide-arrows" />
                              <span class="text-[10px] text-slate-400 font-bold pr-2">gr</span>
                            </div>
                            
                            <button @click="bukaModalKomposit(idx)" class="text-[10px] bg-amber-50 text-amber-700 px-2.5 py-1.5 rounded-lg border border-amber-200 font-bold hover:bg-amber-100 transition shadow-sm flex items-center gap-1">
                              <Layers :size="12" /> {{ row.komposit_detail?.length || 0 }} Komposit
                            </button>
                            <button @click="bukaModalKemasan(idx)" class="text-[10px] bg-sky-50 text-sky-700 px-2.5 py-1.5 rounded-lg border border-sky-200 font-bold hover:bg-sky-100 transition shadow-sm flex items-center gap-1">
                              <PackageOpen :size="12" /> {{ row.kemasan_detail?.length || 0 }} Kemasan
                            </button>
                        </div>
                    </div>
                    <div v-else class="pt-1">
                        <select v-model="row.idBarangM" @change="onPilihBarangMaster(idx)" class="w-full px-3 py-1.5 bg-white print:bg-transparent border border-slate-200 print:border-none rounded-lg outline-none font-bold text-slate-800 cursor-pointer focus:ring-2 focus:ring-amber-500 transition-shadow">
                            <option value="" disabled>Pilih Barang</option>
                            <option v-for="b in barangsMaster" :key="b.ID" :value="b.ID">{{ b.NamaBarang }}</option>
                        </select>
                    </div>
                  </template>
                  <template v-else>
                    <div class="font-bold text-slate-800 pt-1.5">{{ row.namaKustom }}</div>
                  </template>
                </td>
                
                <td class="p-2 align-top pt-3">
                  <input type="number" v-model.number="row.banyak" min="1" @wheel="$event.target.blur()" class="w-full px-2 text-center outline-none bg-white border border-slate-200 print:border-none print:bg-transparent rounded-lg py-1.5 font-black text-slate-800 focus:ring-2 focus:ring-amber-500 transition-shadow" />
                </td>
                
                <td class="p-2 align-top pt-3">
                  <input type="number" v-model.number="row.hargaJual" :disabled="!row.isKustom" @wheel="$event.target.blur()" class="w-full px-3 text-right outline-none bg-white border border-slate-200 print:border-none print:bg-transparent rounded-lg py-1.5 font-bold focus:ring-2 focus:ring-amber-500 transition-shadow disabled:bg-slate-50 disabled:text-slate-500 hide-arrows" :class="{'text-slate-800': row.isKustom}" />
                </td>
                
                <td class="p-3 text-right font-black text-amber-900 print:text-black align-top pt-4">
                  {{ formatRp(row.banyak * row.hargaJual) }}
                </td>

                <td class="p-2 text-center print:hidden align-top pt-3">
                  <button @click="hapusBaris(idx)" class="p-1.5 text-red-400 hover:text-white hover:bg-red-500 rounded-lg transition-colors flex justify-center w-full">
                    <X :size="18" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <button @click="tambahBaris" class="mt-3 text-sm font-bold text-amber-600 hover:text-amber-800 transition flex items-center gap-1 print:hidden px-2">
            <span class="bg-amber-100 rounded-full w-5 h-5 flex items-center justify-center">+</span> Tambah Baris
        </button>
      </div>

      <!-- FOOTER RINGKASAN -->
      <div class="p-6 bg-slate-50 border-t border-slate-200 print:bg-transparent print:border-none flex flex-col-reverse md:flex-row print:flex-row justify-between items-end gap-6 print:gap-0 print:mt-4">
        <div class="w-full md:w-auto hidden print:flex gap-16 text-sm font-bold text-slate-800">
          <div class="text-center w-32">
            <p>Tanda Terima,</p>
            <div class="h-20 border-b border-slate-400 border-dashed mt-8"></div>
          </div>
          <div class="text-center w-32">
            <p>Hormat Kami,</p>
            <div class="h-20 border-b border-slate-400 border-dashed mt-8"></div>
          </div>
        </div>

        <div class="w-full md:w-80 print:w-64 bg-white print:bg-transparent p-5 print:p-0 rounded-2xl border border-slate-200 shadow-sm print:shadow-none print:border-none ml-auto shrink-0">
          <div class="flex justify-between text-sm mb-2 text-slate-600 font-medium">
            <span>Total Pesanan:</span>
            <span class="font-bold text-slate-800">Rp {{ formatRp(totalBayar) }}</span>
          </div>

          <div class="flex justify-between items-center text-sm mb-2 text-slate-600 font-medium" 
               :class="{'print:hidden': !form.ongkir || form.ongkir === 0}">
            <span>Ongkos Kirim:</span>
            <input type="number" v-model.number="form.ongkir" @wheel="$event.target.blur()" class="w-28 print:w-20 text-right font-bold outline-none bg-slate-50 border border-slate-200 print:border-none print:bg-transparent rounded-lg py-1 px-2 focus:ring-2 focus:ring-amber-500 hide-arrows text-slate-800" />
          </div>
          
          <div class="flex justify-between items-center text-sm mb-2 text-slate-600 font-medium" 
               :class="{'print:hidden': !form.uang_muka || form.uang_muka === 0}">
            <span>Uang Muka (DP):</span>
            <input type="number" v-model.number="form.uang_muka" @wheel="$event.target.blur()" class="w-28 print:w-20 text-right font-bold outline-none bg-slate-50 border border-slate-200 print:border-none print:bg-transparent rounded-lg py-1 px-2 focus:ring-2 focus:ring-amber-500 hide-arrows text-slate-800" />
          </div>
          
          <div class="flex justify-between items-center text-sm mb-4 pb-4 border-b border-slate-100 print:border-slate-800 text-slate-600 font-medium" 
               :class="{'print:hidden': !form.total_voucher || form.total_voucher === 0}">
            <span>Voucher (Rp):</span>
            <input type="number" v-model.number="form.total_voucher" @wheel="$event.target.blur()" class="w-28 print:w-20 text-right font-bold outline-none bg-slate-50 border border-slate-200 print:border-none print:bg-transparent rounded-lg py-1 px-2 focus:ring-2 focus:ring-amber-500 hide-arrows text-slate-800" />
          </div>

          <div class="p-4 bg-linear-to-br from-amber-500 to-amber-600 print:bg-transparent rounded-xl text-amber-50 print:text-black shadow-inner print:shadow-none print:p-0">
            <div class="flex justify-between items-center">
              <span class="font-black tracking-wide text-amber-100 print:text-slate-800">SISA TAGIHAN</span>
              <span class="text-xl font-black drop-shadow-md print:drop-shadow-none" :class="{'text-emerald-200 print:text-emerald-700': sisaTagihan <= 0}">
                Rp {{ formatRp(sisaTagihan) }}
              </span>
            </div>
          </div>
        </div>
      </div>
      
    </fieldset>
    </div> <!-- End Card Container -->

    <!-- ACTION BUTTONS -->
    <div class="mt-6 flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-3 print:hidden">
      <button v-if="canManagePO" @click="simpanPesanan" class="flex-1 sm:flex-none justify-center bg-amber-500 hover:bg-amber-600 text-amber-950 px-8 py-3.5 rounded-xl shadow-lg shadow-amber-500/30 font-black tracking-wide transition-all active:scale-95 flex items-center gap-2">
        <Save :size="20" /> {{ isEdit ? 'UPDATE PESANAN' : 'SIMPAN PESANAN' }}
      </button>
      <button @click="cetakPDF" class="flex-1 sm:flex-none justify-center bg-slate-800 hover:bg-slate-900 text-white px-8 py-3.5 rounded-xl shadow-lg shadow-slate-500/30 font-black tracking-wide transition-all active:scale-95 flex items-center gap-2">
        <Printer :size="20" /> CETAK / PDF
      </button>
    </div>

    <!-- MODAL KEMASAN -->
    <div v-if="showModalKemasan" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in custom-scrollbar">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up border-t-8 border-sky-500">
        <div class="p-6">
          <div class="flex items-center gap-3 mb-2">
            <div class="w-10 h-10 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center">
              <PackageOpen :size="20" />
            </div>
            <h3 class="text-xl font-black text-slate-800">Kemasan Kustom</h3>
          </div>
          <p class="text-sm font-medium text-slate-500 mb-6 pl-13">
            Rakit kemasan untuk: <span class="text-sky-600 font-bold">{{ details[activeIdx].namaKustom || 'Item Baru' }}</span>
          </p>
          
          <div class="space-y-3 max-h-[60vh] overflow-y-auto pr-2 mb-6 custom-scrollbar">
            <div v-for="(k, kIdx) in details[activeIdx].kemasan_detail" :key="kIdx" class="flex gap-2 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <select v-model="k.bahan_id" class="flex-1 text-sm font-bold p-2 outline-none border border-slate-200 rounded-lg bg-white cursor-pointer focus:ring-2 focus:ring-sky-500 text-slate-700">
                <option value="" disabled>-- Pilih Dus/Plastik/Pita --</option>
                <option v-for="b in bahansMaster" :key="b.ID" :value="b.ID">{{ b.nama_bahan }} ({{ b.satuan }})</option>
              </select>
              <input type="number" v-model.number="k.kebutuhan" class="w-16 text-sm font-bold p-2 border border-slate-200 rounded-lg text-center outline-none focus:ring-2 focus:ring-sky-500 text-slate-700 hide-arrows" min="0.1" step="any" placeholder="Qty">
              <button @click="hapusKemasanKustom(kIdx)" class="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"><X :size="18"/></button>
            </div>
            
            <button @click="tambahKemasanKustom" class="w-full py-3 border-2 border-dashed border-sky-200 text-sky-600 text-sm font-bold rounded-xl hover:bg-sky-50 transition-colors">+ Tambah Lapis Kemasan</button>
          </div>

          <button @click="showModalKemasan = false" class="w-full bg-slate-800 hover:bg-slate-900 transition-colors text-white py-3.5 rounded-xl font-black shadow-md active:scale-95">TUTUP & SIMPAN</button>
        </div>
      </div>
    </div>

    <!-- MODAL KOMPOSIT -->
    <div v-if="showModalKomposit" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in custom-scrollbar">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up border-t-8 border-amber-500">
        <div class="p-6">
          <div class="flex items-center gap-3 mb-2">
            <div class="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
              <Layers :size="20" />
            </div>
            <h3 class="text-xl font-black text-slate-800">Isian & Topping</h3>
          </div>
          <p class="text-sm font-medium text-slate-500 mb-6 pl-13">
            Pilih komposit untuk: <span class="text-amber-600 font-bold">{{ details[activeIdx].namaKustom || 'Item Baru' }}</span>
          </p>
          
          <div class="space-y-3 max-h-[60vh] overflow-y-auto pr-2 mb-6 custom-scrollbar">
            <div v-for="(k, kIdx) in details[activeIdx].komposit_detail" :key="kIdx" class="flex gap-2 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <select v-model="k.resep_komposit_id" class="flex-1 text-sm font-bold p-2 outline-none border border-slate-200 rounded-lg bg-white cursor-pointer focus:ring-2 focus:ring-amber-500 text-slate-700">
                <option value="" disabled>-- Pilih Butter/Isian --</option>
                <option v-for="c in kompositMaster" :key="c.id" :value="c.id">{{ c.nama_komposit }}</option>
              </select>
              <div class="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-amber-500">
                <input type="number" v-model.number="k.kebutuhan" class="w-16 text-sm font-bold py-2 text-center outline-none text-slate-700 hide-arrows" min="0.1" step="any" placeholder="Gram">
                <span class="text-xs font-bold text-slate-400 pr-2">gr</span>
              </div>
              <button @click="hapusKompositKustom(kIdx)" class="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"><X :size="18"/></button>
            </div>
            
            <button @click="tambahKompositKustom" class="w-full py-3 border-2 border-dashed border-amber-200 text-amber-600 text-sm font-bold rounded-xl hover:bg-amber-50 transition-colors">+ Tambah Lapis Komposit</button>
          </div>

          <button @click="showModalKomposit = false" class="w-full bg-slate-800 hover:bg-slate-900 transition-colors text-white py-3.5 rounded-xl font-black shadow-md active:scale-95">TUTUP & SIMPAN</button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
@media print {
  @page { margin: 5mm; }
  body { margin: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .overflow-x-auto { overflow: visible !important; }
  .print\:overflow-visible { overflow: visible !important; }
  .nota-container { 
    box-shadow: none !important; 
    border: none !important; 
    margin: 0 auto !important; 
    padding: 0 !important;
    width: 100% !important; 
    max-width: 100% !important; 
    min-width: 100% !important;
  }

  input[type="date"]::-webkit-calendar-picker-indicator,
  input[type="date"]::-webkit-inner-spin-button,
  input[type="date"]::-webkit-clear-button {
    display: none !important;
    -webkit-appearance: none !important;
  }
  
  select {
    -webkit-appearance: none !important;
    -moz-appearance: none !important;
    appearance: none !important;
    background-image: none !important;
  }
}
input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.hide-arrows::-webkit-outer-spin-button, .hide-arrows::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
</style>