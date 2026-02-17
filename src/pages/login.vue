<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

import { getCookie } from '../utils/cookies'

const toast = useToast()
const router = useRouter()
const { setUser } = useAuth()

const fields: AuthFormField[] = [{
  name: 'username',
  type: 'text',
  label: 'Username',
  placeholder: 'Enter your username',
  required: true
}, {
  name: 'password',
  label: 'Password',
  type: 'password',
  placeholder: 'Enter your password',
  required: true
}, {
  name: 'remember',
  type: 'checkbox',
  label: 'Remember me'
}]


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
        'X-CSRFToken': getCookie('csrftoken') || '',
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
  <div class="flex flex-col items-center justify-center min-h-screen gap-4 p-4">
    <UPageCard class="w-full max-w-md">
      <UAuthForm
        :schema="schema"
        :fields="fields"
        title="Welcome back!"
        icon="i-lucide-lock"
        @submit="onSubmit"
      >
        <template #description>
          Don't have an account? <ULink to="/register" class="text-primary font-medium">
            Sign up
          </ULink>.
        </template>
        <template #password-hint>
          <ULink to="#" class="text-primary font-medium" tabindex="-1">
            Forgot password?
          </ULink>
        </template>
        <template #footer>
          By signing in, you agree to our <ULink to="#" class="text-primary font-medium">
            Terms of Service
          </ULink>.
        </template>
      </UAuthForm>
    </UPageCard>
  </div>
</template>
