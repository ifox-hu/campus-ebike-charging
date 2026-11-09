package com.chargeplatform.device.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@TableName("connector")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Connector {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long chargerId;
    private String code;
    private String name;
    private Integer ratedPower;
    private String status;
    private Long statusRevision=0L;

    public Connector(Long chargerId, String code, String name, Integer ratedPower) {
        this.chargerId = chargerId; this.code = code; this.name = name; this.ratedPower = ratedPower; this.status = "IDLE";
    }
    public void updateInfo(String code, String name, Integer ratedPower) { this.code = code; this.name = name; this.ratedPower = ratedPower; }
    public void changeStatus(String status) { if(!java.util.Objects.equals(this.status,status))statusRevision=(statusRevision==null?0:statusRevision)+1;this.status = status; }
}
