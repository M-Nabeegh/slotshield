export function HowItWorks() {
  return (
    <section className="how-it-works content-width" id="how-it-works" aria-labelledby="how-it-works-title">
      <div className="how-it-works-heading">
        <div>
          <p className="studio-kicker">A clear path from public page to safe rehearsal</p>
          <h2 id="how-it-works-title">How it works</h2>
        </div>
        <p>Start with what a visitor can reach, then choose the depth of test your team needs.</p>
      </div>

      <ol className="how-it-works-list">
        <li>
          <span className="how-it-works-index">01</span>
          <div>
            <a href="#website-audit-check">Add your public link</a>
            <p>SlotShield performs a bounded, read-only inspection of the reachable public surface.</p>
          </div>
        </li>
        <li>
          <span className="how-it-works-index">02</span>
          <div>
            <a href="#public-check-result">Review what was observed</a>
            <p>Separate verified public facts from behavior that needs a test environment.</p>
          </div>
        </li>
        <li>
          <span className="how-it-works-index">03</span>
          <div>
            <a href="#staging-audit">Test staging safely</a>
            <p>Connect a test-only adapter or rehearse deterministic fictional failures locally.</p>
          </div>
        </li>
      </ol>
    </section>
  );
}
