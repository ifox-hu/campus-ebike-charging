package com.chargeplatform.device.service;

import com.chargeplatform.common.exception.BusinessException;
import com.chargeplatform.order.dto.OrderRequests;
import com.chargeplatform.order.service.CustomerChargingService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:bike_devices;MODE=MySQL;DB_CLOSE_DELAY=-1","spring.sql.init.mode=always","spring.sql.init.schema-locations=classpath:bike-schema.sql"})
@ActiveProfiles("test")
class BikeDeviceIntegrationTest {
    @Autowired BikeDeviceService devices;
    @Autowired CustomerChargingService charging;
    @Autowired com.chargeplatform.order.service.ChargeOrderService orders;
    @Autowired JdbcTemplate db;
    @BeforeEach void seed(){
        for(var table:new String[]{"charge_order","connector","charger","price_period","station","sys_user"})db.update("DELETE FROM "+table);
        db.update("INSERT INTO sys_user(username,display_name,password,role,enabled) VALUES('student','测试用户','unused','USER',true)");
        db.update("INSERT INTO station(id,name,address,status) VALUES(7,'测试站','测试地址','OPERATING')");
        db.update("INSERT INTO price_period(station_id,start_time,end_time,electricity_price,service_price) VALUES(7,'00:00:00','23:59:59',0.60,0.20)");
    }
    @Test void batchCreatesAnExplicitRowWithExactlyTwoSocketsEach(){
        var rows=devices.create(new BikeDeviceService.Create(7L,"A排","TEST", "测试设备", 12));
        assertEquals(12,rows.size());
        assertEquals(24,db.queryForObject("SELECT COUNT(*) FROM connector",Integer.class));
        assertEquals(12,db.queryForObject("SELECT COUNT(*) FROM charger WHERE row_name='A排' AND enabled=true",Integer.class));
        assertEquals("A插座",db.queryForObject("SELECT name FROM connector ORDER BY id LIMIT 1",String.class));
        assertThrows(BusinessException.class,()->devices.create(new BikeDeviceService.Create(7L,"B排","TEST","重复设备",2)));
        assertEquals(12,db.queryForObject("SELECT COUNT(*) FROM charger",Integer.class));
    }
    @Test void disabledOnlineDeviceCannotStartAndActiveTasksPreventManualDisable(){
        var device=devices.create(new BikeDeviceService.Create(7L,"A排","LOCK","测试设备",1)).get(0);
        Long socket=db.queryForObject("SELECT id FROM connector ORDER BY id LIMIT 1",Long.class);
        devices.update(device.getId(),new BikeDeviceService.Update("A排",false,"ONLINE"));
        assertThrows(BusinessException.class,()->charging.start(new OrderRequests.CustomerStart(7L,socket),"student"));
        devices.update(device.getId(),new BikeDeviceService.Update("A排",true,"ONLINE"));
        charging.start(new OrderRequests.CustomerStart(7L,socket),"student");
        assertThrows(BusinessException.class,()->devices.update(device.getId(),new BikeDeviceService.Update("A排",false,"ONLINE")));
        assertThrows(BusinessException.class,()->devices.socketStatus(socket,"FAULT"));
    }
    @Test void faultStateIsIndependentAndOnlyIdleResourcesCanBeChanged(){
        devices.create(new BikeDeviceService.Create(7L,"B排","FAULT","测试设备",1));
        Long socket=db.queryForObject("SELECT id FROM connector ORDER BY id LIMIT 1",Long.class);
        devices.socketStatus(socket,"FAULT");
        assertThrows(BusinessException.class,()->charging.start(new OrderRequests.CustomerStart(7L,socket),"student"));
        devices.socketStatus(socket,"IDLE");
        assertEquals("CHARGING",charging.start(new OrderRequests.CustomerStart(7L,socket),"student").getStatus());
        assertThrows(BusinessException.class,()->devices.socketStatus(socket,"IDLE"));
    }
    @Test void legacyAdminStartCannotBypassTheNewDeviceDisableFlag(){
        var device=devices.create(new BikeDeviceService.Create(7L,"A排","ADMIN","测试设备",1)).get(0);
        Long socket=db.queryForObject("SELECT id FROM connector ORDER BY id LIMIT 1",Long.class);
        devices.update(device.getId(),new BikeDeviceService.Update("A排",false,"ONLINE"));
        assertThrows(BusinessException.class,()->orders.start(new OrderRequests.Start(7L,socket,"豫A12345",true)));
        assertEquals(0,db.queryForObject("SELECT COUNT(*) FROM charge_order",Integer.class));
    }
}
