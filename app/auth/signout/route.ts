import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      {
        error: "Supabase environment variables are missing.",
      },
      {
        status: 500,
      },
    );
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(
            ({ name, value, options }) => {
              cookieStore.set(name, value, options);
            },
          );
        },
      },
    },
  );

  await supabase.auth.signOut();

  return NextResponse.redirect(
    new URL("/login", request.url),
    {
      status: 302,
    },
  );
}
