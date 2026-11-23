package com.ebike.admin;
import java.util.Map;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
@RestController
public class CaptchaController {
    private final CaptchaService captchas;
    public CaptchaController(CaptchaService captchas) { this.captchas = captchas; }
    @GetMapping("/api/auth/captcha")
    public ResponseEntity<Map<String,Object>> challenge(@RequestParam(required=false) String previousId) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(Map.of("data",captchas.issue(previousId)));
    }
}
