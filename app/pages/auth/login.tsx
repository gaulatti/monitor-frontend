import { LoginForm } from "~/components/login-form"

/**
 * The `LoginPage` component renders the login page of the application.
 * It includes a background image and centers the login form within the page.
 *
 * @returns A JSX element representing the login page.
 */
export default function LoginPage() {
  return (
    <div style={{ background: 'url(/login.background.png)', backgroundSize: 'cover' }} className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-3xl">
        <LoginForm />
      </div>
    </div>
  )
}
