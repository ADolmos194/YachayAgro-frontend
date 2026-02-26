import { test, expect } from '@playwright/test'

test.describe('Autenticación y Registro', () => {
  test('debería permitir registrarse, verificar y loguearse', async ({ page }) => {
    const timestamp = Date.now()
    const username = `user_e2e_${timestamp}`
    const email = `e2e_${timestamp}@example.com`

    // 1. Registro
    await page.goto('/register', { waitUntil: 'networkidle' })
    await page.fill('input[placeholder="Enter your username"]', username)
    await page.fill('input[placeholder="Enter your first name"]', 'Auto')
    await page.fill('input[placeholder="Enter your last name"]', 'Test')
    await page.fill('input[placeholder="Enter your email"]', email)
    await page.fill('input[placeholder="Enter your password"]', 'Password123!')
    await page.click('button:has-text("Create an account")')

    // Esperar a la pantalla de verificación
    await page.waitForURL(/.*verify/, { timeout: 10000 })

    // 2. Verificación
    await page.fill('input[placeholder*="código"]', '123456')
    await page.click('button:has-text("Verificar")')

    // 3. Login
    await page.waitForURL(/.*login/, { timeout: 10000 })
    await page.fill('input[placeholder="Enter your username"]', username)
    await page.fill('input[placeholder="Enter your password"]', 'Password123!')
    await page.click('button:has-text("Login")')

    // 4. Dashboard
    await page.waitForURL('http://localhost:5173/', { timeout: 10000 })
    // Verificar que el nombre de usuario aparezca en algún lugar (ej. UserMenu)
    await expect(page.locator('body')).toContainText(username)
  })
})
