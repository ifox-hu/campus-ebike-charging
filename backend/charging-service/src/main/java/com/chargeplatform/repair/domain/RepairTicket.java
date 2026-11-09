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
    private String assigneeUsername;
    private String progressHistory;
    public void assign(String username){assigneeUsername=username;}
    public void addProgress(String username,String note){
        try{
            var json=new com.fasterxml.jackson.databind.ObjectMapper();
            java.util.List<java.util.Map<String,String>> history=progressHistory==null?new java.util.ArrayList<>():json.readValue(progressHistory,new com.fasterxml.jackson.core.type.TypeReference<java.util.List<java.util.Map<String,String>>>(){});
            history.add(java.util.Map.of("status",status,"note",note,"at",updatedAt.toString(),"handler",username,"assignee",assigneeUsername==null?"":assigneeUsername));
            progressHistory=json.writeValueAsString(history);
        }catch(Exception e){throw new IllegalStateException("无法保存报修处理记录",e);}
    }
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    public RepairTicket(String owner,Long station,Long charger,Long connector,String name,String device,String socket,String description,String key){
        ownerUsername=owner;stationId=station;chargerId=charger;connectorId=connector;stationName=name;deviceCode=device;socketCode=socket;
        this.description=description;requestKey=key;status="OPEN";createdAt=LocalDateTime.now().truncatedTo(java.time.temporal.ChronoUnit.MICROS);updatedAt=createdAt;
    }
    public void handle(String status,String resolution,String username){this.status=status;this.resolution=resolution;handlerUsername=username;updatedAt=LocalDateTime.now().truncatedTo(java.time.temporal.ChronoUnit.MICROS);}
}
