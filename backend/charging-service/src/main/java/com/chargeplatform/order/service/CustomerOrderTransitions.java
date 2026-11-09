package com.chargeplatform.order.service;

import com.chargeplatform.auth.mapper.SysUserMapper;
import com.chargeplatform.common.exception.BusinessException;
import com.chargeplatform.device.mapper.ChargerMapper;
import com.chargeplatform.device.mapper.ConnectorMapper;
import com.chargeplatform.order.domain.ChargeOrder;
import com.chargeplatform.order.dto.OrderRequests;
import com.chargeplatform.order.mapper.ChargeOrderMapper;
import com.chargeplatform.price.mapper.PricePeriodMapper;
import com.chargeplatform.station.mapper.StationMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.UUID;

/** Each public transition commits independently of the device network call. */
@Service
public class CustomerOrderTransitions {
    private final SysUserMapper users;
    private final StationMapper stations;
    private final ChargerMapper chargers;
    private final ConnectorMapper connectors;
    private final ChargeOrderMapper orders;
    private final PricePeriodMapper prices;
    private final OrderTariffs tariffs;
    private final SoftwareMeter meter;
    public CustomerOrderTransitions(SysUserMapper users,StationMapper stations,ChargerMapper chargers,ConnectorMapper connectors,
        ChargeOrderMapper orders,PricePeriodMapper prices,OrderTariffs tariffs,SoftwareMeter meter) {
        this.users=users;this.stations=stations;this.chargers=chargers;this.connectors=connectors;
        this.orders=orders;this.prices=prices;this.tariffs=tariffs;this.meter=meter;
    }
    public record Prepared(ChargeOrder order,boolean created) { }

    @Transactional
    public Prepared reserve(OrderRequests.CustomerStart request,String username,boolean tcp) {
        var plan=ChargingPlans.resolve(request.planId(),request.customMinutes());
        var user=users.selectByUsernameForUpdate(username);
        if(user==null||!user.isEnabled()||!"USER".equals(user.getRole()))throw new BusinessException(403,"请使用有效的普通用户账号");
        var active=orders.selectActiveByOwner(username);
        if(active!=null) {
            if(active.getStationId().equals(request.stationId())&&active.getConnectorId().equals(request.connectorId())){
                if(active.getPlanId()!=null&&(!active.getPlanId().equals(plan.id())||!java.util.Objects.equals(active.getDurationMinutes(),plan.minutes())))throw new BusinessException(409,"已有活动订单，不能变更方案，请查看当前充电");
                return new Prepared(active,false);
            }
            throw new BusinessException(409,"已有订单正在启动或充电，请先查看当前任务");
        }
        var station=stations.selectById(request.stationId());
        if(station==null)throw new BusinessException(404,"站点不存在");
        if(!"OPERATING".equals(station.getStatus()))throw new BusinessException(409,"站点已停用，无法启动");
        var located=connectors.selectById(request.connectorId());
        if(located==null)throw new BusinessException(404,"插座不存在");
        var charger=chargers.lock(located.getChargerId());
        var connector=connectors.selectByIdForUpdate(request.connectorId());
        if(connector==null)throw new BusinessException(404,"插座不存在");
        if(charger==null||!request.stationId().equals(charger.getStationId()))throw new BusinessException(400,"插座不属于所选站点");
        if(Boolean.FALSE.equals(charger.getEnabled()))throw new BusinessException(409,"设备已停用，无法启动");
        if(!"ONLINE".equals(charger.getStatus()))throw new BusinessException(409,"设备离线或故障，无法启动");
        if(!"IDLE".equals(connector.getStatus())||orders.hasActiveConnector(connector.getId()))throw new BusinessException(409,"插座已被占用或不可用");
        String snapshot=tariffs.snapshot(prices.selectByStationId(request.stationId()));
        var order=new ChargeOrder("BC"+UUID.randomUUID().toString().replace("-",""),request.stationId(),request.connectorId(),null,true);
        order.prepareCustomer(username,tcp?"TCP":"SOFTWARE",tcp?null:meter.powerWatts(),snapshot,station.getName(),connector.getCode());
        java.math.BigDecimal estimate=null;
        if(plan.minutes()!=null){
            var start=LocalDateTime.now().withNano(0);
            var energy=java.math.BigDecimal.valueOf(meter.powerWatts()).multiply(java.math.BigDecimal.valueOf(plan.minutes())).divide(java.math.BigDecimal.valueOf(60000),9,java.math.RoundingMode.HALF_UP);
            var bill=new ChargeBillingService().calculate(start,start.plusMinutes(plan.minutes()),energy,tariffs.restore(snapshot));
            estimate=bill.electricityFee().add(bill.serviceFee());
        }
        order.selectPlan(plan.id(),plan.minutes(),estimate);
        connector.changeStatus("CHARGING");connectors.updateById(connector);orders.insert(order);
        return new Prepared(order,true);
    }
    @Transactional
    public ChargeOrder activate(Long id) {
        var order=orders.selectByIdForUpdate(id);
        if(order==null)throw new BusinessException(404,"订单不存在");
        if(!"STARTING".equals(order.getStatus()))return order;
        order.activate(LocalDateTime.now());orders.updateById(order);return order;
    }
    @Transactional
    public ChargeOrder fail(Long id,String reason,boolean stopped) {
        var order=orders.selectByIdForUpdate(id);
        if(order==null)throw new BusinessException(404,"订单不存在");
        if(!"STARTING".equals(order.getStatus()))return order;
        var socket=connectors.selectByIdForUpdate(order.getConnectorId());
        if(socket!=null){socket.changeStatus(stopped?"IDLE":"FAULT");connectors.updateById(socket);}
        String text=reason==null?"设备启动未确认":reason;
        if(!stopped)text+="；插座已隔离，请管理员核对设备状态";
        order.failStart(text.substring(0,Math.min(500,text.length())),LocalDateTime.now());orders.updateById(order);return order;
    }
}
