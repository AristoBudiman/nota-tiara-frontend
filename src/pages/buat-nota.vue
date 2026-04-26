<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const daftarToko = ref([])
const items = ref([]) 
const isEdit = ref(false)

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
  tanggal_kirim: getTanggalWIB()
})

// --- LOGIKA FORM ---

const generateNoNota = () => {
  if (isEdit.value) return 

  const tglInput = form.value.tanggal_kirim || getTanggalWIB()
  const tgl = tglInput.replace(/-/g, '');
  
  const random = Math.floor(100 + Math.random() * 900);
  const detik = new Date().getSeconds();
  
  const idToko = form.value.toko_id || '0';
  
  // Memberi nilai ke form.value.no_nota
  form.value.no_nota = `NT/${tgl}/${idToko}-${random}${detik}`;
  console.log("Nomor Nota Baru Ter-generate:", form.value.no_nota);
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

// --- DATA FETCHING ---

const fetchData = async () => {
  try {
    // 1. Ambil token dari penyimpanan browser
    const token = localStorage.getItem('admin_token')

    // 2. Buat konfigurasi header pembawa karcis (token)
    const requestOptions = {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // <--- Token disisipkan di sini
      }
    }

    // 3. Tembak API menggunakan opsi header di atas (pastikan URL pakai /api/)
    const resToko = await fetch('http://localhost:3000/api/tokos', requestOptions)
    // Cek jika token tidak valid / kedaluwarsa
    if (!resToko.ok) throw new Error("Akses ditolak atau sesi habis")
    daftarToko.value = await resToko.json()

    // 4. Lakukan hal yang sama untuk data barang
    const resBarang = await fetch('http://localhost:3000/api/barangs', requestOptions)
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
    // Opsional: Kalau error karena token, otomatis lempar ke halaman login
    // router.push('/login')
  }
}
onMounted(async () => {
  // 1. Ambil semua data master (ini akan mengambil harga terbaru)
  await fetchData()
  
  if (route.query.edit) {
    isEdit.value = true
    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch(`http://localhost:3000/api/notas/${route.query.edit}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const notaLama = await res.json()
      
      form.value = {
        no_nota: notaLama.NoNota,
        toko_id: notaLama.TokoID,
        tanggal_kirim: notaLama.TanggalKirim.split('T')[0]
      }

      // 2. LOGIKA KRUSIAL: Filter & Kunci Data
      // Kita hanya ingin menampilkan barang yang ADA di nota lama ini.
      // Dan kita harus PAKSA harganya pakai harga snapshot.
      const detailIds = notaLama.Details.map(d => d.BarangID)

      const isTokoHarian = (notaLama.SiklusSnapshot === 'HARIAN')
      
      items.value = items.value
        // Toko harian akan mem-bypass filter ini sehingga SEMUA barang tampil
        .filter(item => isTokoHarian || detailIds.includes(item.barang_id))
        // .filter(item => detailIds.includes(item.barang_id)) Sembunyikan barang baru yang tidak ada di nota ini
        .map(item => {
          const d = notaLama.Details.find(det => det.BarangID === item.barang_id)
          return {
            ...item,
            detail_id: d ? d.ID : null,
            banyak_kirim: d ? d.BanyakKirim : 0,
            banyak_retur: d ? d.BanyakRetur : 0,
            // PAKSA: Gunakan harga snapshot dari database, bukan harga master saat ini
            harga_barang: d ? d.HargaJual : item.harga_barang, 
            // PAKSA: Gunakan nama snapshot agar sejarah tidak berubah jika nama diedit
            nama_barang: d ? d.NamaBarangSnapshot : item.nama_barang
          }
        })

      // Urutkan berdasarkan ID agar posisinya tidak berubah-ubah
      items.value.sort((a, b) => a.barang_id - b.barang_id)

    } catch (e) {
      console.error("Gagal sinkronisasi data sejarah:", e)
    }
  }
})

// --- COMPUTED PROPERTIES ---

const totalKirim = computed(() => items.value.reduce((acc, i) => acc + (i.banyak_kirim * i.harga_barang), 0))
const totalRetur = computed(() => items.value.reduce((acc, i) => acc + (i.banyak_retur * i.harga_barang), 0))
const totalBayar = computed(() => totalKirim.value - totalRetur.value)

// --- ACTIONS ---

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
    ? `http://localhost:3000/api/notas/${route.query.edit}` 
    : 'http://localhost:3000/api/notas';
  
  const method = isEdit.value ? 'PUT' : 'POST';
  const token = localStorage.getItem('admin_token') // <-- AMBIL TOKEN

  try {
    const res = await fetch(url, {
      method: method,
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // <-- SISIPKAN TOKEN
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

const cetakPDF = () => {
  window.print()
}
</script>

<template>
  <div class="nota-container p-8 max-w-5xl mx-auto bg-white shadow-lg my-4 border border-gray-200 rounded">
    
    <div class="flex justify-between items-start mb-8 border-b-2 pb-4">
      <div class="profile-perusahaan">
        <h1 class="text-3xl font-black text-blue-900">TIARA NOTA</h1>
        <p class="font-bold text-gray-700">Distributor Sembako & Alat Jahit</p>
        <p class="text-xs text-gray-500 italic">Jl. Slamet Riyadi No. 10, Surakarta | 0812-3456-7890</p>
      </div>

      <div class="info-nota text-right">
        <h2 class="text-xl font-bold mb-2 bg-blue-900 text-white px-2 inline-block">NOTA PENGIRIMAN</h2>
        <div class="grid grid-cols-2 gap-2 text-sm mt-2">
          <span class="font-semibold text-left">Tanggal:</span>
          <input type="date" v-model="form.tanggal_kirim" @change="generateNoNota" class="border rounded px-1" />
          
          <span class="font-semibold text-left">Mitra:</span>
          <select v-model="form.toko_id" @change="generateNoNota" class="border rounded px-1" :disabled="isEdit">
            <option :value="null" disabled>Pilih Mitra</option>
            <option v-for="t in daftarToko" :key="t.ID" :value="t.ID">{{ t.NamaToko }}</option>
          </select>
          
          <span class="font-semibold text-left">No. Nota:</span>
          <input 
            v-model="form.no_nota" 
            class="border rounded px-1 font-mono text-[10px] bg-gray-50 w-full" 
            placeholder="Otomatis..."
            readonly
          />
        </div>
      </div>
    </div>

    <table class="w-full border-collapse border border-gray-400 text-sm">
      <thead class="bg-gray-100">
        <tr class="uppercase text-[11px]">
          <th class="border border-gray-400 p-2 text-left">Nama Barang</th>
          <th class="border border-gray-400 p-2 w-24">Harga</th>
          <th class="border border-gray-400 p-2 w-16">Kirim</th>
          <th class="border border-gray-400 p-2 w-28">Subtotal K</th>
          <th class="border border-gray-400 p-2 w-16 bg-red-50 text-red-700">Retur</th>
          <th class="border border-gray-400 p-2 w-28 bg-red-50 text-red-700">Subtotal R</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.barang_id" class="hover:bg-gray-50" :class="{'print:hidden': item.banyak_kirim === 0 && item.banyak_retur === 0}">
          <td class="border border-gray-400 p-2 font-medium">{{ item.nama_barang }}</td>
          <td class="border border-gray-400 p-2 text-right">Rp{{ item.harga_barang.toLocaleString() }}</td>
          <td class="border border-gray-400 p-2">
            <input type="number" v-model.number="item.banyak_kirim" :readonly="isEdit" class="w-full text-center outline-none focus:bg-blue-100" />
          </td>
          <td class="border border-gray-400 p-2 text-right font-bold text-blue-800">
            {{ (item.banyak_kirim * item.harga_barang).toLocaleString() }}
          </td>
          <td class="border border-gray-400 p-2 bg-red-50">
            <input type="number" v-model.number="item.banyak_retur" class="w-full text-center outline-none bg-transparent focus:bg-red-100 text-red-700 font-bold" />
          </td>
          <td class="border border-gray-400 p-2 text-right font-bold bg-red-50 text-red-700">
            {{ (item.banyak_retur * item.harga_barang).toLocaleString() }}
          </td>
        </tr>
      </tbody>
    </table>

    <div class="mt-6 flex justify-between items-end">
      <div class="signature-area hidden-print flex gap-8 text-xs">
        <div class="text-center w-32">
          <p>Tanda Terima,</p>
          <div class="h-12"></div>
          <p class="border-t border-black">( .................... )</p>
        </div>
        <div class="text-center w-32">
          <p>Hormat Kami,</p>
          <div class="h-12"></div>
          <p class="border-t border-black">( Aristo Budiman )</p>
        </div>
      </div>

      <div class="w-72 bg-gray-50 p-3 rounded border border-gray-300 shadow-sm">
        <div class="flex justify-between text-xs mb-1">
          <span>Total Kirim:</span>
          <span>Rp{{ totalKirim.toLocaleString() }}</span>
        </div>
        <div class="flex justify-between text-xs mb-2 text-red-600 border-b pb-1">
          <span>Total Retur:</span>
          <span>(Rp{{ totalRetur.toLocaleString() }})</span>
        </div>
        <div class="flex justify-between font-black text-lg text-blue-900 mt-1">
          <span>TOTAL:</span>
          <span>Rp{{ totalBayar.toLocaleString() }}</span>
        </div>
      </div>
    </div>

    <div class="mt-8 flex justify-end gap-3 no-print">
      <button @click="simpanData" class="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded shadow font-bold transition flex items-center gap-2">
        <span>💾</span> {{ isEdit ? 'UPDATE RETUR' : 'SIMPAN NOTA' }}
      </button>
      <button @click="cetakPDF" class="bg-gray-800 hover:bg-black text-white px-6 py-2 rounded shadow font-bold transition flex items-center gap-2">
        <span>🖨️</span> EXPORT PDF
      </button>
    </div>
  </div>
</template>

<style scoped>
@media print {
  .no-print { display: none !important; }
  .hidden-print { display: flex !important; }
  .nota-container { box-shadow: none !important; border: none !important; margin: 0 !important; width: 100% !important; max-width: 100% !important; }
  input, select { border: none !important; appearance: none; -webkit-appearance: none; background: transparent !important; }
}
input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
</style>