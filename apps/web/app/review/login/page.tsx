import { firstSearchParam } from "@/lib/review-auth";

type ReviewLoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

function errorMessage(error: string | undefined): string | null {
  switch (error) {
    case "config":
      return "Brakuje konfiguracji Supabase w Vercel. Sprawdź SUPABASE_URL i SUPABASE_ANON_KEY.";
    case "email":
      return "Ten e-mail nie ma dostępu do panelu. Dodaj go w Vercel jako US100_REVIEW_EMAILS.";
    case "rate_limit":
      return "Kod był wysyłany zbyt często. Odczekaj chwilę i spróbuj ponownie.";
    case "supabase":
      return "Supabase nie wysłał kodu. Sprawdź ustawienia Auth / Email w Supabase.";
    case "unknown":
      return "Nie udało się wysłać kodu. Sprawdź konfigurację Vercel i Supabase.";
    default:
      return null;
  }
}

export default async function ReviewLoginPage({ searchParams }: ReviewLoginPageProps) {
  const query = await searchParams;
  const error = firstSearchParam(query.error);
  const email = firstSearchParam(query.email) ?? "";
  const message = errorMessage(error);

  return (
    <main className="page">
      <section className="review-panel review-form-panel">
        <p className="eyebrow">Review login</p>
        <h1>Zaloguj do panelu akceptacji</h1>
        <p>Wpisz swój e-mail. Wyślemy krótki kod logowania.</p>
        {message ? <p className="form-error">{message}</p> : null}
        <form action="/api/review/login" className="review-form" method="post">
          <label>
            E-mail
            <input autoComplete="email" defaultValue={email} name="email" required type="email" />
          </label>
          <button className="button-primary" type="submit">
            Wyślij kod
          </button>
        </form>
      </section>
    </main>
  );
}
