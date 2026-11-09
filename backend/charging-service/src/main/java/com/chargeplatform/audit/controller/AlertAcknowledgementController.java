package com.chargeplatform.audit.controller;

import com.chargeplatform.common.dto.ApiResponse;
import com.chargeplatform.common.exception.BusinessException;
import com.chargeplatform.device.mapper.ChargerMapper;
import com.chargeplatform.device.mapper.ConnectorMapper;
import com.chargeplatform.order.mapper.ChargeOrderMapper;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.*;

@RestController @RequestMapping("/api/alert-acknowledgements") @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
public class AlertAcknowledgementController {
    private final JdbcTemplate db;private final ChargerMapper devices;private final ConnectorMapper sockets;private final ChargeOrderMapper orders;
    public AlertAcknowledgementController(JdbcTemplate db,ChargerMapper devices,ConnectorMapper sockets,ChargeOrderMapper orders){this.db=db;this.devices=devices;this.sockets=sockets;this.orders=orders;}
    public record Input(@NotBlank @Pattern(regexp="(DEVICE:[1-9][0-9]*:OFFLINE:[0-9]+|SOCKET:[1-9][0-9]*:FAULT:[0-9]+|ORDER:[1-9][0-9]*:(START_FAILED|ABNORMAL|START_TIMEOUT|OVERDUE))") String alertKey,@NotBlank @Size(min=2,max=500) String note){}
    public record Ack(String alertKey,String note,String username,LocalDateTime updatedAt){}
    @GetMapping public ApiResponse<List<Ack>> list(){return ApiResponse.success(db.query("SELECT alert_key,note,username,updated_at FROM alert_acknowledgement ORDER BY updated_at DESC",(r,n)->new Ack(r.getString(1),r.getString(2),r.getString(3),r.getTimestamp(4).toLocalDateTime())));}
    @PostMapping @Transactional public ApiResponse<Ack> acknowledge(@Valid @RequestBody Input input,Authentication auth){
        String[] parts=input.alertKey().split(":");Long id;
        try{id=Long.valueOf(parts[1]);}catch(NumberFormatException e){throw new BusinessException(400,"告警编号无效");}
        boolean exists=switch(parts[0]){case "DEVICE" -> devices.selectById(id)!=null;case "SOCKET" -> sockets.selectById(id)!=null;default -> orders.selectById(id)!=null;};
        if(!exists)throw new BusinessException(404,"告警关联资源不存在");
        if(!"ORDER".equals(parts[0])){
            Long revision="DEVICE".equals(parts[0])?devices.selectById(id).getStatusRevision():sockets.selectById(id).getStatusRevision();
            if(!String.valueOf(revision==null?0:revision).equals(parts[3]))throw new BusinessException(409,"设备状态已经变化，请刷新后重新核对告警");
        }
        if(input.note().trim().length()<2)throw new BusinessException(400,"请填写有效核对说明");
        var now=LocalDateTime.now();
        // Portable MySQL/H2 upsert; a duplicate insert is harmless and never changes equipment state.
        int updated=db.update("UPDATE alert_acknowledgement SET note=?,username=?,updated_at=? WHERE alert_key=?",input.note().trim(),auth.getName(),now,input.alertKey());
        if(updated==0){try{db.update("INSERT INTO alert_acknowledgement(alert_key,note,username,updated_at) VALUES(?,?,?,?)",input.alertKey(),input.note().trim(),auth.getName(),now);}catch(org.springframework.dao.DuplicateKeyException e){db.update("UPDATE alert_acknowledgement SET note=?,username=?,updated_at=? WHERE alert_key=?",input.note().trim(),auth.getName(),now,input.alertKey());}}
        return ApiResponse.success(new Ack(input.alertKey(),input.note().trim(),auth.getName(),now));
    }
}
