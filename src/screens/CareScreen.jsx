import { safetyResult } from '../agent/safety'

export default function CareScreen() {
  return (
    <main className="page shell care-page">
      <header className="brand"><a href="#/">Untangle</a><span>care</span></header>
      <section className="care-card">
        <h1>This needs a person, not a diagram.</h1>
        <p>{safetyResult.message}</p>
        <div className="care-resources">
          <p>If you might act on these thoughts or someone is in immediate danger, call your local emergency number now.</p>
          <p>In the U.S. and Canada, call or text <strong>988</strong> for the Suicide &amp; Crisis Lifeline.</p>
          <p>Elsewhere, contact local emergency services or find a verified local helpline at <a href="https://findahelpline.com/" target="_blank" rel="noreferrer">findahelpline.com</a>.</p>
        </div>
        <a className="button ghost" href="#/">Return to your library</a>
      </section>
    </main>
  )
}
