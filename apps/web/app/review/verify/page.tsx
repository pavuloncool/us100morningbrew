import { firstSearchParam } from "@/lib/review-auth";

type ReviewVerifyPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export default async function ReviewVerifyPage({ searchParams }: ReviewVerifyPageProps) {
  const query = await searchParams;
  const email = firstSearchParam(query.email) ?? "";
  const error = firstSearchParam(query.error);

  return (
    <main className="page">
      <section className="review-panel review-form-panel">
        <p className="eyebrow">Review login</p>
        <h1>Wpisz kod z e-maila</h1>
        <p>Kod został wysłany na adres {email || "podany w poprzednim kroku"}.</p>
        {error ? <p className="form-error">Kod jest niepoprawny albo wygasł.</p> : null}
        <form action="/api/review/verify" className="review-form" method="post">
          <input name="email" type="hidden" value={email} />
          <label>
            Kod
            <input autoComplete="one-time-code" inputMode="numeric" name="code" required type="text" />
          </label>
          <button className="button-primary" type="submit">
            Zaloguj
          </button>
        </form>
        <p>
          <a href="/review/login">Wyślij kod ponownie</a>
        </p>
      </section>
    </main>
  );
}
