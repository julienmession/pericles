import 'core-js/fn/promise/finally';

import Vue from 'vue/dist/vue.esm'

import Store from './store.js';
import ResourcesComponent from './ps-resources.vue';
import UnsedResourcesComponent from './ps-unused-resources.vue';


document.addEventListener('DOMContentLoaded', () => {
  const app = new Vue({
    el: '#resources',
    data: Store.state,
    components: {
      'ps-resources': ResourcesComponent,
      'ps-unused-resources': UnsedResourcesComponent
    }
  });

  Store.init();
});