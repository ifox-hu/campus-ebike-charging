package com.chargeplatform.repair.service;
import com.chargeplatform.auth.mapper.SysUserMapper;
import com.chargeplatform.common.exception.BusinessException;
import com.chargeplatform.device.mapper.*;
import com.chargeplatform.station.mapper.StationMapper;
import com.chargeplatform.repair.domain.RepairTicket;
import com.chargeplatform.repair.dto.RepairRequests;
import com.chargeplatform.repair.mapper.RepairMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Objects;

@Service
public class RepairService {
    private final RepairMapper tickets;private final SysUserMapper users;private final ConnectorMapper sockets;private final ChargerMapper devices;private final StationMapper stations;
    public RepairService(RepairMapper tickets,SysUserMapper users,ConnectorMapper sockets,ChargerMapper devices,StationMapper stations){this.tickets=tickets;this.users=users;this.sockets=sockets;this.devices=devices;this.stations=stations;}
    @Transactional public RepairTicket create(RepairRequests.Create request,String owner){
        var user=users.selectByUsernameForUpdate(owner);
        if(user==null||!user.isEnabled()||!"USER".equals(user.getRole()))throw new BusinessException(403,"请使用有效的普通用户账号");
        if(request.connectorId()==null&&request.chargerId()==null)throw new BusinessException(400,"请选择设备或插座");
        String body=request.description()==null?"":request.description().trim();
        if(body.length()<5||body.length()>300)throw new BusinessException(400,"请填写5—300字的问题说明");
        if(request.requestKey()!=null){
            var existing=tickets.byRequest(owner,request.requestKey());
            if(existing!=null){
                if(!Objects.equals(existing.getConnectorId(),request.connectorId())||!body.equals(existing.getDescription())
                    ||(request.chargerId()!=null&&!request.chargerId().equals(existing.getChargerId())))throw new BusinessException(409,"这条反馈可能已提交，请先查看报修记录");
                return existing;
            }
        }
        var socket=request.connectorId()==null?null:sockets.selectById(request.connectorId());
        if(request.connectorId()!=null&&socket==null)throw new BusinessException(404,"插座不存在");
        Long deviceId=socket==null?request.chargerId():socket.getChargerId();
        if(request.chargerId()!=null&&!request.chargerId().equals(deviceId))throw new BusinessException(400,"插座与设备不匹配");
        var device=devices.selectById(deviceId);if(device==null)throw new BusinessException(404,"设备不存在");
        var station=stations.selectById(device.getStationId());if(station==null)throw new BusinessException(404,"站点不存在");
        var ticket=new RepairTicket(owner,station.getId(),device.getId(),socket==null?null:socket.getId(),station.getName(),device.getCode(),socket==null?null:socket.getCode(),body,request.requestKey());
        tickets.insert(ticket);return ticket;
    }
    public List<RepairTicket> mine(String username){return tickets.selectList(new LambdaQueryWrapper<RepairTicket>().eq(RepairTicket::getOwnerUsername,username).orderByDesc(RepairTicket::getId));}
    public RepairTicket mine(Long id,String username){var ticket=tickets.selectById(id);if(ticket==null||!username.equals(ticket.getOwnerUsername()))throw new BusinessException(404,"报修记录不存在");return ticket;}
    public List<RepairTicket> list(String status){
        if(status!=null&&!status.isBlank()&&!List.of("OPEN","PROCESSING","RESOLVED").contains(status))throw new BusinessException(400,"报修状态不正确");
        return tickets.selectList(new LambdaQueryWrapper<RepairTicket>().eq(status!=null&&!status.isBlank(),RepairTicket::getStatus,status).orderByDesc(RepairTicket::getId));
    }
    @Transactional public RepairTicket handle(Long id,RepairRequests.Handle request,String handler){
        var ticket=tickets.lock(id);if(ticket==null)throw new BusinessException(404,"报修记录不存在");
        var actor=users.selectByUsername(handler);
        if(actor==null||!actor.isEnabled()||!List.of("ADMIN","OPERATOR").contains(actor.getRole()))throw new BusinessException(403,"没有报修处理权限");
        if("OPERATOR".equals(actor.getRole())&&!handler.equals(ticket.getAssigneeUsername()))throw new BusinessException(403,"只能处理分派给本人的报修");
        String assignee=request.assigneeUsername()==null?ticket.getAssigneeUsername():request.assigneeUsername().trim();
        if(!"ADMIN".equals(actor.getRole())&&!Objects.equals(assignee,ticket.getAssigneeUsername()))throw new BusinessException(403,"只有管理员可分派报修");
        if(assignee!=null&&!assignee.isBlank()){
            var assigned=users.selectByUsername(assignee);
            if(assigned==null||!assigned.isEnabled()||!List.of("ADMIN","OPERATOR").contains(assigned.getRole()))throw new BusinessException(400,"请选择有效的管理员或运营员");
        }
        if(!List.of("PROCESSING","RESOLVED").contains(request.status()))throw new BusinessException(400,"处理状态不正确");
        String result=request.resolution()==null?"":request.resolution().trim();
        if(result.length()>500||("RESOLVED".equals(request.status())&&result.length()<2))throw new BusinessException(400,"请填写2—500字的处理结果");
        if("RESOLVED".equals(ticket.getStatus())){
            if(request.status().equals(ticket.getStatus())&&result.equals(ticket.getResolution()))return ticket;
            throw new BusinessException(409,"该报修已处理完成");
        }
        ticket.assign(assignee==null||assignee.isBlank()?handler:assignee);
        ticket.handle(request.status(),result,handler);ticket.addProgress(handler,result);tickets.updateById(ticket);return ticket;
    }
}
