package com.chargeplatform.auth.service;

import org.springframework.stereotype.Service;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import javax.imageio.ImageIO;

@Service
public class CaptchaService {
    private static final long TTL_MILLIS = 120_000;
    private final Clock clock;
    private final SecureRandom random;
    private final Map<String, Answer> answers = new HashMap<>();
    private record Answer(String code, long expiresAt) { }
    public record Challenge(String id, String image, long expiresAt) { }

    public CaptchaService() { this(Clock.systemUTC(), new SecureRandom()); }
    CaptchaService(Clock clock, SecureRandom random) { this.clock = clock; this.random = random; }

    public synchronized Challenge issue(String previousId) {
        long now = clock.millis();
        answers.entrySet().removeIf(entry -> entry.getValue().expiresAt() <= now);
        if (previousId != null) answers.remove(previousId);
        if (answers.size() >= 10_000) throw new IllegalArgumentException("验证码请求较多，请稍后重试。");
        StringBuilder code = new StringBuilder();
        for (int i = 0; i < 4; i++) code.append(random.nextInt(10));
        String id = UUID.randomUUID().toString();
        long expiresAt = now + TTL_MILLIS;
        String image = image(code.toString());
        answers.put(id, new Answer(code.toString(), expiresAt));
        return new Challenge(id, image, expiresAt);
    }

    public synchronized void verify(String id, String code) {
        Answer answer = id == null ? null : answers.remove(id);
        if (answer == null) throw new IllegalArgumentException("验证码已失效，请刷新后重试。");
        if (clock.millis() >= answer.expiresAt()) throw new IllegalArgumentException("验证码已过期，请刷新后重试。");
        if (code == null || !MessageDigest.isEqual(answer.code().getBytes(java.nio.charset.StandardCharsets.UTF_8), code.trim().getBytes(java.nio.charset.StandardCharsets.UTF_8)))
            throw new IllegalArgumentException("验证码不正确，请重新输入。");
    }

    private String image(String code) {
        BufferedImage image = new BufferedImage(126, 48, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = image.createGraphics();
        try {
            graphics.setColor(new Color(237, 242, 252)); graphics.fillRect(0, 0, 126, 48);
            graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            graphics.setColor(new Color(180, 190, 225));
            for (int i = 0; i < 5; i++) graphics.drawLine(random.nextInt(126), random.nextInt(48), random.nextInt(126), random.nextInt(48));
            graphics.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 29));
            for (int i = 0; i < 4; i++) {
                graphics.setColor(i % 2 == 0 ? new Color(37, 90, 131) : new Color(118, 90, 208));
                var old = graphics.getTransform();
                graphics.rotate(Math.toRadians(random.nextInt(21) - 10), 17 + i * 27, 30);
                graphics.drawString(code.substring(i, i + 1), 12 + i * 27, 34 + random.nextInt(5));
                graphics.setTransform(old);
            }
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            ImageIO.write(image, "png", output);
            return "data:image/png;base64," + Base64.getEncoder().encodeToString(output.toByteArray());
        } catch (java.io.IOException failure) { throw new IllegalStateException("验证码图片生成失败，请重试。", failure); }
        finally { graphics.dispose(); }
    }
}
