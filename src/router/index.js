import { createRouter, createWebHistory } from 'vue-router'
import Login from '../pages/Login.vue'
import DashboardNota from '../pages/DashboardNota.vue'
import BuatNota from '../pages/buat-nota.vue'      
import DaftarNota from '../pages/daftar-nota.vue'  
import CatatanBesar from '../pages/catatan-besar.vue'
import Rangkuman from '../pages/Rangkuman.vue'
import MasterToko from '../pages/MasterToko.vue'
import MasterBarang from '../pages/MasterBarang.vue'
import Sampah from '../pages/Sampah.vue'
import BuatPesanan from '../pages/buat-pesanan.vue'

const routes = [
  { path: '/', redirect: to => {
      return localStorage.getItem('admin_role') === 'sales' ? '/daftar-nota' : '/dashboard'
  }}, 
  { path: '/login', component: Login },
  { path: '/dashboard', component: DashboardNota, meta: { allowedRoles: ['superadmin'] } },
  // AREA BERSAMA (SUPERADMIN & SALES)
  { path: '/buat-nota', component: BuatNota, meta: { allowedRoles: ['superadmin', 'sales'] } },
  { path: '/daftar-nota', component: DaftarNota, meta: { allowedRoles: ['superadmin', 'sales'] }},
  { path: '/buat-pesanan', component: BuatPesanan, meta: { allowedRoles: ['superadmin', 'sales'] }},
  // AREA KHUSUS SUPERADMIN
  { path: '/catatan-besar', component: CatatanBesar, meta: { allowedRoles: ['superadmin'] } },
  { path: '/rangkuman', component: Rangkuman, meta: { allowedRoles: ['superadmin'] } },
  { path: '/master-toko', component: MasterToko, meta: { allowedRoles: ['superadmin'] } },
  { path: '/master-barang', component: MasterBarang, meta: { allowedRoles: ['superadmin'] } },
  { path: '/sampah', component: Sampah, meta: { allowedRoles: ['superadmin'] } }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('admin_token')
  const role = localStorage.getItem('admin_role')

  // Cegah akses tanpa token
  if (to.path !== '/login' && !token) {
    return next('/login')
  }

  // Arahkan saat baru login atau saat mengakses '/'
  if (to.path === '/login' && token) {
    return role === 'sales' ? next('/daftar-nota') : next('/dashboard')
  }

  if (to.meta.allowedRoles && token) {
    if (!to.meta.allowedRoles.includes(role)) {
      window.$dialog?.alert(`Akses Ditolak! Role '${role}' tidak diizinkan melihat halaman ini.`)
      return role === 'sales' ? next('/daftar-nota') : next('/dashboard')
    }
  }

  next()
})

export default router