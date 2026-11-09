package com.chargeplatform.repair.controller;
import com.chargeplatform.common.dto.ApiResponse;
import com.chargeplatform.repair.domain.RepairTicket;
import com.chargeplatform.repair.dto.RepairRequests;
import com.chargeplatform.repair.service.RepairService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController @RequestMapping("/api/customer/repairs") @PreAuthorize("hasRole('USER')")
public class CustomerRepairController {
    private final RepairService service;public CustomerRepairController(RepairService service){this.service=service;}
    @PostMapping public ApiResponse<RepairTicket> create(@Valid @RequestBody RepairRequests.Create request,Authentication auth){return ApiResponse.created(service.create(request,auth.getName()));}
    @GetMapping public ApiResponse<List<RepairTicket>> list(Authentication auth){return ApiResponse.success(service.mine(auth.getName()));}
    @GetMapping("/{id}") public ApiResponse<RepairTicket> get(@PathVariable Long id,Authentication auth){return ApiResponse.success(service.mine(id,auth.getName()));}
}
