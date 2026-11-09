package com.chargeplatform.repair.dto;
import jakarta.validation.constraints.*;
public final class RepairRequests {
    private RepairRequests(){}
    public record Create(Long chargerId,Long connectorId,@NotBlank @Size(min=5,max=300) String description,
                         @Pattern(regexp="[A-Za-z0-9_-]{1,64}") String requestKey) { }
    public record Handle(@NotBlank @Pattern(regexp="PROCESSING|RESOLVED") String status,@Size(max=500) String resolution) { }
}
