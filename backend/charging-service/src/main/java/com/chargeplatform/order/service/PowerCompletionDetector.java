package com.chargeplatform.order.service;

import com.chargeplatform.order.domain.ChargeOrder;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;

/** Socket-side inference only; never a battery SOC reading or hardware protection. */
public final class PowerCompletionDetector {
    public boolean observe(ChargeOrder order,BigDecimal watts,LocalDateTime sampleAt,LocalDateTime now){
        var previous=order.getLastPowerSampleAt();
        if(watts==null||watts.signum()<0||sampleAt==null||sampleAt.isAfter(now)||
            sampleAt.isBefore(now.minusSeconds(30))||order.getStartTime()==null||sampleAt.isBefore(order.getStartTime())){
            order.powerEvidence(false,null,null);return false;
        }
        if(previous!=null&&!sampleAt.isAfter(previous)){
            if(sampleAt.isBefore(previous))order.powerEvidence(false,null,null);
            return false;
        }
        boolean seen=Boolean.TRUE.equals(order.getChargingPowerSeen());
        var low=order.getLowPowerSince();
        if(previous!=null&&Duration.between(previous,sampleAt).compareTo(Duration.ofSeconds(30))>0){seen=false;low=null;}
        if(watts.compareTo(new BigDecimal("50"))>=0)seen=true;
        if(watts.compareTo(new BigDecimal("2"))<0){seen=false;low=null;}
        else if(watts.compareTo(new BigDecimal("10"))>0||!seen||sampleAt.isBefore(order.getStartTime().plusMinutes(10)))low=null;
        else if(low==null)low=sampleAt;
        order.powerEvidence(seen,low,sampleAt);
        return low!=null&&!sampleAt.isBefore(low.plusMinutes(5));
    }
}
