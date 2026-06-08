<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import draggable from 'vuedraggable'
import { useRouter } from 'vue-router'
import { Package, Plus, X } from 'lucide-vue-next'

const router = useRouter()
const listBarang = ref([])
const isEdit = ref(false)
const showModal = ref(false)

const form = ref({
  ID: null,
  NamaBarang: '',
  HargaDefault: 0
})

const checkAuthError = (res) => {
  if (res.status === 401 || res.status === 403) {
    window.$dialog?.alert("Sesi habis atau Akses Ditolak (Bukan Superadmin)!")
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

const bukaModalTambah = () => {
  resetForm()
  showModal.value = true
}

const handleSubmit = async () => {
  const method = isEdit.value ? 'PUT' : 'POST'
  
  const url = isEdit.value 
    ? `${import.meta.env.VITE_API_URL}/api/barangs/${form.value.ID}` 
    : `${import.meta.env.VITE_API_URL}/api/barangs`

  const token = localStorage.getItem('admin_token')

  try {
    const res = await fetch(url, {
      method: method,
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(form.value)
    })
    if (checkAuthError(res)) return

    if (!res.ok) throw new Error("Gagal menyimpan data")

    resetForm()
    showModal.value = false
    fetchBarang()
  } catch (err) {
    console.error("Gagal simpan barang:", err.message)
    window.$dialog?.alert("Gagal simpan barang: " + err.message)
  }
}

const editBarang = (barang) => {
  isEdit.value = true
  form.value = { ...barang }
  showModal.value = true
}

const hapusBarang = async (id) => {
  if (window.$dialog && await window.$dialog.confirm('Yakin ingin menghapus produk ini?')) {
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

watch(showModal, (isOpen) => {
  if (isOpen) document.body.style.overflow = 'hidden'
  else document.body.style.overflow = ''
})

onUnmounted(() => { document.body.style.overflow = '' })

onMounted(fetchBarang)
</script>

<template>
  <div class="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between border-b-2 border-gray-200 pb-4 gap-4">
      <div>
        <h1 class="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-2"><Package :size="32" /> Master Barang</h1>
        <p class="text-sm text-gray-500 font-medium mt-1">Kelola data produk barang final yang akan dijual.</p>
      </div>
      <div class="flex items-center gap-3">
        <button @click="bukaModalTambah" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-colors flex items-center justify-center gap-2 shrink-0">
            <Plus :size="18" /> Buat Barang
        </button>
      </div>
    </div>

    <!-- Tabel Data -->
    <div class="bg-white rounded-xl border border-gray-200 overflow-x-auto shadow-sm">
      <table class="w-full text-sm text-left min-w-[600px]">
        <thead class="bg-gray-800 text-white">
          <tr>
            <th class="p-4 w-24 text-center font-bold">Posisi</th> 
            <th class="p-4 uppercase tracking-wider font-bold">Nama Barang</th>
            <th class="p-4 uppercase tracking-wider font-bold">Harga</th>
            <th class="p-4 text-center uppercase tracking-wider font-bold w-32">Aksi</th>
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
                <tr class="hover:bg-indigo-50 transition bg-white group">
                    <td class="p-4 text-center border-r drag-handle cursor-grab active:cursor-grabbing bg-gray-50 group-hover:bg-indigo-100/50 transition-colors">
                        <div class="flex flex-col items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                            <span class="text-xl leading-none font-black text-gray-400">⋮⋮</span>
                            <span class="text-[10px] font-bold text-gray-500">#{{ index + 1 }}</span>
                        </div>
                    </td>

                    <td class="p-4 font-bold text-gray-800">{{ element.NamaBarang }}</td>
                    <td class="p-4 text-gray-600 font-medium">Rp {{ element.HargaDefault.toLocaleString() }}</td>
                    <td class="p-4">
                        <div class="flex justify-center gap-3">
                            <button @click="editBarang(element)" class="text-blue-600 hover:text-blue-800 font-bold bg-blue-50 px-3 py-1.5 rounded transition-colors">Edit</button>
                            <button @click="hapusBarang(element.ID)" class="text-red-600 hover:text-red-800 font-bold bg-red-50 px-3 py-1.5 rounded transition-colors">Hapus</button>
                        </div>
                    </td>
                </tr>
            </template>
        </draggable>
        <tbody v-if="listBarang.length === 0">
            <tr>
                <td colspan="4" class="p-10 text-center text-gray-400 font-medium">Belum ada data barang.</td>
            </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Form -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0 bg-slate-900/50 backdrop-blur-sm">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
        
        <!-- Modal Header -->
        <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
          <h2 class="text-xl font-black text-gray-800 flex items-center gap-2">
            <Package :size="24" class="text-blue-600" />
            {{ isEdit ? 'Edit Data Barang' : 'Tambah Barang Baru' }}
          </h2>
          <button @click="showModal = false" class="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50">
            <X :size="24" />
          </button>
        </div>
        
        <!-- Modal Body (Scrollable) -->
        <div class="p-6 overflow-y-auto custom-scrollbar flex-1">
          <form id="barangForm" @submit.prevent="handleSubmit" class="space-y-6">
            <div>
                <label class="block text-sm font-bold text-gray-700 mb-1.5">Nama Produk</label>
                <input v-model="form.NamaBarang" type="text" required 
                class="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-800" 
                placeholder="Contoh: Roti Tawar Gandum">
            </div>
            <div>
                <label class="block text-sm font-bold text-gray-700 mb-1.5">Harga Satuan (Rp)</label>
                <input v-model.number="form.HargaDefault" type="number" required 
                class="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-800" 
                placeholder="0">
            </div>
          </form>
        </div>
        
        <!-- Modal Footer -->
        <div class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0">
          <button @click="showModal = false" type="button" class="px-6 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors">Batal</button>
          <button form="barangForm" type="submit" class="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-bold shadow-md transition-colors">
            {{ isEdit ? 'Simpan Perubahan' : 'Buat Barang' }}
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