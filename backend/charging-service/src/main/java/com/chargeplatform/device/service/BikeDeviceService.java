package com.chargeplatform.device.service;

import com.chargeplatform.common.exception.BusinessException;
import com.chargeplatform.device.domain.*;
import com.chargeplatform.device.mapper.*;
import com.chargeplatform.order.mapper.ChargeOrderMapper;
import com.chargeplatform.station.mapper.StationMapper;
import jakarta.validation.constraints.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service
public class BikeDeviceService {
    private final ChargerMapper devices;
    private final ConnectorMapper sockets;
    private final StationMapper stations;
    private final ChargeOrderMapper orders;
    public BikeDeviceService(ChargerMapper devices,ConnectorMapper sockets,StationMapper stations,ChargeOrderMapper orders){
        this.devices=devices;this.sockets=sockets;this.stations=stations;this.orders=orders;
    }
    public record Create(@NotNull Long stationId,@NotBlank @Size(max=30) String rowName,
                         @NotBlank @Pattern(regexp="[A-Za-z0-9_-]{1,40}") String prefix,
                         @NotBlank @Size(max=60) String name,@Min(1) @Max(30) int count){}
    public record Update(@NotBlank @Size(max=30) String rowName,@NotNull Boolean enabled,
                         @NotBlank @Pattern(regexp="ONLINE|OFFLINE") String status){}
    public record SocketState(@NotBlank @Pattern(regexp="IDLE|FAULT|DISABLED") String status){}
    @Transactional public List<Charger> create(Create request){
        if(stations.selectById(request.stationId())==null)throw new BusinessException(404,"站点不存在");
        if(request.count()<1||request.count()>30)throw new BusinessException(400,"每批创建1至30台设备");
        var result=new ArrayList<Charger>();
        for(int i=1;i<=request.count();i++){
            String code=request.prefix().trim()+"-"+String.format("%02d",i);
            if(devices.selectByCode(code)!=null)throw new BusinessException(409,"设备编号已存在，请更换编号前缀");
            var device=new Charger(request.stationId(),code,request.name().trim()+i);
            device.configureBike(request.rowName().trim(),true,"ONLINE");devices.insert(device);
            sockets.insert(new Connector(device.getId(),code+"-01","A插座",300));
            sockets.insert(new Connector(device.getId(),code+"-02","B插座",300));
            result.add(device);
        }
        return result;
    }
    @Transactional public Charger update(Long id,Update request){
        var device=devices.lock(id);if(device==null)throw new BusinessException(404,"设备不存在");
        if(!List.of("ONLINE","OFFLINE").contains(request.status()))throw new BusinessException(400,"设备通信状态不正确");
        if(!request.enabled()||!"ONLINE".equals(request.status())){
            for(var socket:sockets.selectByChargerId(id)){
                sockets.selectByIdForUpdate(socket.getId());
                if(orders.hasActiveConnector(socket.getId())||"CHARGING".equals(socket.getStatus()))throw new BusinessException(409,"存在活动充电任务，请先结束或核对");
            }
        }
        device.configureBike(request.rowName().trim(),request.enabled(),request.status());devices.updateById(device);return device;
    }
    @Transactional public Connector socketStatus(Long id,String status){
        if(!List.of("IDLE","FAULT","DISABLED").contains(status))throw new BusinessException(400,"插座状态不正确");
        var existing=sockets.selectById(id);if(existing==null)throw new BusinessException(404,"插座不存在");
        devices.lock(existing.getChargerId());var socket=sockets.selectByIdForUpdate(id);
        if(orders.hasActiveConnector(id)||"CHARGING".equals(socket.getStatus()))throw new BusinessException(409,"活动任务未结束，不能修改插座状态");
        socket.changeStatus(status);sockets.updateById(socket);return socket;
    }
}
