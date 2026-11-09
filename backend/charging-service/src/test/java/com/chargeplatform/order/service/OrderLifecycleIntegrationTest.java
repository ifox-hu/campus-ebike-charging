package com.chargeplatform.order.service;

import com.chargeplatform.order.dto.OrderRequests;
import com.chargeplatform.common.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.jdbc.core.JdbcTemplate;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:bike_lifecycle;MODE=MySQL;DB_CLOSE_DELAY=-1","spring.sql.init.mode=always","spring.sql.init.schema-locations=classpath:bike-schema.sql"})
@ActiveProfiles("test")
class OrderLifecycleIntegrationTest {
    @Autowired CustomerChargingService customer;
    @Autowired ChargeOrderService orders;
    @Autowired JdbcTemplate db;
    @BeforeEach void seed(){
        for(var table:new String[]{"charge_order","price_period","connector","charger","station","sys_user"})db.update("DELETE FROM "+table);
        db.update("INSERT INTO sys_user(username,display_name,password,role,enabled) VALUES('student','测试用户','unused','USER',true),('other','其他用户','unused','USER',true)");
        db.update("INSERT INTO station(id,name,address,status) VALUES(7,'测试站','测试地址','OPERATING')");
        db.update("INSERT INTO charger(id,station_id,code,name,status) VALUES(20,7,'BIKE-A','设备','ONLINE')");
        db.update("INSERT INTO connector(id,charger_id,code,name,rated_power,status) VALUES(31,20,'BIKE-A-01','插座1',300,'IDLE'),(32,20,'BIKE-A-02','插座2',300,'IDLE')");
        db.update("INSERT INTO price_period(station_id,start_time,end_time,electricity_price,service_price) VALUES(7,'00:00:00','23:59:59',0.60,0.20)");
    }
    @Test void softwareStopsWithServerEnergyAndFrozenTariff(){
        var order=customer.start(new OrderRequests.CustomerStart(7L,31L),"student");
        assertEquals("CHARGING",order.getStatus());assertEquals("SOFTWARE",order.getMeteringSource());assertNull(order.getPlateNumber());
        db.update("UPDATE charge_order SET start_time=? WHERE id=?",LocalDateTime.now().minusMinutes(90),order.getId());
        db.update("UPDATE price_period SET electricity_price=99,service_price=99");
        var ended=orders.stop(order.getId(),new OrderRequests.Stop(new BigDecimal("999")));
        assertEquals(new BigDecimal("0.450"),ended.getEnergyKwh());assertEquals(new BigDecimal("0.36"),ended.getTotalAmount());
        assertEquals("COMPLETED",orders.stop(order.getId(),null).getStatus());
        assertEquals("IDLE",db.queryForObject("SELECT status FROM connector WHERE id=31",String.class));
        var paid=orders.mockPay(order.getId(),"student","WECHAT");
        assertEquals(paid.getPaymentNo(),orders.mockPay(order.getId(),"student","WECHAT").getPaymentNo());
    }
    @Test void sameStartRetryReturnsSameOrderAndOtherSocketIsBlocked(){
        var first=customer.start(new OrderRequests.CustomerStart(7L,31L),"student");
        assertEquals(first.getId(),customer.start(new OrderRequests.CustomerStart(7L,31L),"student").getId());
        assertThrows(BusinessException.class,()->customer.start(new OrderRequests.CustomerStart(7L,32L),"student"));
        assertEquals(1,db.queryForObject("SELECT COUNT(*) FROM charge_order",Integer.class));
    }
    @Test void softwareReadingUsesElapsedTimeAndRefreshDoesNotAdvanceIt(){
        var order=customer.start(new OrderRequests.CustomerStart(7L,31L),"student");
        db.update("UPDATE charge_order SET start_time=? WHERE id=?",LocalDateTime.now().minusMinutes(90),order.getId());
        assertThrows(BusinessException.class,()->orders.customerOrder(order.getId(),"other"));
        assertEquals(new BigDecimal("0.450"),orders.customerOrder(order.getId(),"student").getEnergyKwh());
        assertEquals(new BigDecimal("0.450"),orders.customerOrder(order.getId(),"student").getEnergyKwh());
        assertEquals(0,db.queryForObject("SELECT energy_kwh FROM charge_order WHERE id=?",BigDecimal.class,order.getId()).signum());
        var ended=orders.stop(order.getId(),null);assertEquals(new BigDecimal("0.36"),ended.getTotalAmount());
        assertEquals("PAID",orders.mockPay(order.getId(),"student","WECHAT").getPaymentStatus());
    }
    @Test void incompleteTariffCannotReserveSocket(){
        db.update("UPDATE price_period SET start_time='01:00:00'");
        assertThrows(BusinessException.class,()->customer.start(new OrderRequests.CustomerStart(7L,31L),"student"));
        assertEquals("IDLE",db.queryForObject("SELECT status FROM connector WHERE id=31",String.class));
        assertEquals(0,db.queryForObject("SELECT COUNT(*) FROM charge_order",Integer.class));
    }
    @Test void immediateSoftwareStopIsAllowedAndZeroBillDoesNotRequirePayment(){
        var order=customer.start(new OrderRequests.CustomerStart(7L,31L),"student");
        var ended=orders.stop(order.getId(),null);assertEquals("COMPLETED",ended.getStatus());assertEquals(0,ended.getTotalAmount().signum());assertEquals("NOT_REQUIRED",ended.getPaymentStatus());
        assertThrows(BusinessException.class,()->orders.mockPay(order.getId(),"student","WECHAT"));
    }
    @Test void concurrentStartsForOneUserCreateOnlyOneTask()throws Exception{
        var pool=Executors.newFixedThreadPool(2);var ready=new CountDownLatch(1);
        try {
            Callable<Boolean> a=()->{ready.await();try{customer.start(new OrderRequests.CustomerStart(7L,31L),"student");return true;}catch(BusinessException e){return false;}};
            Callable<Boolean> b=()->{ready.await();try{customer.start(new OrderRequests.CustomerStart(7L,32L),"student");return true;}catch(BusinessException e){return false;}};
            var one=pool.submit(a);var two=pool.submit(b);ready.countDown();
            assertNotEquals(one.get(10,TimeUnit.SECONDS),two.get(10,TimeUnit.SECONDS));
            assertEquals(1,db.queryForObject("SELECT COUNT(*) FROM charge_order WHERE status='CHARGING'",Integer.class));
        }finally{pool.shutdownNow();}
    }
    @Test void concurrentCustomersCannotShareOneSocket()throws Exception{
        var pool=Executors.newFixedThreadPool(2);var ready=new CountDownLatch(1);
        try {
            Callable<Boolean> a=()->{ready.await();try{customer.start(new OrderRequests.CustomerStart(7L,31L),"student");return true;}catch(BusinessException e){return false;}};
            Callable<Boolean> b=()->{ready.await();try{customer.start(new OrderRequests.CustomerStart(7L,31L),"other");return true;}catch(BusinessException e){return false;}};
            var one=pool.submit(a);var two=pool.submit(b);ready.countDown();
            assertNotEquals(one.get(10,TimeUnit.SECONDS),two.get(10,TimeUnit.SECONDS));
            assertEquals(1,db.queryForObject("SELECT COUNT(*) FROM charge_order",Integer.class));
        }finally{pool.shutdownNow();}
    }
}
