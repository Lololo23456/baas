import Link from 'next/link'
import LiveProofCard from '@/components/bank/LiveProofCard'

export default function Home() {
  return (
    <main style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        padding: '120px 24px 80px',
        background: '#FFFFFF',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 80,
            alignItems: 'center',
          }}>

            {/* Left — Manifesto */}
            <div>
              <div className="pill animate-fade-up" style={{ marginBottom: 32 }}>
                <span className="live-dot" />
                Live on Base Sepolia
              </div>

              <h1 className="display animate-fade-up delay-1" style={{
                fontSize: 'clamp(40px, 4.5vw, 58px)',
                color: '#0F172A',
                marginBottom: 28,
                maxWidth: 540,
              }}>
                More control over<br />
                your money than<br />
                <span style={{ color: '#94A3B8' }}>any bank offers.</span>
              </h1>

              <p className="animate-fade-up delay-2" style={{
                fontSize: 17,
                color: '#64748B',
                lineHeight: 1.7,
                marginBottom: 40,
                maxWidth: 480,
              }}>
                A non-custodial savings interface for freelancers. Your funds
                go directly into an on-chain vault — transparent, auditable,
                and governed by code rather than by our decisions.
              </p>

              <div className="animate-fade-up delay-3" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link href="/app" className="btn btn-dark" style={{ fontSize: 14, padding: '14px 28px' }}>
                  Open App
                </Link>
                <a href="#how-it-works" className="btn btn-outline" style={{ fontSize: 14, padding: '14px 28px' }}>
                  How it works
                </a>
              </div>

              {/* Trust signals */}
              <div className="animate-fade-up delay-4" style={{
                display: 'flex',
                gap: 32,
                marginTop: 56,
                paddingTop: 32,
                borderTop: '1px solid #E2E8F0',
              }}>
                {[
                  { value: '6', label: 'Smart contracts' },
                  { value: '181', label: 'Automated tests' },
                  { value: '0%', label: 'Custody of funds' },
                ].map(({ value, label }) => (
                  <div key={label}>
                    <p style={{ fontSize: 28, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.03em', lineHeight: 1 }}>
                      {value}
                    </p>
                    <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 4, fontWeight: 500 }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Live proof */}
            <div className="animate-fade-up delay-2">
              <LiveProofCard />
            </div>

          </div>
        </div>
      </section>

      {/* ── Three Pillars ────────────────────────────────────── */}
      <section style={{ background: '#F8FAFC', padding: '96px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>

          <div style={{ marginBottom: 64, maxWidth: 560 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
              Three principles
            </p>
            <h2 className="display" style={{ fontSize: 'clamp(28px, 3vw, 40px)', color: '#0F172A' }}>
              What makes it<br />different
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>

            {/* Pillar 1 */}
            <div style={{
              background: '#0F172A',
              borderRadius: '20px 0 0 20px',
              padding: '44px 36px',
              color: '#FFFFFF',
            }}>
              <div style={{
                width: 40, height: 40,
                borderRadius: 10,
                background: 'rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 28,
                fontSize: 18,
              }}>
                I
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, letterSpacing: '-0.02em' }}>
                On-chain transparency
              </h3>
              <p style={{ fontSize: 14, color: '#94A3B8', lineHeight: 1.7, marginBottom: 24 }}>
                Every deposit, every yield fraction, every fee is recorded on
                a public blockchain — verifiable by anyone, in real time.
                Not a quarterly report.
              </p>
              <p style={{ fontSize: 12, color: '#475569', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20 }}>
                Open the contract on Basescan and read the rules yourself.
              </p>
            </div>

            {/* Pillar 2 */}
            <div style={{
              background: '#0F172A',
              padding: '44px 36px',
              color: '#FFFFFF',
              borderLeft: '1px solid rgba(255,255,255,0.06)',
              borderRight: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{
                width: 40, height: 40,
                borderRadius: 10,
                background: 'rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 28,
                fontSize: 18,
              }}>
                II
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, letterSpacing: '-0.02em' }}>
                Collective Ownership
              </h3>
              <p style={{ fontSize: 14, color: '#94A3B8', lineHeight: 1.7, marginBottom: 24 }}>
                $FBK is a cooperative share, not an investment. Distributed
                freely to users through usage. The DAO is a general assembly
                that actually works.
              </p>
              <p style={{ fontSize: 12, color: '#475569', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20 }}>
                Votes executed automatically by code, without intermediaries.
              </p>
            </div>

            {/* Pillar 3 */}
            <div style={{
              background: '#0F172A',
              borderRadius: '0 20px 20px 0',
              padding: '44px 36px',
              color: '#FFFFFF',
            }}>
              <div style={{
                width: 40, height: 40,
                borderRadius: 10,
                background: 'rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 28,
                fontSize: 18,
              }}>
                III
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, letterSpacing: '-0.02em' }}>
                Non-custodial by design
              </h3>
              <p style={{ fontSize: 14, color: '#94A3B8', lineHeight: 1.7, marginBottom: 24 }}>
                We never hold your funds. Withdrawals are governed by smart
                contract code — not by our approval. No one at FinBank can
                freeze your balance.
              </p>
              <p style={{ fontSize: 12, color: '#475569', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20 }}>
                Residual risks: Morpho Blue, EURe issuer, underlying chain.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────── */}
      <section id="how-it-works" style={{ background: '#FFFFFF', padding: '96px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>

          <div style={{ marginBottom: 64, maxWidth: 560 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
              How it works
            </p>
            <h2 className="display" style={{ fontSize: 'clamp(28px, 3vw, 40px)', color: '#0F172A' }}>
              As simple as a banking app.<br />
              <span style={{ color: '#94A3B8' }}>As transparent as a blockchain.</span>
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
            {[
              {
                step: '01',
                title: 'Connect with Face ID',
                desc: 'No seed phrase. No password. Your phone\'s biometric is your key — powered by Base Smart Wallet.',
              },
              {
                step: '02',
                title: 'Receive a personal IBAN',
                desc: 'Connect Monerium to get a SEPA IBAN. Wire EUR from any bank — it arrives as EURe in your wallet within 1 business day.',
              },
              {
                step: '03',
                title: 'Earn yield automatically',
                desc: 'Your funds are placed in Morpho Blue, a DeFi lending protocol. Yield is variable and market-driven. Withdraw anytime.',
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="card" style={{ padding: '36px 32px' }}>
                <p style={{
                  fontSize: 11, fontWeight: 700, color: '#CBD5E1',
                  letterSpacing: '0.08em', marginBottom: 20,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {step}
                </p>
                <h3 style={{ fontSize: 17, fontWeight: 600, color: '#0F172A', marginBottom: 12, letterSpacing: '-0.01em' }}>
                  {title}
                </h3>
                <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.7 }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison table ─────────────────────────────────── */}
      <section style={{ background: '#F8FAFC', padding: '96px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>

          <div style={{ marginBottom: 48, maxWidth: 560 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
              Comparison
            </p>
            <h2 className="display" style={{ fontSize: 'clamp(28px, 3vw, 40px)', color: '#0F172A' }}>
              How FinBank compares<br />to your current options.
            </h2>
          </div>

          <div className="card" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <th scope="col" style={{ padding: '16px 24px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.04em' }}>
                    Criteria
                  </th>
                  {['Traditional bank', 'Neobank', 'FinBank'].map((col, i) => (
                    <th
                      key={col}
                      scope="col"
                      style={{
                        padding: '16px 24px',
                        textAlign: 'center',
                        fontSize: 12,
                        fontWeight: 600,
                        color: i === 2 ? '#0F172A' : '#94A3B8',
                        letterSpacing: '0.04em',
                        background: i === 2 ? '#F1F5F9' : 'transparent',
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Account closure by provider', 'Possible', 'Possible', 'Not by FinBank¹'],
                  ['Yield on deposits', '~0%', '0–3%', 'Variable (Morpho Blue)'],
                  ['Custody of funds', 'Bank holds', 'Provider holds', 'You hold'],
                  ['Governance', 'Opaque', 'Opaque', 'On-chain, auditable'],
                  ['Rule changes', 'Unilateral', 'Unilateral', 'DAO vote required'],
                  ['Audit', 'Annual report', 'Annual report', 'Real-time, public'],
                ].map(([criteria, trad, neo, fb], i) => (
                  <tr
                    key={criteria}
                    style={{ borderBottom: i < 5 ? '1px solid #F1F5F9' : 'none' }}
                  >
                    <th scope="row" style={{ padding: '16px 24px', fontSize: 13, color: '#64748B', fontWeight: 500, textAlign: 'left' }}>
                      {criteria}
                    </th>
                    <td style={{ padding: '16px 24px', textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>
                      {trad}
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>
                      {neo}
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#0F172A', background: '#F8FAFC' }}>
                      {fb}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Risks & Disclaimers ─────────────────────────────── */}
      <section style={{ background: '#FFFFFF', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ marginBottom: 40 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
              Risks & Disclaimers
            </p>
            <h2 className="display" style={{ fontSize: 'clamp(24px, 2.5vw, 34px)', color: '#0F172A' }}>
              Be informed before you deposit.
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {[
              {
                title: 'Smart contract risk',
                desc: 'FinBank\'s contracts have not yet been audited by a third party. A bug could result in loss of funds. An audit is planned before mainnet launch.',
              },
              {
                title: 'Variable yield',
                desc: 'Yield is determined by Morpho Blue\'s lending market rates. It fluctuates with supply and demand. Past rates do not guarantee future returns.',
              },
              {
                title: 'Third-party dependencies',
                desc: 'The fiat bridge relies on Monerium (regulated). The stablecoin relies on Monerium (EURe). Issues with either provider would affect your ability to move fiat.',
              },
              {
                title: 'Regulatory uncertainty',
                desc: 'DeFi regulation in Europe (MiCA, PSD2) is evolving. FinBank is a non-custodial software interface — not a bank, not a payment institution.',
              },
            ].map(({ title, desc }) => (
              <div key={title} style={{
                padding: '24px 28px',
                border: '1px solid #E2E8F0',
                borderRadius: 12,
                borderLeft: '3px solid #F59E0B',
              }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 8 }}>{title}</p>
                <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 24, lineHeight: 1.7 }}>
            ¹ FinBank cannot close your account or freeze withdrawals. However, Morpho Blue (the underlying protocol) has a guardian mechanism that could pause deposits in an emergency. Your funds would remain withdrawable. This is not financial advice.
          </p>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────── */}
      <section style={{ background: '#0F172A', padding: '96px 24px' }}>
        <div style={{
          maxWidth: 600,
          margin: '0 auto',
          textAlign: 'center',
        }}>
          <h2 className="display" style={{
            fontSize: 'clamp(32px, 4vw, 48px)',
            color: '#FFFFFF',
            marginBottom: 20,
          }}>
            Try it on testnet.<br />No real money.
          </h2>
          <p style={{ fontSize: 16, color: '#64748B', lineHeight: 1.7, marginBottom: 40 }}>
            FinBank runs on Base Sepolia — a test network. Use it to explore
            the interface with fake funds. Mainnet launches after the security audit.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/app" className="btn btn-dark" style={{
              background: '#FFFFFF',
              color: '#0F172A',
              fontSize: 14,
              padding: '14px 28px',
            }}>
              Open App
            </Link>
            <a
              href="https://sepolia.basescan.org/address/0x5C763aA7536BF5D67155553BD709Ca66187CDfDd"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
              style={{ color: '#64748B', borderColor: 'rgba(255,255,255,0.12)', fontSize: 14, padding: '14px 28px' }}
            >
              Read the contract ↗
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer style={{
        background: '#0F172A',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '40px 24px',
      }}>
        <div style={{
          maxWidth: 1100,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7,
              background: 'rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>FB</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>FinBank</span>
          </div>
          <p style={{ fontSize: 12, color: '#334155', maxWidth: 400, lineHeight: 1.6 }}>
            FinBank is a non-custodial software interface. We never hold your funds.
            Testnet only · Not financial advice · Audit pending
          </p>
          <div style={{ display: 'flex', gap: 20 }}>
            {[
              { label: 'Contracts', href: 'https://sepolia.basescan.org/address/0x5C763aA7536BF5D67155553BD709Ca66187CDfDd' },
              { label: 'GitHub', href: 'https://github.com/Lololo23456/baas' },
              { label: 'Governance', href: '/governance' },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                target={href.startsWith('http') ? '_blank' : undefined}
                rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                style={{ fontSize: 12, color: '#475569', textDecoration: 'none' }}
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </footer>

    </main>
  )
}
