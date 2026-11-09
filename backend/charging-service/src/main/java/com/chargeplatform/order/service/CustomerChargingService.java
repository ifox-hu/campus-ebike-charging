package com.chargeplatform.order.service;

import com.chargeplatform.order.domain.ChargeOrder;
import com.chargeplatform.order.dto.OrderRequests;
import com.chargeplatform.order.mapper.ChargeOrderMapper;
import com.chargeplatform.simulator.SimulatorBindingResolver;
import com.chargeplatform.simulator.SimulatorTcpClient;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.beans.factory.annotation.Value;
import java.time.LocalDateTime;

@Service
public class CustomerChargingService {
    private final CustomerOrderTransitions transitions;
    private final SimulatorTcpClient simulator;
    private final SimulatorBindingResolver bindings;
    private final ChargeOrderMapper orders;
    @Value("${app.order-recovery.enabled:true}") private boolean recoveryEnabled=true;
    public CustomerChargingService(CustomerOrderTransitions transitions,SimulatorTcpClient simulator,SimulatorBindingResolver bindings,ChargeOrderMapper orders) {
        this.transitions=transitions;this.simulator=simulator;this.bindings=bindings;this.orders=orders;
    }
    public ChargeOrder start(OrderRequests.CustomerStart request,String username) {
        var prepared=transitions.reserve(request,username,simulator.enabled());
        if(!prepared.created())return prepared.order();
        var order=prepared.order();
        if("SOFTWARE".equals(order.getMeteringSource()))return transitions.activate(order.getId());
        try {
            var binding=bindings.resolve(order.getConnectorId());
            var confirmed=simulator.sendAndConfirm(binding.deviceId(),new SimulatorTcpClient.Command("START",binding.localConnectorId()),"CHARGING");
            if(confirmed==null||!"CHARGING".equals(confirmed.status()))throw new IllegalStateException("启动未确认");
            return transitions.activate(order.getId());
        }catch(RuntimeException error) {
            return transitions.fail(order.getId(),"设备启动未确认，请稍后重试",confirmStopped(order));
        }
    }
    private boolean confirmStopped(ChargeOrder order) {
        try {
            var binding=bindings.resolve(order.getConnectorId());
            var snapshot=simulator.sendAndConfirm(binding.deviceId(),new SimulatorTcpClient.Command("STOP",binding.localConnectorId()),"IDLE");
            return snapshot!=null&&"IDLE".equals(snapshot.status());
        }catch(RuntimeException error){return false;}
    }
    @Scheduled(fixedDelayString="${app.simulator.reconcile-interval-ms:5000}")
    public void recoverStarting() {
        if(!recoveryEnabled)return;
        for(var order:orders.selectStartingBefore(LocalDateTime.now().minusMinutes(1))) {
            if("SOFTWARE".equals(order.getMeteringSource())){transitions.activate(order.getId());continue;}
            try {
                var binding=bindings.resolve(order.getConnectorId());
                var live=simulator.liveConnector(binding.deviceId(),binding.localConnectorId()).connector();
                if("CHARGING".equals(live.status()))transitions.activate(order.getId());
                else transitions.fail(order.getId(),"启动确认超时",confirmStopped(order));
            }catch(RuntimeException error){transitions.fail(order.getId(),"启动确认超时",false);}
        }
    }
}
