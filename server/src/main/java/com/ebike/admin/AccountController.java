package com.ebike.admin;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.security.Principal;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class AccountController {
    private final AccountService accounts;
    private final SessionRegistry sessions;
    public AccountController(AccountService accounts,SessionRegistry sessions){this.accounts=accounts;this.sessions=sessions;}
    @GetMapping("/health") public Map<String,Object> health(){return Map.of("ready",true,"service","admin-account-service");}
    @GetMapping("/auth/csrf") public CsrfToken csrf(CsrfToken token){return token;}
    @GetMapping("/auth/me") public Map<String,Object> me(Principal principal){return Map.of("data",accounts.profile(principal.getName()));}
    @PutMapping("/account/profile") public Map<String,Object> profile(Principal p,@RequestBody AccountService.ProfileInput body){return Map.of("data",accounts.updateProfile(p.getName(),body));}
    @PutMapping("/account/preferences") public Map<String,Object> preferences(Principal p,@RequestBody AccountService.Preferences body){return Map.of("data",accounts.updatePreferences(p.getName(),body));}
    @PostMapping("/account/password") public Map<String,String> password(Principal p,@RequestBody AccountService.PasswordInput body,HttpServletRequest request,HttpServletResponse response){
        accounts.changePassword(p.getName(),body);
        for(Object principal:sessions.getAllPrincipals())if(principal instanceof UserDetails u&&u.getUsername().equals(p.getName()))sessions.getAllSessions(principal,false).forEach(s->s.expireNow());
        var session=request.getSession(false);if(session!=null)session.invalidate();SecurityContextHolder.clearContext();response.addHeader("Set-Cookie",ResponseCookie.from("EBIKE_ADMIN_SESSION","").path("/").httpOnly(true).sameSite("Lax").maxAge(0).build().toString());return Map.of("message","密码已更新，请使用新密码重新登录");
    }
    public record ReadInput(List<String> keys){}
    @GetMapping("/notifications/read-state") public Map<String,Object> reads(Principal p){return Map.of("data",accounts.readNoticeKeys(p.getName()));}
    @PostMapping("/notifications/read-state") public Map<String,Object> markReads(Principal p,@RequestBody ReadInput body){return Map.of("data",accounts.markNoticesRead(p.getName(),body.keys()));}
    @ExceptionHandler(IllegalArgumentException.class) public ResponseEntity<Map<String,String>> badInput(IllegalArgumentException e){return ResponseEntity.badRequest().body(Map.of("message",e.getMessage()));}
}
