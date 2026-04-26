<script setup>
import { ref, onMounted } from 'vue'

const listBarang = ref([])
const isEdit = ref(false)
const form = ref({
  ID: null,
  NamaBarang: '',
  HargaDefault: 0
})

const fetchBarang = async () => {
  try {
    const token = localStorage.getItem('admin_token')
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/barangs`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
    
    if (!res.ok) throw new Error("Akses ditolak")
    listBarang.value = await res.json()
  } catch (err) {
    console.error("Gagal load barang:", err)
  }
}

const handleSubmit = async () => {
  const method = isEdit.value ? 'PUT' : 'POST'
  
  // PERBAIKAN DI SINI: Tambahkan /api/ pada kedua kondisi URL
  const url = isEdit.value 
    ? `${import.meta.env.VITE_API_URL}/api/barangs/${form.value.ID}` 
    : `${import.meta.env.VITE_API_URL}/api/barangs`

  // Wajib ambil token untuk operasi POST/PUT
  const token = localStorage.getItem('admin_token')

  try {
    const res = await fetch(url, {
      method: method,
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // <-- SISIPKAN TOKEN DI SINI
      },
      body: JSON.stringify(form.value)
    })

    if (!res.ok) throw new Error("Gagal menyimpan data")

    resetForm()
    fetchBarang()
  } catch (err) {
    console.error("Gagal simpan barang:", err.message)
  }
}

const editBarang = (barang) => {
  isEdit.value = true
  form.value = { ...barang }
}

const hapusBarang = async (id) => {
  if (confirm('Yakin ingin menghapus produk ini?')) {
    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/barangs/${id}`, { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!res.ok) throw new Error("Gagal menghapus barang atau sesi habis")

      fetchBarang()
    } catch (err) {
      console.error("Gagal hapus barang:", err.message)
    }
  }
}

const resetForm = () => {
  isEdit.value = false
  form.value = { ID: null, NamaBarang: '', HargaDefault: 0 }
}

// --- FITUR ATUR URUTAN (PLAYLIST) ---

const geserAtas = (index) => {
  if (index > 0) {
    // Tukar posisi array saat ini dengan yang di atasnya
    const temp = listBarang.value[index]
    listBarang.value[index] = listBarang.value[index - 1]
    listBarang.value[index - 1] = temp
  }
}

const geserBawah = (index) => {
  if (index < listBarang.value.length - 1) {
    // Tukar posisi array saat ini dengan yang di bawahnya
    const temp = listBarang.value[index]
    listBarang.value[index] = listBarang.value[index + 1]
    listBarang.value[index + 1] = temp
  }
}

const simpanUrutan = async () => {
  // Buat format data { id, urutan } berdasarkan posisi array terbaru
  const payload = listBarang.value.map((barang, index) => ({
    id: barang.ID,
    urutan: index
  }))

  try {
    const token = localStorage.getItem('admin_token')
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/barangs/reorder`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    })

    if (!res.ok) throw new Error("Gagal menyimpan urutan")
    
    alert("Urutan barang berhasil dikunci!")
    fetchBarang()
  } catch (err) {
    console.error("Gagal simpan urutan:", err.message)
    alert("Gagal mengunci urutan. Cek konsol.")
  }
}

onMounted(fetchBarang)
</script>


<template>
  <div class="p-8 bg-gray-50 min-h-screen">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold text-gray-900 mb-8">Kelola Master Barang</h1>

      <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-10">
        <h2 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span>🍞</span> {{ isEdit ? 'Edit Barang' : 'Tambah Barang Baru' }}
        </h2>
        
        <form @submit.prevent="handleSubmit" class="flex flex-col md:flex-row items-end gap-4">
          <div class="flex-1 w-full">
            <label class="block text-sm font-semibold text-gray-700 mb-1">Nama Produk</label>
            <input v-model="form.NamaBarang" type="text" required 
              class="w-full border-2 border-gray-200 rounded-lg p-2.5 focus:border-blue-500 outline-none transition" 
              placeholder="Contoh: Roti Tawar Gandum">
          </div>
          <div class="w-full md:w-48">
            <label class="block text-sm font-semibold text-gray-700 mb-1">Harga Satuan (Rp)</label>
            <input v-model.number="form.HargaDefault" type="number" required 
              class="w-full border-2 border-gray-200 rounded-lg p-2.5 focus:border-blue-500 outline-none transition" 
              placeholder="0">
          </div>
          <div class="flex gap-2">
            <button v-if="isEdit" @click="resetForm" type="button" class="px-4 py-2.5 text-gray-600 font-bold hover:underline">Batal</button>
            <button type="submit" class="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold shadow-lg hover:bg-blue-700 transition">
              {{ isEdit ? 'Update' : 'Tambah' }}
            </button>
          </div>
        </form>
      </div>

      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div class="flex justify-end mb-3">
            <button @click="simpanUrutan" class="bg-indigo-600 hover:bg-indigo-800 text-white px-4 py-2 rounded shadow font-bold text-sm transition">
                💾 Simpan Posisi Urutan
            </button>
        </div>

        <table class="w-full text-sm text-left">
            <thead class="bg-gray-800 text-white">
                <tr>
                    <th class="p-4 w-24 text-center font-bold">Posisi</th> <th class="p-4 uppercase tracking-wider font-bold">Nama Barang</th>
                    <th class="p-4 uppercase tracking-wider font-bold">Harga</th>
                    <th class="p-4 text-center uppercase tracking-wider font-bold">Aksi</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
                <tr v-for="(barang, index) in listBarang" :key="barang.ID" class="hover:bg-indigo-50 transition">
                
                    <td class="p-4 text-center border-r bg-white">
                        <div class="flex flex-col items-center gap-1">
                            <button @click="geserAtas(index)" :disabled="index === 0" class="text-gray-400 hover:text-blue-600 disabled:opacity-20 font-black text-lg p-1 leading-none">▲</button>
                            <span class="text-xs font-bold text-gray-500">{{ index + 1 }}</span>
                            <button @click="geserBawah(index)" :disabled="index === listBarang.length - 1" class="text-gray-400 hover:text-blue-600 disabled:opacity-20 font-black text-lg p-1 leading-none">▼</button>
                        </div>
                    </td>

                    <td class="p-4 font-bold text-gray-800">{{ barang.NamaBarang }}</td>
                    <td class="p-4 text-gray-600">Rp {{ barang.HargaDefault.toLocaleString() }}</td>
                    <td class="p-4 text-center">
                        <div class="flex justify-center gap-4">
                            <button @click="editBarang(barang)" class="text-blue-600 hover:text-blue-800 font-bold">Edit</button>
                            <button @click="hapusBarang(barang.ID)" class="text-red-600 hover:text-red-800 font-bold">Hapus</button>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
      </div>
    </div>
  </div>
</template>