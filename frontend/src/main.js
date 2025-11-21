import { createApp } from 'vue';
import { createRouter, createWebHashHistory } from 'vue-router';
import App from './App.vue';

// Import Bootstrap CSS and Icons
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

// Import AG Grid CSS
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

// Import custom styles
import './assets/style.css';

// Import components
import BillOfQuantitiesTab from './components/BOQ/BillOfQuantitiesTab.vue';
import CatalogueTab from './components/Catalogue/CatalogueTab.vue';
import ContactsTab from './components/Contacts/ContactsTab.vue';
import SuppliersTab from './components/Suppliers/SuppliersTab.vue';
import JobsTab from './components/Jobs/JobsTab.vue';
import PurchaseOrdersTab from './components/PurchaseOrders/PurchaseOrdersTab.vue';
import TemplatesTab from './components/Templates/TemplatesTab.vue';
import SettingsView from './components/Settings/SettingsView.vue';

// Create router
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      redirect: '/jobs'
    },
    {
      path: '/jobs',
      name: 'Jobs',
      component: JobsTab
    },
    {
      path: '/boq',
      name: 'BillOfQuantities',
      component: BillOfQuantitiesTab
    },
    {
      path: '/catalogue',
      name: 'Catalogue',
      component: CatalogueTab
    },
    {
      path: '/contacts',
      name: 'Contacts',
      component: ContactsTab
    },
    {
      path: '/suppliers',
      name: 'Suppliers',
      component: SuppliersTab
    },
    {
      path: '/purchase-orders',
      name: 'PurchaseOrders',
      component: PurchaseOrdersTab
    },
    {
      path: '/templates',
      name: 'Templates',
      component: TemplatesTab
    },
    {
      path: '/settings',
      name: 'Settings',
      component: SettingsView
    }
  ]
});

// Create and mount app
const app = createApp(App);
app.use(router);
app.mount('#app');

console.log('DBx BOQ - Vue app initialized');
