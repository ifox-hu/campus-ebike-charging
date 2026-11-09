package com.chargeplatform.device.service;
import com.chargeplatform.common.config.GraduationDemoInitializer;
import com.chargeplatform.auth.mapper.SysUserMapper;
import com.chargeplatform.device.mapper.ConnectorMapper;
import com.chargeplatform.station.mapper.StationMapper;
import com.chargeplatform.station.service.StationService;
import com.chargeplatform.price.service.PriceService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.argThat;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:graduation_seed;MODE=MySQL;DB_CLOSE_DELAY=-1","spring.sql.init.mode=always","spring.sql.init.schema-locations=classpath:bike-schema.sql"})
@ActiveProfiles("test") @Import(GraduationSeedIntegrationTest.Configuration.class)
class GraduationSeedIntegrationTest {
    @TestConfiguration static class Configuration {
        @Bean GraduationDemoInitializer seedRunner(SysUserMapper users,PasswordEncoder passwords,StationMapper mapper,StationService sites,PriceService prices,BikeDeviceService devices,ConnectorMapper sockets){return new GraduationDemoInitializer(users,passwords,mapper,sites,prices,devices,sockets);}
    }
    @Autowired GraduationDemoInitializer initializer;@Autowired JdbcTemplate db;
    @SpyBean BikeDeviceService devices;
    @BeforeEach void clear(){for(var table:new String[]{"charge_order","repair_ticket","connector","charger","price_period","station","sys_user"})db.update("DELETE FROM "+table);reset(devices);}
    @Test void newDemoUsesNanyangCampusLocationsWithoutOverwritingExistingStations(){
        initializer.run(null);
        assertEquals(5,db.queryForObject("SELECT COUNT(*) FROM station WHERE name LIKE '南阳师范学院%'",Integer.class));
        assertEquals("南阳理工学院校园充电站（模拟）",db.queryForObject("SELECT name FROM station WHERE longitude=112.553209",String.class));
        assertEquals(6,db.queryForObject("SELECT COUNT(*) FROM station WHERE coordinate_type='GCJ02'",Integer.class));
        String[] areas={"逸夫教学楼南侧","中区四公寓东侧","体育馆南侧","西区八公寓北侧","东升园餐厅南侧"};
        int[][] counts={{12,15,12},{13,15},{12},{9,11,8},{10,12}};
        for(int i=0;i<areas.length;i++){
            Long id=db.queryForObject("SELECT id FROM station WHERE name LIKE ?",Long.class,"%"+areas[i]+"%");
            for(int j=0;j<counts[i].length;j++)assertEquals(counts[i][j],db.queryForObject("SELECT COUNT(*) FROM charger WHERE station_id=? AND row_name=?",Integer.class,id,((char)('A'+j))+"排"));
        }
        assertEquals(306,db.queryForObject("SELECT COUNT(*) FROM connector",Integer.class));
        db.update("UPDATE station SET name='管理员自定义站点' WHERE name LIKE '%逸夫教学楼南侧%'");
        initializer.run(null);
        assertEquals(1,db.queryForObject("SELECT COUNT(*) FROM station WHERE name='管理员自定义站点'",Integer.class));
    }
    @Test void interruptedSeedIsAtomicAndRetryCanCreateTheWholeCatalog(){
        doThrow(new IllegalStateException("simulated interruption")).when(devices).create(argThat(r->r.prefix().equals("NYIT-A")));
        assertThrows(IllegalStateException.class,()->initializer.run(null));
        assertEquals(0,db.queryForObject("SELECT COUNT(*) FROM station",Integer.class));
        assertEquals(0,db.queryForObject("SELECT COUNT(*) FROM charger",Integer.class));
        reset(devices);initializer.run(null);
        assertEquals(6,db.queryForObject("SELECT COUNT(*) FROM station",Integer.class));
        assertEquals(153,db.queryForObject("SELECT COUNT(*) FROM charger",Integer.class));
        initializer.run(null);assertEquals(153,db.queryForObject("SELECT COUNT(*) FROM charger",Integer.class));
    }
}
