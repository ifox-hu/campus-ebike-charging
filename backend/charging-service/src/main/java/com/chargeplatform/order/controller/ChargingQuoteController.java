package com.chargeplatform.order.controller;

import com.chargeplatform.common.dto.ApiResponse;
import com.chargeplatform.common.exception.BusinessException;
import com.chargeplatform.order.dto.OrderRequests;
import com.chargeplatform.order.service.*;
import com.chargeplatform.price.mapper.PricePeriodMapper;
import com.chargeplatform.station.mapper.StationMapper;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import jakarta.validation.Valid;
import java.math.*;
import java.time.LocalDateTime;

@RestController @RequestMapping("/api/customer/charging-quote") @PreAuthorize("hasRole('USER')")
public class ChargingQuoteController {
    private final PricePeriodMapper prices;private final StationMapper stations;private final OrderTariffs tariffs;private final SoftwareMeter meter;private final ChargeBillingService billing;
    public ChargingQuoteController(PricePeriodMapper prices,StationMapper stations,OrderTariffs tariffs,SoftwareMeter meter,ChargeBillingService billing){this.prices=prices;this.stations=stations;this.tariffs=tariffs;this.meter=meter;this.billing=billing;}
    public record Quote(String planId,Integer durationMinutes,BigDecimal estimatedAmount,int assumedPowerWatts,String note){}
    @PostMapping public ApiResponse<Quote> quote(@Valid @RequestBody OrderRequests.CustomerStart request){
        var plan=ChargingPlans.resolve(request.planId(),request.customMinutes());
        var station=stations.selectById(request.stationId());
        if(station==null)throw new BusinessException(404,"站点不存在");
        if(!"OPERATING".equals(station.getStatus()))throw new BusinessException(409,"站点当前未运营");
        var periods=tariffs.restore(tariffs.snapshot(prices.selectByStationId(request.stationId())));
        BigDecimal amount=null;
        if(plan.minutes()!=null){
            var start=LocalDateTime.now().withNano(0);
            var energy=BigDecimal.valueOf(meter.powerWatts()).multiply(BigDecimal.valueOf(plan.minutes())).divide(BigDecimal.valueOf(60000),9,RoundingMode.HALF_UP);
            var bill=billing.calculate(start,start.plusMinutes(plan.minutes()),energy,periods);amount=bill.electricityFee().add(bill.serviceFee());
        }
        return ApiResponse.success(new Quote(plan.id(),plan.minutes(),amount,meter.powerWatts(),"按模拟功率及分时费率预估；最终按启动时保存的费率与实际计量结算"));
    }
}
