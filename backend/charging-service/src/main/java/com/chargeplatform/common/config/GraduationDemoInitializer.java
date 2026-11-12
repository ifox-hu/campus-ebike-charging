package com.chargeplatform.common.config;

import com.chargeplatform.auth.domain.SysUser;
import com.chargeplatform.auth.mapper.SysUserMapper;
import com.chargeplatform.device.service.BikeDeviceService;
import com.chargeplatform.device.mapper.ConnectorMapper;
import com.chargeplatform.device.mapper.ChargerMapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.chargeplatform.device.domain.Charger;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import com.chargeplatform.station.service.StationService;
import com.chargeplatform.station.mapper.StationMapper;
import com.chargeplatform.price.service.PriceService;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalTime;

/** Only the explicit graduation demo profile seeds its separate demonstration DB. */
@Component @Profile("graduation")
public class GraduationDemoInitializer implements ApplicationRunner {
    private final SysUserMapper users;private final PasswordEncoder passwords;private final StationMapper stationMapper;
    private final StationService stations;private final PriceService prices;private final BikeDeviceService devices;private final ConnectorMapper sockets;
    private final ChargerMapper chargers;
    @Value("${DEMO_ADMIN_PASSWORD:DemoAdmin2027!}") private String adminPassword;
    @Value("${DEMO_USER_PASSWORD:DemoUser2027!}") private String userPassword;
    public GraduationDemoInitializer(SysUserMapper users,PasswordEncoder passwords,StationMapper stationMapper,
        StationService stations,PriceService prices,BikeDeviceService devices,ConnectorMapper sockets,ChargerMapper chargers){
        this.users=users;this.passwords=passwords;this.stationMapper=stationMapper;this.stations=stations;this.prices=prices;this.devices=devices;this.sockets=sockets;this.chargers=chargers;
    }
    @Transactional
    public void run(ApplicationArguments args){
        ensureUser("graduation_admin",adminPassword,"毕设演示管理员","ADMIN");
        ensureUser("graduation_user",userPassword,"毕设演示用户","USER");
        ensureUser("graduation_other",userPassword,"权限测试用户","USER");
        // Never modify an existing station, tariff, device, order or account password.
        boolean empty=stationMapper.selectCount(null)==0;
        boolean knownDemo=chargers.selectCount(new QueryWrapper<Charger>().likeRight("code","NYNU-").or().likeRight("code","NYIT-"))>0;
        if(!empty&&!knownDemo)return;
        if(empty){
        // School POIs verified in AMap coordinate picker on 2026-11-09 (GCJ02).
        // These are campus scenario locations, not surveyed charging facilities.
        seed("南阳师范学院·逸夫教学楼南侧（模拟）","南阳师范学院中区 · 逸夫教学楼南侧室外道路附近","32.975612","112.490464","NYNU-TEACH",12,15,12);
        seed("南阳师范学院·中区四公寓东侧（模拟）","南阳师范学院中区 · 第四学生公寓东侧室外道路附近","32.975396","112.489584","NYNU-LIFE",13,15);
        seed("南阳师范学院·体育馆南侧（模拟）","南阳师范学院中区 · 体育馆南侧室外道路附近","32.978431","112.489693","NYNU-GYM",12);
        seed("南阳师范学院·西区八公寓北侧（模拟）","南阳师范学院西区 · 第八学生公寓北侧室外道路附近","32.974283","112.483707","NYNU-WEST",9,11,8);
        seed("南阳师范学院·东升园餐厅南侧（模拟）","南阳师范学院东区 · 东升园餐厅（东区学生餐厅/教工餐厅）南侧道路附近","32.976604","112.495396","NYNU-EAST",10,12);
        seed("南阳理工学院校园充电站（模拟）","河南省南阳市宛城区长江路80号 · 毕设演示点位","32.967595","112.553209","NYIT",12,12);
        }
        seedScenarios();
    }
    private void seedScenarios(){
        try(var stream=new ClassPathResource("scenario-stations.json").getInputStream()){
            for(var site:new ObjectMapper().readTree(stream)){
                String prefix="DEMO-"+site.path("prefix").asText();
                // Stable device prefix survives administrator changes to station names.
                if(chargers.selectCount(new QueryWrapper<Charger>().likeRight("code",prefix+"-"))>0)continue;
                String marker="[scenario:"+site.path("id").asText()+"]";
                if(stationMapper.selectList(null).stream().anyMatch(s->s.getDescription()!=null&&s.getDescription().contains(marker)))continue;
                int[] rows=new int[site.path("rows").size()];for(int i=0;i<rows.length;i++)rows[i]=site.path("rows").get(i).asInt();
                seedScene(site.path("name").asText(),site.path("address").asText(),site.path("latitude").asText(),site.path("longitude").asText(),prefix,site.path("scene").asText(),site.path("note").asText()+" "+marker,rows);
            }
        }catch(java.io.IOException e){throw new IllegalStateException("无法读取多场景演示站点目录",e);}
    }
    private void ensureUser(String name,String password,String display,String role){if(users.selectByUsername(name)==null)users.insert(new SysUser(name,passwords.encode(password),display,role));}
    private void seed(String name,String address,String lat,String lon,String prefix,int... rowCounts){
        seedScene(name,address,lat,lon,prefix,"校园","按参考图固定排布；官方校园GIS楼栋参考与高德GCJ-02锚点，楼栋室外道路附近演示规划估算，非实测充电设施",rowCounts);
    }
    private void seedScene(String name,String address,String lat,String lon,String prefix,String scene,String note,int... rowCounts){
        var site=stations.create(name,address,note,new BigDecimal(lat),new BigDecimal(lon),"GCJ02");
        stations.changeScene(site.getId(),scene);
        prices.create(site.getId(),LocalTime.MIDNIGHT,LocalTime.of(23,59,59),new BigDecimal("0.60"),new BigDecimal("0.20"));
        for(int i=0;i<rowCounts.length;i++){
            String letter=String.valueOf((char)('A'+i)),row=letter+"排";
            devices.create(new BikeDeviceService.Create(site.getId(),row,prefix+"-"+letter,row+"设备",rowCounts[i]));
        }
    }
}
