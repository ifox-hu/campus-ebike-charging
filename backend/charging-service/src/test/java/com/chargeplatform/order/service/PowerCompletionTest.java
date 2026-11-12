package com.chargeplatform.order.service;

import com.chargeplatform.order.domain.ChargeOrder;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class PowerCompletionTest {
    private final LocalDateTime start=LocalDateTime.of(2026,11,12,8,0);
    private ChargeOrder order(){
        var order=new ChargeOrder("POWER",7L,31L,null,true);
        order.prepareCustomer("student","SOFTWARE",300,"[]","测试站","A");
        order.selectPlan("FULL",null,null);order.activate(start);return order;
    }
    @Test void softwareFullUsesTaperedPowerAndIntegratedEnergyInsteadOfCapacityThreshold(){
        var meter=new SoftwareMeter(300);var order=order();
        assertEquals(new BigDecimal("0.977"),meter.reading(order,start.plusMinutes(215)));
        assertEquals(new BigDecimal("5.000"),meter.powerWatts(order,start.plusMinutes(212)));
        assertEquals(start.plusMinutes(215),meter.completionAt(order));
        assertEquals(start.plusHours(12),ChargingPlans.deadline(order));
        assertNull(ChargingPlans.dueReason(order,start.plusHours(5)));
    }
    @Test void sustainedLowPowerAfterARealLoadIsRequired(){
        var detector=new PowerCompletionDetector();var order=order();
        assertFalse(detector.observe(order,new BigDecimal("300"),start.plusMinutes(10),start.plusMinutes(10)));
        for(int s=0;s<300;s+=10)assertFalse(detector.observe(order,new BigDecimal("5"),start.plusMinutes(10).plusSeconds(10).plusSeconds(s),start.plusMinutes(10).plusSeconds(10).plusSeconds(s)));
        assertTrue(detector.observe(order,new BigDecimal("5"),start.plusMinutes(15).plusSeconds(10),start.plusMinutes(15).plusSeconds(10)));
    }
    @Test void unpluggedStaleRepeatedAndInterruptedSamplesCannotCountAsFull(){
        var detector=new PowerCompletionDetector();var order=order();
        var time=start.plusMinutes(10);
        assertFalse(detector.observe(order,new BigDecimal("5"),time,time));
        detector.observe(order,new BigDecimal("300"),time.plusSeconds(10),time.plusSeconds(10));
        detector.observe(order,new BigDecimal("5"),time.plusSeconds(20),time.plusSeconds(20));
        assertFalse(detector.observe(order,BigDecimal.ZERO,time.plusSeconds(30),time.plusSeconds(30)));
        assertNull(order.getLowPowerSince());
        detector.observe(order,new BigDecimal("300"),time.plusSeconds(40),time.plusSeconds(40));
        detector.observe(order,new BigDecimal("5"),time.plusSeconds(50),time.plusSeconds(50));
        assertFalse(detector.observe(order,new BigDecimal("5"),time.plusSeconds(50),time.plusSeconds(55)));
        assertFalse(detector.observe(order,new BigDecimal("5"),time.plusSeconds(50),time.plusMinutes(6)));
        assertNull(order.getLowPowerSince());
        assertFalse(detector.observe(order,new BigDecimal("5"),time.plusMinutes(7),time.plusMinutes(7)));
        assertNull(order.getLowPowerSince());
    }
    @Test void highPowerSpikeResetsOnlyTheLowWindow(){
        var detector=new PowerCompletionDetector();var order=order();var t=start.plusMinutes(10);
        detector.observe(order,new BigDecimal("300"),t,t);
        for(int s=10;s<300;s+=10)detector.observe(order,new BigDecimal("5"),t.plusSeconds(s),t.plusSeconds(s));
        assertFalse(detector.observe(order,new BigDecimal("100"),t.plusMinutes(5),t.plusMinutes(5)));
        assertNull(order.getLowPowerSince());
        assertFalse(detector.observe(order,new BigDecimal("5"),t.plusMinutes(5).plusSeconds(10),t.plusMinutes(5).plusSeconds(10)));
    }
    @Test void tariffBoundaryUsesIntegratedSegmentEnergyRatherThanTimeProportion(){
        var order=order();var meter=new SoftwareMeter(300);
        var periods=java.util.List.of(
            new com.chargeplatform.price.domain.PricePeriod(7L,java.time.LocalTime.MIDNIGHT,java.time.LocalTime.of(11,0),BigDecimal.ONE,BigDecimal.ZERO),
            new com.chargeplatform.price.domain.PricePeriod(7L,java.time.LocalTime.of(11,0),java.time.LocalTime.of(23,59,59),BigDecimal.TEN,BigDecimal.ZERO));
        var bill=new ChargeBillingService().calculateMetered(start,start.plusMinutes(215),periods,
            (from,to)->meter.exactReading(order,to).subtract(meter.exactReading(order,from)));
        assertEquals(new BigDecimal("1.67"),bill.electricityFee());
    }
    @Test void futureAndOutOfOrderSamplesDiscardEvidence(){
        var order=order();var detector=new PowerCompletionDetector();var time=start.plusMinutes(10);
        detector.observe(order,new BigDecimal("300"),time,time);
        detector.observe(order,new BigDecimal("5"),time.plusSeconds(10),time.plusSeconds(10));
        assertFalse(detector.observe(order,new BigDecimal("5"),time.plusSeconds(20),time.plusSeconds(15)));
        assertNull(order.getLowPowerSince());assertFalse(order.getChargingPowerSeen());
        detector.observe(order,new BigDecimal("300"),time.plusSeconds(30),time.plusSeconds(30));
        assertFalse(detector.observe(order,new BigDecimal("5"),time.plusSeconds(25),time.plusSeconds(30)));
        assertNull(order.getLastPowerSampleAt());
    }
    @Test void aGapEvenSlightlyOverThirtySecondsCannotExtendTheWindow(){
        var order=order();var detector=new PowerCompletionDetector();var time=start.plusMinutes(10);
        detector.observe(order,new BigDecimal("300"),time,time);
        detector.observe(order,new BigDecimal("5"),time.plusSeconds(10),time.plusSeconds(10));
        var next=time.plusSeconds(40).plusNanos(1_000_000);
        assertFalse(detector.observe(order,new BigDecimal("5"),next,next));
        assertNull(order.getLowPowerSince());
    }
}
