import { firstSearchParam } from "@/lib/review-auth";

type ReviewLoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export default async function ReviewLoginPage({ searchParams }: ReviewLoginPageProps) {
  const query = await searchParams;
  const error = firstSearchParam(query.error);

  return (
    <main className="page">
      <section className="review-panel review-form-panel">
        <p className="eyebrow">Review login</p>
        <h1>Zaloguj do panelu akceptacji</h1>
        <p>Wpisz swój e-mail. Wyślemy krótki kod logowania.</p>
        {error ? <p className="form-error">Nie udało się wysłać kodu. Sprawdź e-mail.</p> : null}
        <form action="/api/review/login" className="review-form" method="post">
          <label>
            E-mail
            <input autoComplete="email" name="email" required type="email" />
          </label>
          <button className="button-primary" type="submit">
            Wyślij kod
          </button>
        </form>
      </section>
    </main>
  );
}
