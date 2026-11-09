package com.chargeplatform.repair.domain;
import com.baomidou.mybatisplus.annotation.*;
import lombok.*;
import java.time.LocalDateTime;

@TableName("repair_ticket") @Getter @NoArgsConstructor(access=AccessLevel.PROTECTED)
public class RepairTicket {
    @TableId(type=IdType.AUTO) private Long id;
    private String ownerUsername;
    private Long stationId;
    private Long chargerId;
    private Long connectorId;
    private String stationName;
    private String deviceCode;
    private String socketCode;
    private String description;
    private String status;
    private String resolution;
    private String handlerUsername;
    private String requestKey;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    public RepairTicket(String owner,Long station,Long charger,Long connector,String name,String device,String socket,String description,String key){
        ownerUsername=owner;stationId=station;chargerId=charger;connectorId=connector;stationName=name;deviceCode=device;socketCode=socket;
        this.description=description;requestKey=key;status="OPEN";createdAt=LocalDateTime.now().truncatedTo(java.time.temporal.ChronoUnit.MICROS);updatedAt=createdAt;
    }
    public void handle(String status,String resolution,String username){this.status=status;this.resolution=resolution;handlerUsername=username;updatedAt=LocalDateTime.now().truncatedTo(java.time.temporal.ChronoUnit.MICROS);}
}
