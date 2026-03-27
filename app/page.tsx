import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/supabase/queries";

export default async function HomePage() {
  const user = await getCurrentUser();
  redirect(user ? "/today" : "/login");
}
