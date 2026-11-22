<script setup>
import ServiceUsersPage from './ServiceUsersPage.vue';
import TeamAccountsPage from './TeamAccountsPage.vue';
import BusinessStatisticsPage from './BusinessStatisticsPage.vue';
import OperationLogsPage from './OperationLogsPage.vue';
import OperatorManagementPage from './OperatorManagementPage.vue';
import './management.css';
import {computed,ref,watch} from 'vue';
import DashboardOperatorFilter from '../DashboardOperatorFilter.vue';
import {scopeDashboardSource} from '../../domain/dashboardView.js';

const props=defineProps({ page: String, client: Object, user: Object, operatorId: { default: '' }, operators: Array, stations: Array, source: Object });
defineEmits(['updated', 'order']);
const selectedOperator=ref(props.operatorId||'');
watch(()=>props.operatorId,value=>{selectedOperator.value=value||''});
const filteredSource=computed(()=>scopeDashboardSource(props.source,selectedOperator.value));
</script>

<template>
  <div class="management-workspace"><div v-if="user.role==='ADMIN' && ['statistics','audit'].includes(page)" class="management-heading"><DashboardOperatorFilter v-model="selectedOperator" :operators="operators" :label="page==='audit'?'日志运营商':'统计运营商'"/></div>
    <OperatorManagementPage v-if="page === 'operators' && user.role === 'ADMIN'" :client="client" :stations="stations" @updated="$emit('updated')" />
    <ServiceUsersPage v-else-if="page === 'serviceUsers' && ['OPERATOR_ADMIN', 'OPERATOR'].includes(user.role)" :client="client" @order="$emit('order', $event)" />
    <TeamAccountsPage v-else-if="page === 'team' && user.role === 'OPERATOR_ADMIN'" :client="client" :user="user" />
    <BusinessStatisticsPage v-else-if="page === 'statistics'" :client="client" :user="user" :operator-id="selectedOperator" :stations="stations" :source="filteredSource" />
    <OperationLogsPage v-else-if="page === 'audit' && user.role === 'ADMIN'" :client="client" :operator-id="selectedOperator" :operators="operators" />
  </div>
</template>
