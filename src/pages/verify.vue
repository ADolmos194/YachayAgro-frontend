<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'
import { useRouter } from 'vue-router'
import { onMounted, ref } from 'vue'

import { getCookie } from '../utils/cookies'

const toast = useToast()
const router = useRouter()
const email = ref('')

onMounted(() => {
  email.value = localStorage.getItem('verify_email') || ''
})

const fields: AuthFormField[] = [{
  name: 'email',
  type: 'email',
  label: 'Email',
  placeholder: 'Enter your email',
  required: true
}, {
  name: 'code',
  type: 'text',
  label: 'Verification Code',
  placeholder: 'Enter 6-digit code',
  required: true
}]

const schema = z.object({
  email: z.string().email('Invalid email'),
  code: z.string().length(6, 'Must be exactly 6 digits')
})

type Schema = z.output<typeof schema>

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  try {
    const response = await fetch(`${import.meta.env.VUE_URL_BASE}/auth/verify/`, {
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
  }
}
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen gap-4 p-4">
    <UPageCard class="w-full max-w-md">
      <UAuthForm
        :schema="schema"
        :fields="fields"
        :state="{ email }"
        title="Verify your account"
        description="Enter the code sent to your email"
        icon="i-lucide-shield-check"
        @submit="onSubmit"
      >
        <template #footer>
          Didn't receive a code? <ULink to="#" class="text-primary font-medium">
            Resend
          </ULink>
        </template>
      </UAuthForm>
    </UPageCard>
  </div>
</template>
