<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Save, Printer, Receipt } from 'lucide-vue-next'
import logoTiara from '../assets/logo_tiara.png'

const route = useRoute()
const router = useRouter()

const daftarToko = ref([])
const items = ref([]) 
const isEdit = ref(false)
const role = ref(localStorage.getItem('admin_role') || '')
const isPrintPabrik = ref(true)

const checkAuthError = (res) => {
  if (res.status === 401 || res.status === 403) {
    window.$dialog?.alert("Sesi habis atau Akses Ditolak!")
    localStorage.clear()
    router.push('/login')
    return true
  }
  return false
}

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
  status: 'KIRIM',
  is_lunas: false,
  total_diskon: 0,
  total_voucher: 0
})

const profil = ref({ Alamat: '', NoTelp: '', NoHP: '' })

const fetchProfil = async () => {
  const token = localStorage.getItem('admin_token')
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/profil`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (checkAuthError(res)) return
  if (res.ok) {
    profil.value = await res.json()
  }
}

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

const generateNoNota = async () => {
  if (isEdit.value) return 

  if (!form.value.toko_id) {
    form.value.no_nota = ''
    return
  }

  try {
    const token = localStorage.getItem('admin_token')
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/notas/next-number?toko_id=${form.value.toko_id}&tanggal=${form.value.tanggal_kirim}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (checkAuthError(res)) return
    
    if (res.ok) {
      const data = await res.json()
      form.value.no_nota = data.no_nota
    }
  } catch (e) {
    console.error("Gagal generate no nota otomatis", e)
  }
}

const resetForm = () => {
  form.value = {
    no_nota: '',
    toko_id: null,
    tanggal_kirim: getTanggalWIB(),
    assigned_to: 0,
    status: 'KIRIM',
    is_lunas: false,
    total_diskon: 0,
    total_voucher: 0
  }
  items.value.forEach(item => {
    item.banyak_kirim = 0
    item.banyak_retur = 0
  })
}

const fetchData = async () => {
  try {
    const token = localStorage.getItem('admin_token')
    const requestOptions = {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      }
    }

    const resToko = await fetch(`${import.meta.env.VITE_API_URL}/api/tokos`, requestOptions)
    if (checkAuthError(resToko)) return
    if (!resToko.ok) throw new Error("Akses ditolak atau sesi habis")
    daftarToko.value = await resToko.json()

    const resBarang = await fetch(`${import.meta.env.VITE_API_URL}/api/barangs`, requestOptions)
    if (checkAuthError(resBarang)) return
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
      if (checkAuthError(res)) return
      const notaLama = await res.json()
      
      form.value = {
        no_nota: notaLama.NoNota,
        toko_id: notaLama.TokoID,
        tanggal_kirim: notaLama.TanggalKirim.split('T')[0],
        assigned_to: notaLama.assigned_to,
        status: notaLama.Status || 'KIRIM',
        is_lunas: notaLama.is_lunas || false,
        total_diskon: notaLama.total_diskon || 0,
        total_voucher: notaLama.total_voucher || 0
      }

      // 2. LOGIKA KRUSIAL: Filter & Kunci Data
      // Hanya ingin menampilkan barang yang ada di nota lama ini.
      // PAKSA harganya pakai harga snapshot.
      // const detailIds = notaLama.Details.map(d => d.BarangID)
      // const tampilSemuaBarang = (notaLama.SiklusSnapshot === 'HARIAN' || notaLama.SiklusSnapshot === 'SiklusDua')
      
      // items.value = items.value
      //   // Toko harian akan mem-bypass filter ini sehingga SEMUA barang tampil
      //   .filter(item => tampilSemuaBarang || detailIds.includes(item.barang_id))
      //   .map(item => {
      //     const d = notaLama.Details.find(det => det.BarangID === item.barang_id || det.barang_id === item.barang_id)
      //     return {
      //       ...item,
      //       detail_id: d ? (d.ID || d.id) : null,
      //       banyak_kirim: d ? d.BanyakKirim : 0,
      //       banyak_retur: d ? d.BanyakRetur : 0,
      //       harga_barang: d ? d.HargaJual : item.harga_barang,
      //       nama_barang: d ? d.NamaBarangSnapshot : item.nama_barang
      //     }
      //   })
      // items.value.sort((a, b) => a.barang_id - b.barang_id)

      // 2. LOGIKA KRUSIAL: Sinkronisasi Data (Filter Dihapus)
      // Sekarang SEMUA barang akan selalu tampil agar bisa ditambah jika ada human error
      items.value = items.value.map(item => {
        const d = notaLama.Details.find(det => det.BarangID === item.barang_id || det.barang_id === item.barang_id)
        return {
          ...item,
          detail_id: d ? (d.ID || d.id) : null,
          banyak_kirim: d ? d.BanyakKirim : 0,
          banyak_retur: d ? d.BanyakRetur : 0,
          harga_barang: d ? d.HargaJual : item.harga_barang,
          nama_barang: d ? d.NamaBarangSnapshot : item.nama_barang
        }
      })
      items.value.sort((a, b) => a.barang_id - b.barang_id)
    } catch (e) {
      console.error("Gagal sinkronisasi data sejarah:", e)
    }
  }
})

const totalKirim = computed(() => items.value.reduce((acc, i) => acc + (i.banyak_kirim * i.harga_barang), 0))
const totalRetur = computed(() => items.value.reduce((acc, i) => acc + (i.banyak_retur * i.harga_barang), 0))
const totalBayar = computed(() => totalKirim.value - totalRetur.value - (form.value.total_diskon || 0) - (form.value.total_voucher || 0))

const simpanData = async () => {
  if (!form.value.toko_id) {
    window.$dialog?.alert("Pilih Mitra terlebih dahulu!");
    return;
  }
  
  if (!form.value.no_nota || form.value.no_nota === "") {
    window.$dialog?.alert("Nomor nota kosong! Coba ganti pilihan Mitra untuk generate ulang.");
    return;
  }

  const payload = {
    no_nota: String(form.value.no_nota),
    toko_id: Number(form.value.toko_id),
    tanggal_kirim: form.value.tanggal_kirim,
    assigned_to: Number(form.value.assigned_to || 0),
    status: form.value.status,
    is_lunas: form.value.is_lunas,
    total_diskon: Number(form.value.total_diskon || 0),
    total_voucher: Number(form.value.total_voucher || 0),
    details: items.value
      .filter(i => i.banyak_kirim > 0 || i.banyak_retur > 0 || i.detail_id)
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
  const token = localStorage.getItem('admin_token') 

  try {
    const res = await fetch(url, {
      method: method,
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    if (checkAuthError(res)) return

    if (res.ok) {
      window.$dialog?.alert(isEdit.value ? "Retur Berhasil Diupdate!" : "Nota Berhasil Disimpan!");
      if (isEdit.value) {
        router.push('/daftar-nota');
      } else {
        resetForm();
      }
    } else {
      const err = await res.json();
      window.$dialog?.alert("Gagal simpan: " + (err.error || "Cek terminal Go kamu!"));
    }
  } catch (e) {
    window.$dialog?.alert("Server Backend (Go) tidak merespons!");
  }
}

watch(totalRetur, (nilaiReturBaru) => {
  if (nilaiReturBaru > 0) isPrintPabrik.value = false 
  else isPrintPabrik.value = true  
})

const daftarSales = ref([])

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

const cetakPDF = () => { window.print() }
</script>

<template>
  <div class="nota-container p-4 md:p-8 max-w-5xl mx-auto my-4">
    <div class="bg-white shadow-sm border border-slate-200 rounded-2xl overflow-hidden print:shadow-none print:border-none print:rounded-none">
      
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
              <div class="hidden md:block print:hidden text-slate-400 text-xs font-medium">Rincian Nota Pengiriman</div>
              <div class="inline-flex items-center bg-blue-100 print:bg-slate-800 text-blue-800 print:text-white px-3 py-1.5 print:px-2.5 print:py-1 rounded-md ml-auto">
                <h2 class="text-sm font-black tracking-wide">NOTA PENGIRIMAN</h2>
              </div>
            </div>
            
            <div class="grid grid-cols-[90px_1fr] md:grid-cols-[90px_1fr_90px_1fr] lg:grid-cols-[90px_1fr_90px_1fr_90px_1fr] print:grid-cols-[75px_1fr] gap-x-4 print:gap-x-2 gap-y-3 print:gap-y-1.5 text-xs print:text-xs items-center">
              <span class="font-bold text-slate-600">Tanggal:</span>
              <input type="date" v-model="form.tanggal_kirim" @change="generateNoNota" class="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 font-bold text-slate-800 w-full focus:ring-1 focus:ring-blue-500 outline-none transition-all print:hidden" />
              <span class="hidden print:block font-bold text-slate-800">{{ form.tanggal_kirim.split('-').reverse().join('/') }}</span>
              
              <span class="font-bold text-slate-600 whitespace-nowrap">Mitra:</span>
              <div class="flex min-w-0 print:hidden w-full">
                <select v-model="form.toko_id" @change="generateNoNota" class="bg-slate-50 border border-slate-200 rounded px-2 py-1.5 font-bold text-slate-800 w-full focus:ring-1 focus:ring-blue-500 outline-none transition-all truncate" :disabled="isEdit">
                  <option :value="null" disabled>Pilih Mitra</option>
                  <option v-for="t in daftarToko" :key="t.ID" :value="t.ID">{{ t.NamaToko }}</option>
                </select>
              </div>
              <span class="hidden print:block font-bold text-slate-800 truncate">
                {{ daftarToko.find(t => t.ID === form.toko_id)?.NamaToko || '' }}
              </span>
              
              <span class="font-bold text-slate-600">No. Nota:</span>
              <input v-model="form.no_nota" class="bg-slate-100 border border-slate-200 rounded px-2.5 py-1.5 font-mono text-xs text-slate-600 print:bg-transparent w-full print:border-none print:p-0 font-bold" placeholder="Otomatis..." readonly />
              
              <template v-if="role === 'Superadmin'">
                <span class="font-bold text-orange-600 print:hidden whitespace-nowrap">Tugaskan:</span>
                <select v-model="penugasanDanStatus" class="bg-orange-50 border border-orange-200 rounded px-2.5 py-1.5 font-bold text-orange-800 w-full outline-none focus:ring-1 focus:ring-orange-500 print:hidden">
                  <option :value="0">-- Belum Ditugaskan--</option>
                  <option v-for="s in daftarSales" :key="s.id || s.ID" :value="s.id || s.ID">Ke: {{ s.username || s.Username }}</option>
                  <option value="SELESAI" class="bg-emerald-100 text-emerald-800">[SELESAI] FISIK SELESAI</option>
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
        <div class="rounded-xl border border-slate-200 overflow-hidden print:border-none min-w-[700px] md:min-w-full">
          <table class="w-full text-sm border-collapse">
            <thead class="bg-slate-800 text-white print:bg-transparent print:text-black print:border-y-2 print:border-slate-800">
              <tr class="tracking-wide">
                <th class="p-3 text-left font-bold">Nama Barang</th>
                <th class="p-3 w-28 text-right font-bold">Harga</th>
                <th class="p-3 w-20 text-center font-bold">Kirim</th>
                <th class="p-3 w-32 text-right font-bold text-blue-200 print:text-blue-800">Kirim (Rp)</th>
                <th class="p-3 w-20 text-center font-bold bg-slate-700 print:bg-transparent text-red-300 print:text-red-700 border-l border-slate-600 print:border-none">Retur</th>
                <th class="p-3 w-32 text-right font-bold bg-slate-700 print:bg-transparent text-red-300 print:text-red-700">Retur (Rp)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 print:divide-slate-400">
              <tr v-for="item in items" :key="item.barang_id" class="hover:bg-blue-50/50 even:bg-slate-50 transition-colors print:even:bg-transparent print-row" :class="{'print:hidden': item.banyak_kirim === 0 && item.banyak_retur === 0}">
                <td class="p-3 font-bold text-slate-800">{{ item.nama_barang }}</td>
                <td class="p-3 text-right text-slate-600 font-medium">Rp{{ item.harga_barang.toLocaleString() }}</td>
                <td class="p-2">
                  <input type="number" v-model.number="item.banyak_kirim" @wheel="$event.target.blur()" class="w-full px-2 text-center outline-none bg-white border border-slate-200 print:border-none print:bg-transparent rounded-lg py-1.5 font-black text-blue-900 focus:ring-2 focus:ring-blue-500 transition-shadow" />
                </td>
                <td class="p-3 text-right font-black text-blue-900 print:text-black">{{ (item.banyak_kirim * item.harga_barang).toLocaleString() }}</td>
                <td class="p-2 border-l border-slate-100 print:border-none">
                  <input type="number" v-model.number="item.banyak_retur" :readonly="!isEdit" @wheel="$event.target.blur()" class="w-full px-2 text-center outline-none bg-white border border-slate-200 print:border-none print:bg-transparent rounded-lg py-1.5 font-black text-red-600 focus:ring-2 focus:ring-red-500 transition-shadow" :class="{'print-transparent': isPrintPabrik}" />
                </td>
                <td class="p-3 text-right font-black text-red-600">
                  <span :class="{'print-transparent': isPrintPabrik}">{{ (item.banyak_retur * item.harga_barang).toLocaleString() }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
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
            <span>Total Kirim:</span>
            <span class="font-bold text-slate-800">Rp {{ totalKirim.toLocaleString() }}</span>
          </div>
          <div class="flex justify-between text-sm mb-4 pb-4 text-red-600 font-medium border-b border-slate-100 print:border-slate-800">
            <span>Total Retur:</span>
            <span class="font-bold" :class="{'print-transparent': isPrintPabrik}">(Rp {{ totalRetur.toLocaleString() }})</span>
          </div>
          
          <div v-if="isEdit && (form.total_diskon > 0 || !isPrintPabrik)" class="flex justify-between items-center text-sm mb-2 text-orange-600 print:text-black font-medium" 
               :class="{'print:hidden': !form.total_diskon || form.total_diskon === 0}">
            <span>Diskon (Rp):</span>
            <input type="number" v-model.number="form.total_diskon" @wheel="$event.target.blur()" class="w-28 print:w-20 text-right font-bold outline-none bg-slate-50 border border-slate-200 print:border-none print:bg-transparent rounded-lg py-1 px-2 focus:ring-2 focus:ring-blue-500 hide-arrows text-slate-800" />
          </div>
          
          <div v-if="isEdit && (form.total_voucher > 0 || !isPrintPabrik)" class="flex justify-between items-center text-sm mb-4 pb-4 border-b border-slate-100 print:border-slate-800 text-orange-600 print:text-black font-medium" 
               :class="{'print:hidden': !form.total_voucher || form.total_voucher === 0}">
            <span>Voucher (Rp):</span>
            <input type="number" v-model.number="form.total_voucher" @wheel="$event.target.blur()" class="w-28 print:w-20 text-right font-bold outline-none bg-slate-50 border border-slate-200 print:border-none print:bg-transparent rounded-lg py-1 px-2 focus:ring-2 focus:ring-blue-500 hide-arrows text-slate-800" />
          </div>

          <div class="p-4 bg-linear-to-br from-blue-600 to-blue-800 print:bg-transparent rounded-xl text-white print:text-black shadow-inner print:shadow-none print:p-0">
            <div class="flex justify-between items-center">
              <span class="font-black tracking-wide text-blue-100 print:text-slate-800">TOTAL</span>
              <span class="text-xl font-black drop-shadow-md print:drop-shadow-none" :class="{'print-transparent': isPrintPabrik}">
                Rp {{ totalBayar.toLocaleString() }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div> <!-- End Card Container -->

    <!-- ACTION BUTTONS -->
    <div class="mt-6 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 print:hidden">
      <label v-if="role === 'Superadmin'" class="flex items-center gap-2 font-bold text-slate-700 bg-white border border-slate-200 px-4 py-3 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors shadow-sm w-full md:w-auto">
        <input type="checkbox" v-model="isPrintPabrik" class="w-5 h-5 accent-blue-600 cursor-pointer rounded" />
        <Printer :size="18" class="text-slate-500" /> Mode Print Pabrik (Kosongkan Retur & Diskon)
      </label>

      <div class="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
        <button @click="simpanData" class="flex-1 sm:flex-none justify-center bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl shadow-lg shadow-blue-500/30 font-black tracking-wide transition-all active:scale-95 flex items-center gap-2">
          <Save :size="20" /> {{ isEdit ? 'UPDATE RETUR' : 'SIMPAN NOTA' }}
        </button>
        <button @click="cetakPDF" class="flex-1 sm:flex-none justify-center bg-slate-800 hover:bg-slate-900 text-white px-8 py-3.5 rounded-xl shadow-lg shadow-slate-500/30 font-black tracking-wide transition-all active:scale-95 flex items-center gap-2">
          <Printer :size="20" /> CETAK / PDF
        </button>
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
  .print-transparent { 
    visibility: hidden !important; 
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