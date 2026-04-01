// Reports have moved to the Home page (/home).
import { redirect } from 'next/navigation'
export default function ReportsPage() {
  redirect('/home')
}
