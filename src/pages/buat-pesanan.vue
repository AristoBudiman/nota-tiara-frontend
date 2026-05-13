<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import logoTiara from '../assets/logo_tiara.png'

const route = useRoute()
const router = useRouter()

const profil = ref({ Alamat: '', NoTelp: '', NoHP: '' })
const role = ref(localStorage.getItem('admin_role') || '')
const isSales = computed(() => role.value === 'sales')

const barangsMaster = ref([])
const tokosMaster = ref([])
const resepsMaster = ref([]) // <--- State untuk katalog resep
const bahansMaster = ref([]) // Katalog Dus/Kemasan
const showModalKemasan = ref(false)
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
  { isKustom: false, idBarangM: '', namaKustom: '', banyak: 1, hargaJual: 0, idResep: '', gramasi: 0, kemasan_detail: [] }
])

const daftarSales = ref([])

const checkAuthError = (res) => {
  if (res.status === 401 || res.status === 403) {
    alert("Sesi habis atau Akses Ditolak!")
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
    daftarSales.value = admins.filter(a => a.Role === 'sales')
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

    const resB = await fetch(`${import.meta.env.VITE_API_URL}/api/barangs`, { headers })
    if (resB.ok) barangsMaster.value = await resB.json()

    const resT = await fetch(`${import.meta.env.VITE_API_URL}/api/tokos`, { headers })
    if (resT.ok) tokosMaster.value = await resT.json()

    // Ambil Data Resep untuk PO Kustom
    const resR = await fetch(`${import.meta.env.VITE_API_URL}/api/resep`, { headers })
    if (resR.ok) resepsMaster.value = await resR.json()

    const resBhn = await fetch(`${import.meta.env.VITE_API_URL}/api/bahan`, { headers })
    if (resBhn.ok) bahansMaster.value = await resBhn.json()

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
  if (isEdit.value || !form.value.tanggal_kirim) return
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
  details.value = [{ isKustom: false, idBarangM: '', namaKustom: '', banyak: 1, hargaJual: 0, idResep: '', gramasi: 0 }]
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
        namaKustom: d.BarangID === null ? d.NamaBarangBebas : '',
        banyak: d.Banyak,
        hargaJual: d.HargaJual,
        idResep: d.ResepID || d.resep_id || '', // Adaptasi aman dari JSON Golang
        gramasi: d.Gramasi || d.gramasi || 0,
        kemasan_detail: (d.KemasanDetail || d.kemasan_detail || []).map(k => ({ bahan_id: k.bahan_id || k.BahanID, kebutuhan: k.kebutuhan || k.Kebutuhan }))
      }))

    } catch (e) {
      console.error("Gagal sinkronisasi data pesanan lama:", e)
    }
  } else {
    generateNoNota()
  }
})

const tambahBaris = () => details.value.push({ isKustom: false, idBarangM: '', namaKustom: '', banyak: 1, hargaJual: 0, idResep: '', gramasi: 0, kemasan_detail: [] })
const hapusBaris = (index) => details.value.splice(index, 1)

const gantiMode = (index) => {
  const row = details.value[index]
  row.isKustom = !row.isKustom
  row.idBarangM = ''; row.namaKustom = ''; row.hargaJual = 0; row.idResep = ''; row.gramasi = 0; row.kemasan_detail =  []
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
  if (!form.value.nama_pemesan) return alert("Nama pemesan wajib diisi!")
  if (form.value.jenis_pengambilan === 'MITRA' && !form.value.toko_id) return alert("Pilih toko penitipan!")

  const payloadDetails = []
  for (const d of details.value) {
    if (d.banyak <= 0) continue
    let bID = null; let namaBebas = ""

    if (d.isKustom) {
      if (!d.namaKustom) return alert("Nama barang kustom tidak boleh kosong!")
      namaBebas = d.namaKustom
    } else {
      if (!d.idBarangM) return alert("Pilih barang master terlebih dahulu!")
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
      kemasan_detail: d.isKustom && d.kemasan_detail ? d.kemasan_detail.map(k => ({ bahan_id: Number(k.bahan_id), kebutuhan: Number(k.kebutuhan) })) : []
    })
  }

  if (payloadDetails.length === 0) return alert("Tambahkan minimal 1 pesanan!")

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
    
    alert(isEdit.value ? "Pesanan berhasil diupdate!" : "Pesanan berhasil dibuat!")
    if (isEdit.value) {
      router.push('/daftar-nota')
    } else {
      resetForm()
    }
  } catch (err) { alert("Gagal: " + err.message) }
}

