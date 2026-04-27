import { createRouter, createWebHistory } from 'vue-router'

// 1. Import komponen Login dari folder pages
import Login from '../pages/Login.vue'

// 2. Import halaman utama dari folder pages (Ingat, huruf besar/kecil HARUS SAMA PERSIS dengan nama file aslinya)
import BuatNota from '../pages/buat-nota.vue'      
import DaftarNota from '../pages/daftar-nota.vue'  
import CatatanBesar from '../pages/catatan-besar.vue'
import Rangkuman from '../pages/Rangkuman.vue'

// 3. Import halaman Master Data dari folder pages
import MasterToko from '../pages/MasterToko.vue'
import MasterBarang from '../pages/MasterBarang.vue'

const routes = [
  { path: '/', redirect: '/login' }, 
  { path: '/login', component: Login },
  
  { path: '/buat-nota', component: BuatNota },
  { path: '/daftar-nota', component: DaftarNota },
  { path: '/catatan-besar', component: CatatanBesar },
  { path: '/rangkuman', component: Rangkuman },
  
  { path: '/master-toko', component: MasterToko },
  { path: '/master-barang', component: MasterBarang }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('admin_token')
  const role = localStorage.getItem('admin_role')

  // 1. Jika belum login dan mencoba akses halaman selain '/login', lempar ke login
  if (to.path !== '/login' && !token) {
    return next('/login')
  }

  // 2. Jika mengakses alamat utama (localhost:5173/), arahkan sesuai jabatannya
  if (to.path === '/') {
    if (role === 'sales') {
      return next('/daftar-nota') // Sales langsung dilempar ke Dashboard Kunjungan
    } else {
      return next('/catatan-besar') // Superadmin dilempar ke Catatan Besar
    }
  }

  // 3. GEMBOK KEAMANAN: Jika Sales nekat mengetik URL sensitif secara manual
  const superadminOnlyRoutes = ['/catatan-besar', '/rangkuman', '/master-toko', '/master-barang']
  
  if (role === 'sales' && superadminOnlyRoutes.includes(to.path)) {
    alert("Akses Ditolak! Anda tidak memiliki izin untuk melihat halaman ini.")
    return next('/daftar-nota') // Lempar kembali ke kandangnya
  }

  // 4. Jika semua aman, silakan lewat
  next()
})

export default router