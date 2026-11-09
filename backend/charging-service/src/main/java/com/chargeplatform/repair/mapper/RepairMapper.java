package com.chargeplatform.repair.mapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.chargeplatform.repair.domain.RepairTicket;
import org.apache.ibatis.annotations.*;
@Mapper
public interface RepairMapper extends BaseMapper<RepairTicket> {
    @Select("SELECT * FROM repair_ticket WHERE id=#{id} FOR UPDATE") RepairTicket lock(@Param("id")Long id);
    @Select("SELECT * FROM repair_ticket WHERE owner_username=#{owner} AND request_key=#{key}") RepairTicket byRequest(@Param("owner")String owner,@Param("key")String key);
}
