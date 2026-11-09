package com.chargeplatform.device.controller;
import com.chargeplatform.common.dto.ApiResponse;
import com.chargeplatform.device.domain.*;
import com.chargeplatform.device.service.BikeDeviceService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api/bike") @PreAuthorize("hasRole('ADMIN')")
public class BikeDeviceController {
    private final BikeDeviceService service;
    public BikeDeviceController(BikeDeviceService service){this.service=service;}
    @PostMapping("/devices") public ApiResponse<List<Charger>> create(@Valid @RequestBody BikeDeviceService.Create request){return ApiResponse.created(service.create(request));}
    @PatchMapping("/devices/{id}") public ApiResponse<Charger> update(@PathVariable Long id,@Valid @RequestBody BikeDeviceService.Update request){return ApiResponse.success(service.update(id,request));}
    @PatchMapping("/sockets/{id}/status") public ApiResponse<Connector> socket(@PathVariable Long id,@Valid @RequestBody BikeDeviceService.SocketState request){return ApiResponse.success(service.socketStatus(id,request.status()));}
}
