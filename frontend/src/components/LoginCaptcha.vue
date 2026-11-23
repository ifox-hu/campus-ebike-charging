<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { isStaticDemo } from '../runtime.js';
import { createDemoCaptcha, verifyDemoCaptcha } from '../domain/loginCaptcha.js';
const props = defineProps({ loadChallenge: Function, disabled: Boolean });
const challenge = ref(null),
  code = ref(''),
  loading = ref(false),
  error = ref('');
let revision = 0,
  ready = Promise.resolve(),
  active = true;
function refresh() {
  const version = ++revision;
  const previousId = challenge.value?.id;
  code.value = '';
  error.value = '';
  loading.value = true;
  ready = (async () => {
    try {
      const value = isStaticDemo ? createDemoCaptcha() : await props.loadChallenge(previousId);
      if (!value?.id || !value?.image) throw Error('验证码加载失败，请点击重试。');
      if (active && version === revision) challenge.value = value;
      return value;
    } catch (e) {
      if (active && version === revision) {
        challenge.value = null;
        error.value = e.message || '验证码加载失败，请点击重试。';
      }
    } finally {
      if (active && version === revision) loading.value = false;
    }
  })();
  return ready;
}
async function fillDemo() {
  if (!isStaticDemo) return;
  if (!challenge.value || loading.value) await ready;
  if (!challenge.value) await refresh();
  if (challenge.value) code.value = challenge.value.answer;
}
function validate() {
  if (loading.value || !challenge.value) throw Error('请先加载验证码。');
  if (!code.value.trim()) throw Error('请输入验证码。');
  if (isStaticDemo) verifyDemoCaptcha(challenge.value, code.value);
  else if (Date.now() >= challenge.value.expiresAt) throw Error('验证码已过期，请刷新后重试。');
  return { captchaId: challenge.value.id, captchaCode: code.value.trim() };
}
defineExpose({ refresh, fillDemo, validate });
onMounted(refresh);
onBeforeUnmount(() => {
  active = false;
  revision++;
});
</script>
<template>
  <div class="login-captcha">
    <label class="ec-label" for="energy-captcha">验证码</label>
    <div class="captcha-row">
      <div class="ec-field">
        <input
          id="energy-captcha"
          v-model="code"
          placeholder="请输入验证码"
          autocomplete="off"
          inputmode="numeric"
          pattern="[0-9]{4}"
          required
          maxlength="4"
          :disabled="disabled || loading"
        />
      </div>
      <button
        class="captcha-refresh"
        type="button"
        aria-label="刷新验证码"
        title="点击刷新验证码"
        :disabled="disabled || loading"
        @click="refresh"
      >
        <img v-if="challenge && !loading" :src="challenge.image" alt="验证码图片" /><span v-else>{{
          loading ? '加载中…' : '点击重试'
        }}</span>
      </button>
    </div>
    <p v-if="error" class="captcha-error" role="alert">{{ error }}</p>
  </div>
</template>
<style scoped>
.login-captcha {
  margin-top: 0;
}
.captcha-row {
  display: flex;
  gap: 12px;
  align-items: stretch;
}
.captcha-row .ec-field {
  flex: 1;
  min-width: 0;
  margin-bottom: 0;
}
.captcha-row input {
  width: 100%;
  min-width: 0;
}
.captcha-refresh {
  width: 126px;
  flex: 0 0 126px;
  padding: 0;
  border: 1px solid #9eaee33b;
  border-radius: 7px;
  background: #edf2fc;
  color: #5d6591;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.captcha-refresh img {
  width: 126px;
  height: 48px;
  display: block;
  object-fit: cover;
}
.captcha-refresh:disabled {
  cursor: wait;
  opacity: 0.6;
}
.captcha-error {
  font-size: 12px;
  color: #ffc0bf;
  margin: 8px 0 0;
}
.captcha-row {
  margin-bottom: 16px;
}
@media (max-width: 420px) {
  .captcha-refresh {
    width: 108px;
    flex-basis: 108px;
  }
  .captcha-refresh img {
    width: 108px;
  }
}
</style>
