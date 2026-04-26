<script setup>
import { ref, onMounted } from 'vue'

const listNota = ref([])

const fetchNotas = async () => {
  try {
    const token = localStorage.getItem('admin_token')
    const res = await fetch('http://localhost:3000/api/notas', {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
    
    if (!res.ok) throw new Error("Akses ditolak")
    listNota.value = await res.json()
  } catch (err) {
    console.error("Gagal load nota:", err)
  }
}

onMounted(fetchNotas)

const formatTanggal = (tgl) => {
  return new Date(tgl).toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta', // <--- TAMBAHKAN KUNCI INI
    day: '2-digit', 
    month: 'long', 
    year: 'numeric'
  })
}
</script>

<template>
  <div class="p-8 max-w-6xl mx-auto">
    <h1 class="text-2xl font-bold mb-6 text-blue-900 border-b-2 pb-2">Riwayat Nota Pengiriman</h1>
    
    <div class="bg-white shadow-md rounded-lg overflow-hidden">
      <table class="w-full text-left border-collapse">
        <thead class="bg-blue-600 text-white">
          <tr>
            <th class="p-4 border">Tanggal</th>
            <th class="p-4 border">No. Nota</th>
            <th class="p-4 border">Nama Toko</th>
            <th class="p-4 border text-right">Total Kirim</th>
            <th class="p-4 border text-center">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="nota in listNota" :key="nota.ID" class="hover:bg-gray-50 transition">
            <td class="p-4 border">{{ formatTanggal(nota.TanggalKirim) }}</td>
            <td class="p-4 border font-mono font-bold">{{ nota.NoNota }}</td>
            <td class="p-4 border">{{ nota.NamaTokoSnapshot || 'Data Lama' }}</td>
            <td class="p-4 border text-right">Rp {{ nota.JumlahKirim.toLocaleString() }}</td>
            <td class="p-4 border text-center">
              <button class="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600">
                <router-link :to="'/buat-nota?edit=' + nota.ID" class="bg-green-500 text-white px-3 py-1 rounded">
                    Lihat / Isi Retur
                </router-link>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>