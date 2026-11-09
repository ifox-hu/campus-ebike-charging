package com.chargeplatform.order.service;
import org.springframework.stereotype.Component;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.beans.factory.annotation.Value;
@Component
public class PlannedChargingScheduler {
    private final ChargeOrderService orders;
    @Value("${app.order-recovery.enabled:true}") private boolean enabled;
    public PlannedChargingScheduler(ChargeOrderService orders){this.orders=orders;}
    @Scheduled(fixedDelayString="${app.simulator.reconcile-interval-ms:5000}")
    public void tick(){if(enabled)orders.reconcilePlannedOrders();}
}
