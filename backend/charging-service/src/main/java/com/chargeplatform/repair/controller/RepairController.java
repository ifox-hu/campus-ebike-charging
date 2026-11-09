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
@RestController @RequestMapping("/api/repairs") @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
public class RepairController {
    private final RepairService service;public RepairController(RepairService service){this.service=service;}
    @GetMapping public ApiResponse<List<RepairTicket>> list(@RequestParam(required=false)String status,Authentication auth){boolean admin=auth.getAuthorities().stream().anyMatch(a->a.getAuthority().equals("ROLE_ADMIN"));return ApiResponse.success(service.list(status).stream().filter(t->admin||auth.getName().equals(t.getAssigneeUsername())).toList());}
    @PatchMapping("/{id}") public ApiResponse<RepairTicket> handle(@PathVariable Long id,@Valid @RequestBody RepairRequests.Handle request,Authentication auth){return ApiResponse.success(service.handle(id,request,auth.getName()));}
}
