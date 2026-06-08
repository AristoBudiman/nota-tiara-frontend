<script setup>
import { ref, onMounted, watch, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Store, Plus, X } from 'lucide-vue-next'

const router = useRouter()
const listToko = ref([])
const isEdit = ref(false)
const showModal = ref(false)

const selectedSiklus = ref('')
const form = ref({
  ID: null,
  NamaToko: '', 
  Alamat: '', 
  NoTelp: '',
  SiklusKamisSenin: false, 
  SiklusJumatSelasa: false, 
  SiklusSabtuRabu: false,
  IsHarian: false,
  SiklusDua: false
})

watch(selectedSiklus, (val) => {
  form.value.SiklusKamisSenin = (val === 'KamisSenin')
  form.value.SiklusJumatSelasa = (val === 'JumatSelasa')
  form.value.SiklusSabtuRabu = (val === 'SabtuRabu')
  form.value.IsHarian = (val === 'Harian')
  form.value.SiklusDua = (val === 'SiklusDua')
})

const checkAuthError = (res) => {
  if (res.status === 401 || res.status === 403) {
    alert("Sesi habis atau Akses Ditolak!")
    localStorage.clear()
    router.push('/login')
    return true
  }
  return false
}

const fetchToko = async () => {
  try {
    const token = localStorage.getItem('admin_token')
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/tokos`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
    if (checkAuthError(res)) return
    
    if (!res.ok) throw new Error("Akses ditolak")
    listToko.value = await res.json()
  } catch (err) {
    console.error("Gagal load toko:", err)
  }
}

const bukaModalTambah = () => {
  resetForm()
  showModal.value = true
}

const handleSubmit = async () => {
  const method = isEdit.value ? 'PUT' : 'POST'
  
  const url = isEdit.value 
    ? `${import.meta.env.VITE_API_URL}/api/tokos/${form.value.ID}` 
    : `${import.meta.env.VITE_API_URL}/api/tokos`

  // Wajib ambil token untuk operasi POST/PUT
  const token = localStorage.getItem('admin_token')

  try {
    const res = await fetch(url, {
      method: method,
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // SISIPKAN TOKEN DI SINI
      },
      body: JSON.stringify(form.value)
    })
    if (checkAuthError(res)) return

    if (!res.ok) throw new Error("Gagal menyimpan data")

    resetForm()
    showModal.value = false
    fetchToko()
  } catch (err) {
    console.error("Gagal simpan toko:", err.message)
    alert("Gagal simpan toko: " + err.message)
  }
}

const editToko = (toko) => {
  isEdit.value = true
  form.value = { ...toko }
  
  // Update UI Radio Button saat edit
  if (toko.SiklusKamisSenin) selectedSiklus.value = 'KamisSenin'
  else if (toko.SiklusJumatSelasa) selectedSiklus.value = 'JumatSelasa'
  else if (toko.SiklusSabtuRabu) selectedSiklus.value = 'SabtuRabu'
  else if (toko.IsHarian) selectedSiklus.value = 'Harian'
  else if (toko.SiklusDua) selectedSiklus.value = 'SiklusDua'
  else selectedSiklus.value = ''
  
  showModal.value = true
}

const hapusToko = async (id) => {
  if (confirm('Hapus toko ini? Data nota terkait mungkin akan terpengaruh.')) {
    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/tokos/${id}`, { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (checkAuthError(res)) return

      if (!res.ok) throw new Error("Gagal menghapus toko atau sesi habis")
      
      fetchToko()
    } catch (err) {
      console.error("Gagal hapus toko:", err.message)
    }
  }
}

const resetForm = () => {
  isEdit.value = false
  selectedSiklus.value = '' // Reset Radio Button
  form.value = {
    ID: null, NamaToko: '', Alamat: '', NoTelp: '',
    SiklusKamisSenin: false, SiklusJumatSelasa: false, SiklusSabtuRabu: false, IsHarian: false, SiklusDua: false
  }
}

watch(showModal, (isOpen) => {
  if (isOpen) document.body.style.overflow = 'hidden'
  else document.body.style.overflow = ''
})

onUnmounted(() => { document.body.style.overflow = '' })

onMounted(fetchToko)
</script>


