<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import logoTiara from '../assets/logo_tiara.png'

const route = useRoute()
const router = useRouter()

const daftarToko = ref([])
const items = ref([]) 
const isEdit = ref(false)
const role = ref(localStorage.getItem('admin_role') || '')
const isPrintPabrik = ref(true)

const getTanggalWIB = () => {
  const date = new Date()
  return date.toLocaleString('en-CA', { 
    timeZone: 'Asia/Jakarta', 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  })
}

const form = ref({
  no_nota: '',
  toko_id: null,
  tanggal_kirim: getTanggalWIB(),
  assigned_to: 0,
  status: 'KIRIM'
})

const profil = ref({ Alamat: '', NoTelp: '', NoHP: '' })

const fetchProfil = async () => {
  const token = localStorage.getItem('admin_token')
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/profil`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (res.ok) {
    profil.value = await res.json()
  }
}

// Dropdown Pintar: Gabungan Status & Penugasan
const penugasanDanStatus = computed({
  get() {
    if (form.value.status === 'SELESAI') return 'SELESAI'
    return form.value.assigned_to
  },
  set(val) {
    if (val === 'SELESAI') {
      form.value.status = 'SELESAI'
      form.value.assigned_to = 0
    } else {
      form.value.status = 'KIRIM'
      form.value.assigned_to = Number(val)
    }
  }
})

// LOGIKA FORM

const generateNoNota = async () => {
  if (isEdit.value) return 

  // Jika belum pilih mitra, kosongkan nomornya
  if (!form.value.toko_id) {
    form.value.no_nota = ''
    return
  }

  try {
    const token = localStorage.getItem('admin_token')
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/notas/next-number?toko_id=${form.value.toko_id}&tanggal=${form.value.tanggal_kirim}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    if (res.ok) {
      const data = await res.json()
      form.value.no_nota = data.no_nota // Otomatis terisi dari Backend!
    }
  } catch (e) {
    console.error("Gagal generate no nota otomatis", e)
  }
}

const resetForm = () => {
  form.value = {
    no_nota: '',
    toko_id: null,
    tanggal_kirim: getTanggalWIB()
  }
  items.value.forEach(item => {
    item.banyak_kirim = 0
    item.banyak_retur = 0
  })
}

// DATA FETCHING DATA

const fetchData = async () => {
  try {
    // 1. Ambil token dari penyimpanan browser
    const token = localStorage.getItem('admin_token')

    // 2. Buat konfigurasi header pembawa token
    const requestOptions = {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // Token disisipkan di sini
      }
    }

    // 3. Tembak API Toko dan Barang menggunakan opsi header di atas (pastikan URL pakai /api/)
    const resToko = await fetch(`${import.meta.env.VITE_API_URL}/api/tokos`, requestOptions)
    // Cek jika token tidak valid / kedaluwarsa
    if (!resToko.ok) throw new Error("Akses ditolak atau sesi habis")
    daftarToko.value = await resToko.json()

    const resBarang = await fetch(`${import.meta.env.VITE_API_URL}/api/barangs`, requestOptions)
    if (!resBarang.ok) throw new Error("Akses ditolak atau sesi habis")
    const barangs = await resBarang.json()
    
    items.value = barangs.map(b => ({
      barang_id: b.ID,
      nama_barang: b.NamaBarang,
      harga_barang: b.HargaDefault,
      banyak_kirim: 0,
      banyak_retur: 0,
      detail_id: null
    }))
  } catch (e) {
    console.error("Gagal load data master:", e.message)
  }
}
onMounted(async () => {
  // 1. Ambil semua data master (ini akan mengambil harga terbaru)
  await fetchProfil()
  await fetchData()
  await fetchSales()

  if (route.query.toko_id && !route.query.edit) {
    form.value.toko_id = Number(route.query.toko_id)
    generateNoNota()
  }
  
  if (route.query.edit) {
    isEdit.value = true
    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/notas/${route.query.edit}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const notaLama = await res.json()
      
      form.value = {
        no_nota: notaLama.NoNota,
        toko_id: notaLama.TokoID,
        tanggal_kirim: notaLama.TanggalKirim.split('T')[0],
        assigned_to: notaLama.assigned_to,
        status: notaLama.Status || 'KIRIM'
      }

      // 2. LOGIKA KRUSIAL: Filter & Kunci Data
      // Hanya ingin menampilkan barang yang ada di nota lama ini.
      // PAKSA harganya pakai harga snapshot.
      const detailIds = notaLama.Details.map(d => d.BarangID)

      const isTokoHarian = (notaLama.SiklusSnapshot === 'HARIAN')
      
      items.value = items.value
        // Toko harian akan mem-bypass filter ini sehingga SEMUA barang tampil
        .map(item => {
          const d = notaLama.Details.find(det => det.BarangID === item.barang_id)
          return {
            ...item,
            detail_id: d ? d.ID : null,
            banyak_kirim: d ? d.BanyakKirim : 0,
            banyak_retur: d ? d.BanyakRetur : 0,
            harga_barang: d ? d.HargaJual : item.harga_barang, // PAKSA: Gunakan harga snapshot dari database, bukan harga master saat ini
            nama_barang: d ? d.NamaBarangSnapshot : item.nama_barang // PAKSA: Gunakan nama snapshot agar sejarah tidak berubah jika nama diedit
          }
        })

      // Urutkan berdasarkan ID agar posisinya tidak berubah-ubah
      items.value.sort((a, b) => a.barang_id - b.barang_id)

    } catch (e) {
      console.error("Gagal sinkronisasi data sejarah:", e)
    }
  }
})

// COMPUTED PROPERTIES
const totalKirim = computed(() => items.value.reduce((acc, i) => acc + (i.banyak_kirim * i.harga_barang), 0))
const totalRetur = computed(() => items.value.reduce((acc, i) => acc + (i.banyak_retur * i.harga_barang), 0))
const totalBayar = computed(() => totalKirim.value - totalRetur.value)

// ACTIONS
const simpanData = async () => {
  if (!form.value.toko_id) {
    alert("Pilih Mitra terlebih dahulu!");
    return;
  }
  
  if (!form.value.no_nota || form.value.no_nota === "") {
    alert("Nomor nota kosong! Coba ganti pilihan Mitra untuk generate ulang.");
    return;
  }

  const payload = {
    no_nota: String(form.value.no_nota),
    toko_id: Number(form.value.toko_id),
    tanggal_kirim: form.value.tanggal_kirim,
    assigned_to: Number(form.value.assigned_to || 0),
    status: form.value.status,
    details: items.value
      .filter(i => i.banyak_kirim > 0 || i.banyak_retur > 0)
      .map(i => ({
        id: i.detail_id ? Number(i.detail_id) : 0,
        barang_id: Number(i.barang_id),
        banyak_kirim: Number(i.banyak_kirim || 0),
        banyak_retur: Number(i.banyak_retur || 0),
        harga_jual: Number(i.harga_barang)
      }))
  };

  const url = isEdit.value 
    ? `${import.meta.env.VITE_API_URL}/api/notas/${route.query.edit}` 
    : `${import.meta.env.VITE_API_URL}/api/notas`;
  
  const method = isEdit.value ? 'PUT' : 'POST';
  const token = localStorage.getItem('admin_token') // AMBIL TOKEN

  try {
    const res = await fetch(url, {
      method: method,
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // SISIPKAN TOKEN
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      alert(isEdit.value ? "Retur Berhasil Diupdate!" : "Nota Berhasil Disimpan!");
      if (isEdit.value) {
        router.push('/daftar-nota');
      } else {
        resetForm();
      }
    } else {
      const err = await res.json();
      alert("Gagal simpan: " + (err.error || "Cek terminal Go kamu!"));
    }
  } catch (e) {
    alert("Server Backend (Go) tidak merespons!");
  }
}

watch(totalRetur, (nilaiReturBaru) => {
  if (nilaiReturBaru > 0) {
    // Jika ada retur, otomatis hilangkan centang (biar angka retur tercetak)
    isPrintPabrik.value = false 
  } else {
    // Jika retur kosong, otomatis centang (biar kolom retur tercetak kosong untuk ditulis tangan)
    isPrintPabrik.value = true  
  }
})

const daftarSales = ref([])

const fetchSales = async () => {
  const token = localStorage.getItem('admin_token')
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admins`, { // Asumsi ada API daftar admin
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (res.ok) {
    const admins = await res.json()
    daftarSales.value = admins.filter(a => a.Role === 'sales')
  }
}

const cetakPDF = () => {
  window.print()
}
</script>

<template>
  <div class="nota-container p-8 max-w-5xl mx-auto bg-white shadow-lg my-4 border border-gray-200 rounded">
    
    <div class="flex justify-between items-start mb-6 print:mb-2 border-b-2 pb-4 print:pb-2">
      
      <div class="flex flex-col items-start gap-1 flex-1">
        <div class="shrink-0">
          <img :src="logoTiara" alt="Logo" class="w-48 max-h-24 object-contain print:hidden" />
          <img :src="logoTiara" alt="Logo" class="w-48 max-h-24 object-contain hidden print:block" style="filter: grayscale(100%);" />
        </div>
        <div class="profile-perusahaan mt-1">
          <p class="text-[12px] md:text-sm text-gray-800 font-bold leading-tight">
            {{ profil.Alamat }}
          </p>
          <p class="text-[11px] text-gray-600 font-medium mt-1 print:mt-0">
            <span v-if="profil.NoTelp">Telp: {{ profil.NoTelp }}</span>
            <span v-if="profil.NoTelp && profil.NoHP" class="mx-1">|</span>
            <span v-if="profil.NoHP">HP/WA: {{ profil.NoHP }}</span>
          </p>
        </div>
      </div>

      <div class="info-nota text-right shrink-0">
        <h2 class="text-xl font-bold mb-2 print:mb-1 bg-blue-900 text-white px-2 inline-block">NOTA PENGIRIMAN</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-1 text-sm print:text-xs mt-1">
          <span class="font-semibold text-left">Tanggal:</span>
          <input type="date" v-model="form.tanggal_kirim" @change="generateNoNota" class="border rounded px-1 print:border-none print:p-0" />
          
          <span class="font-semibold text-left">Mitra:</span>
          <select v-model="form.toko_id" @change="generateNoNota" class="border rounded px-1 print:border-none print:p-0 print:appearance-none" :disabled="isEdit">
            <option :value="null" disabled>Pilih Mitra</option>
            <option v-for="t in daftarToko" :key="t.ID" :value="t.ID">{{ t.NamaToko }}</option>
          </select>
          
          <span class="font-semibold text-left">No. Nota:</span>
          <input 
            v-model="form.no_nota" 
            class="border rounded px-1 font-mono text-[10px] bg-gray-50 print:bg-transparent w-full print:border-none print:p-0" 
            placeholder="Otomatis..."
            readonly
          />
          <template v-if="role === 'superadmin'">
            <span class="font-semibold text-left text-orange-600 print:hidden">Status / Tugas:</span>
            <select 
              v-model="penugasanDanStatus" 
              class="border rounded px-1 border-orange-400 bg-orange-50 print:hidden font-bold"
            >
              <option :value="0">-- Belum Ditugaskan --</option>
              <option v-for="s in daftarSales" :key="s.ID" :value="s.ID">
                Tugaskan: {{ s.Username }}
              </option>
              <option value="SELESAI" class="bg-green-100 text-green-800">✅ SELESAI</option>
            </select>
          </template>
        </div>
      </div>
    </div>

    <div class="overflow-x-auto w-full mb-6">
      <table class="w-full border-collapse border border-gray-400 text-sm">
        <thead class="bg-gray-100">
          <tr class="uppercase text-[11px]">
            <th class="border border-gray-400 p-2 text-left">Nama Barang</th>
            <th class="border border-gray-400 p-2 w-24">Harga</th>
            <th class="border border-gray-400 p-2 w-16">Kirim</th>
            <th class="border border-gray-400 p-2 w-28">Kirim (Rp)</th>
            <th class="border border-gray-400 p-2 w-16 bg-red-50 text-red-700">Retur</th>
            <th class="border border-gray-400 p-2 w-28 bg-red-50 text-red-700">Retur (Rp)</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.barang_id" class="hover:bg-gray-50 border-b border-gray-300 print-row" :class="{'print:hidden': item.banyak_kirim === 0 && item.banyak_retur === 0}">
            <td class="border border-gray-400 p-2 font-medium">{{ item.nama_barang }}</td>
            <td class="border border-gray-400 p-2 text-right">Rp{{ item.harga_barang.toLocaleString() }}</td>
            <td class="border border-gray-400 p-2">
              <input type="number" v-model.number="item.banyak_kirim" :readonly="isEdit" class="w-full text-center outline-none focus:bg-blue-100" />
            </td>
            <td class="border border-gray-400 p-2 text-right font-bold text-blue-800">
              {{ (item.banyak_kirim * item.harga_barang).toLocaleString() }}
            </td>
            <td class="border border-gray-400 p-2 bg-red-50">
              <input type="number" v-model.number="item.banyak_retur" class="w-full text-center outline-none bg-transparent focus:bg-red-100 text-red-700 font-bold" :class="{'print-transparent': isPrintPabrik}" />
            </td>
            <td class="border border-gray-400 p-2 text-right font-bold bg-red-50 text-red-700">
              <span :class="{'print-transparent': isPrintPabrik}">
                {{ (item.banyak_retur * item.harga_barang).toLocaleString() }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

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

      <div class="w-48 bg-gray-50 print:bg-transparent p-2 rounded border border-gray-400 shadow-sm print:shadow-none">
        <div class="flex justify-between text-[10px] mb-1 text-gray-700 print:text-black">
          <span>Total Kirim:</span>
          <span class="font-bold">Rp{{ totalKirim.toLocaleString() }}</span>
        </div>
        <div class="flex justify-between text-[10px] mb-1.5 text-red-700 print:text-black border-b border-gray-300 pb-1">
          <span>Total Retur:</span>
          <span class="font-bold" :class="{'print-transparent': isPrintPabrik}">(Rp{{ totalRetur.toLocaleString() }})</span>
        </div>
        <div class="flex justify-between font-black text-sm text-blue-900 print:text-black mt-1.5">
          <span>TOTAL:</span>
          <span :class="{'print-transparent': isPrintPabrik}">Rp{{ totalBayar.toLocaleString() }}</span>
        </div>
      </div>
      
    </div>

    <div class="mt-8 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 print:hidden">
      
      <label class="flex items-center gap-2 cursor-pointer bg-blue-50 text-blue-800 px-4 py-3 md:py-2 rounded border border-blue-200 font-bold text-sm shadow-sm hover:bg-blue-100 transition">
        <input type="checkbox" v-model="isPrintPabrik" class="w-5 h-5 accent-blue-600 cursor-pointer" />
        🖨️ Mode Print Pabrik (Kosongkan Angka Retur)
      </label>

      <div class="flex flex-col md:flex-row gap-3">
        <button @click="simpanData" class="justify-center bg-green-600 hover:bg-green-700 text-white px-6 py-3 md:py-2 rounded shadow font-bold transition flex items-center gap-2">
          <span>💾</span> {{ isEdit ? 'UPDATE RETUR' : 'SIMPAN NOTA' }}
        </button>
        <button @click="cetakPDF" class="justify-center bg-gray-800 hover:bg-black text-white px-6 py-3 md:py-2 rounded shadow font-bold transition flex items-center gap-2">
          <span>🖨️</span> EXPORT PDF
        </button>
      </div>
    </div>

    <!-- <div class="mt-8 flex flex-col md:flex-row justify-between items-center no-print">
      <label class="flex items-center gap-2 cursor-pointer bg-blue-50 text-blue-800 px-4 py-2 rounded border border-blue-200 font-bold text-sm shadow-sm hover:bg-blue-100 transition">
        <input type="checkbox" v-model="isPrintPabrik" class="w-5 h-5 accent-blue-600 cursor-pointer" />
        🖨️ Mode Print Pabrik (Kosongkan Angka Retur)
      </label>

      <div class="flex gap-3">
        <button @click="simpanData" class="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded shadow font-bold transition flex items-center gap-2">
          <span>💾</span> {{ isEdit ? 'UPDATE RETUR' : 'SIMPAN NOTA' }}
        </button>
        <button @click="cetakPDF" class="bg-gray-800 hover:bg-black text-white px-6 py-2 rounded shadow font-bold transition flex items-center gap-2">
          <span>🖨️</span> EXPORT PDF
        </button>
      </div>
    </div> -->
  </div>
</template>

<style scoped>
@media print {
  @page { 
    size: B5 portrait; 
    margin: 0; 
  }

  body { 
    margin: 0;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .overflow-x-auto {
    overflow: visible !important;
  }

  .nota-container { 
    box-shadow: none !important; 
    border: none !important; 
    margin: 0 auto !important; 
    padding: 10mm !important;
    width: 100% !important; 
    max-width: none !important; 
  }

  input, select { 
    border: none !important; 
    background: transparent !important; 
    outline: none !important;
    appearance: none;
    -webkit-appearance: none;
  }


  .print-transparent {
    color: transparent !important;
  }

  .print-row td {
    padding-top: 2px !important;
    padding-bottom: 2px !important;
    line-height: 1 !important;
    font-size: 11px !important; 
  }
}

input::-webkit-outer-spin-button, 
input::-webkit-inner-spin-button { 
  -webkit-appearance: none; 
  margin: 0; 
}

/* --- TAMBAHAN BARU: Warna selang-seling (zebra) agar mata tidak lelah di layar --- */
tbody tr:nth-child(even) {
  background-color: #f9fafb;
}
</style>