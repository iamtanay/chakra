// Middleware redirects / → /home for authenticated users.
// This stub exists as a fallback only.
import { redirect } from 'next/navigation'
export default function RootPage() {
  redirect('/home')
}
