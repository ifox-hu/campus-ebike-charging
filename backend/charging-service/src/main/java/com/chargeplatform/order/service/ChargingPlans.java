package com.chargeplatform.order.service;

import com.chargeplatform.common.exception.BusinessException;
import com.chargeplatform.order.domain.ChargeOrder;
import java.time.LocalDateTime;

/** Software-demo policy, never a claim about a physical battery's state of charge. */
public final class ChargingPlans {
    private ChargingPlans(){}
    public record Plan(String id,Integer minutes){}
    public static Plan resolve(String id,Integer custom){
        id=id==null?"FULL":id;
        Integer minutes=switch(id){
            case "HOUR_1" -> 60;case "HOUR_2" -> 120;case "HOUR_3" -> 180;
            case "FULL" -> null;
            case "CUSTOM" -> {
                if(custom==null||custom<15||custom>720)throw new BusinessException(400,"自定义时长须为15—720分钟的整数");
                yield custom;
            }
            default -> throw new BusinessException(400,"请选择有效的充电方式");
        };
        if(!"CUSTOM".equals(id)&&custom!=null)throw new BusinessException(400,"只有自定义方案可指定时长");
        return new Plan(id,minutes);
    }
    public static LocalDateTime deadline(ChargeOrder order){
        if(order.getStartTime()==null||order.getPlanId()==null)return null;
        if(order.getDurationMinutes()!=null)return order.getStartTime().plusMinutes(order.getDurationMinutes());
        if("FULL".equals(order.getPlanId())){
            return order.getStartTime().plusHours(12);
        }
        return null;
    }
    public static String dueReason(ChargeOrder order,LocalDateTime now){
        var deadline=deadline(order);
        if(deadline==null||now.isBefore(deadline))return null;
        if(!"FULL".equals(order.getPlanId()))return "定时时长已到";
        return "最长充电时限已到";
    }
}
