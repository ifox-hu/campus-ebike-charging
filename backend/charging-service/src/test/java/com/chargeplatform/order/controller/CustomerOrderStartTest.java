package com.chargeplatform.order.controller;

import com.chargeplatform.auth.domain.SysUser;
import com.chargeplatform.audit.mapper.AuditLogMapper;
import com.chargeplatform.auth.mapper.SysUserMapper;
import com.chargeplatform.auth.service.JwtService;
import com.chargeplatform.order.domain.ChargeOrder;
import com.chargeplatform.order.dto.OrderRequests;
import com.chargeplatform.order.service.ChargeOrderService;
import com.chargeplatform.order.service.CustomerChargingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CustomerOrderStartTest {
    @Autowired MockMvc mvc;
    @Autowired JwtService jwt;
    @MockBean ChargeOrderService service;
    @MockBean CustomerChargingService charging;
    @MockBean SysUserMapper users;
    @MockBean AuditLogMapper audit;
    String token;
    @Test void customDurationIsTransportedAndFractionalJsonIsRejected()throws Exception{
        mvc.perform(post("/api/customer/orders/start").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content("{\"stationId\":7,\"connectorId\":31,\"planId\":\"CUSTOM\",\"customMinutes\":75}")).andExpect(status().isOk());
        var input=ArgumentCaptor.forClass(OrderRequests.CustomerStart.class);verify(charging).start(input.capture(),eq("student"));
        org.junit.jupiter.api.Assertions.assertEquals(75,input.getValue().customMinutes());
        clearInvocations(charging);
        mvc.perform(post("/api/customer/orders/start").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content("{\"stationId\":7,\"connectorId\":31,\"planId\":\"CUSTOM\",\"customMinutes\":15.5}")).andExpect(status().isBadRequest());
        verifyNoInteractions(charging);
    }

    @BeforeEach
    void setUp() {
        when(users.selectByUsername("student")).thenReturn(new SysUser("student", "unused", "测试用户", "USER"));
        token = jwt.create("student", "USER");
        var order = new ChargeOrder("BIKE-TEST", 7L, 31L, null, true);
        order.assignCustomer("student");
        when(charging.start(any(OrderRequests.CustomerStart.class), eq("student"))).thenReturn(order);
    }

    @Test
    void customerStartsWithOnlyStationAndSocketIds() throws Exception {
        mvc.perform(post("/api/customer/orders/start").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"stationId\":7,\"connectorId\":31}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.code").value(201))
            .andExpect(jsonPath("$.data.ownerUsername").value("student"));
        var input = ArgumentCaptor.forClass(OrderRequests.CustomerStart.class);
        verify(charging).start(input.capture(), eq("student"));
        org.junit.jupiter.api.Assertions.assertEquals(7L,input.getValue().stationId());
        org.junit.jupiter.api.Assertions.assertEquals(31L,input.getValue().connectorId());
    }

    @Test
    void legacyPlateFieldIsNotRequiredOrUsedForCustomerIdentity() throws Exception {
        mvc.perform(post("/api/customer/orders/start").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"stationId\":7,\"connectorId\":31,\"plateNumber\":\"not-a-car-plate\",\"testOrder\":false}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.code").value(201));
        var input = ArgumentCaptor.forClass(OrderRequests.CustomerStart.class);
        verify(charging).start(input.capture(), eq("student"));
        org.junit.jupiter.api.Assertions.assertEquals(7L,input.getValue().stationId());
        org.junit.jupiter.api.Assertions.assertEquals(31L,input.getValue().connectorId());
    }

    @Test
    void missingStationOrSocketIsStillRejected() throws Exception {
        for (var body : new String[]{"{\"stationId\":7}", "{\"connectorId\":31}"}) {
            mvc.perform(post("/api/customer/orders/start").header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isBadRequest());
        }
        verifyNoInteractions(service,charging);
    }

    @Test
    void anonymousStartStillRequiresLogin() throws Exception {
        mvc.perform(post("/api/customer/orders/start").contentType(MediaType.APPLICATION_JSON)
                .content("{\"stationId\":7,\"connectorId\":31}"))
            .andExpect(status().isUnauthorized());
        verifyNoInteractions(service,charging);
    }

    @Test
    void administratorCannotUseTheCustomerStartEndpoint() throws Exception {
        when(users.selectByUsername("admin")).thenReturn(new SysUser("admin", "unused", "测试管理员", "ADMIN"));
        mvc.perform(post("/api/customer/orders/start").header("Authorization", "Bearer " + jwt.create("admin", "ADMIN"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"stationId\":7,\"connectorId\":31}"))
            .andExpect(status().isForbidden());
        verifyNoInteractions(service,charging);
    }
}
