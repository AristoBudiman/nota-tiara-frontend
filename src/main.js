import { createApp } from 'vue'
import App from './App.vue'
import router from './router' // Import router yang baru dibuat
import './style.css' // Jika ada tailwind/css

const app = createApp(App)
app.use(router) // PENTING: Gunakan router
app.mount('#app')