<script setup>
import { ref, onMounted, watch } from 'vue'

const listToko = ref([])
const isEdit = ref(false)

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
    
    if (!res.ok) throw new Error("Akses ditolak")
    listToko.value = await res.json()
  } catch (err) {
    console.error("Gagal load toko:", err)
  }
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

    if (!res.ok) throw new Error("Gagal menyimpan data")

    resetForm()
    fetchToko()
  } catch (err) {
    console.error("Gagal simpan toko:", err.message)
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

onMounted(fetchToko)
</script>


<template>
  <div class="p-4 md:p-8 bg-gray-50 min-h-screen">
    <div class="max-w-6xl mx-auto">
      <h1 class="text-3xl font-bold text-gray-900 mb-8">Kelola Master Toko</h1>

      <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-10">
        <h2 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span>➕</span> {{ isEdit ? 'Edit Toko' : 'Tambah Toko Baru' }}
        </h2>
        
        <form @submit.prevent="handleSubmit" class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1">Nama Toko</label>
              <input v-model="form.NamaToko" type="text" required 
                class="w-full border-2 border-gray-200 rounded-lg p-2.5 focus:border-blue-500 outline-none transition" 
                placeholder="Masukkan nama toko...">
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1">Nomor Telepon</label>
              <input v-model="form.NoTelp" type="text" 
                class="w-full border-2 border-gray-200 rounded-lg p-2.5 focus:border-blue-500 outline-none transition" 
                placeholder="Contoh: 08123456789">
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1">Alamat</label>
              <textarea v-model="form.Alamat" rows="2"
                class="w-full border-2 border-gray-200 rounded-lg p-2.5 focus:border-blue-500 outline-none transition" 
                placeholder="Alamat lengkap toko..."></textarea>
            </div>
          </div>

          <div class="bg-blue-50 p-5 rounded-xl border border-blue-100">
            <label class="block text-sm font-bold text-blue-900 mb-3 uppercase tracking-wider">Pengaturan Siklus Harian</label>
            <div class="space-y-3">
              <label class="flex items-center gap-3 p-2 bg-white rounded-lg border cursor-pointer hover:bg-blue-100 transition shadow-sm">
                <input type="radio" v-model="selectedSiklus" value="KamisSenin" class="w-5 h-5 accent-blue-600">
                <span class="text-sm font-medium text-gray-700">Siklus Kamis - Senin</span>
              </label>
              <label class="flex items-center gap-3 p-2 bg-white rounded-lg border cursor-pointer hover:bg-blue-100 transition shadow-sm">
                <input type="radio" v-model="selectedSiklus" value="JumatSelasa" class="w-5 h-5 accent-blue-600">
                <span class="text-sm font-medium text-gray-700">Siklus Jumat - Selasa</span>
              </label>
              <label class="flex items-center gap-3 p-2 bg-white rounded-lg border cursor-pointer hover:bg-blue-100 transition shadow-sm">
                <input type="radio" v-model="selectedSiklus" value="SabtuRabu" class="w-5 h-5 accent-blue-600">
                <span class="text-sm font-medium text-gray-700">Siklus Sabtu - Rabu</span>
              </label>
              <label class="flex items-center gap-3 p-2 bg-white rounded-lg border cursor-pointer hover:bg-blue-100 transition shadow-sm">
                <input type="radio" v-model="selectedSiklus" value="SiklusDua" class="w-5 h-5 accent-blue-600">
                <span class="text-sm font-medium text-gray-700">Siklus Dua (Grup 3 Harian)</span>
              </label>
              <label class="flex items-center gap-3 p-2 bg-white rounded-lg border cursor-pointer hover:bg-blue-100 transition shadow-sm">
                <input type="radio" v-model="selectedSiklus" value="Harian" class="w-5 h-5 accent-blue-600">
                <span class="text-sm font-medium text-gray-700">Harian</span>
              </label>
            </div>
          </div>

          <div class="md:col-span-2 flex justify-end gap-3 mt-2">
            <button v-if="isEdit" @click="resetForm" type="button" class="px-6 py-2.5 text-gray-600 font-bold">Batal</button>
            <button type="submit" class="bg-blue-600 text-white px-8 py-2.5 rounded-lg font-bold shadow-lg hover:bg-blue-700 transition">
              {{ isEdit ? 'Update Data' : 'Simpan Toko' }}
            </button>
          </div>
        </form>
      </div>

      <div class="bg-white rounded-xl border border-gray-200 overflow-x-auto shadow-sm">
        <table class="w-full text-sm text-left">
          <thead class="bg-gray-800 text-white">
            <tr>
              <th class="p-4 uppercase tracking-wider font-bold">Nama Toko</th>
              <th class="p-4 uppercase tracking-wider font-bold">Jadwal Siklus</th>
              <th class="p-4 uppercase tracking-wider font-bold">Alamat</th>
              <th class="p-4 text-center uppercase tracking-wider font-bold">Aksi</th>
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
                  <span v-if="toko.IsHarian" class="bg-purple-100 text-orange-700 px-2.5 py-1 rounded-full text-[10px] font-bold border border-purple-200">HARIAN</span>
                </div>
              </td>
              <td class="p-4 text-gray-600 max-w-xs truncate">{{ toko.Alamat || '-' }}</td>
              <td class="p-4 text-center">
                <div class="flex justify-center gap-4">
                  <button @click="editToko(toko)" class="text-blue-600 hover:text-blue-800 font-bold">Edit</button>
                  <button @click="hapusToko(toko.ID)" class="text-red-600 hover:text-red-800 font-bold">Hapus</button>
                </div>
              </td>
            </tr>
            <tr v-if="listToko.length === 0">
              <td colspan="4" class="p-10 text-center text-gray-400 italic">Belum ada data toko.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>