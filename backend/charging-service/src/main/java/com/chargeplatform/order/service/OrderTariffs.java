package com.chargeplatform.order.service;

import com.chargeplatform.common.exception.BusinessException;
import com.chargeplatform.price.domain.PricePeriod;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Component
public class OrderTariffs {
    private final ObjectMapper json;
    public OrderTariffs(ObjectMapper json) { this.json=json; }
    public record Rate(String startTime,String endTime,BigDecimal electricityPrice,BigDecimal servicePrice) { }

    public String snapshot(List<PricePeriod> periods) {
        if(periods==null||periods.isEmpty())throw new BusinessException(409,"站点尚未配置完整费率，暂时无法启动");
        for(var p:periods)if(p==null||p.getStartTime()==null||p.getEndTime()==null)throw new BusinessException(409,"站点费率信息不完整");
        var sorted=periods.stream().sorted(Comparator.comparing(PricePeriod::getStartTime)).toList();
        LocalTime next=LocalTime.MIDNIGHT;
        for(var p:sorted) {
            if(p.getStartTime()==null||p.getEndTime()==null||!p.getStartTime().equals(next)||!p.getEndTime().isAfter(p.getStartTime())
                ||p.getElectricityPrice()==null||p.getServicePrice()==null||p.getElectricityPrice().signum()<0||p.getServicePrice().signum()<0)
                throw new BusinessException(409,"站点费率存在空缺或重叠，暂时无法启动");
            next=p.getEndTime();
        }
        if(!next.equals(LocalTime.of(23,59,59)))throw new BusinessException(409,"站点费率未覆盖全天，暂时无法启动");
        try{return json.writeValueAsString(sorted.stream().map(p->new Rate(p.getStartTime().toString(),p.getEndTime().toString(),p.getElectricityPrice(),p.getServicePrice())).toList());}
        catch(Exception e){throw new BusinessException(500,"无法保存订单费率");}
    }
    public List<PricePeriod> restore(String snapshot) {
        try {
            List<Rate> rates=json.readValue(snapshot,new TypeReference<List<Rate>>(){});
            var result=new ArrayList<PricePeriod>();
            for(var p:rates)result.add(new PricePeriod(null,LocalTime.parse(p.startTime()),LocalTime.parse(p.endTime()),p.electricityPrice(),p.servicePrice()));
            snapshot(result);return result;
        }catch(Exception e){throw new BusinessException(409,"订单费率快照异常，请管理员核对");}
    }
}
