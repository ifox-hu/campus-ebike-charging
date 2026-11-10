package com.ebike.admin;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountService implements UserDetailsService, ApplicationRunner {
    private final JdbcTemplate jdbc;
    private final PasswordEncoder encoder;
    private final String bootstrapUsername, bootstrapPassword;
    public AccountService(JdbcTemplate jdbc,PasswordEncoder encoder,@Value("${app.bootstrap.username}") String username,@Value("${app.bootstrap.password}") String password){this.jdbc=jdbc;this.encoder=encoder;bootstrapUsername=username;bootstrapPassword=password;}
    public record Preferences(String fontSize,String density){}
    public record Profile(long id,String username,String displayName,String email,String phone,String bio,String avatar,String role,Preferences preferences,String createdAt,String updatedAt){}
    public record ProfileInput(String displayName,String email,String phone,String bio,String avatar){}
    public record PasswordInput(String currentPassword,String newPassword){}
    private record Stored(Profile profile,String hash){}
    @Override public void run(ApplicationArguments args){
        if(jdbc.queryForObject("SELECT COUNT(*) FROM eb_admin_accounts",Integer.class)==0){
            validatePassword(bootstrapPassword);
            jdbc.update("INSERT INTO eb_admin_accounts(username,password_hash,display_name,created_at,updated_at) VALUES(?,?,?,?,?)",bootstrapUsername,encoder.encode(bootstrapPassword),"管理员",Instant.now().toString(),Instant.now().toString());
        }
    }
    private Stored stored(String username){
        var rows=jdbc.query("SELECT * FROM eb_admin_accounts WHERE username=?",(rs,n)->new Stored(new Profile(rs.getLong("id"),rs.getString("username"),rs.getString("display_name"),rs.getString("email"),rs.getString("phone"),rs.getString("bio"),rs.getString("avatar"),"ADMIN",new Preferences(rs.getString("font_size"),rs.getString("density")),rs.getString("created_at"),rs.getString("updated_at")),rs.getString("password_hash")),username);
        if(rows.isEmpty())throw new UsernameNotFoundException("账号不存在");return rows.get(0);
    }
    @Override public UserDetails loadUserByUsername(String username){Stored s=stored(username);return User.withUsername(s.profile.username()).password(s.hash).roles("ADMIN").build();}
    public Profile profile(String username){return stored(username).profile;}
    private String clean(String value,int max,String name){String s=value==null?"":value.trim();if(s.length()>max)throw new IllegalArgumentException(name+"过长");return s;}
    @Transactional public Profile updateProfile(String username,ProfileInput input){
        String name=clean(input.displayName(),60,"显示名称"),email=clean(input.email(),160,"邮箱"),phone=clean(input.phone(),24,"联系电话"),bio=clean(input.bio(),300,"个人说明");
        if(name.isBlank())throw new IllegalArgumentException("显示名称不能为空");
        if(!email.isEmpty()&&!email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"))throw new IllegalArgumentException("邮箱格式不正确");
        if(!phone.isEmpty()&&!phone.matches("^[+0-9() -]{7,24}$"))throw new IllegalArgumentException("联系电话格式不正确");
        String avatar=input.avatar()==null?profile(username).avatar():AvatarImages.validate(input.avatar());
        jdbc.update("UPDATE eb_admin_accounts SET display_name=?,email=?,phone=?,bio=?,avatar=?,updated_at=? WHERE username=?",name,email,phone,bio,avatar,Instant.now().toString(),username);return profile(username);
    }
    public void validatePassword(String p){
        if(p==null||p.length()<10||p.length()>64||p.getBytes(StandardCharsets.UTF_8).length>72||!p.matches(".*[a-zA-Z].*")||!p.matches(".*[0-9].*"))throw new IllegalArgumentException("密码须为 10～64 个字符，包含字母和数字，UTF-8 不超过 72 字节");
    }
    @Transactional public void changePassword(String username,PasswordInput input){
        Stored s=stored(username);if(input.currentPassword()==null||!encoder.matches(input.currentPassword(),s.hash))throw new IllegalArgumentException("原密码不正确");validatePassword(input.newPassword());if(encoder.matches(input.newPassword(),s.hash))throw new IllegalArgumentException("新密码不能与原密码相同");
        jdbc.update("UPDATE eb_admin_accounts SET password_hash=?,updated_at=? WHERE username=?",encoder.encode(input.newPassword()),Instant.now().toString(),username);
    }
    @Transactional public Profile updatePreferences(String username,Preferences p){
        if(p==null||!Set.of("normal","large","xlarge").contains(p.fontSize()==null?"":p.fontSize())||!Set.of("comfortable","compact").contains(p.density()==null?"":p.density()))throw new IllegalArgumentException("不支持的显示设置");
        jdbc.update("UPDATE eb_admin_accounts SET font_size=?,density=?,updated_at=? WHERE username=?",p.fontSize(),p.density(),Instant.now().toString(),username);return profile(username);
    }
    public List<String> readNoticeKeys(String username){return jdbc.queryForList("SELECT event_key FROM eb_admin_notice_reads WHERE account_id=?",String.class,profile(username).id());}
    public List<String> markNoticesRead(String username,List<String> keys){
        if(keys==null||keys.size()>1000||keys.stream().anyMatch(k->k==null||k.isBlank()||k.length()>220))throw new IllegalArgumentException("通知标识无效或数量过多");
        long id=profile(username).id();for(String key:keys.stream().distinct().toList())try{jdbc.update("INSERT INTO eb_admin_notice_reads(account_id,event_key,read_at) VALUES(?,?,?)",id,key,Instant.now().toString());}catch(DuplicateKeyException ignored){}
        return readNoticeKeys(username);
    }
}
