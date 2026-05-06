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
  { isKustom: false, idBarangM: '', namaKustom: '', banyak: 1, hargaJual: 0, idResep: '', gramasi: 0 }
])

const daftarSales = ref([])

const fetchSales = async () => {
  const token = localStorage.getItem('admin_token')
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admins`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
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
  if (res.ok) profil.value = await res.json()
}

const fetchData = async () => {
  try {
    const token = localStorage.getItem('admin_token')
    const headers = { 'Authorization': `Bearer ${token}` }

    const resB = await fetch(`${import.meta.env.VITE_API_URL}/api/barangs`, { headers })
    barangsMaster.value = await resB.json()

    const resT = await fetch(`${import.meta.env.VITE_API_URL}/api/tokos`, { headers })
    tokosMaster.value = await resT.json()
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
    total_voucher: 0
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
        idResep: d.resep_id || '',
        gramasi: d.gramasi || 0
      }))

    } catch (e) {
      console.error("Gagal sinkronisasi data pesanan lama:", e)
    }
  } else {
    generateNoNota()
  }
})

const tambahBaris = () => details.value.push({ isKustom: false, idBarangM: '', namaKustom: '', banyak: 1, hargaJual: 0, idResep: '', gramasi: 0 })
const hapusBaris = (index) => details.value.splice(index, 1)

const gantiMode = (index) => {
  const row = details.value[index]
  row.isKustom = !row.isKustom
  row.idBarangM = ''; row.namaKustom = ''; row.hargaJual = 0; row.gramasi = 0
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
      resep_id: null,
      gramasi: Number(d.gramasi)
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
  const method = isEdit.value ? 'POST' : 'POST' 

  try {
    const token = localStorage.getItem('admin_token')
    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload)
    })
    if (!res.ok) throw new Error(await res.text())
    
    alert(isEdit.value ? "Pesanan berhasil diupdate!" : "Pesanan berhasil dibuat!")
    if (isEdit.value) {
      router.push('/daftar-nota')
    } else {
      resetForm()
    }
  } catch (err) { alert("Gagal: " + err.message) }
}

const cetakPDF = () => window.print()
</script>

<template>
  <div class="nota-container p-8 max-w-5xl mx-auto bg-white shadow-lg my-4 border border-gray-200 rounded">
    
    <fieldset :disabled="isSales" class="border-0 p-0 m-0 w-full min-w-0">
        <div class="flex justify-between items-start mb-6 print:mb-2 border-b-2 pb-4 print:pb-2">
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
            <div class="text-right">
            <h2 class="text-xl font-bold mb-2 print:mb-1 bg-yellow-600 text-white px-2 inline-block">NOTA PESANAN (PO)</h2>
            </div>
            
            <div class="grid grid-cols-[100px_1fr] print:grid-cols-[80px_1fr] gap-x-2 gap-y-1 text-sm print:text-xs mt-1 items-center">
            
            <span class="font-semibold text-left">Pemesan:</span>
            <input type="text" v-model="form.nama_pemesan" class="border rounded px-2 py-0.5 print:border-none print:p-0 font-bold w-full" placeholder="Nama Pemesan" />
            
            <span class="font-semibold text-left">Tgl Selesai:</span>
            <input type="date" v-model="form.tanggal_kirim" class="border rounded px-2 py-0.5 print:border-none print:p-0 font-bold w-full" />
            
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
                
                <td class="border border-gray-400 p-1 text-center print:hidden">
                <button @click="gantiMode(idx)" class="px-1 py-1 text-[10px] font-bold rounded shadow-sm border w-full"
                        :class="row.isKustom ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-blue-100 text-blue-700 border-blue-300'">
                    {{ row.isKustom ? '✍️' : '📦' }}
                </button>
                </td>

                <td class="border border-gray-400 p-1 font-medium">
                <input v-if="row.isKustom" type="text" v-model="row.namaKustom" placeholder="Ketik kue..." class="w-full px-2 outline-none font-bold" />
                <select v-else v-model="row.idBarangM" @change="onPilihBarangMaster(idx)" class="w-full px-1 outline-none bg-transparent appearance-none font-bold">
                    <option value="" disabled>Pilih Barang</option>
                    <option v-for="b in barangsMaster" :key="b.ID" :value="b.ID">{{ b.NamaBarang }}</option>
                </select>
                </td>
                
                <td class="border border-gray-400 p-1">
                <input type="number" v-model.number="row.banyak" min="1" @wheel="$event.target.blur()" class="w-full text-center outline-none focus:bg-yellow-100 font-bold" />
                </td>
                
                <td class="border border-gray-400 p-1 text-right">
                <input type="number" v-model.number="row.hargaJual" :disabled="!row.isKustom" @wheel="$event.target.blur()" class="w-full text-right outline-none bg-transparent" :class="{'text-gray-500': !row.isKustom}" />
                </td>
                
                <td class="border border-gray-400 p-2 text-right font-bold text-blue-800">
                {{ formatRp(row.banyak * row.hargaJual) }}
                </td>

                <td class="border border-gray-400 p-1 text-center print:hidden">
                <button @click="hapusBaris(idx)" class="text-red-500 hover:text-red-700 font-bold text-lg leading-none">×</button>
                </td>
            </tr>
            </tbody>
        </table>
        
        <button @click="tambahBaris" class="mt-2 text-xs font-bold text-yellow-600 hover:underline px-2 print:hidden">
            + Tambah Baris Baru
        </button>
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

      <!-- KOTAK KALKULASI TAGIHAN BARU -->
      <div class="w-64 bg-yellow-50 print:bg-transparent p-2 rounded border border-gray-400 shadow-sm print:shadow-none ml-auto">
        <div class="flex justify-between text-xs mb-1 text-gray-700 print:text-black">
          <span>Total Pesanan:</span>
          <span class="font-bold">Rp{{ formatRp(totalBayar) }}</span>
        </div>

        <!-- ROW ONGKIR: Sembunyi saat di-print jika tidak ada Ongkir (0) -->
        <div class="flex justify-between items-center text-xs mb-1 text-gray-700 print:text-black" 
             :class="{'print:hidden': !form.ongkir || form.ongkir === 0}">
          <span>Ongkos Kirim:</span>
          <input type="number" v-model.number="form.ongkir" @wheel="$event.target.blur()" class="w-24 text-right font-bold outline-none bg-white border border-gray-300 print:border-none print:bg-transparent rounded px-1 hide-arrows" />
        </div>
        
        <!-- ROW DP: Sembunyi saat di-print jika tidak ada DP (0) -->
        <div class="flex justify-between items-center text-xs mb-1 text-gray-700 print:text-black" 
             :class="{'print:hidden': !form.uang_muka || form.uang_muka === 0}">
          <span>Uang Muka (DP):</span>
          <input type="number" v-model.number="form.uang_muka" @wheel="$event.target.blur()" class="w-24 text-right font-bold outline-none bg-white border border-gray-300 print:border-none print:bg-transparent rounded px-1 hide-arrows" />
        </div>
        
        <!-- ROW VOUCHER: Sembunyi saat di-print jika tidak ada Voucher (0) -->
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
}
input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.hide-arrows::-webkit-outer-spin-button, .hide-arrows::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
tbody tr:nth-child(even) { background-color: #f9fafb; }
</style>