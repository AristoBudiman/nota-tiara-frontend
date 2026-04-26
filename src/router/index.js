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

// Navigation Guard (Penjaga Keamanan Token)
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('admin_token')
  if (to.path !== '/login' && !token) {
    next('/login')
  } else if (to.path === '/login' && token) {
    next('/catatan-besar')
  } else {
    next()
  }
})

export default router