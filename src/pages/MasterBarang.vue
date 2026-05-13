<script setup>
import { ref, onMounted } from 'vue'
import draggable from 'vuedraggable'
import { useRouter } from 'vue-router'

const listBarang = ref([])
const isEdit = ref(false)
const form = ref({
  ID: null,
  NamaBarang: '',
  HargaDefault: 0
})

// Fungsi pembantu untuk cek error RBAC
const checkAuthError = (res) => {
  if (res.status === 401 || res.status === 403) {
    alert("Sesi habis atau Akses Ditolak (Bukan Superadmin)!")
    localStorage.clear()
    router.push('/login')
    return true
  }
  return false
}

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
    if (checkAuthError(res)) return
    
    if (!res.ok) throw new Error("Gagal load data")
    listBarang.value = await res.json()
  } catch (err) {
    console.error("Gagal load barang:", err)
  }
}

const handleSubmit = async () => {
  const method = isEdit.value ? 'PUT' : 'POST'
  
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
        'Authorization': `Bearer ${token}` // SISIPKAN TOKEN DI SINI
      },
      body: JSON.stringify(form.value)
    })
    if (checkAuthError(res)) return

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

      if (checkAuthError(res)) return

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

const simpanUrutan = async () => {
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
    if (checkAuthError(res)) return

    if (!res.ok) throw new Error("Gagal menyimpan urutan")
    
  } catch (err) {
    console.error("Gagal simpan urutan:", err.message)
  }
}

onMounted(fetchBarang)
</script>


<template>
  <div class="p-4 md:p-8 bg-gray-50 min-h-screen">
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

      <div class="bg-white rounded-xl border border-gray-200 overflow-x-auto shadow-sm">
        <div class="flex justify-end mb-3">
            <button @click="simpanUrutan" class="bg-indigo-600 hover:bg-indigo-800 text-white px-4 py-2 rounded shadow font-bold text-sm transition">
                💾 Simpan Posisi Urutan
            </button>
        </div>

        <table class="w-full text-sm text-left min-w-150">
            <thead class="bg-gray-800 text-white">
                <tr>
                    <th class="p-4 w-24 text-center font-bold">Posisi</th> 
                    <th class="p-4 uppercase tracking-wider font-bold">Nama Barang</th>
                    <th class="p-4 uppercase tracking-wider font-bold">Harga</th>
                    <th class="p-4 text-center uppercase tracking-wider font-bold">Aksi</th>
                </tr>
            </thead>
            
            <draggable 
                v-model="listBarang" 
                tag="tbody" 
                item-key="ID" 
                handle=".drag-handle" 
                @end="simpanUrutan"
                class="divide-y divide-gray-200"
                animation="200"
            >
                <template #item="{ element, index }">
                    <tr class="hover:bg-indigo-50 transition bg-white">
                    
                        <td class="p-4 text-center border-r drag-handle cursor-grab active:cursor-grabbing">
                            <div class="flex flex-col items-center gap-1 opacity-50 hover:opacity-100 transition-opacity">
                                <span class="text-2xl leading-none">☰</span>
                                <span class="text-[10px] font-bold text-gray-400">#{{ index + 1 }}</span>
                            </div>
                        </td>

                        <td class="p-4 font-bold text-gray-800">{{ element.NamaBarang }}</td>
                        <td class="p-4 text-gray-600">Rp {{ element.HargaDefault.toLocaleString() }}</td>
                        <td class="p-4 text-center">
                            <div class="flex justify-center gap-4">
                                <button @click="editBarang(element)" class="text-blue-600 hover:text-blue-800 font-bold">Edit</button>
                                <button @click="hapusBarang(element.ID)" class="text-red-600 hover:text-red-800 font-bold">Hapus</button>
                            </div>
                        </td>
                    </tr>
                </template>
            </draggable>
        </table>
      </div>
    </div>
  </div>
</template>