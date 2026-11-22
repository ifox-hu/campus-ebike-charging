<script setup>
import ServiceUsersPage from './ServiceUsersPage.vue';
import TeamAccountsPage from './TeamAccountsPage.vue';
import BusinessStatisticsPage from './BusinessStatisticsPage.vue';
import OperationLogsPage from './OperationLogsPage.vue';
import OperatorManagementPage from './OperatorManagementPage.vue';
import './management.css';

defineProps({ page: String, client: Object, user: Object, operatorId: { default: '' }, operators: Array, stations: Array, source: Object });
defineEmits(['updated', 'order']);
</script>

<template>
  <div class="management-workspace">
    <OperatorManagementPage v-if="page === 'operators' && user.role === 'ADMIN'" :client="client" :stations="stations" @updated="$emit('updated')" />
    <ServiceUsersPage v-else-if="page === 'serviceUsers' && ['OPERATOR_ADMIN', 'OPERATOR'].includes(user.role)" :client="client" @order="$emit('order', $event)" />
    <TeamAccountsPage v-else-if="page === 'team' && user.role === 'OPERATOR_ADMIN'" :client="client" :user="user" />
    <BusinessStatisticsPage v-else-if="page === 'statistics'" :client="client" :user="user" :operator-id="operatorId" :stations="stations" :source="source" />
    <OperationLogsPage v-else-if="page === 'audit' && user.role === 'ADMIN'" :client="client" :operator-id="operatorId" :operators="operators" />
  </div>
</template>
