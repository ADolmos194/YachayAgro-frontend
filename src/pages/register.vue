<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'
import { useRouter } from 'vue-router'

import { getCookie } from '../utils/cookies'

const toast = useToast()
const router = useRouter()

const fields: AuthFormField[] = [{
  name: 'username',
  type: 'text',
  label: 'Username',
  placeholder: 'Enter your username',
  required: true
}, {
  name: 'first_name',
  type: 'text',
  label: 'First Name',
  placeholder: 'Enter your first name',
  required: true
}, {
  name: 'last_name',
  type: 'text',
  label: 'Last Name',
  placeholder: 'Enter your last name',
  required: true
}, {
  name: 'email',
  type: 'email',
  label: 'Email',
  placeholder: 'Enter your email',
  required: true
}, {
  name: 'password',
  label: 'Password',
  type: 'password',
  placeholder: 'Enter your password',
  required: true
}]

const schema = z.object({
  username: z.string().min(3, 'Must be at least 3 characters'),
  first_name: z.string().min(2, 'Required'),
  last_name: z.string().min(2, 'Required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Must be at least 8 characters')
})

type Schema = z.output<typeof schema>

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  try {
    const response = await fetch(`${import.meta.env.VUE_URL_BASE}/auth/register/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken') || '',
      },
      credentials: 'include',
      body: JSON.stringify(payload.data)
    })

    const result = await response.json()

    if (response.ok && result.status === 'success') {
      toast.add({
        title: 'Account Created',
        description: result.message || 'Please verify your email with the code sent.',
        color: 'success'
      })
      // Save email for verification page
      localStorage.setItem('verify_email', payload.data.email)
      router.push('/verify')
    } else {
      // Show errors as toasts in top-right corner
      let description = ''
      if (typeof result.data === 'object' && result.data !== null) {
          description = Object.entries(result.data).map(([key, val]) => `${key}: ${val}`).join('\n')
      } else {
          description = result.message || 'Registration failed'
      }
        
      toast.add({
        title: 'Error creating account',
        description,
        color: 'error',
        icon: 'i-lucide-error'
      })
    }
  } catch (error) {
    console.error('Registration error:', error)
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
        title="Create an account"
        icon="i-lucide-user-plus"
        @submit="onSubmit"
      >
        <template #description>
          Already have an account? <ULink to="/login" class="text-primary font-medium">
            Log in
          </ULink>.
        </template>
        <template #footer>
          By signing up, you agree to our <ULink to="#" class="text-primary font-medium">
            Terms of Service
          </ULink>.
        </template>
      </UAuthForm>
    </UPageCard>
  </div>
</template>
