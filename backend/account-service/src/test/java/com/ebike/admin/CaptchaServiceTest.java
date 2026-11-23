package com.ebike.admin;
import org.junit.jupiter.api.Test;
import java.security.SecureRandom;
import java.time.Clock;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CaptchaServiceTest {
    private SecureRandom fixedRandom() { return new SecureRandom() { @Override public int nextInt(int bound) { return Math.min(2, bound - 1); } }; }
    @Test void generatedPngDoesNotReturnTheAnswerAndCanBeUsedOnlyOnce() {
        Clock clock = mock(Clock.class); when(clock.millis()).thenReturn(1000L);
        var service = new CaptchaService(clock, fixedRandom());
        var challenge = service.issue(null);
        assertTrue(challenge.image().startsWith("data:image/png;base64,"));
        assertEquals(121000L, challenge.expiresAt());
        service.verify(challenge.id(), "2222");
        assertThrows(IllegalArgumentException.class, () -> service.verify(challenge.id(), "2222"));
    }
    @Test void wrongExpiredAndRefreshedChallengesCannotBeReused() {
        Clock clock = mock(Clock.class); when(clock.millis()).thenReturn(1000L);
        var service = new CaptchaService(clock, fixedRandom());
        var wrong = service.issue(null);
        assertThrows(IllegalArgumentException.class, () -> service.verify(wrong.id(), "0000"));
        assertThrows(IllegalArgumentException.class, () -> service.verify(wrong.id(), "2222"));
        var old = service.issue(null); var fresh = service.issue(old.id());
        assertThrows(IllegalArgumentException.class, () -> service.verify(old.id(), "2222"));
        when(clock.millis()).thenReturn(121000L);
        assertThrows(IllegalArgumentException.class, () -> service.verify(fresh.id(), "2222"));
        assertThrows(IllegalArgumentException.class, () -> service.verify(null, null));
    }
}
