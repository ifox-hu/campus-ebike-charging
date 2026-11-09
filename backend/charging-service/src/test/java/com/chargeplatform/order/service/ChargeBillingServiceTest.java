package com.chargeplatform.order.service;

import com.chargeplatform.common.exception.BusinessException;
import com.chargeplatform.price.domain.PricePeriod;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ChargeBillingServiceTest {

    private final ChargeBillingService billing = new ChargeBillingService();
    @Test void fractionalSecondsAcrossMidnightMustNotLoseBillableEnergy(){
        var start=LocalDateTime.of(2026,11,9,23,30,0,123456000);
        var rate=new PricePeriod(1L,LocalTime.MIDNIGHT,LocalTime.of(23,59,59),new BigDecimal("0.60"),new BigDecimal("0.20"));
        var bill=billing.calculate(start,start.plusMinutes(75),new BigDecimal("0.375"),List.of(rate));
        assertEquals(new BigDecimal("0.23"),bill.electricityFee());assertEquals(new BigDecimal("0.08"),bill.serviceFee());
    }

    @Test
    void splitsEnergyAcrossPricePeriodsByChargingDuration() {
        List<PricePeriod> periods = List.of(
                new PricePeriod(1L, LocalTime.of(8, 0), LocalTime.of(10, 0), new BigDecimal("1.00"), new BigDecimal("0.20")),
                new PricePeriod(1L, LocalTime.of(10, 0), LocalTime.of(12, 0), new BigDecimal("0.50"), new BigDecimal("0.10")));

        var result = billing.calculate(
                LocalDateTime.of(2026, 9, 23, 9, 0),
                LocalDateTime.of(2026, 9, 23, 11, 0),
                new BigDecimal("20.000"), periods);

        assertEquals(new BigDecimal("15.00"), result.electricityFee());
        assertEquals(new BigDecimal("3.00"), result.serviceFee());
    }

    @Test
    void rejectsChargingIntervalWithoutCompletePriceCoverage() {
        List<PricePeriod> periods = List.of(
                new PricePeriod(1L, LocalTime.of(8, 0), LocalTime.of(9, 0), BigDecimal.ONE, BigDecimal.ZERO));

        assertThrows(BusinessException.class, () -> billing.calculate(
                LocalDateTime.of(2026, 9, 23, 8, 30),
                LocalDateTime.of(2026, 9, 23, 9, 30),
                BigDecimal.TEN, periods));
    }
}
