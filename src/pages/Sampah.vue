<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const trash = ref({ tokos: [], barangs: [] })

const checkAuthError = (res) => {
  if (res.status === 401 || res.status === 403) {
    alert("Sesi habis atau Akses Ditolak!")
    localStorage.clear()
    router.push('/login')
    return true
  }
  return false
}

const fetchTrash = async () => {
  const token = localStorage.getItem('admin_token')
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/sampah`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (checkAuthError(res)) return
  if (res.ok) trash.value = await res.json()
}

const restore = async (type, id) => {
  if (confirm('Pulihkan data ini kembali ke sistem aktif?')) {
    const token = localStorage.getItem('admin_token')
    await fetch(`${import.meta.env.VITE_API_URL}/api/sampah/${type}/${id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (checkAuthError(res)) return
    fetchTrash()
  }
}

onMounted(fetchTrash)
</script>

<template>
  <div class="p-8 bg-gray-50 min-h-screen">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold text-gray-900 mb-8">🗑️ Tempat Sampah</h1>
      
      <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
        <h3 class="font-bold text-lg mb-4 text-red-700">Toko / Mitra yang Dihapus</h3>
        <div v-if="trash.tokos.length === 0" class="text-gray-500 italic">Tidak ada toko di tempat sampah.</div>
        <div v-for="t in trash.tokos" :key="t.ID" class="flex justify-between items-center border p-3 rounded mb-2 bg-red-50 hover:bg-red-100 transition">
          <span class="font-bold">{{ t.NamaToko }}</span>
          <button @click="restore('toko', t.ID)" class="bg-blue-600 text-white px-4 py-1.5 rounded font-bold shadow-sm hover:bg-blue-700">Pulihkan</button>
        </div>
      </div>

      <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 class="font-bold text-lg mb-4 text-red-700">Barang yang Dihapus</h3>
        <div v-if="trash.barangs.length === 0" class="text-gray-500 italic">Tidak ada barang di tempat sampah.</div>
        <div v-for="b in trash.barangs" :key="b.ID" class="flex justify-between items-center border p-3 rounded mb-2 bg-red-50 hover:bg-red-100 transition">
          <span class="font-bold">{{ b.NamaBarang }}</span>
          <button @click="restore('barang', b.ID)" class="bg-blue-600 text-white px-4 py-1.5 rounded font-bold shadow-sm hover:bg-blue-700">Pulihkan</button>
        </div>
      </div>
    </div>
  </div>
</template>