<template>
  <div class="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between border-b-2 border-gray-200 pb-4 gap-4">
      <div>
        <h1 class="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-2"><Store :size="32" /> Master Toko</h1>
        <p class="text-sm text-gray-500 font-medium mt-1">Kelola data mitra toko dan jadwal siklus pengirimannya.</p>
      </div>
      <button @click="bukaModalTambah" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-colors flex items-center justify-center gap-2 shrink-0">
        <Plus :size="18" /> Buat Toko
      </button>
    </div>

    <!-- Tabel Data -->
    <div class="bg-white rounded-xl border border-gray-200 overflow-x-auto shadow-sm">
      <table class="w-full text-sm text-left min-w-[800px]">
        <thead class="bg-gray-800 text-white">
          <tr>
            <th class="p-4 uppercase tracking-wider font-bold">Nama Toko</th>
            <th class="p-4 uppercase tracking-wider font-bold">Jadwal Siklus</th>
            <th class="p-4 uppercase tracking-wider font-bold">Alamat & Telp</th>
            <th class="p-4 text-center uppercase tracking-wider font-bold w-32">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr v-for="toko in listToko" :key="toko.ID" class="hover:bg-gray-50 transition">
            <td class="p-4 font-bold text-gray-800">{{ toko.NamaToko }}</td>
            <td class="p-4">
              <div class="flex flex-wrap gap-1">
                <span v-if="toko.SiklusKamisSenin" class="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-[10px] font-bold border border-blue-200">KAMIS-SENIN</span>
                <span v-if="toko.SiklusJumatSelasa" class="bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-[10px] font-bold border border-green-200">JUMAT-SELASA</span>
                <span v-if="toko.SiklusSabtuRabu" class="bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full text-[10px] font-bold border border-purple-200">SABTU-RABU</span>
                <span v-if="toko.SiklusDua" class="bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full text-[10px] font-bold border border-indigo-200">SIKLUS DUA</span>
                <span v-if="toko.IsHarian" class="bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full text-[10px] font-bold border border-orange-200">HARIAN</span>
              </div>
            </td>
            <td class="p-4 text-gray-600 max-w-xs truncate">
                <div class="font-medium text-xs text-gray-900">{{ toko.NoTelp || '-' }}</div>
                <div class="truncate text-gray-500 mt-0.5" :title="toko.Alamat">{{ toko.Alamat || '-' }}</div>
            </td>
            <td class="p-4">
              <div class="flex justify-center gap-3">
                <button @click="editToko(toko)" class="text-blue-600 hover:text-blue-800 font-bold bg-blue-50 px-3 py-1.5 rounded transition-colors">Edit</button>
                <button @click="hapusToko(toko.ID)" class="text-red-600 hover:text-red-800 font-bold bg-red-50 px-3 py-1.5 rounded transition-colors">Hapus</button>
              </div>
            </td>
          </tr>
          <tr v-if="listToko.length === 0">
            <td colspan="4" class="p-10 text-center text-gray-400 font-medium">Belum ada data toko.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Form -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0 bg-slate-900/50 backdrop-blur-sm">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
        
        <!-- Modal Header -->
        <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
          <h2 class="text-xl font-black text-gray-800 flex items-center gap-2">
            <Store :size="24" class="text-blue-600" />
            {{ isEdit ? 'Edit Data Toko' : 'Tambah Toko Baru' }}
          </h2>
          <button @click="showModal = false" class="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50">
            <X :size="24" />
          </button>
        </div>
        
        <!-- Modal Body (Scrollable) -->
        <div class="p-6 overflow-y-auto custom-scrollbar flex-1">
          <form id="tokoForm" @submit.prevent="handleSubmit" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1.5">Nama Toko</label>
                    <input v-model="form.NamaToko" type="text" required 
                    class="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-800" 
                    placeholder="Contoh: Toko Berkah">
                </div>
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1.5">Nomor Telepon</label>
                    <input v-model="form.NoTelp" type="text" 
                    class="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-800" 
                    placeholder="Contoh: 08123456789">
                </div>
            </div>

            <div>
                <label class="block text-sm font-bold text-gray-700 mb-1.5">Alamat</label>
                <textarea v-model="form.Alamat" rows="2"
                class="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-800 resize-none" 
                placeholder="Alamat lengkap toko..."></textarea>
            </div>

            <div class="bg-blue-50/50 p-5 rounded-xl border border-blue-100">
              <label class="block text-xs font-black text-blue-900 mb-3 uppercase tracking-wider">Pengaturan Siklus Harian</label>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label class="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition-all shadow-sm">
                  <input type="radio" v-model="selectedSiklus" value="KamisSenin" class="w-5 h-5 accent-blue-600">
                  <span class="text-sm font-bold text-gray-700">Siklus Kamis - Senin</span>
                </label>
                <label class="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition-all shadow-sm">
                  <input type="radio" v-model="selectedSiklus" value="JumatSelasa" class="w-5 h-5 accent-blue-600">
                  <span class="text-sm font-bold text-gray-700">Siklus Jumat - Selasa</span>
                </label>
                <label class="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition-all shadow-sm">
                  <input type="radio" v-model="selectedSiklus" value="SabtuRabu" class="w-5 h-5 accent-blue-600">
                  <span class="text-sm font-bold text-gray-700">Siklus Sabtu - Rabu</span>
                </label>
                <label class="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition-all shadow-sm">
                  <input type="radio" v-model="selectedSiklus" value="SiklusDua" class="w-5 h-5 accent-blue-600">
                  <span class="text-sm font-bold text-gray-700">Siklus Dua (3 Harian)</span>
                </label>
                <label class="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition-all shadow-sm">
                  <input type="radio" v-model="selectedSiklus" value="Harian" class="w-5 h-5 accent-blue-600">
                  <span class="text-sm font-bold text-gray-700">Harian</span>
                </label>
              </div>
            </div>
          </form>
        </div>
        
        <!-- Modal Footer -->
        <div class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0">
          <button @click="showModal = false" type="button" class="px-6 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors">Batal</button>
          <button form="tokoForm" type="submit" class="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-bold shadow-md transition-colors">
            {{ isEdit ? 'Simpan Perubahan' : 'Buat Toko' }}
          </button>
        </div>
        
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.animate-fade-in { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>