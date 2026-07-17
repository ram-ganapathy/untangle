export default function NewSpiral() {
  return (
    <main className="page shell">
      <header className="brand"><a href="#/">Untangle</a><span>new spiral</span></header>
      <section className="form-stage">
        <h1>What’s looping tonight?</h1>
        <p className="subtle">Say it or type it, exactly as messy as it is in your head.</p>
        <div className="input-surface">
          <textarea aria-label="Your thought spiral" placeholder="Pour it in here…" />
          <div className="actions"><button className="button primary">Hold it still</button><button className="button ghost">Show me an example</button></div>
        </div>
      </section>
    </main>
  )
}
