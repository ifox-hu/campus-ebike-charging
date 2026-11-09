package com.ebike.admin;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:toolbar-tests;DB_CLOSE_DELAY=-1","app.bootstrap.username=test-admin","app.bootstrap.password=TestOnly@12345"})
@AutoConfigureMockMvc
class AccountApiTest {
 @Autowired MockMvc mvc;@Autowired JdbcTemplate jdbc;@Autowired PasswordEncoder encoder;@Autowired AccountService service;
 static final String PASSWORD="TestOnly@12345";
 @BeforeEach void prepare(){jdbc.update("DELETE FROM eb_admin_notice_reads");jdbc.update("DELETE FROM eb_admin_accounts WHERE username<>'test-admin'");jdbc.update("UPDATE eb_admin_accounts SET password_hash=?,display_name='管理员',email='',phone='',bio='',font_size='normal',density='comfortable' WHERE username='test-admin'",encoder.encode(PASSWORD));}
 MockHttpSession login(String password)throws Exception{return (MockHttpSession)mvc.perform(post("/api/auth/login").with(csrf()).param("username","test-admin").param("password",password)).andExpect(status().isOk()).andReturn().getRequest().getSession(false);}
 @Test void anonymousIsBlocked()throws Exception{mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());mvc.perform(get("/api/notifications/read-state")).andExpect(status().isUnauthorized());mvc.perform(get("/api/auth/csrf")).andExpect(status().isOk()).andExpect(jsonPath("$.token").isNotEmpty());}
 @Test void loginRejectsWrongPasswordAndNeverReturnsHash()throws Exception{mvc.perform(post("/api/auth/login").with(csrf()).param("username","test-admin").param("password","wrong")).andExpect(status().isUnauthorized());var s=login(PASSWORD);mvc.perform(get("/api/auth/me").session(s)).andExpect(status().isOk()).andExpect(jsonPath("$.data.username").value("test-admin")).andExpect(jsonPath("$.data.password").doesNotExist()).andExpect(jsonPath("$.data.hash").doesNotExist());}
 @Test void csrfIsRequiredForMutations()throws Exception{mvc.perform(post("/api/auth/login").param("username","test-admin").param("password",PASSWORD)).andExpect(status().isForbidden());mvc.perform(put("/api/account/profile").session(login(PASSWORD)).contentType(MediaType.APPLICATION_JSON).content("{\"displayName\":\"测试\"}")).andExpect(status().isForbidden());}
 @Test void profileIsStoredAndRoleIsReadOnly()throws Exception{var s=login(PASSWORD);mvc.perform(put("/api/account/profile").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{\"displayName\":\"值班管理员\",\"email\":\"demo@example.test\",\"phone\":\"\",\"bio\":\"本地资料测试\",\"role\":\"SUPERUSER\"}")).andExpect(status().isOk()).andExpect(jsonPath("$.data.role").value("ADMIN"));mvc.perform(get("/api/auth/me").session(s)).andExpect(jsonPath("$.data.displayName").value("值班管理员")).andExpect(jsonPath("$.data.username").value("test-admin"));}
 @Test void invalidProfileAndPreferencesAreRejected()throws Exception{var s=login(PASSWORD);mvc.perform(put("/api/account/profile").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{\"displayName\":\"  \"}")).andExpect(status().isBadRequest());mvc.perform(put("/api/account/preferences").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{\"fontSize\":\"huge\",\"density\":\"compact\"}")).andExpect(status().isBadRequest());}
 @Test void preferencesSurviveNewLogin()throws Exception{var s=login(PASSWORD);mvc.perform(put("/api/account/preferences").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{\"fontSize\":\"xlarge\",\"density\":\"compact\"}")).andExpect(status().isOk());mvc.perform(get("/api/auth/me").session(login(PASSWORD))).andExpect(jsonPath("$.data.preferences.fontSize").value("xlarge")).andExpect(jsonPath("$.data.preferences.density").value("compact"));}
 @Test void notificationReadsArePersistentAndIdempotent()throws Exception{var s=login(PASSWORD);for(int i=0;i<2;i++)mvc.perform(post("/api/notifications/read-state").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{\"keys\":[\"device:D1:offline\",\"report:R1:pending\"]}")).andExpect(status().isOk()).andExpect(jsonPath("$.data.length()").value(2));mvc.perform(get("/api/notifications/read-state").session(login(PASSWORD))).andExpect(jsonPath("$.data.length()").value(2));}
 @Test void wrongOldPasswordDoesNotChangeAccount()throws Exception{var s=login(PASSWORD);mvc.perform(post("/api/account/password").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{\"currentPassword\":\"wrong\",\"newPassword\":\"ChangedOnly@12345\"}")).andExpect(status().isBadRequest());assertNotNull(login(PASSWORD));}
 @Test void changingPasswordInvalidatesSessionsAndBootstrapDoesNotOverwriteIt()throws Exception{var s=login(PASSWORD);var other=login(PASSWORD);mvc.perform(post("/api/account/password").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{\"currentPassword\":\""+PASSWORD+"\",\"newPassword\":\"ChangedOnly@12345\"}")).andExpect(status().isOk());assertTrue(s.isInvalid());mvc.perform(get("/api/auth/me").session(other)).andExpect(status().isUnauthorized());service.run(new DefaultApplicationArguments());mvc.perform(post("/api/auth/login").with(csrf()).param("username","test-admin").param("password",PASSWORD)).andExpect(status().isUnauthorized());assertNotNull(login("ChangedOnly@12345"));}
 @Test void logoutInvalidatesSession()throws Exception{var s=login(PASSWORD);mvc.perform(post("/api/auth/logout").session(s).with(csrf())).andExpect(status().isOk());assertTrue(s.isInvalid());mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());}
}
