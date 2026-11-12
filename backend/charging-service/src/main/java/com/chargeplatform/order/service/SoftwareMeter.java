package com.chargeplatform.order.service;

import com.chargeplatform.common.exception.BusinessException;
import com.chargeplatform.order.domain.ChargeOrder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;

/** Server-owned software simulation, not a reading from physical equipment. */
@Component
public class SoftwareMeter {
    private final int watts;
    public SoftwareMeter(@Value("${app.simulation.power-watts:300}") int watts) {
        if(watts<=0)throw new IllegalArgumentException("模拟功率必须大于零");
        this.watts=watts;
    }
    public int powerWatts(){return watts;}
    public boolean tapered(ChargeOrder order){return "FULL".equals(order.getPlanId())&&"POWER_V1".equals(order.getCompletionPolicy());}
    public LocalDateTime completionAt(ChargeOrder order){
        return tapered(order)&&order.getStartTime()!=null&&order.getSimulatedPowerWatts()!=null&&order.getSimulatedPowerWatts()>=50
            ?order.getStartTime().plusMinutes(215):null;
    }
    public LocalDateTime effectiveEnd(ChargeOrder order,LocalDateTime now){
        var limit=ChargingPlans.deadline(order);var full=completionAt(order);
        if(full!=null&&(limit==null||full.isBefore(limit)))limit=full;
        return limit!=null&&now.isAfter(limit)?limit:now;
    }
    public BigDecimal powerWatts(ChargeOrder order,LocalDateTime now){
        double seconds=Math.max(0,Duration.between(order.getStartTime(),now).toMillis()/1000d);
        double rated=order.getSimulatedPowerWatts();
        double power=!tapered(order)||seconds<=10800?rated:seconds>=12600?Math.min(5,rated):rated-(rated-Math.min(5,rated))*(seconds-10800)/1800;
        return BigDecimal.valueOf(power).setScale(3,RoundingMode.HALF_UP);
    }
    public BigDecimal reading(ChargeOrder order,LocalDateTime now) {
        return exactReading(order,now).setScale(3,RoundingMode.HALF_UP);
    }
    public BigDecimal exactReading(ChargeOrder order,LocalDateTime now) {
        if(order.getStartTime()==null||now.isBefore(order.getStartTime())||order.getSimulatedPowerWatts()==null||order.getSimulatedPowerWatts()<=0)
            throw new BusinessException(409,"订单模拟计量信息异常，请管理员核对");
        if(tapered(order)){
            double seconds=Duration.between(order.getStartTime(),now).toMillis()/1000d;
            double rated=order.getSimulatedPowerWatts(),floor=Math.min(5,rated),ramp=Math.min(1800,Math.max(0,seconds-10800));
            double wattSeconds=rated*Math.min(seconds,10800)+rated*ramp-(rated-floor)*ramp*ramp/3600+floor*Math.max(0,seconds-12600);
            return BigDecimal.valueOf(wattSeconds).divide(BigDecimal.valueOf(3600000),12,RoundingMode.HALF_UP);
        }
        return BigDecimal.valueOf(Duration.between(order.getStartTime(),now).toMillis())
            .multiply(BigDecimal.valueOf(order.getSimulatedPowerWatts()))
            .divide(BigDecimal.valueOf(3_600_000_000L),12,RoundingMode.HALF_UP);
    }
}
