package com.chargeplatform.order.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

public final class OrderRequests {
    private OrderRequests() {
    }

    // Customer charging identifies a logged-in user and a socket, not a car.
    public record CustomerStart(@NotNull(message = "请选择站点") Long stationId,
                                @NotNull(message = "请选择插座") Long connectorId,
                                @jakarta.validation.constraints.Pattern(regexp="HOUR_1|HOUR_2|HOUR_3|FULL|CUSTOM") String planId,
                                @jakarta.validation.constraints.Min(15) @jakarta.validation.constraints.Max(720)
                                @com.fasterxml.jackson.databind.annotation.JsonDeserialize(using=StrictMinutes.class) Integer customMinutes) {
        public CustomerStart(Long stationId,Long connectorId){this(stationId,connectorId,"FULL",null);}
    }
    public static class StrictMinutes extends com.fasterxml.jackson.databind.JsonDeserializer<Integer>{
        @Override public Integer deserialize(com.fasterxml.jackson.core.JsonParser parser,com.fasterxml.jackson.databind.DeserializationContext context)throws java.io.IOException{
            if(!parser.hasToken(com.fasterxml.jackson.core.JsonToken.VALUE_NUMBER_INT))throw com.fasterxml.jackson.databind.JsonMappingException.from(parser,"自定义时长必须为整数分钟");
            return parser.getIntValue();
        }
    }

    public record Start(@NotNull Long stationId, @NotNull Long connectorId, @NotBlank @jakarta.validation.constraints.Pattern(regexp = "^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼港澳台][A-Z][0-9]{5,6}$", message = "车牌号格式应为地区简称+大写字母+5或6位数字") String plateNumber, Boolean testOrder) {
    }

    public record Stop(@DecimalMin(value = "0.001") BigDecimal energyKwh) {
    }

    public record Cleanup(List<Long> ids) {
    }
}
