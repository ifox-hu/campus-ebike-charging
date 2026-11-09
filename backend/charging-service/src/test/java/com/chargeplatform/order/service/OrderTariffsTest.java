package com.chargeplatform.order.service;
import com.chargeplatform.price.domain.PricePeriod;
import com.chargeplatform.common.exception.BusinessException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
class OrderTariffsTest {
    final OrderTariffs tariffs=new OrderTariffs(new ObjectMapper());
    PricePeriod rate(String start,String end){return new PricePeriod(7L,LocalTime.parse(start),LocalTime.parse(end),new BigDecimal("0.60"),new BigDecimal("0.20"));}
    @Test void snapshotRoundTripPreservesRates(){var restored=tariffs.restore(tariffs.snapshot(List.of(rate("00:00:00","23:59:59"))));assertEquals(new BigDecimal("0.60"),restored.get(0).getElectricityPrice());}
    @Test void gapsAndOverlapsAreRejected(){assertThrows(BusinessException.class,()->tariffs.snapshot(List.of(rate("01:00:00","23:59:59"))));assertThrows(BusinessException.class,()->tariffs.snapshot(List.of(rate("00:00:00","12:00:00"),rate("11:00:00","23:59:59"))));}
    @Test void damagedSnapshotsDoNotFallBackToCurrentPrices(){assertThrows(BusinessException.class,()->tariffs.restore("invalid"));}
}
