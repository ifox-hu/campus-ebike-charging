package com.chargeplatform.device.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@TableName("charger")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Charger {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long stationId;
    private String code;
    private String name;
    private String status;
    private String rowName;
    private Boolean enabled;
    private Long statusRevision=0L;

    public Charger(Long stationId, String code, String name) {
        this.stationId = stationId; this.code = code; this.name = name; this.status = "ONLINE"; this.enabled = true;
    }
    public void updateInfo(String code, String name, String status) { this.code = code; this.name = name; updateStatus(status); }
    public void updateStatus(String status) { if(!java.util.Objects.equals(this.status,status))statusRevision=(statusRevision==null?0:statusRevision)+1;this.status = status; }
    public void configureBike(String rowName, boolean enabled, String status) {
        if(!java.util.Objects.equals(this.enabled,enabled))statusRevision=(statusRevision==null?0:statusRevision)+1;
        this.rowName = rowName; this.enabled = enabled; updateStatus(status);
    }
}
