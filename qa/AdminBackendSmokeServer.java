// Isolated QA server using the existing backend's actual Spring controllers,
// services, security and mappers. All fixture data lives only in this JVM's H2.
// Build the backend test classpath first; see docs/backend-integration.md.
import com.chargeplatform.ChargePlatformApplication;
import org.springframework.boot.SpringApplication;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

class AdminBackendSmokeServer {
    public static void main(String[] args) {
        var context = SpringApplication.run(ChargePlatformApplication.class,
            "--server.address=127.0.0.1", "--server.port=18082", "--spring.profiles.active=test",
            "--spring.datasource.url=jdbc:h2:mem:admin_qa;MODE=MySQL;DB_CLOSE_DELAY=-1",
            "--spring.datasource.driver-class-name=org.h2.Driver", "--spring.datasource.username=sa",
            "--spring.datasource.password=", "--spring.sql.init.mode=never",
            "--app.redis.enabled=false", "--app.rabbit.enabled=false", "--app.simulator.enabled=false",
            "--app.demo-data.enabled=false", "--app.jwt.secret=mobile-qa-only-not-a-production-signing-secret");
        var db = context.getBean(JdbcTemplate.class);
        db.execute("CREATE TABLE sys_user(id BIGINT AUTO_INCREMENT PRIMARY KEY, display_name VARCHAR(50), enabled BOOLEAN, password VARCHAR(255), role VARCHAR(20), username VARCHAR(50) UNIQUE)");
        db.execute("CREATE TABLE station(id BIGINT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), address VARCHAR(255), description VARCHAR(255), status VARCHAR(30), latitude DECIMAL(10,7), longitude DECIMAL(10,7), coordinate_type VARCHAR(16))");
        db.execute("CREATE TABLE charger(id BIGINT AUTO_INCREMENT PRIMARY KEY, station_id BIGINT, code VARCHAR(255) UNIQUE, name VARCHAR(255), status VARCHAR(30))");
        db.execute("CREATE TABLE connector(id BIGINT AUTO_INCREMENT PRIMARY KEY, charger_id BIGINT, code VARCHAR(255) UNIQUE, name VARCHAR(255), rated_power INT, status VARCHAR(30))");
        db.execute("CREATE TABLE price_period(id BIGINT AUTO_INCREMENT PRIMARY KEY, station_id BIGINT, start_time TIME, end_time TIME, electricity_price DECIMAL(10,4), service_price DECIMAL(10,4))");
        db.execute("CREATE TABLE charge_order(id BIGINT AUTO_INCREMENT PRIMARY KEY, order_no VARCHAR(255) UNIQUE, station_id BIGINT, connector_id BIGINT, plate_number VARCHAR(255), status VARCHAR(30), test_order BOOLEAN, archived BOOLEAN, archived_at TIMESTAMP, start_time TIMESTAMP, end_time TIMESTAMP, energy_kwh DECIMAL(12,3), electricity_fee DECIMAL(12,2), service_fee DECIMAL(12,2), total_amount DECIMAL(12,2), owner_username VARCHAR(50), payment_status VARCHAR(20), payment_method VARCHAR(20), payment_no VARCHAR(50) UNIQUE, paid_at TIMESTAMP)");
        db.execute("CREATE TABLE audit_log(id BIGINT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(64), role VARCHAR(32), method VARCHAR(10), path VARCHAR(255), status_code INT, client_ip VARCHAR(64), created_at TIMESTAMP)");
        var encoder = context.getBean(PasswordEncoder.class);
db.update("INSERT INTO sys_user(display_name,enabled,password,role,username) VALUES(?,?,?,?,?)", "管理端隔离验收账号", true, encoder.encode("admin-qa-password"), "ADMIN", "admin_qa");
        db.update("INSERT INTO sys_user(display_name,enabled,password,role,username) VALUES(?,?,?,?,?)", "移动端验收账号", true, encoder.encode("mobile-qa-password"), "USER", "mobile_qa");
        db.update("INSERT INTO sys_user(display_name,enabled,password,role,username) VALUES(?,?,?,?,?)", "另一个测试账号", true, encoder.encode("other-qa-password"), "USER", "other_qa");
        db.update("INSERT INTO station(id,name,address,status) VALUES(7,'校园接口验收站','校园东区模拟点位','OPERATING')");
        db.update("INSERT INTO charger(id,station_id,code,name,status) VALUES(20,7,'BIKE-A','测试设备','ONLINE')");
        db.update("INSERT INTO connector(id,charger_id,code,name,rated_power,status) VALUES(31,20,'BIKE-A-01','插座1',300,'IDLE'),(32,20,'BIKE-A-02','插座2',300,'CHARGING')");
        db.update("INSERT INTO price_period(id,station_id,start_time,end_time,electricity_price,service_price) VALUES(1,7,'00:00:00','23:59:59',0.60,0.20)");
        db.update("INSERT INTO charge_order(id,order_no,station_id,connector_id,status,test_order,archived,start_time,end_time,energy_kwh,electricity_fee,service_fee,total_amount,owner_username,payment_status) VALUES(90,'QA-COMPLETED',7,31,'COMPLETED',true,false,'2026-11-09 10:00:00','2026-11-09 11:30:00',0.450,0.27,0.09,0.36,'mobile_qa','UNPAID'),(91,'QA-CHARGING',7,32,'CHARGING',true,false,'2026-11-09 12:00:00',NULL,0,0,0,0,'mobile_qa','UNPAID'),(92,'QA-OTHER-USER',7,31,'COMPLETED',true,false,'2026-11-09 10:00:00','2026-11-09 11:30:00',0.450,0.27,0.09,0.36,'other_qa','UNPAID')");
        System.out.println("ADMIN_QA_SERVER_READY port=18082 storage=isolated-H2-memory");
    }
}
