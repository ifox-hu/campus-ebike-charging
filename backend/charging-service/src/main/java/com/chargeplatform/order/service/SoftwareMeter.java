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
    public BigDecimal reading(ChargeOrder order,LocalDateTime now) {
        if(order.getStartTime()==null||now.isBefore(order.getStartTime())||order.getSimulatedPowerWatts()==null||order.getSimulatedPowerWatts()<=0)
            throw new BusinessException(409,"订单模拟计量信息异常，请管理员核对");
        return BigDecimal.valueOf(Duration.between(order.getStartTime(),now).toMillis())
            .multiply(BigDecimal.valueOf(order.getSimulatedPowerWatts()))
            .divide(BigDecimal.valueOf(3_600_000_000L),3,RoundingMode.HALF_UP);
    }
}