const bukaModalKemasan = (idx) => { activeIdx.value = idx; showModalKemasan.value = true }
const tambahKemasanKustom = () => details.value[activeIdx.value].kemasan_detail.push({ bahan_id: '', kebutuhan: 1 })
const hapusKemasanKustom = (kIdx) => details.value[activeIdx.value].kemasan_detail.splice(kIdx, 1)

const cetakPDF = () => window.print()
</script>

<template>
  <div class="nota-container p-8 max-w-5xl mx-auto bg-white shadow-lg my-4 border border-gray-200 rounded">
    
    <fieldset :disabled="isSales" class="border-0 p-0 m-0 w-full min-w-0">
        <div class="flex flex-col md:flex-row print:flex-row justify-between items-start mb-6 print:mb-2 border-b-2 pb-4 print:pb-2 gap-4 md:gap-0 print:gap-0">
        <div class="flex flex-col items-start gap-1 flex-1 pr-4">
            <div class="shrink-0">
            <img :src="logoTiara" alt="Logo" class="w-48 max-h-24 object-contain print:hidden" />
            <img :src="logoTiara" alt="Logo" class="w-48 max-h-24 object-contain hidden print:block" style="filter: grayscale(100%);" />
            </div>
            <div class="profile-perusahaan mt-1">
            <p class="text-[12px] md:text-sm text-gray-800 font-bold leading-tight">{{ profil.Alamat }}</p>
            <p class="text-[11px] text-gray-600 font-medium mt-1 print:mt-0">
                <span v-if="profil.NoTelp">Telp: {{ profil.NoTelp }}</span>
                <span v-if="profil.NoTelp && profil.NoHP" class="mx-1">|</span>
                <span v-if="profil.NoHP">HP/WA: {{ profil.NoHP }}</span>
            </p>
            </div>
        </div>

        <div class="info-nota shrink-0 w-full md:w-90 print:w-70">
            <div class="text-left md:text-right print:text-right">
            <h2 class="text-xl font-bold mb-2 print:mb-1 bg-yellow-600 text-white px-2 inline-block">NOTA PESANAN (PO)</h2>
            </div>
            
            <div class="grid grid-cols-[100px_1fr] print:grid-cols-[80px_1fr] gap-x-2 gap-y-1 text-sm print:text-xs mt-1 items-center">
            
            <span class="font-semibold text-left">Pemesan:</span>
            <input type="text" v-model="form.nama_pemesan" class="border rounded px-2 py-0.5 print:border-none print:p-0 font-bold w-full" placeholder="Nama Pemesan" />
            
            <span class="font-semibold text-left">Tgl Selesai:</span>
            <input type="date" v-model="form.tanggal_kirim" class="border rounded px-2 py-0.5 font-bold w-full print:hidden" />
            <span class="hidden print:block font-bold">{{ form.tanggal_kirim.split('-').reverse().join('/') }}</span>
            
            <span class="font-semibold text-left">Titik Ambil:</span>
            <div class="flex gap-1 w-full border rounded print:hidden">
                <select v-model="form.jenis_pengambilan" class="px-1 py-0.5 outline-none font-bold text-xs bg-gray-50 flex-1 truncate">
                <option value="PABRIK">PABRIK</option>
                <option value="MITRA">MITRA</option>
                </select>
                <select v-if="form.jenis_pengambilan === 'MITRA'" v-model="form.toko_id" class="px-1 py-0.5 border-l text-xs outline-none flex-1 truncate font-bold bg-white">
                <option value="" disabled>Pilih</option>
                <option v-for="t in tokosMaster" :key="t.ID" :value="t.ID">{{ t.NamaToko }}</option>
                </select>
            </div>
            <div class="hidden print:block font-bold">
                <span v-if="form.jenis_pengambilan === 'PABRIK'">PABRIK</span>
                <span v-else>MITRA - {{ tokosMaster.find(t => t.ID === form.toko_id)?.NamaToko || '?' }}</span>
            </div>
            
            <span class="font-semibold text-left">No. PO:</span>
            <input v-model="form.no_nota" class="border rounded px-2 py-0.5 font-mono text-[10px] bg-gray-50 print:bg-transparent w-full print:border-none print:p-0 font-bold" readonly />
            
            <template v-if="role === 'superadmin'">
                <span class="font-semibold text-left text-orange-600 print:hidden mt-1">Tugaskan:</span>
                <select v-model="penugasanDanStatus" class="border rounded px-2 py-0.5 mt-1 border-orange-400 bg-orange-50 print:hidden font-bold w-full outline-none">
                <option :value="0">-- Belum Ditugaskan--</option>
                <option v-for="s in daftarSales" :key="s.ID" :value="s.ID">Ke: {{ s.Username }}</option>
                <option value="DIAMBIL" class="bg-green-100 text-green-800">✅ DIAMBIL (Selesai)</option>
                </select>

                <span class="font-semibold text-left text-green-600 print:hidden mt-1">Pembayaran:</span>
                <label class="flex items-center justify-center gap-2 font-bold text-green-700 bg-green-50 px-2 py-0.5 mt-1 rounded border border-green-300 w-full print:hidden cursor-pointer hover:bg-green-100 transition shadow-sm">
                <input type="checkbox" v-model="form.is_lunas" class="w-4 h-4 accent-green-600 cursor-pointer" />
                Tandai Lunas
                </label>
            </template>
            </div>
        </div>
        </div>

        <div class="overflow-x-auto w-full mb-6">
        <table class="w-full border-collapse border border-gray-400 text-sm">
            <thead class="bg-gray-100">
            <tr class="uppercase text-[11px]">
                <th class="border border-gray-400 p-2 text-left w-6 print:hidden">Mode</th>
                <th class="border border-gray-400 p-2 text-left w-48">Barang Pesanan</th>
                <th class="border border-gray-400 p-2 w-16">Qty</th>
                <th class="border border-gray-400 p-2 w-24">Harga/Pcs</th>
                <th class="border border-gray-400 p-2 w-28">Subtotal (Rp)</th>
                <th class="border border-gray-400 p-2 w-8 print:hidden text-red-500">❌</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="(row, idx) in details" :key="idx" class="hover:bg-gray-50 border-b border-gray-300 print-row">
                
                <td class="border border-gray-400 p-1 text-center print:hidden align-top pt-2">
                  <button @click="gantiMode(idx)" class="px-1 py-1 text-[10px] font-bold rounded shadow-sm border w-full"
                          :class="row.isKustom ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-blue-100 text-blue-700 border-blue-300'">
                      {{ row.isKustom ? '✍️' : '📦' }}
                  </button>
                </td>

                <td class="border border-gray-400 p-1 font-medium align-top">
                  <div v-if="row.isKustom">
                      <input type="text" v-model="row.namaKustom" placeholder="Ketik kue kustom..." class="w-full px-2 outline-none font-bold pt-1" />
                      
                      <div v-if="false" class="flex items-center gap-1 px-2 mt-1 print:hidden">
                          <select v-model="row.idResep" class="w-full outline-none text-[10px] text-gray-500 bg-gray-100 rounded border border-gray-300 px-1 py-0.5 cursor-pointer">
                              <option value="">- Potong Resep Apa? -</option>
                              <option v-for="r in resepsMaster" :key="r.ID" :value="r.ID">{{ r.nama_resep }}</option>
                          </select>
                          <input type="number" v-model.number="row.gramasi" placeholder="0" class="w-12 outline-none text-[10px] text-center text-gray-500 bg-gray-100 rounded border border-gray-300 hide-arrows py-0.5" />
                          <span class="text-[9px] text-gray-400 font-bold">gr</span>
                          <button @click="bukaModalKemasan(idx)" class="text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded border border-blue-300 font-bold hover:bg-blue-200 whitespace-nowrap shadow-sm">
                            📦 {{ row.kemasan_detail?.length || 0 }} Kemasan
                          </button>
                      </div>
                  </div>
                  <div v-else class="pt-1">
                      <select v-model="row.idBarangM" @change="onPilihBarangMaster(idx)" class="w-full px-1 outline-none bg-transparent appearance-none font-bold cursor-pointer">
                          <option value="" disabled>Pilih Barang</option>
                          <option v-for="b in barangsMaster" :key="b.ID" :value="b.ID">{{ b.NamaBarang }}</option>
                      </select>
                  </div>
                </td>
                
                <td class="border border-gray-400 p-1 align-top pt-2">
                <input type="number" v-model.number="row.banyak" min="1" @wheel="$event.target.blur()" class="w-full text-center outline-none focus:bg-yellow-100 font-bold bg-transparent" />
                </td>
                
                <td class="border border-gray-400 p-1 text-right align-top pt-2">
                <input type="number" v-model.number="row.hargaJual" :disabled="!row.isKustom" @wheel="$event.target.blur()" class="w-full text-right outline-none bg-transparent font-bold" :class="{'text-gray-500': !row.isKustom}" />
                </td>
                
                <td class="border border-gray-400 p-2 text-right font-bold text-blue-800 align-top pt-2">
                {{ formatRp(row.banyak * row.hargaJual) }}
                </td>

                <td class="border border-gray-400 p-1 text-center print:hidden align-top pt-1">
                <button @click="hapusBaris(idx)" class="text-red-500 hover:text-red-700 font-bold text-xl leading-none">×</button>
                </td>
            </tr>
            </tbody>
        </table>
        
        <button @click="tambahBaris" class="mt-2 text-xs font-bold text-yellow-600 hover:underline px-2 print:hidden">
            + Tambah Baris Baru
        </button>
        </div>
        <div v-if="showModalKemasan" class="fixed inset-0 bg-black/50 flex justify-center items-center z-60 p-4">
          <div class="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border-t-8 border-blue-600">
            <div class="p-6">
              <h3 class="text-lg font-black text-gray-800 mb-1">📦 Kemasan Kustom</h3>
              <p class="text-xs font-bold text-gray-500 mb-4">
                Rakit kemasan untuk: <span class="text-purple-600">{{ details[activeIdx].namaKustom || 'Item Baru' }}</span>
              </p>
              
              <div class="space-y-3 max-h-60 overflow-y-auto pr-2 mb-6">
                <div v-for="(k, kIdx) in details[activeIdx].kemasan_detail" :key="kIdx" class="flex gap-2 items-center bg-gray-50 p-2 rounded border border-gray-200 shadow-sm">
                  <select v-model="k.bahan_id" class="flex-1 text-xs font-bold p-1 outline-none border rounded bg-white cursor-pointer">
                    <option value="" disabled>-- Pilih Dus/Plastik/Pita --</option>
                    <option v-for="b in bahansMaster" :key="b.ID" :value="b.ID">{{ b.nama_bahan }} ({{ b.satuan }})</option>
                  </select>
                  <input type="number" v-model.number="k.kebutuhan" class="w-14 text-xs font-bold p-1 border rounded text-center outline-none" min="0.1" step="any" placeholder="Qty">
                  <button @click="hapusKemasanKustom(kIdx)" class="text-red-500 font-black px-2 hover:bg-red-100 rounded">×</button>
                </div>
                
                <button @click="tambahKemasanKustom" class="w-full py-2 border-2 border-dashed border-blue-300 text-blue-600 text-xs font-bold rounded-lg hover:bg-blue-50 transition">+ Tambah Lapis Kemasan</button>
              </div>

              <button @click="showModalKemasan = false" class="w-full bg-blue-600 hover:bg-blue-700 transition text-white py-3 rounded-lg font-black shadow-md">TUTUP & SIMPAN</button>
            </div>
          </div>
        </div>
    </fieldset>

    <div class="mt-4 print:mt-2 flex justify-between items-end">
      <div class="signature-area hidden print:flex gap-12 text-xs">
        <div class="text-center w-32">
          <p>Tanda Terima,</p>
          <div class="h-16"></div>
          <p>( .................... )</p>
        </div>
        <div class="text-center w-32">
          <p>Hormat Kami,</p>
          <div class="h-16"></div>
          <p>( .................... )</p>
        </div>
      </div>

      <div class="w-64 bg-yellow-50 print:bg-transparent p-2 rounded border border-gray-400 shadow-sm print:shadow-none ml-auto">
        <div class="flex justify-between text-xs mb-1 text-gray-700 print:text-black">
          <span>Total Pesanan:</span>
          <span class="font-bold">Rp{{ formatRp(totalBayar) }}</span>
        </div>

        <div class="flex justify-between items-center text-xs mb-1 text-gray-700 print:text-black" 
             :class="{'print:hidden': !form.ongkir || form.ongkir === 0}">
          <span>Ongkos Kirim:</span>
          <input type="number" v-model.number="form.ongkir" @wheel="$event.target.blur()" class="w-24 text-right font-bold outline-none bg-white border border-gray-300 print:border-none print:bg-transparent rounded px-1 hide-arrows" />
        </div>
        
        <div class="flex justify-between items-center text-xs mb-1 text-gray-700 print:text-black" 
             :class="{'print:hidden': !form.uang_muka || form.uang_muka === 0}">
          <span>Uang Muka (DP):</span>
          <input type="number" v-model.number="form.uang_muka" @wheel="$event.target.blur()" class="w-24 text-right font-bold outline-none bg-white border border-gray-300 print:border-none print:bg-transparent rounded px-1 hide-arrows" />
        </div>
        
        <div class="flex justify-between items-center text-xs mb-1.5 text-gray-700 print:text-black border-b border-gray-300 pb-1" 
             :class="{'print:hidden': !form.total_voucher || form.total_voucher === 0}">
          <span>Voucher (Rp):</span>
          <input type="number" v-model.number="form.total_voucher" @wheel="$event.target.blur()" class="w-24 text-right font-bold outline-none bg-white border border-gray-300 print:border-none print:bg-transparent rounded px-1 hide-arrows" />
        </div>

        <div class="flex justify-between font-black text-sm text-yellow-900 print:text-black mt-1.5">
          <span>SISA TAGIHAN:</span>
          <span :class="{'text-red-600': sisaTagihan > 0, 'text-green-600': sisaTagihan <= 0}">Rp{{ formatRp(sisaTagihan) }}</span>
        </div>
      </div>
    </div>

    <div class="mt-8 flex flex-col md:flex-row justify-end items-stretch md:items-center gap-3 print:hidden border-t-2 pt-4">
      <button v-if="!isSales" @click="simpanPesanan" class="justify-center bg-yellow-500 hover:bg-yellow-600 text-yellow-950 px-6 py-3 md:py-2 rounded shadow font-bold transition flex items-center gap-2">
        <span>💾</span> {{ isEdit ? 'UPDATE PESANAN' : 'SIMPAN PO' }}
      </button>
      <button @click="cetakPDF" class="justify-center bg-gray-800 hover:bg-black text-white px-6 py-3 md:py-2 rounded shadow font-bold transition flex items-center gap-2">
        <span>🖨️</span> EXPORT PDF
      </button>
    </div>

  </div>
</template>

<style scoped>
@media print {
  @page { margin: 5mm; }
  body { margin: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .overflow-x-auto { overflow: visible !important; }
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
tbody tr:nth-child(even) { background-color: #f9fafb; }
</style>