<script setup lang="ts">
import * as z from 'zod'
type FormSubmitEvent<T> = SubmitEvent & { data: T }
import { useRouter } from 'vue-router'
import { onMounted, reactive, ref } from 'vue'

import { getCookie } from '../utils/cookies'

const toast = useToast()
const router = useRouter()
const state = reactive({
  email: '',
  code: [] as string[]
})

onMounted(() => {
  state.email = localStorage.getItem('verify_email') || ''
})

const schema = z.object({
  email: z.string().email('Invalid email'),
  code: z
    .array(z.string())
    .length(6, 'Must be exactly 6 digits')
    .transform((val) => val.join(''))
})

type Schema = z.output<typeof schema>

async function onResend() {
  if (!state.email) return

  try {
    const response = await fetch(`${import.meta.env.VUE_URL_BASE}/auth/resend/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken') || ''
      },
      credentials: 'include',
      body: JSON.stringify({ email: state.email })
    })

    const result = await response.json()

    if (response.ok && result.status === 'success') {
      toast.add({
        title: 'Sent',
        description: 'A new code has been sent to your email.',
        color: 'success'
      })
    } else {
      toast.add({
        title: 'Error',
        description: result.message || 'Could not resend code',
        color: 'warning'
      })
    }
  } catch (error) {
    console.error('Resend error:', error)
    toast.add({
      title: 'Connection Error',
      description: 'Could not connect to the server',
      color: 'error'
    })
  }
}

const loading = ref(false)

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    const response = await fetch(`${import.meta.env.VUE_URL_BASE}/auth/verify/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken') || ''
      },
      credentials: 'include',
      body: JSON.stringify(payload.data)
    })

    const result = await response.json()

    if (response.ok && result.status === 'success') {
      toast.add({
        title: 'Verified',
        description: result.message || 'Account activated successfully!',
        color: 'success'
      })
      router.push('/login')
    } else {
      toast.add({
        title: 'Verification Failed',
        description: result.message || 'Invalid code',
        color: 'error'
      })
    }
  } catch (error) {
    console.error('Verification error:', error)
    toast.add({
      title: 'Connection Error',
      description: 'Could not connect to the server',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div
    class="flex flex-col items-center justify-center min-h-screen gap-6 p-4 bg-zinc-50 dark:bg-zinc-950 overflow-hidden relative"
  >
    <!-- Brand Background Logo (Watermark effect) -->
    <div
      class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05] dark:opacity-[0.1]"
    >
      <img
        src="/logo_yachay_agro.png"
        alt=""
        class="w-[800px] h-[800px] object-contain blur-[2px]"
      />
    </div>

    <!-- Subtle Background Accents -->
    <div
      class="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] -mr-48 -mt-48"
    />
    <div
      class="absolute bottom-0 left-0 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[120px] -ml-48 -mb-48"
    />

    <UPageCard
      class="w-full max-w-md relative z-10 shadow-2xl border-zinc-200/50 dark:border-zinc-800/50 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm"
    >
      <div class="mb-8">
        <h1 class="text-2xl font-bold text-zinc-900 dark:text-white">Verify your account</h1>
        <p class="text-zinc-500 dark:text-zinc-400 mt-1">
          Enter the 6-digit code sent to your email.
        </p>
      </div>

      <UForm :schema="schema" :state="state" class="space-y-6" @submit="onSubmit">
        <UFormField label="Email" name="email" class="w-full">
          <UInput
            v-model="state.email"
            type="email"
            placeholder="Enter your email"
            icon="i-lucide-mail"
            block
            class="w-full"
          />
        </UFormField>

        <UFormField label="Verification Code" name="code" class="flex flex-col items-center gap-2">
          <UPinInput
            v-model="state.code"
            color="neutral"
            highlight
            placeholder="○"
            :length="6"
            size="lg"
            class="justify-center"
          />
        </UFormField>

        <UButton
          type="submit"
          block
          color="primary"
          size="lg"
          class="font-semibold text-white mt-4"
          :loading="loading"
        >
          Continue
        </UButton>

        <div class="text-center mt-6 text-sm">
          Didn't receive a code?
          <ULink
            to="#"
            class="text-primary font-medium hover:underline transition-all"
            @click.prevent="onResend"
          >
            Resend
          </ULink>
        </div>

        <div class="text-center mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <ULink
            to="/login"
            class="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors inline-flex items-center gap-2 group text-sm"
          >
            <UIcon
              name="i-lucide-arrow-left"
              class="w-4 h-4 transition-transform group-hover:-translate-x-1"
            />
            Back to login
          </ULink>
        </div>
      </UForm>
    </UPageCard>
  </div>
</template>
