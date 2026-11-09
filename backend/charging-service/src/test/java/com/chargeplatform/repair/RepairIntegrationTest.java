package com.chargeplatform.repair;
import com.chargeplatform.repair.dto.RepairRequests;
import com.chargeplatform.repair.service.RepairService;
import com.chargeplatform.common.exception.BusinessException;
import com.chargeplatform.auth.service.JwtService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.MediaType;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:bike_repairs;MODE=MySQL;DB_CLOSE_DELAY=-1","spring.sql.init.mode=always","spring.sql.init.schema-locations=classpath:bike-schema.sql"})
@AutoConfigureMockMvc @ActiveProfiles("test")
class RepairIntegrationTest {
    @Autowired RepairService repairs;@Autowired JdbcTemplate db;@Autowired MockMvc mvc;@Autowired JwtService jwt;
    @BeforeEach void seed(){
        for(var table:new String[]{"repair_ticket","connector","charger","station","sys_user"})db.update("DELETE FROM "+table);
        db.update("INSERT INTO sys_user(username,display_name,password,role,enabled) VALUES('student','测试用户','unused','USER',true),('other','其他用户','unused','USER',true),('admin','管理员','unused','ADMIN',true)");
        db.update("INSERT INTO station(id,name,address,status) VALUES(7,'测试站','测试地址','OPERATING')");
        db.update("INSERT INTO charger(id,station_id,code,name,status) VALUES(20,7,'BIKE-A','设备','OFFLINE')");
        db.update("INSERT INTO connector(id,charger_id,code,name,rated_power,status) VALUES(31,20,'BIKE-A-01','插座1',300,'FAULT')");
    }
    RepairRequests.Create request(String key){return new RepairRequests.Create(null,31L,"插座指示灯不亮，请检查",key);}
    @Test void offlineSocketCanBeReportedAndReplayDoesNotDuplicate(){
        var created=repairs.create(request("same-request"),"student");
        assertEquals(created.getId(),repairs.create(request("same-request"),"student").getId());
        assertEquals("OPEN",created.getStatus());assertEquals("FAULT",db.queryForObject("SELECT status FROM connector WHERE id=31",String.class));
        assertEquals(1,repairs.mine("student").size());
    }
    @Test void customersOnlyReadTheirOwnTickets(){
        var created=repairs.create(request("own-request"),"student");
        assertTrue(repairs.mine("other").isEmpty());assertThrows(BusinessException.class,()->repairs.mine(created.getId(),"other"));
    }
    @Test void processingAndResolutionAreVisibleAndResolutionIsIdempotent(){
        var created=repairs.create(request("resolve-request"),"student");
        repairs.handle(created.getId(),new RepairRequests.Handle("PROCESSING","已安排检查"),"admin");
        var resolved=repairs.handle(created.getId(),new RepairRequests.Handle("RESOLVED","已更换损坏插座，恢复使用"),"admin");
        assertEquals("RESOLVED",repairs.mine(created.getId(),"student").getStatus());
        assertEquals("admin",resolved.getHandlerUsername());
        assertEquals(resolved.getUpdatedAt(),repairs.handle(created.getId(),new RepairRequests.Handle("RESOLVED","已更换损坏插座，恢复使用"),"admin").getUpdatedAt());
        assertThrows(BusinessException.class,()->repairs.handle(created.getId(),new RepairRequests.Handle("PROCESSING",""),"admin"));
    }
    @Test void validationAndReusedKeyCannotOverwritePreviousDescription(){
        var created=repairs.create(request("key"),"student");
        assertThrows(BusinessException.class,()->repairs.create(new RepairRequests.Create(null,31L,"完全不同的另一个问题","key"),"student"));
        assertThrows(BusinessException.class,()->repairs.handle(created.getId(),new RepairRequests.Handle("RESOLVED",""),"admin"));
        assertThrows(BusinessException.class,()->repairs.create(new RepairRequests.Create(null,null,"没有关联任何设备",null),"student"));
    }
    @Test void userCannotProcessTicketsAndCannotReadAnotherUsersDetail()throws Exception{
        var created=repairs.create(request("permissions"),"student");
        mvc.perform(patch("/api/repairs/"+created.getId()).header("Authorization","Bearer "+jwt.create("student","USER")).contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"RESOLVED\",\"resolution\":\"已修复\"}")).andExpect(status().isForbidden());
        mvc.perform(get("/api/customer/repairs/"+created.getId()).header("Authorization","Bearer "+jwt.create("other","USER"))).andExpect(status().isNotFound());
        mvc.perform(patch("/api/repairs/"+created.getId()).header("Authorization","Bearer "+jwt.create("admin","ADMIN")).contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"RESOLVED\",\"resolution\":\"已修复\"}")).andExpect(status().isOk()).andExpect(jsonPath("$.data.status").value("RESOLVED"));
    }
}
