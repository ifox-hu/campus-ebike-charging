package com.chargeplatform.order.service;

import com.chargeplatform.device.domain.Charger;
import com.chargeplatform.device.domain.Connector;
import com.chargeplatform.device.mapper.ChargerMapper;
import com.chargeplatform.device.mapper.ConnectorMapper;
import com.chargeplatform.order.dto.OrderRequests;
import com.chargeplatform.order.event.OrderEventPublisher;
import com.chargeplatform.order.mapper.ChargeOrderMapper;
import com.chargeplatform.price.mapper.PricePeriodMapper;
import com.chargeplatform.station.domain.Station;
import com.chargeplatform.station.mapper.StationMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ChargeOrderBikeStartTest {
    @Test
    void startWithoutPlatePreservesOwnerAndSocketReservation() {
        var orders=mock(ChargeOrderMapper.class);
        var sockets=mock(ConnectorMapper.class);
        var chargers=mock(ChargerMapper.class);
        var stations=mock(StationMapper.class);
        when(stations.selectById(7L)).thenReturn(new Station("测试站点", "测试地址", ""));
        when(chargers.lock(20L)).thenReturn(new Charger(7L, "BIKE-A", "测试设备"));
        var socket=new Connector(20L, "BIKE-A-01", "插座1", 300);
        when(sockets.selectByIdForUpdate(31L)).thenReturn(socket); when(sockets.selectById(31L)).thenReturn(socket);
        var service=new ChargeOrderService(orders,sockets,chargers,stations,mock(PricePeriodMapper.class),mock(ChargeBillingService.class),mock(OrderEventPublisher.class));

        var order=service.start(new OrderRequests.Start(7L,31L,null,true),"student");

        assertNull(order.getPlateNumber());assertEquals("student",order.getOwnerUsername());
        assertEquals("CHARGING",order.getStatus());assertEquals("UNPAID",order.getPaymentStatus());
        assertEquals(31L,order.getConnectorId());assertEquals("CHARGING",socket.getStatus());
        verify(orders).insert(order);verify(sockets).updateById(socket);
    }
}
