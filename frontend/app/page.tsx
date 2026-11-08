import { redirect } from 'next/navigation';

// Temporary: the dashboard will live here; until then the top page shows the company list
export default function Home() {
  redirect('/companies');
}
