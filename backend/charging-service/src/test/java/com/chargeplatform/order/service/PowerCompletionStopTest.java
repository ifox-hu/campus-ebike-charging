package com.chargeplatform.order.service;

import com.chargeplatform.order.domain.ChargeOrder;
import com.chargeplatform.order.mapper.ChargeOrderMapper;
import com.chargeplatform.device.mapper.*;
import com.chargeplatform.device.domain.Connector;
import com.chargeplatform.station.mapper.StationMapper;
import com.chargeplatform.price.mapper.PricePeriodMapper;
import com.chargeplatform.price.domain.PricePeriod;
import com.chargeplatform.order.event.OrderEventPublisher;
import com.chargeplatform.simulator.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class PowerCompletionStopTest {
    @Test void stopFailureKeepsSocketOccupiedAndFreshSampleRetriesWithoutDoubleSettlement(){
        var repository=mock(ChargeOrderMapper.class);var sockets=mock(ConnectorMapper.class);
        var simulator=mock(SimulatorTcpClient.class);var bindings=mock(SimulatorBindingResolver.class);
        var prices=mock(PricePeriodMapper.class);var events=mock(OrderEventPublisher.class);
        var order=new ChargeOrder("POWER",7L,31L,null,true);
        org.springframework.test.util.ReflectionTestUtils.setField(order,"id",9L);
        order.prepareCustomer("student","TCP",null,null,"station","A");
        order.selectPlan("FULL",null,null);order.activate(LocalDateTime.now().minusMinutes(30));
        order.powerEvidence(true,LocalDateTime.now().minusMinutes(6),LocalDateTime.now().minusSeconds(10));
        when(repository.selectChargingOrders()).thenAnswer(call->"CHARGING".equals(order.getStatus())?List.of(order):List.of());
        when(repository.selectByIdForUpdate(9L)).thenReturn(order);when(repository.selectById(9L)).thenReturn(order);
        var connector=mock(Connector.class);when(sockets.selectByIdForUpdate(31L)).thenReturn(connector);
        when(prices.selectByStationId(7L)).thenReturn(List.of(new PricePeriod(7L,LocalTime.MIDNIGHT,LocalTime.of(23,59,59),BigDecimal.ONE,BigDecimal.ZERO)));
        when(simulator.enabled()).thenReturn(true);when(bindings.resolve(31L)).thenReturn(new SimulatorBindingResolver.Binding("SIM",1,31L));
        doAnswer(call->new SimulatorTcpClient.LiveConnector("SIM",
            new SimulatorTcpClient.ConnectorSnapshot(1,"CHARGING",new BigDecimal("0.900"),new BigDecimal("0.005"),null,null,Instant.now()))).when(simulator).liveConnector("SIM",1);
        when(simulator.sendAndConfirm(eq("SIM"),any(),eq("IDLE"))).thenThrow(new IllegalStateException("unavailable"));
        var service=new ChargeOrderService(repository,sockets,mock(ChargerMapper.class),mock(StationMapper.class),prices,new ChargeBillingService(),events,simulator,bindings);
        service.reconcilePlannedOrders();
        assertEquals("CHARGING",order.getStatus());verify(connector,never()).changeStatus("IDLE");verify(events,never()).orderCompleted(any());
        when(simulator.liveConnector("SIM",1)).thenThrow(new IllegalStateException("disconnected"));
        service.reconcilePlannedOrders();
        doAnswer(call->new SimulatorTcpClient.LiveConnector("SIM",
            new SimulatorTcpClient.ConnectorSnapshot(1,"CHARGING",new BigDecimal("0.900"),new BigDecimal("0.005"),null,null,Instant.now()))).when(simulator).liveConnector("SIM",1);
        doReturn(new SimulatorTcpClient.ConnectorSnapshot(1,"IDLE",new BigDecimal("0.901"),BigDecimal.ZERO,null,null,Instant.now()))
            .when(simulator).sendAndConfirm(eq("SIM"),any(),eq("IDLE"));
        // New device sample after the failed attempt; a repeat alone cannot advance detection.
        service.reconcilePlannedOrders();service.reconcilePlannedOrders();
        assertEquals("COMPLETED",order.getStatus());assertEquals(new BigDecimal("0.901"),order.getEnergyKwh());
        assertEquals("低功率持续，模拟充电结束",order.getEndReason());
        verify(connector,times(1)).changeStatus("IDLE");verify(events,times(1)).orderCompleted(any());
    }
}
