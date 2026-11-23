package com.ebike.admin;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.security.core.session.SessionRegistryImpl;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.session.HttpSessionEventPublisher;

@Configuration
public class SecurityConfig {
    @Bean PasswordEncoder passwordEncoder(){return new BCryptPasswordEncoder();}
    @Bean SessionRegistry sessionRegistry(){return new SessionRegistryImpl();}
    @Bean HttpSessionEventPublisher sessionEventPublisher(){return new HttpSessionEventPublisher();}
    static void json(HttpServletResponse response,ObjectMapper mapper,int status,Object data)throws IOException{response.setStatus(status);response.setContentType("application/json;charset=UTF-8");response.setHeader("Cache-Control","no-store");mapper.writeValue(response.getWriter(),data);}
    @Bean SecurityFilterChain filterChain(HttpSecurity http,ObjectMapper mapper,AccountService accounts,SessionRegistry sessions,CaptchaService captchas)throws Exception{
        http.authorizeHttpRequests(a->a.requestMatchers("/api/auth/csrf","/api/auth/captcha","/api/health","/api/auth/login","/error").permitAll().anyRequest().hasRole("ADMIN"))
            .requestCache(c->c.disable())
            .formLogin(f->f.loginProcessingUrl("/api/auth/login")
                .successHandler((req,res,auth)->json(res,mapper,200,Map.of("data",accounts.profile(auth.getName()))))
                .failureHandler((req,res,e)->json(res,mapper,401,Map.of("message","账号或密码不正确"))))
            .logout(l->l.logoutUrl("/api/auth/logout").invalidateHttpSession(true).clearAuthentication(true).deleteCookies("EBIKE_ADMIN_SESSION").logoutSuccessHandler((req,res,auth)->json(res,mapper,200,Map.of("message","已安全退出"))))
            .exceptionHandling(e->e.authenticationEntryPoint((req,res,ex)->json(res,mapper,401,Map.of("message","请登录或重新登录"))).accessDeniedHandler((req,res,ex)->json(res,mapper,403,Map.of("message","请求校验失效，请刷新后重试"))))
            .sessionManagement(s->s.maximumSessions(5).sessionRegistry(sessions).expiredSessionStrategy(event->json(event.getResponse(),mapper,401,Map.of("message","会话已失效，请重新登录"))));
        http.addFilterBefore(new org.springframework.web.filter.OncePerRequestFilter() {
            @Override protected boolean shouldNotFilter(jakarta.servlet.http.HttpServletRequest request) {
                return !"POST".equals(request.getMethod()) || !(request.getContextPath()+"/api/auth/login").equals(request.getRequestURI());
            }
            @Override protected void doFilterInternal(jakarta.servlet.http.HttpServletRequest request, HttpServletResponse response, jakarta.servlet.FilterChain chain) throws jakarta.servlet.ServletException, IOException {
                try { captchas.verify(request.getParameter("captchaId"), request.getParameter("captchaCode")); }
                catch (IllegalArgumentException failure) { json(response,mapper,400,Map.of("message",failure.getMessage())); return; }
                chain.doFilter(request,response);
            }
        },org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
