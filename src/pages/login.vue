<script setup lang="ts">
import * as z from 'zod'

type AuthFormField = {
  name: string
  type: string
  label?: string
  placeholder?: string
  required?: boolean
  description?: string
  help?: string
  hint?: string
}

type FormSubmitEvent<T> = SubmitEvent & { data: T }
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

import { getCookie } from '../utils/cookies'

const toast = useToast()
const router = useRouter()
const { setUser } = useAuth()

const fields: AuthFormField[] = [
  {
    name: 'username',
    type: 'text',
    label: 'Username',
    placeholder: 'Enter your username',
    required: true
  },
  {
    name: 'password',
    label: 'Password',
    type: 'password',
    placeholder: 'Enter your password',
    required: true
  },
  {
    name: 'remember',
    type: 'checkbox',
    label: 'Remember me'
  }
]

const schema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(8, 'Must be at least 8 characters')
})

type Schema = z.output<typeof schema>

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  try {
    const response = await fetch(`${import.meta.env.VUE_URL_BASE}/auth/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken') || ''
      },
      credentials: 'include',
      body: JSON.stringify({
        username: payload.data.username,
        password: payload.data.password,
        system: `${import.meta.env.VUE_SYSTEM_BASE}`
      })
    })

    const result = await response.json()

    if (response.ok && result.status === 'success') {
      setUser(result.data)
      toast.add({
        title: 'Success',
        description: result.message || 'Logged in successfully',
        color: 'success'
      })
      router.push('/')
    } else {
      // Show error in top-right corner as requested
      toast.add({
        title: 'Error signing in',
        description: result.message || 'Invalid credentials or account issue',
        color: 'error',
        icon: 'i-lucide-info'
      })

      if (result.data?.instruction) {
        if (result.data.email) {
          localStorage.setItem('verify_email', result.data.email)
        }
        // If need verification, redirect to verify page
        router.push('/verify')
      }
    }
  } catch (error) {
    console.error('Login error:', error)
    toast.add({
      title: 'Connection Error',
      description: 'Could not connect to the server',
      color: 'error'
    })
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
      class="w-full max-w-md relative z-10 shadow-2xl border-zinc-200/50 dark:border-zinc-800/50 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md"
    >
      <UAuthForm :schema="schema" :fields="fields" title="Welcome back!" @submit="onSubmit">
        <template #description>
          Don't have an account?
          <ULink to="/register" class="text-primary font-medium"> Sign up </ULink>.
        </template>
        <template #password-hint>
          <ULink to="#" class="text-primary font-medium" tabindex="-1"> Forgot password? </ULink>
        </template>
        <template #footer>
          By signing in, you agree to our
          <ULink to="#" class="text-primary font-medium"> Terms of Service </ULink>.
        </template>
      </UAuthForm>
    </UPageCard>
  </div>
</template>
