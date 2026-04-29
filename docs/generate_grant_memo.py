from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT

# Colors
NAVY    = colors.HexColor('#0F172A')
BLUE    = colors.HexColor('#1E40AF')
GREEN   = colors.HexColor('#16A34A')
LIGHT   = colors.HexColor('#F1F5F9')
BORDER  = colors.HexColor('#E2E8F0')
GRAY    = colors.HexColor('#64748B')
WHITE   = colors.white

W, H = A4

def build():
    doc = SimpleDocTemplate(
        '/Users/loic/Desktop/BAAS/docs/FinBank_Grant_Memo.pdf',
        pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=2.5*cm, bottomMargin=2*cm,
    )

    styles = getSampleStyleSheet()

    def S(name, **kw):
        return ParagraphStyle(name, **kw)

    title_style = S('Title2', fontName='Helvetica-Bold', fontSize=22,
                    textColor=WHITE, leading=28, alignment=TA_LEFT)
    sub_style   = S('Sub', fontName='Helvetica', fontSize=10,
                    textColor=colors.HexColor('#94A3B8'), leading=14, alignment=TA_LEFT)
    h2_style    = S('H2', fontName='Helvetica-Bold', fontSize=13,
                    textColor=NAVY, leading=18, spaceBefore=14, spaceAfter=6)
    body_style  = S('Body2', fontName='Helvetica', fontSize=9.5,
                    textColor=colors.HexColor('#334155'), leading=15, spaceAfter=4)
    bullet_style= S('Bullet', fontName='Helvetica', fontSize=9.5,
                    textColor=colors.HexColor('#334155'), leading=15,
                    leftIndent=14, spaceAfter=3)
    label_style = S('Label', fontName='Helvetica-Bold', fontSize=8,
                    textColor=GRAY, leading=12)
    footer_style= S('Footer', fontName='Helvetica', fontSize=7.5,
                    textColor=GRAY, alignment=TA_CENTER)
    tag_style   = S('Tag', fontName='Helvetica-Bold', fontSize=8,
                    textColor=WHITE, leading=10)

    story = []

    # ── Header band ──────────────────────────────────────────────────────────
    header_data = [[
        Paragraph('FinBank', title_style),
        Paragraph('Grant Application Memo', title_style),
    ]]
    header_table = Table(header_data, colWidths=[5.5*cm, 11.5*cm])
    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), NAVY),
        ('VALIGN',     (0,0), (-1,-1), 'MIDDLE'),
        ('LEFTPADDING',(0,0), (-1,-1), 18),
        ('RIGHTPADDING',(0,0),(-1,-1), 18),
        ('TOPPADDING', (0,0), (-1,-1), 18),
        ('BOTTOMPADDING',(0,0),(-1,-1), 18),
        ('SPAN',       (0,0), (0,0)),
    ]))

    # Sub-header
    sub_data = [[
        Paragraph('Decentralized Savings Infrastructure for European Freelancers', sub_style),
        Paragraph('April 2026 &nbsp;|&nbsp; Stage: Testnet Live &nbsp;|&nbsp; Network: Base &nbsp;|&nbsp; fin-bank.xyz', sub_style),
    ]]
    sub_table = Table(sub_data, colWidths=[9*cm, 8*cm])
    sub_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#1E293B')),
        ('VALIGN',     (0,0), (-1,-1), 'MIDDLE'),
        ('LEFTPADDING',(0,0), (-1,-1), 18),
        ('RIGHTPADDING',(0,0),(-1,-1), 18),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING',(0,0),(-1,-1), 8),
        ('ALIGN',      (1,0), (1,0), 'RIGHT'),
    ]))

    story.append(header_table)
    story.append(sub_table)
    story.append(Spacer(1, 16))

    # ── Section helper ────────────────────────────────────────────────────────
    def section(title, content_fn):
        story.append(HRFlowable(width='100%', thickness=1, color=BORDER, spaceAfter=6))
        story.append(Paragraph(title, h2_style))
        content_fn()
        story.append(Spacer(1, 6))

    def p(text): story.append(Paragraph(text, body_style))
    def b(text): story.append(Paragraph(f'• &nbsp; {text}', bullet_style))
    def sp(n=8): story.append(Spacer(1, n))

    # ── Section 1: The Problem ────────────────────────────────────────────────
    def s1():
        p('4 million freelancers in France alone — and tens of millions across Europe — face the same structural injustice: banks can close their accounts arbitrarily, charge high fees on international payments, offer near-zero yield on deposits, and make unilateral decisions in shareholders\' interests — not their clients\'.')
        sp()
        p('Neobanks (Revolut, N26) improved the experience. They did not change the foundations.')
        sp()
        p('<b>FinBank changes the foundations.</b>')
        sp()
        # Comparison table
        data = [
            ['', 'Traditional Banks', 'Neobanks', 'FinBank'],
            ['Account closure risk', 'High', 'Medium', 'Zero (code)'],
            ['Yield on deposits', 'Near zero', '0–2%', '~85% of DeFi yield'],
            ['Governance', 'Opaque', 'Opaque', 'On-chain DAO'],
            ['Withdrawals blockable', 'Yes', 'Yes', 'No — hardcoded'],
            ['Real-time transparency', 'No', 'No', 'Full on-chain'],
        ]
        t = Table(data, colWidths=[4.5*cm, 3.5*cm, 3.5*cm, 3.5*cm])
        t.setStyle(TableStyle([
            ('BACKGROUND',   (0,0), (-1,0), NAVY),
            ('TEXTCOLOR',    (0,0), (-1,0), WHITE),
            ('FONTNAME',     (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE',     (0,0), (-1,-1), 8.5),
            ('ROWBACKGROUNDS',(0,1),(-1,-1), [WHITE, LIGHT]),
            ('GRID',         (0,0), (-1,-1), 0.5, BORDER),
            ('VALIGN',       (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING',  (0,0), (-1,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 8),
            ('TOPPADDING',   (0,0), (-1,-1), 5),
            ('BOTTOMPADDING',(0,0), (-1,-1), 5),
            ('TEXTCOLOR',    (3,1), (3,-1), GREEN),
            ('FONTNAME',     (3,1), (3,-1), 'Helvetica-Bold'),
        ]))
        story.append(t)

    section('1.  The Problem', s1)

    # ── Section 2: What FinBank Is ────────────────────────────────────────────
    def s2():
        p('FinBank is a decentralized savings protocol built on Base, designed for European freelancers. It is the cooperative banking model of the 19th century (Crédit Agricole, Crédit Mutuel) made <b>technically inviolable</b> for the first time.')
        sp()
        b('Withdrawals are technically impossible to block — hardcoded in the smart contract, not written in terms of service.')
        b('Full on-chain accounting — every euro, every yield fraction, every fee is verifiable in real time by anyone.')
        b('Cooperative governance — $FBK tokens are distributed to users by usage, not sold to investors. No VC pre-allocation.')
        b('Zero personal data stored by the protocol — KYC via on-chain EAS attestations only.')

    section('2.  What FinBank Is', s2)

    # ── Section 3: How It Works ───────────────────────────────────────────────
    def s3():
        # Flow
        flow_data = [
            ['Step', 'Action', 'Technology'],
            ['1', 'Connect wallet', 'Base Smart Wallet — Passkey / Face ID'],
            ['2', 'One-click KYC', 'Coinbase Verifications (EAS on-chain attestation)'],
            ['3', 'Receive SEPA transfer', 'Monerium non-custodial IBAN → EURe minted on-chain'],
            ['4', 'Earn yield automatically', 'ERC-4626 Vault → Morpho Blue (~4% APY on EURC)'],
            ['5', 'Withdraw unconditionally', 'Redeem shares → EURe → SEPA at any time'],
        ]
        tf = Table(flow_data, colWidths=[1.2*cm, 5.3*cm, 8.5*cm])
        tf.setStyle(TableStyle([
            ('BACKGROUND',   (0,0), (-1,0), BLUE),
            ('TEXTCOLOR',    (0,0), (-1,0), WHITE),
            ('FONTNAME',     (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE',     (0,0), (-1,-1), 8.5),
            ('ROWBACKGROUNDS',(0,1),(-1,-1), [WHITE, LIGHT]),
            ('GRID',         (0,0), (-1,-1), 0.5, BORDER),
            ('VALIGN',       (0,0), (-1,-1), 'MIDDLE'),
            ('ALIGN',        (0,0), (0,-1), 'CENTER'),
            ('LEFTPADDING',  (0,0), (-1,-1), 8),
            ('TOPPADDING',   (0,0), (-1,-1), 5),
            ('BOTTOMPADDING',(0,0), (-1,-1), 5),
        ]))
        story.append(tf)
        sp()
        p('<b>Revenue model:</b> 85% of Morpho Blue yield goes directly to depositors. 15% to the DAO treasury (buy-back $FBK + insurance fund). No subscription fees, no transaction fees, no hidden charges.')

    section('3.  How It Works', s3)

    # ── Section 4: Current Status ─────────────────────────────────────────────
    def s4():
        data = [
            ['Component', 'Status'],
            ['Smart Contracts (6 contracts)', '✓  Deployed on Base Sepolia'],
            ['Automated Tests', '✓  181 tests — 0 failures'],
            ['Backend Indexer', '✓  Live (Fastify + Prisma + PostgreSQL)'],
            ['Frontend', '✓  Production — fin-bank.xyz'],
            ['Full deposit / yield / withdrawal flow', '✓  Validated on-chain'],
            ['Monerium IBAN partnership', '✓  In active discussion — Base confirmed'],
            ['Fintech Belgium', '✓  Regulatory guidance initiated'],
            ['Security audit', '←  Pending funding (primary blocker)'],
            ['Mainnet deployment', '←  Scheduled post-audit'],
        ]
        t = Table(data, colWidths=[10*cm, 7*cm])
        t.setStyle(TableStyle([
            ('BACKGROUND',   (0,0), (-1,0), NAVY),
            ('TEXTCOLOR',    (0,0), (-1,0), WHITE),
            ('FONTNAME',     (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE',     (0,0), (-1,-1), 8.5),
            ('ROWBACKGROUNDS',(0,1),(-1,-1), [WHITE, LIGHT]),
            ('GRID',         (0,0), (-1,-1), 0.5, BORDER),
            ('VALIGN',       (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING',  (0,0), (-1,-1), 8),
            ('TOPPADDING',   (0,0), (-1,-1), 5),
            ('BOTTOMPADDING',(0,0), (-1,-1), 5),
        ]))
        # Green checkmarks
        for row in range(1, 8):
            t.setStyle(TableStyle([('TEXTCOLOR', (1,row), (1,row), GREEN),
                                   ('FONTNAME',  (1,row), (1,row), 'Helvetica-Bold')]))
        story.append(t)

    section('4.  Current Status', s4)

    # ── Section 5: Why Base ───────────────────────────────────────────────────
    def s5():
        p('Base is not a deployment choice — it is an <b>architectural requirement</b>.')
        sp()
        b('<b>Coinbase Verifications (EAS):</b> native on-chain KYC without data storage. No other L2 provides this. It eliminates the need for a third-party KYC vendor and aligns perfectly with FinBank\'s zero-data-storage principle.')
        b('<b>Base Smart Wallet:</b> Passkey authentication (Face ID / fingerprint) eliminates seed phrases entirely. Non-crypto users can onboard in under 60 seconds.')
        b('<b>Morpho Blue:</b> the most capital-efficient lending protocol, audited, live on Base. Direct integration for yield generation.')
        b('<b>100M+ Coinbase users:</b> a large portion are already KYC-verified. FinBank users with a Coinbase account require zero additional verification steps.')
        b('<b>Low transaction costs:</b> essential for retail depositors making sub-1000 EUR deposits.')

    section('5.  Why Base', s5)

    # ── Section 6: Use of Funds ───────────────────────────────────────────────
    def s6():
        data = [
            ['Priority', 'Item', 'Estimated Cost', 'Rationale'],
            ['1 — Critical', 'Security Audit\n(Code4rena or Spearbit)', '$15,000 – $50,000', 'Required before any\nmainnet deployment'],
            ['2 — Required', 'Legal Structure\n(Belgian BV/SRL)', '~$1,500', 'Required to sign\ncommercial agreements'],
            ['3 — Operations', 'Infrastructure\n(RPC, DB, monitoring)', '$2,000 – $5,000/yr', 'Production reliability'],
        ]
        t = Table(data, colWidths=[2.8*cm, 4.5*cm, 3.7*cm, 4*cm])
        t.setStyle(TableStyle([
            ('BACKGROUND',   (0,0), (-1,0), NAVY),
            ('TEXTCOLOR',    (0,0), (-1,0), WHITE),
            ('FONTNAME',     (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE',     (0,0), (-1,-1), 8.5),
            ('ROWBACKGROUNDS',(0,1),(-1,-1), [WHITE, LIGHT]),
            ('GRID',         (0,0), (-1,-1), 0.5, BORDER),
            ('VALIGN',       (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING',  (0,0), (-1,-1), 8),
            ('TOPPADDING',   (0,0), (-1,-1), 6),
            ('BOTTOMPADDING',(0,0), (-1,-1), 6),
            ('FONTNAME',     (0,1), (0,1), 'Helvetica-Bold'),
            ('TEXTCOLOR',    (0,1), (0,1), colors.HexColor('#B91C1C')),
        ]))
        story.append(t)
        sp()
        p('<b>Zero allocation to:</b> marketing, salaries, token liquidity, or speculative activities. Every dollar goes directly toward making a safe mainnet launch possible.')

    section('6.  Use of Funds', s6)

    # ── Section 7: Roadmap ────────────────────────────────────────────────────
    def s7():
        data = [
            ['Phase', 'Timeline', 'Milestone'],
            ['4 — Integration', 'Now → 3 months', 'Monerium IBAN integration + security audit'],
            ['5 — Mainnet',     '3 – 6 months',   'Mainnet launch, capped TVL, closed whitelist'],
            ['6 — Growth',      '6 – 18 months',  'DAO activation, mobile app, 10,000 depositors'],
            ['7 — Institution', '18 – 48 months', 'EME license, credit products, B2B API'],
        ]
        t = Table(data, colWidths=[3.5*cm, 3.5*cm, 10*cm])
        t.setStyle(TableStyle([
            ('BACKGROUND',   (0,0), (-1,0), NAVY),
            ('TEXTCOLOR',    (0,0), (-1,0), WHITE),
            ('FONTNAME',     (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE',     (0,0), (-1,-1), 8.5),
            ('ROWBACKGROUNDS',(0,1),(-1,-1), [WHITE, LIGHT]),
            ('GRID',         (0,0), (-1,-1), 0.5, BORDER),
            ('VALIGN',       (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING',  (0,0), (-1,-1), 8),
            ('TOPPADDING',   (0,0), (-1,-1), 5),
            ('BOTTOMPADDING',(0,0), (-1,-1), 5),
        ]))
        story.append(t)

    section('7.  Roadmap', s7)

    # ── Section 8: Team ───────────────────────────────────────────────────────
    def s8():
        p('<b>Solo founder</b>, based in Belgium. Built the complete technical stack independently: 6 production-grade smart contracts, backend indexer, and frontend — without external funding.')
        sp()
        b('Smart contracts: Solidity / Foundry — security-reviewed, 181 automated tests')
        b('Backend: TypeScript / Fastify / Prisma / PostgreSQL')
        b('Frontend: Next.js 14 / wagmi v2 / viem — deployed at fin-bank.xyz')
        sp()
        p('<b>Advisors:</b> Fintech Belgium (regulatory guidance) · Monerium (fiat integration, active discussion)')

    section('8.  Team', s8)

    # ── Footer ────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 12))
    story.append(HRFlowable(width='100%', thickness=1, color=BORDER))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        'fin-bank.xyz &nbsp;|&nbsp; Base Sepolia Vault: 0x552138ef55e32b656fe303ccdd5b388dfb7bff9b &nbsp;|&nbsp; l.nys@icloud.com',
        footer_style
    ))

    doc.build(story)
    print("PDF generated: /Users/loic/Desktop/BAAS/docs/FinBank_Grant_Memo.pdf")

build()
