import { createRouter, createWebHistory } from 'vue-router'
import Login from '../pages/Login.vue'
import BuatNota from '../pages/buat-nota.vue'      
import DaftarNota from '../pages/daftar-nota.vue'  
import CatatanBesar from '../pages/catatan-besar.vue'
import Rangkuman from '../pages/Rangkuman.vue'
import MasterToko from '../pages/MasterToko.vue'
import MasterBarang from '../pages/MasterBarang.vue'
import Sampah from '../pages/Sampah.vue'

const routes = [
  { path: '/', redirect: '/login' }, 
  { path: '/login', component: Login },
  { path: '/buat-nota', component: BuatNota },
  { path: '/daftar-nota', component: DaftarNota },
  { path: '/catatan-besar', component: CatatanBesar },
  { path: '/rangkuman', component: Rangkuman },
  { path: '/master-toko', component: MasterToko },
  { path: '/master-barang', component: MasterBarang },
  { path: '/sampah', component: Sampah }
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

  // 2. Arahkan sesuai jabatannya saat development
  if (to.path === '/') {
    if (role === 'sales') {
      return next('/daftar-nota') // Sales langsung dilempar ke Dashboard Kunjungan
    } else {
      return next('/catatan-besar') // Superadmin dilempar ke Catatan Besar
    }
  }

  // 3. KUNCI PAGES: Jika Sales nekat mengetik URL sensitif secara manual
  const superadminOnlyRoutes = ['/catatan-besar', '/rangkuman', '/master-toko', '/master-barang', '/sampah']
  
  if (role === 'sales' && superadminOnlyRoutes.includes(to.path)) {
    alert("Akses Ditolak! Anda tidak memiliki izin untuk melihat halaman ini.")
    return next('/daftar-nota') // Lempar kembali ke dashboard kunjungan
  }

  // 4. Aman baru boleh lewat
  next()
})

export default router