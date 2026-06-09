import { createRouter, createWebHistory } from 'vue-router'
import { hasPermission } from '../utils/permission'

import Login from '../pages/Login.vue'
import DashboardNota from '../pages/DashboardNota.vue'
import DashboardSales from '../pages/dashboard-sales.vue'
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
      return localStorage.getItem('admin_role') === 'Sales' ? '/dashboard-sales' : '/dashboard'
  }}, 
  { path: '/login', component: Login },
  
  // DASHBOARD
  { path: '/dashboard', component: DashboardNota, meta: { requiredPermission: 'view_dashboard_sales' } },
  { path: '/dashboard-sales', component: DashboardSales, meta: { requiredPermission: 'view_dashboard_sales' } },
  
  // NOTA & PESANAN
  { path: '/buat-nota', component: BuatNota, meta: { requiredPermission: 'manage_nota_jual' } },
  { path: '/daftar-nota', component: DaftarNota, meta: { requiredPermission: 'view_riwayat_nota' }},
  { path: '/buat-pesanan', component: BuatPesanan, meta: { requiredPermission: ['manage_nota_pesanan', 'view_riwayat_pesanan'] }},
  
  // LAPORAN & MASTER
  { path: '/catatan-besar', component: CatatanBesar, meta: { requiredPermission: 'view_catatan_besar' } },
  { path: '/rangkuman', component: Rangkuman, meta: { requiredPermission: 'view_rangkuman_penjualan' } },
  { path: '/master-toko', component: MasterToko, meta: { requiredPermission: 'manage_master_toko' } },
  { path: '/master-barang', component: MasterBarang, meta: { requiredPermission: 'manage_master_barang' } },
  { path: '/sampah', component: Sampah, meta: { requiredPermission: 'manage_sampah' } }
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
    return role === 'Sales' ? next('/dashboard-sales') : next('/dashboard')
  }

  if (to.meta.requiredPermission && token) {
    const required = to.meta.requiredPermission
    const hasAccess = Array.isArray(required) 
      ? required.some(p => hasPermission(p))
      : hasPermission(required)

    if (!hasAccess) {
      window.$dialog?.alert(`Akses Ditolak! Anda tidak diizinkan melihat halaman ini.`)
      return role === 'Sales' ? next('/dashboard-sales') : next('/dashboard')
    }
  }

  next()
})

export default router