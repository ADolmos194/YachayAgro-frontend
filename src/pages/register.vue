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

import { getCookie } from '../utils/cookies'

const toast = useToast()
const router = useRouter()

const fields: AuthFormField[] = [
  {
    name: 'username',
    type: 'text',
    label: 'Username',
    placeholder: 'Enter your username',
    required: true
  },
  {
    name: 'first_name',
    type: 'text',
    label: 'First Name',
    placeholder: 'Enter your first name',
    required: true
  },
  {
    name: 'last_name',
    type: 'text',
    label: 'Last Name',
    placeholder: 'Enter your last name',
    required: true
  },
  {
    name: 'email',
    type: 'email',
    label: 'Email',
    placeholder: 'Enter your email',
    required: true
  },
  {
    name: 'password',
    label: 'Password',
    type: 'password',
    placeholder: 'Enter your password',
    required: true
  }
]

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
        'X-CSRFToken': getCookie('csrftoken') || ''
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
        description = Object.entries(result.data)
          .map(([key, val]) => `${key}: ${val}`)
          .join('\n')
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
      <UAuthForm :schema="schema" :fields="fields" title="Create an account" @submit="onSubmit">
        <template #description>
          Already have an account?
          <ULink to="/login" class="text-primary font-medium"> Log in </ULink>.
        </template>
        <template #footer>
          By signing up, you agree to our
          <ULink to="#" class="text-primary font-medium"> Terms of Service </ULink>.
        </template>
      </UAuthForm>
    </UPageCard>
  </div>
</template>
