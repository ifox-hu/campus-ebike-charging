package com.chargeplatform.order.service;
import com.chargeplatform.order.domain.ChargeOrder;
import com.chargeplatform.order.dto.OrderRequests;
import com.chargeplatform.order.mapper.ChargeOrderMapper;
import com.chargeplatform.simulator.SimulatorBindingResolver;
import com.chargeplatform.simulator.SimulatorTcpClient;
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
class CustomerChargingFailureTest {
    @Test void unconfirmedStartIsPersistedAndSocketIsNotBlindlyReleased(){
        var transitions=mock(CustomerOrderTransitions.class);var simulator=mock(SimulatorTcpClient.class);var bindings=mock(SimulatorBindingResolver.class);
        var order=mock(ChargeOrder.class);when(order.getId()).thenReturn(1L);when(order.getConnectorId()).thenReturn(31L);when(order.getMeteringSource()).thenReturn("TCP");
        var request=new OrderRequests.CustomerStart(7L,31L);when(simulator.enabled()).thenReturn(true);
        when(transitions.reserve(request,"student",true)).thenReturn(new CustomerOrderTransitions.Prepared(order,true));
        when(bindings.resolve(31L)).thenReturn(new SimulatorBindingResolver.Binding("SIM-001",1,31L));
        when(simulator.sendAndConfirm(anyString(),any(),anyString())).thenThrow(new IllegalStateException("offline"));
        new CustomerChargingService(transitions,simulator,bindings,mock(ChargeOrderMapper.class)).start(request,"student");
        verify(transitions).fail(eq(1L),anyString(),eq(false));verify(transitions,never()).activate(any());
    }
    @Test void anIdempotentReplayDoesNotSendAnotherDeviceStart(){
        var transitions=mock(CustomerOrderTransitions.class);var simulator=mock(SimulatorTcpClient.class);var request=new OrderRequests.CustomerStart(7L,31L);
        when(transitions.reserve(request,"student",false)).thenReturn(new CustomerOrderTransitions.Prepared(mock(ChargeOrder.class),false));
        new CustomerChargingService(transitions,simulator,mock(SimulatorBindingResolver.class),mock(ChargeOrderMapper.class)).start(request,"student");
        verify(simulator,never()).sendAndConfirm(anyString(),any(),anyString());
    }
}
