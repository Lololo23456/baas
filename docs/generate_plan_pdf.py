#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Génère le PDF FinBank — Plan Complet : Architecture, Vision & Roadmap
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm, mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether, NextPageTemplate,
    BaseDocTemplate, Frame, PageTemplate
)
from reportlab.platypus.flowables import Flowable
from reportlab.pdfgen import canvas as rl_canvas
import os

# ── Couleurs ──────────────────────────────────────────────────────────────────
NAVY       = colors.HexColor('#0F2340')
NAVY_LIGHT = colors.HexColor('#1A3A5C')
BLUE       = colors.HexColor('#1E5F9E')
BLUE_LIGHT = colors.HexColor('#2E86C1')
ACCENT     = colors.HexColor('#00A8E8')
GREEN      = colors.HexColor('#1E8449')
GREEN_BG   = colors.HexColor('#D5F5E3')
ORANGE     = colors.HexColor('#D35400')
ORANGE_BG  = colors.HexColor('#FDEBD0')
GREY_DARK  = colors.HexColor('#2C3E50')
GREY_MED   = colors.HexColor('#5D6D7E')
GREY_LIGHT = colors.HexColor('#EAF0F6')
WHITE      = colors.white
BLACK      = colors.black
TABLE_ALT  = colors.HexColor('#F2F6FC')
BORDER     = colors.HexColor('#BDC3C7')

OUTPUT_PATH = '/Users/loic/Desktop/BAAS/docs/FinBank_Plan_Complet_Vision_Architecture.pdf'

# ── Styles ────────────────────────────────────────────────────────────────────
def make_styles():
    base = getSampleStyleSheet()

    styles = {
        'cover_title': ParagraphStyle('cover_title',
            fontName='Helvetica-Bold', fontSize=36, textColor=WHITE,
            leading=44, alignment=TA_CENTER, spaceAfter=10),
        'cover_subtitle': ParagraphStyle('cover_subtitle',
            fontName='Helvetica', fontSize=16, textColor=ACCENT,
            leading=22, alignment=TA_CENTER, spaceAfter=6),
        'cover_date': ParagraphStyle('cover_date',
            fontName='Helvetica', fontSize=13, textColor=colors.HexColor('#A9CCE3'),
            leading=18, alignment=TA_CENTER),
        'cover_tag': ParagraphStyle('cover_tag',
            fontName='Helvetica-Oblique', fontSize=11, textColor=colors.HexColor('#85929E'),
            leading=16, alignment=TA_CENTER),

        'section_num': ParagraphStyle('section_num',
            fontName='Helvetica-Bold', fontSize=10, textColor=ACCENT,
            leading=14, spaceBefore=18, spaceAfter=2),
        'section_title': ParagraphStyle('section_title',
            fontName='Helvetica-Bold', fontSize=18, textColor=NAVY,
            leading=24, spaceBefore=2, spaceAfter=10),
        'sub_title': ParagraphStyle('sub_title',
            fontName='Helvetica-Bold', fontSize=13, textColor=NAVY_LIGHT,
            leading=18, spaceBefore=14, spaceAfter=6),
        'sub2_title': ParagraphStyle('sub2_title',
            fontName='Helvetica-Bold', fontSize=11, textColor=BLUE,
            leading=16, spaceBefore=10, spaceAfter=4),

        'body': ParagraphStyle('body',
            fontName='Helvetica', fontSize=10, textColor=GREY_DARK,
            leading=16, spaceAfter=6, alignment=TA_JUSTIFY),
        'body_bold': ParagraphStyle('body_bold',
            fontName='Helvetica-Bold', fontSize=10, textColor=GREY_DARK,
            leading=16, spaceAfter=4),
        'bullet': ParagraphStyle('bullet',
            fontName='Helvetica', fontSize=10, textColor=GREY_DARK,
            leading=15, spaceAfter=3, leftIndent=16,
            bulletIndent=4, bulletFontName='Helvetica', bulletFontSize=10),
        'code': ParagraphStyle('code',
            fontName='Courier', fontSize=8.5, textColor=NAVY,
            leading=13, spaceAfter=2, leftIndent=8),
        'caption': ParagraphStyle('caption',
            fontName='Helvetica-Oblique', fontSize=9, textColor=GREY_MED,
            leading=13, alignment=TA_CENTER, spaceAfter=8),
        'callout': ParagraphStyle('callout',
            fontName='Helvetica-Bold', fontSize=10, textColor=NAVY,
            leading=16, spaceAfter=4),
        'never': ParagraphStyle('never',
            fontName='Helvetica-Bold', fontSize=11, textColor=colors.HexColor('#922B21'),
            leading=16, spaceAfter=4),
    }
    return styles

S = make_styles()

# ── Header/Footer ─────────────────────────────────────────────────────────────
class HeaderFooter:
    def __init__(self, title):
        self.title = title

    def __call__(self, canvas, doc):
        canvas.saveState()
        w, h = A4

        # Header bar
        canvas.setFillColor(NAVY)
        canvas.rect(0, h - 28*mm, w, 28*mm, fill=1, stroke=0)

        # Logo text
        canvas.setFont('Helvetica-Bold', 16)
        canvas.setFillColor(WHITE)
        canvas.drawString(18*mm, h - 16*mm, 'FinBank')

        canvas.setFont('Helvetica', 9)
        canvas.setFillColor(ACCENT)
        canvas.drawString(18*mm, h - 23*mm, 'Plan Complet — Architecture, Vision & Roadmap')

        # Page number (right)
        if doc.page > 1:
            canvas.setFont('Helvetica', 9)
            canvas.setFillColor(colors.HexColor('#A9CCE3'))
            canvas.drawRightString(w - 18*mm, h - 16*mm, f'Page {doc.page}')
            canvas.setFont('Helvetica', 8)
            canvas.drawRightString(w - 18*mm, h - 23*mm, 'Confidentiel')

        # Footer
        canvas.setFillColor(NAVY)
        canvas.rect(0, 0, w, 12*mm, fill=1, stroke=0)
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(colors.HexColor('#85929E'))
        canvas.drawString(18*mm, 4*mm, 'FinBank — Document confidentiel — 25 avril 2026')
        canvas.drawRightString(w - 18*mm, 4*mm, 'finbank.xyz')

        canvas.restoreState()

# ── Cover page ────────────────────────────────────────────────────────────────
def cover_page(canvas, doc):
    w, h = A4
    canvas.saveState()

    # Background gradient (navy to darker)
    canvas.setFillColor(NAVY)
    canvas.rect(0, 0, w, h, fill=1, stroke=0)

    # Top accent band
    canvas.setFillColor(BLUE)
    canvas.rect(0, h - 8*mm, w, 8*mm, fill=1, stroke=0)

    # Bottom band
    canvas.setFillColor(NAVY_LIGHT)
    canvas.rect(0, 0, w, 40*mm, fill=1, stroke=0)

    # Left accent stripe
    canvas.setFillColor(ACCENT)
    canvas.rect(0, 0, 6*mm, h, fill=1, stroke=0)

    # Large "FB" watermark
    canvas.setFont('Helvetica-Bold', 180)
    canvas.setFillColor(colors.HexColor('#162C4A'))
    canvas.drawString(55*mm, 80*mm, 'FB')

    # FINBANK title
    canvas.setFont('Helvetica-Bold', 48)
    canvas.setFillColor(WHITE)
    canvas.drawString(20*mm, h - 65*mm, 'FinBank')

    # Accent line under title
    canvas.setStrokeColor(ACCENT)
    canvas.setLineWidth(3)
    canvas.line(20*mm, h - 70*mm, 100*mm, h - 70*mm)

    # Subtitle
    canvas.setFont('Helvetica', 18)
    canvas.setFillColor(ACCENT)
    canvas.drawString(20*mm, h - 83*mm, 'Plan Complet')

    canvas.setFont('Helvetica', 14)
    canvas.setFillColor(colors.HexColor('#A9CCE3'))
    canvas.drawString(20*mm, h - 93*mm, 'Architecture   Vision   Roadmap')

    # Tagline
    canvas.setFont('Helvetica-Oblique', 11)
    canvas.setFillColor(colors.HexColor('#7FB3D3'))
    canvas.drawString(20*mm, h - 115*mm,
        '"La premiere institution financiere de l\'ere numerique')
    canvas.drawString(20*mm, h - 122*mm,
        'construite sur les bons principes depuis le debut."')

    # Status boxes
    boxes = [
        ('6 Smart Contracts', 'deployes sur Sepolia'),
        ('169 Tests', '0 echec'),
        ('~4-5 mois', 'vers le Mainnet'),
    ]
    bx = 20*mm
    for title, sub in boxes:
        canvas.setFillColor(BLUE)
        canvas.roundRect(bx, h - 165*mm, 50*mm, 22*mm, 3, fill=1, stroke=0)
        canvas.setFont('Helvetica-Bold', 12)
        canvas.setFillColor(WHITE)
        canvas.drawString(bx + 3*mm, h - 149*mm, title)
        canvas.setFont('Helvetica', 9)
        canvas.setFillColor(ACCENT)
        canvas.drawString(bx + 3*mm, h - 157*mm, sub)
        bx += 55*mm

    # Date & confidential
    canvas.setFont('Helvetica', 11)
    canvas.setFillColor(colors.HexColor('#A9CCE3'))
    canvas.drawString(20*mm, 22*mm, 'Etat au 25 avril 2026')
    canvas.setFont('Helvetica-Bold', 11)
    canvas.setFillColor(colors.HexColor('#E74C3C'))
    canvas.drawRightString(w - 20*mm, 22*mm, 'CONFIDENTIEL')

    canvas.restoreState()

# ── Helpers ───────────────────────────────────────────────────────────────────
def section_header(num, title):
    return [
        Spacer(1, 4*mm),
        Paragraph(f'SECTION {num}', S['section_num']),
        Paragraph(title, S['section_title']),
        HRFlowable(width='100%', thickness=2, color=NAVY, spaceAfter=8),
    ]

def sub(text):
    return Paragraph(text, S['sub_title'])

def sub2(text):
    return Paragraph(text, S['sub2_title'])

def body(text):
    return Paragraph(text, S['body'])

def bold(text):
    return Paragraph(f'<b>{text}</b>', S['body'])

def bullet(text):
    return Paragraph(f'<bullet>&bull;</bullet> {text}', S['bullet'])

def sp(h=4):
    return Spacer(1, h*mm)

def code_block(lines):
    result = []
    bg_data = [[Paragraph('\n'.join(lines), S['code'])]]
    t = Table(bg_data, colWidths=['100%'])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F0F4F8')),
        ('BOX',        (0,0), (-1,-1), 0.5, BORDER),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    result.append(t)
    result.append(sp(3))
    return result

def callout_box(text, color=ACCENT):
    data = [[Paragraph(text, S['callout'])]]
    t = Table(data, colWidths=['100%'])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#EBF5FB')),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LINEBEFORE', (0,0), (0,-1), 4, color),
    ]))
    return [t, sp(4)]

def make_table(headers, rows, col_widths=None):
    data = [headers] + rows
    if col_widths is None:
        col_widths = [160/len(headers)*mm] * len(headers)

    hstyle = ParagraphStyle('th', fontName='Helvetica-Bold', fontSize=9,
                            textColor=WHITE, leading=13)
    bstyle = ParagraphStyle('td', fontName='Helvetica', fontSize=9,
                            textColor=GREY_DARK, leading=13)

    table_data = []
    for i, row in enumerate(data):
        if i == 0:
            table_data.append([Paragraph(str(c), hstyle) for c in row])
        else:
            table_data.append([Paragraph(str(c), bstyle) for c in row])

    t = Table(table_data, colWidths=col_widths, repeatRows=1)
    style = TableStyle([
        ('BACKGROUND', (0,0), (-1,0), NAVY),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [WHITE, TABLE_ALT]),
        ('BOX',        (0,0), (-1,-1), 0.5, BORDER),
        ('INNERGRID',  (0,0), (-1,-1), 0.3, BORDER),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ])
    t.setStyle(style)
    return [t, sp(4)]

def status_bar(label, pct, done=False):
    """Progress bar row"""
    bar_full  = colors.HexColor('#1E8449') if done else colors.HexColor('#2E86C1')
    bar_empty = colors.HexColor('#D5D8DC')
    tick = 'OK' if done else '...'
    color_text = GREEN if done else BLUE

    label_p = Paragraph(label, ParagraphStyle('sl', fontName='Helvetica', fontSize=9,
                         textColor=GREY_DARK, leading=13))
    pct_p   = Paragraph(f'<b>{pct}%</b>', ParagraphStyle('sp', fontName='Helvetica-Bold',
                         fontSize=9, textColor=color_text, leading=13, alignment=TA_CENTER))
    tick_p  = Paragraph(f'<b>{tick}</b>', ParagraphStyle('st', fontName='Helvetica-Bold',
                         fontSize=9, textColor=color_text, leading=13, alignment=TA_CENTER))

    data = [[label_p, '', pct_p, tick_p]]
    t = Table(data, colWidths=[90*mm, 55*mm, 15*mm, 12*mm])
    filled = max(1, int(55 * pct / 100))
    t.setStyle(TableStyle([
        ('BACKGROUND', (1,0), (1,0), bar_full if done else bar_empty),
        ('BACKGROUND', (0,0), (0,0), WHITE),
        ('BOX',  (1,0), (1,0), 0.3, BORDER),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    return t

# ── Content builders ──────────────────────────────────────────────────────────

def build_section1():
    elems = []
    elems += section_header('1', 'Ce qu\'on construit et pourquoi')

    # Promise callout
    elems += callout_box(
        '"Ta banque actuelle peut fermer ton compte demain matin, prêter ton argent sans te le dire, '
        'et prendre des décisions dans l\'intérêt de ses actionnaires. '
        'FinBank ne peut faire aucune de ces trois choses."',
        NAVY)

    # Three pillars
    elems.append(sub('Les trois piliers de FinBank'))
    pillars_data = [
        [
            Paragraph('<b>1 — Transparence totale</b>',
                ParagraphStyle('p1h', fontName='Helvetica-Bold', fontSize=10,
                               textColor=WHITE, leading=14, spaceAfter=6)),
            Paragraph('<b>2 — Propriété collective</b>',
                ParagraphStyle('p2h', fontName='Helvetica-Bold', fontSize=10,
                               textColor=WHITE, leading=14, spaceAfter=6)),
            Paragraph('<b>3 — Refondation des bases</b>',
                ParagraphStyle('p3h', fontName='Helvetica-Bold', fontSize=10,
                               textColor=WHITE, leading=14, spaceAfter=6)),
        ],
        [
            Paragraph(
                'Chaque euro, chaque fraction de yield, chaque commission : '
                'enregistrés sur une blockchain publique, vérifiables par '
                'n\'importe qui en temps réel. Pas un rapport annuel. La réalité, '
                'lisible dans le code.',
                ParagraphStyle('p1b', fontName='Helvetica', fontSize=9,
                               textColor=GREY_DARK, leading=14)),
            Paragraph(
                '$FBK est une part coopérative, pas un investissement. Distribué '
                'gratuitement aux membres par l\'usage. La DAO est l\'assemblée '
                'générale qui fonctionne vraiment : votes exécutés automatiquement '
                'par le code, sans intermédiaire.',
                ParagraphStyle('p2b', fontName='Helvetica', fontSize=9,
                               textColor=GREY_DARK, leading=14)),
            Paragraph(
                'Les mêmes principes que les coopératives (Crédit Mutuel à l\'origine), '
                'avec les outils qui les rendent enfin inviolables. Les retraits sont '
                'techniquement impossibles à bloquer — codé en dur, immuable. '
                'La confiance est dans le code, pas dans les hommes.',
                ParagraphStyle('p3b', fontName='Helvetica', fontSize=9,
                               textColor=GREY_DARK, leading=14)),
        ]
    ]
    pillars_t = Table(pillars_data, colWidths=[55*mm, 55*mm, 55*mm])
    pillars_t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,0), NAVY),
        ('BACKGROUND', (1,0), (1,0), BLUE),
        ('BACKGROUND', (2,0), (2,0), colors.HexColor('#1A6B3C')),
        ('BACKGROUND', (0,1), (0,1), GREY_LIGHT),
        ('BACKGROUND', (1,1), (1,1), colors.HexColor('#EBF5FB')),
        ('BACKGROUND', (2,1), (2,1), GREEN_BG),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('BOX', (0,0), (-1,-1), 1, NAVY),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    elems.append(pillars_t)
    elems.append(sp(6))

    elems.append(sub('Le problème réel'))
    elems.append(body(
        'Le système bancaire actuel souffre de deux défauts fondamentaux que les néobanques '
        'comme Revolut ou N26 n\'ont fait qu\'atténuer en surface — sans jamais les résoudre.'))
    elems.append(sp(3))

    # Two problem cards side by side
    p1 = [
        Paragraph('<b>Défaut 1 — La lenteur structurelle</b>',
            ParagraphStyle('card_h', fontName='Helvetica-Bold', fontSize=10,
                           textColor=NAVY, leading=14, spaceAfter=4)),
        Paragraph(
            'Les virements bancaires reposent sur des infrastructures des années 70-80 '
            '(SWIFT, systèmes interbancaires). Un virement SEPA prend 1 à 3 jours en 2026. '
            'Incompatible avec l\'économie du travail moderne et les besoins de trésorerie '
            'des indépendants.',
            ParagraphStyle('card_b', fontName='Helvetica', fontSize=9,
                           textColor=GREY_DARK, leading=14))
    ]
    p2 = [
        Paragraph('<b>Défaut 2 — Le contrôle arbitraire</b>',
            ParagraphStyle('card_h2', fontName='Helvetica-Bold', fontSize=10,
                           textColor=NAVY, leading=14, spaceAfter=4)),
        Paragraph(
            'Les banques exercent un pouvoir discrétionnaire absolu : comptes fermés sans '
            'explication, virements bloqués, refus de crédit. Ce pouvoir touche de façon '
            'disproportionnée les freelances (revenus irréguliers = "risque"), et certains '
            'profils géographiques ou sociaux.',
            ParagraphStyle('card_b2', fontName='Helvetica', fontSize=9,
                           textColor=GREY_DARK, leading=14))
    ]
    prob_table = Table([[p1, p2]], colWidths=[83*mm, 83*mm])
    prob_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,0), GREY_LIGHT),
        ('BACKGROUND', (1,0), (1,0), ORANGE_BG),
        ('BOX',        (0,0), (0,0), 1, BLUE),
        ('BOX',        (1,0), (1,0), 1, ORANGE),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    elems.append(prob_table)
    elems.append(sp(6))

    elems.append(sub('La cible initiale : les Freelances'))
    elems.append(body(
        '4 millions+ de freelances en France, systématiquement mal servis par les banques '
        'traditionnelles. Ils sont tech-savvy, communautaires, et ont de vrais problèmes '
        'que FinBank résout directement.'))

    pain_headers = ['Douleur', 'Situation actuelle', 'Avec FinBank']
    pain_rows = [
        ['Compte fermé arbitrairement', 'Courant, recours difficile', 'Impossible — décentralisé'],
        ['Revenus irréguliers = risque', 'Refus de compte / crédit', 'Non pertinent on-chain'],
        ['Virement international', '2-5% de frais, 1-3 jours', 'Quasi-nul, instantané'],
        ['Pas de yield sur épargne', '0-0,5% en compte courant', '~85% du yield DeFi (~3-4%)'],
        ['Séparation pro/perso', 'Compte pro payant', 'Wallet dédié natif'],
    ]
    elems += make_table(pain_headers, pain_rows, [55*mm, 55*mm, 56*mm])

    elems.append(sub('La solution : deux piliers complémentaires'))
    sol_data = [
        [
            Paragraph('<b>Pilier 1 — Finance décentralisée (DeFi)</b>',
                ParagraphStyle('ph', fontName='Helvetica-Bold', fontSize=11,
                               textColor=WHITE, leading=15, spaceAfter=6)),
            Paragraph('<b>Pilier 2 — Gouvernance coopérative</b>',
                ParagraphStyle('ph2', fontName='Helvetica-Bold', fontSize=11,
                               textColor=WHITE, leading=15, spaceAfter=6)),
        ],
        [
            Paragraph(
                'L\'argent est détenu sur une blockchain publique. Aucune entité centrale '
                'ne peut bloquer, geler ou confisquer les fonds. Transactions réglées en '
                'minutes, 24h/24, 7j/7, sans intermédiaire.',
                ParagraphStyle('pb', fontName='Helvetica', fontSize=10,
                               textColor=GREY_DARK, leading=15)),
            Paragraph(
                'Les utilisateurs sont co-propriétaires de la plateforme. Les règles sont '
                'transparentes, votées démocratiquement via la DAO, et ne peuvent pas être '
                'modifiées unilatéralement par une direction.',
                ParagraphStyle('pb2', fontName='Helvetica', fontSize=10,
                               textColor=GREY_DARK, leading=15)),
        ]
    ]
    sol_t = Table(sol_data, colWidths=[83*mm, 83*mm])
    sol_t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,0), NAVY),
        ('BACKGROUND', (1,0), (1,0), BLUE),
        ('BACKGROUND', (0,1), (0,1), GREY_LIGHT),
        ('BACKGROUND', (1,1), (1,1), colors.HexColor('#EBF5FB')),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('BOX', (0,0), (-1,-1), 1, NAVY),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    elems.append(sol_t)
    elems.append(sp(6))

    elems.append(sub('Positionnement vs concurrents'))
    pos_h = ['Critère', 'Banques trad.', 'Néobanques', 'Coopératives', 'FinBank']
    pos_r = [
        ['Vitesse transactions', '1-3 jours', 'Quasi-instantané', '1-3 jours', 'Instantané (blockchain)'],
        ['Risque fermeture compte', 'Élevé', 'Moyen', 'Faible', 'Nul (décentralisé)'],
        ['Gouvernance', 'Opaque', 'Opaque', 'AG symbolique', 'DAO réelle (on-chain)'],
        ['Propriété', 'Actionnaires', 'Actionnaires', 'Membres (en théorie)', 'Membres (en pratique)'],
        ['Transparence', 'Rapport annuel', 'Rapport annuel', 'Rapport annuel', 'Blockchain temps réel'],
        ['Retraits bloquables', 'Oui', 'Oui', 'Oui', 'Non (code immuable)'],
        ['Frais internationaux', 'Élevés', 'Faibles', 'Élevés', 'Quasi-nuls'],
    ]
    elems += make_table(pos_h, pos_r, [38*mm, 28*mm, 28*mm, 30*mm, 42*mm])

    elems += callout_box(
        'FinBank n\'est pas une meilleure banque. Ce sont les mêmes principes qu\'une coopérative, '
        'avec les outils qui les rendent enfin réels. La technologie n\'est pas le projet — '
        'la technologie rend le projet possible.',
        NAVY)
    return elems


def build_section2():
    elems = []
    elems += section_header('2', 'Comment ça marche (sans jargon)')

    elems.append(sub('Vue d\'ensemble en 5 modules'))
    elems += code_block([
        '┌──────────────────────────────────────────────────────────────┐',
        '│                          FINBANK                             │',
        '│                                                              │',
        '│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐ │',
        '│  │  WALLET  │   │   KYC    │   │  VAULT   │   │   DAO    │ │',
        '│  │ Passkey  │──▶│  EAS +   │──▶│ ERC-4626 │──▶│  $FBK /  │ │',
        '│  │ Face ID  │   │  Synaps  │   │  Morpho  │   │  veFBK   │ │',
        '│  └──────────┘   └──────────┘   └──────────┘   └──────────┘ │',
        '│                                      │                      │',
        '│                             ┌────────┴────────┐             │',
        '│                        ┌────▼────┐      ┌─────▼────┐       │',
        '│                        │  FIAT   │      │  YIELD   │       │',
        '│                        │Monerium │      │  ~4% APY │       │',
        '│                        │  IBAN   │      │  (EURC)  │       │',
        '│                        └─────────┘      └──────────┘       │',
        '└──────────────────────────────────────────────────────────────┘',
    ])

    # Module 1
    elems.append(sub('Module 1 — Le Vault (le cœur financier)'))
    elems.append(body(
        'Le Vault est le smart contract qui gère l\'argent des membres. Il suit le standard '
        'ERC-4626, la norme internationale des vaults DeFi — ce qui le rend interopérable '
        'avec tout l\'écosystème.'))
    elems += code_block([
        'Freelance dépose 1 000 EUR',
        '         │',
        '         ▼',
        '   Monerium convertit EUR → EURC (stablecoin euro)',
        '         │',
        '         ▼',
        '   FinBankVault reçoit 1 000 EURC',
        '         │',
        '         ├── Dépose dans Morpho Blue → génère ~4% APY',
        '         │                │',
        '         │    ┌───────────┴───────────┐',
        '         │    │ ~85% aux déposants    │  ~15% trésorerie DAO',
        '         │    │ (~340 EUR/an sur 1000)│  (Buy-back $FBK +',
        '         │    │                       │   fonds d\'assurance)',
        '         │    └───────────────────────┘',
        '         ▼',
        '   Freelance reçoit des "fbEURC" (recu de depot, remboursable a tout moment)',
    ])
    elems += callout_box(
        'CENSURE-RÉSISTANCE : Les dépôts requièrent un KYC valide. '
        'Les retraits ne sont JAMAIS bloqués — même si le KYC expire, '
        'même si la DAO vote pour. Personne ne peut bloquer l\'accès à l\'argent d\'un membre.',
        GREEN)

    # Module 2
    elems.append(sub('Module 2 — L\'IBAN (le pont fiat <-> blockchain)'))
    elems += code_block([
        'Compte bancaire du client',
        '         │  Virement SEPA classique',
        '         ▼',
        '   IBAN Monerium (non-custodial, zone SEPA complète)',
        '         │  Conversion instantanée EUR → EURC',
        '         ▼',
        '   Wallet Base du freelance (on-chain)',
        '         │',
        '         ▼',
        '   Vault FinBank (dépôt automatique ou manuel)',
    ])
    elems.append(body(
        'Monerium fournit un vrai IBAN européen lié directement à l\'adresse blockchain '
        'du freelance. Non-custodial : Monerium ne peut pas bloquer l\'accès aux fonds.'))

    # Module 3
    elems.append(sub('Module 3 — Le KYC sans honeypot de données'))
    elems.append(body(
        'Le KYC est une obligation légale, mais FinBank ne stocke aucune donnée personnelle. '
        'La conformité est déléguée à des Attestors agréés via le standard EAS (Ethereum '
        'Attestation Service).'))
    elems += code_block([
        '1. L\'utilisateur passe son KYC chez Synaps (partenaire agréé)',
        '         │',
        '         ▼',
        '2. Synaps écrit une "attestation" on-chain sur EAS',
        '   Contenu : "Ce wallet 0x... a passé le KYC le 01/01/2026"',
        '         │',
        '         ▼',
        '3. L\'utilisateur appelle registerAttestation() une seule fois',
        '         │',
        '         ▼',
        '4. FinBankVault vérifie l\'attestation avant chaque dépôt',
        '   → Valide     : dépôt autorisé',
        '   → Révoquée   : dépôt bloqué (retrait toujours possible)',
    ])
    props_h = ['Propriété', 'Explication']
    props_r = [
        ['Zéro honeypot', 'FinBank DAO ne détient aucune donnée personnelle'],
        ['Agnostique', 'N\'importe quel Attestor agréé peut être ajouté/retiré par vote DAO'],
        ['Révocable', 'Si Synaps est compromis, la DAO le révoque immédiatement'],
        ['Conformité MiCA/AML', 'Traçabilité assurée par les Attestors, pas par FinBank'],
    ]
    elems += make_table(props_h, props_r, [60*mm, 106*mm])

    # Module 4
    elems.append(sub('Module 4 — Le Wallet (l\'expérience utilisateur)'))
    elems.append(body(
        'Base Smart Wallet — l\'utilisateur s\'authentifie avec son empreinte digitale ou '
        'Face ID. Pas de phrase secrète à sauvegarder. Pas de risque de perte d\'accès. '
        'UX identique à une app bancaire classique (Revolut, Lydia), mais avec la sécurité '
        'et la décentralisation d\'un wallet blockchain.'))

    # Module 5
    elems.append(sub('Module 5 — La Gouvernance coopérative ($FBK / $veFBK)'))
    elems.append(body(
        '$FBK est une part coopérative, pas un token spéculatif. La DAO est '
        'l\'assemblée générale — mais qui fonctionne vraiment : votes exécutés '
        'automatiquement par le code, sans direction qui "prend en compte" la décision et l\'oublie.'))
    gov_h = ['Concept', 'Description', 'Pouvoir']
    gov_r = [
        ['$FBK\n(part coopérative)', 'Fair Launch — distribué gratuitement par usage du protocole. '
         'Les profits de trésorerie reviennent aux membres via buy-back, pas à des actionnaires.',
         'Co-propriété progressive du protocole'],
        ['$veFBK', 'FBK bloqués 1 sem. à 4 ans → pouvoir de vote proportionnel (modèle Curve veCRV)',
         'Vote DAO + part majorée du yield'],
        ['DAO\n(assemblée générale)', 'Gouvernance on-chain via FinBankGovernor.sol — '
         'votes auto-exécutés, pas de direction intermédiaire',
         'Paramètres protocole, Attestors, frais, marchés Morpho'],
        ['Timelock', 'Délai obligatoire entre vote et exécution (sécurité)',
         'Empêche les attaques de gouvernance rapides'],
    ]
    elems += make_table(gov_h, gov_r, [30*mm, 90*mm, 46*mm])
    elems += callout_box(
        'Ce que la DAO ne peut PAS faire : bloquer les retraits. '
        'Cette propriété est codée en dur dans le smart contract, immuable. '
        'C\'est la garantie fondamentale — la confiance est dans le code, pas dans les hommes.',
        GREEN)
    return elems


def build_section3():
    elems = []
    elems += section_header('3', 'Le modèle économique')

    elems += callout_box(
        'Principe directeur : FinBank ne gagne de l\'argent que si les membres en gagnent. '
        'Les revenus viennent du yield, pas de frais sur les clients.')

    elems.append(sub('Flux des revenus'))
    elems += code_block([
        'Yield généré par Morpho Blue (sur les dépôts EURC)',
        '            │',
        '    ┌───────┴───────┐',
        '    │               │',
        '  ~85%            ~15%',
        'Freelances      Trésorerie DAO',
        '                    │',
        '          ┌─────────┴─────────┐',
        '          │                   │',
        '    Buy-back $FBK      Fonds d\'assurance',
        '  (pression acheteuse)   (couverture exploits)',
    ])

    elems.append(sub('Simulation concrète (APY Morpho Blue : 4% sur EURC)'))
    sim_h = ['TVL (Total Value Locked)', 'Yield brut annuel', 'Part DAO (15%)', 'Part membres (85%)']
    sim_r = [
        ['100 000 EUR', '4 000 EUR', '600 EUR', '3 400 EUR'],
        ['1 000 000 EUR', '40 000 EUR', '6 000 EUR', '34 000 EUR'],
        ['10 000 000 EUR', '400 000 EUR', '60 000 EUR', '340 000 EUR'],
        ['100 000 000 EUR', '4 000 000 EUR', '600 000 EUR', '3 400 000 EUR'],
    ]
    elems += make_table(sim_h, sim_r, [52*mm, 40*mm, 30*mm, 44*mm])

    elems.append(body('Ce que le freelance ne paye jamais : frais de tenue de compte, '
                      'frais de virement, commissions sur paiements SEPA, abonnement mensuel.'))
    elems.append(sp(4))

    elems.append(sub('Flywheel économique du protocole'))
    elems += code_block([
        '  + de dépôts → + de yield → + de buy-back $FBK',
        '        ↑                              │',
        '        │                     Valeur $FBK augmente',
        '        │                              │',
        '        └──── Attractivité accrue ─────┘',
    ])

    elems.append(sub('Revenus futurs (V2+)'))
    rev_h = ['Source', 'Modèle', 'Disponibilité']
    rev_r = [
        ['Frais de change', 'Spread <0,5% sur conversions EUR/USD', 'V2'],
        ['Avances sur factures', 'Crédit on-chain collatéralisé par fbEURC', 'V2'],
        ['API B2B', 'Plateformes (Malt, Deel) qui paient leurs freelances', 'V2'],
        ['Multi-stratégie Morpho', 'Vote DAO sur répartition entre marchés', 'V2'],
    ]
    elems += make_table(rev_h, rev_r, [48*mm, 86*mm, 32*mm])
    return elems


def build_section4():
    elems = []
    elems += section_header('4', 'Où on en est — 25 avril 2026')

    elems.append(sub('État d\'avancement des phases'))

    # Progress table
    prog_data = [
        [Paragraph('<b>Phase</b>', ParagraphStyle('ph', fontName='Helvetica-Bold', fontSize=9,
                    textColor=WHITE, leading=13)),
         Paragraph('<b>Description</b>', ParagraphStyle('pd', fontName='Helvetica-Bold', fontSize=9,
                    textColor=WHITE, leading=13)),
         Paragraph('<b>Avancement</b>', ParagraphStyle('pa', fontName='Helvetica-Bold', fontSize=9,
                    textColor=WHITE, leading=13, alignment=TA_CENTER)),
         Paragraph('<b>Statut</b>', ParagraphStyle('ps', fontName='Helvetica-Bold', fontSize=9,
                    textColor=WHITE, leading=13, alignment=TA_CENTER)),
        ]
    ]

    phases = [
        ('Phase 0', 'Cadrage, vision, architecture, business model', 100, True),
        ('Phase 1', 'Smart Contracts (169 tests) + Backend API/indexeur', 100, True),
        ('Phase 2', 'Déploiement Sepolia + tests end-to-end on-chain', 100, True),
        ('Phase 3', 'Frontend Web MVP (Next.js + wagmi + shadcn/ui)', 0, False),
        ('Phase 4', 'KYC Synaps + IBAN Monerium (partenaires commerciaux)', 0, False),
        ('Phase 5', 'Audit externe + Déploiement Base Mainnet', 0, False),
    ]

    bst = ParagraphStyle('bst', fontName='Helvetica', fontSize=9, textColor=GREY_DARK, leading=13)
    for phase, desc, pct, done in phases:
        color = GREEN if done else (BLUE if pct > 0 else GREY_MED)
        statut = 'COMPLET' if done else ('EN COURS' if pct > 0 else 'A VENIR')
        sc = GREEN_BG if done else (colors.HexColor('#EBF5FB') if pct > 0 else colors.HexColor('#F2F3F4'))
        tc = GREEN if done else (BLUE if pct > 0 else GREY_MED)
        prog_data.append([
            Paragraph(f'<b>{phase}</b>', ParagraphStyle('ph2', fontName='Helvetica-Bold',
                       fontSize=9, textColor=NAVY, leading=13)),
            Paragraph(desc, bst),
            Paragraph(f'<b>{pct}%</b>', ParagraphStyle('pp', fontName='Helvetica-Bold',
                       fontSize=9, textColor=tc, leading=13, alignment=TA_CENTER)),
            Paragraph(f'<b>{statut}</b>', ParagraphStyle('ps2', fontName='Helvetica-Bold',
                       fontSize=9, textColor=tc, leading=13, alignment=TA_CENTER)),
        ])

    prog_t = Table(prog_data, colWidths=[22*mm, 100*mm, 20*mm, 24*mm], repeatRows=1)
    row_colors = [GREEN_BG, GREEN_BG, GREEN_BG,
                  colors.HexColor('#EBF5FB'),
                  colors.HexColor('#F9FBFC'),
                  colors.HexColor('#F9FBFC')]
    ts = TableStyle([
        ('BACKGROUND', (0,0), (-1,0), NAVY),
        ('BOX',        (0,0), (-1,-1), 0.5, BORDER),
        ('INNERGRID',  (0,0), (-1,-1), 0.3, BORDER),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ])
    for i, c in enumerate(row_colors):
        ts.add('BACKGROUND', (0, i+1), (-1, i+1), c)
    prog_t.setStyle(ts)
    elems.append(prog_t)
    elems.append(sp(6))

    elems.append(sub('Ce qui est déjà fait et validé en détail'))

    elems.append(sub2('6 Smart Contracts déployés sur Base Sepolia'))
    contracts_h = ['Contrat', 'Rôle', 'Adresse Sepolia (abrégée)']
    contracts_r = [
        ['EASChecker', 'Vérification KYC on-chain', '0x7E069926...1b03'],
        ['FBKToken', 'Token de gouvernance $FBK (100M cap, Fair Launch)', '0x9B0a0f72...0F18'],
        ['FinBankVault', 'Vault ERC-4626 sur Morpho Blue (cœur financier)', '0x5C763aA7...fDd'],
        ['VeFBK', 'Staking vote-escrowed (modèle Curve veCRV)', '0x977f97eb...A6F'],
        ['FBKDistributor', 'Distribution $FBK proportionnelle aux dépôts', '0xeba8C872...c3f'],
        ['FinBankGovernor', 'Gouvernance DAO on-chain (avec timelock intégré)', '0x1aE5609a...88F0'],
    ]
    elems += make_table(contracts_h, contracts_r, [35*mm, 85*mm, 46*mm])

    elems.append(sub2('Flux financier validé on-chain (Base Sepolia, vraies transactions)'))
    results = [
        ('Dépôt 1 000 EURC', 'Recu 1 000 000 000 shares fbEURC', True),
        ('Yield +50 EURC simulé', 'totalAssets passe à 1 050 000 000', True),
        ('Retrait 50% des shares', 'Recu 521,25 EURC (yield inclus)', True),
        ('KYC attestation EAS', 'isAuthorized: true sur la vraie blockchain', True),
        ('Backend API', 'GET /vault retourne TVL réel en temps réel', True),
    ]
    for action, result, ok in results:
        r_data = [[
            Paragraph(f'<b>{action}</b>',
                ParagraphStyle('ra', fontName='Helvetica-Bold', fontSize=9,
                               textColor=NAVY, leading=13)),
            Paragraph(f'→  {result}',
                ParagraphStyle('rb', fontName='Helvetica', fontSize=9,
                               textColor=GREY_DARK, leading=13)),
            Paragraph('<b>OK</b>',
                ParagraphStyle('rc', fontName='Helvetica-Bold', fontSize=9,
                               textColor=GREEN, leading=13, alignment=TA_CENTER)),
        ]]
        rt = Table(r_data, colWidths=[52*mm, 100*mm, 14*mm])
        rt.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), GREEN_BG),
            ('BOX', (0,0), (-1,-1), 0.3, GREEN),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 8),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('LINEBEFORE', (0,0), (0,-1), 3, GREEN),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        elems.append(rt)
        elems.append(sp(1.5))

    elems.append(sp(4))
    elems.append(sub2('Couverture de tests : 169 tests automatisés — 0 échec'))
    tests_h = ['Suite de tests', 'Nb tests', 'Ce qui est couvert']
    tests_r = [
        ['FinBankVault.t.sol', '15', 'Dépôt, retrait, yield, fees, KYC, censure-résistance'],
        ['FBKToken.t.sol', '33', 'Mint, burn, cap 100M, Fair Launch, gouvernance'],
        ['VeFBK.t.sol', '46', 'Lock, unlock, décroissance veFBK, scénarios Curve'],
        ['FBKDistributor.t.sol', '33', 'Rewards Synthetix, claim, changement de taux'],
        ['FinBankGovernor.t.sol', '42', 'Cycle complet vote, timelock, exécution on-chain'],
        ['TOTAL', '169', '0 échec — code production-ready'],
    ]
    elems += make_table(tests_h, tests_r, [48*mm, 18*mm, 100*mm])
    return elems


def build_section5():
    elems = []
    elems += section_header('5', 'Le plan complet vers le Mainnet')

    # Phase 3
    elems.append(sub('Phase 3 — Frontend Web MVP (3-4 semaines)'))
    elems.append(body(
        'Objectif : une interface qu\'un freelance non-technique peut utiliser seul, '
        'aussi simple que Revolut, connectée à l\'infrastructure on-chain déjà opérationnelle.'))
    elems.append(sp(2))
    p3_h = ['Page', 'URL', 'Contenu']
    p3_r = [
        ['Landing page', '/', 'Proposition de valeur, waitlist, FAQs'],
        ['Dashboard', '/app', 'Solde EURC, yield temps réel, $FBK claimables, Dépôt/Retrait'],
        ['Onboarding', '/onboarding', 'Connexion wallet (Base Smart Wallet / MetaMask) + flux KYC'],
        ['Gouvernance', '/governance', 'Votes DAO actifs, créer/voter une proposition'],
        ['Staking', '/stake', 'Lock $FBK → $veFBK, visualisation décroissance'],
    ]
    elems += make_table(p3_h, p3_r, [28*mm, 28*mm, 110*mm])
    int_h = ['Intégration', 'Technologie', 'Rôle']
    int_r = [
        ['Wallet', 'Base Smart Wallet + wagmi', 'Connexion Passkey / Face ID, sans seed phrase'],
        ['Données on-chain', 'API backend existante', 'Lecture TVL, yield, shares en temps réel'],
        ['Transactions', 'wagmi + viem', 'Signing, confirmation, toast de succès'],
        ['UI components', 'shadcn/ui + TailwindCSS', 'Interface professionnelle, dark mode'],
    ]
    elems += make_table(int_h, int_r, [28*mm, 42*mm, 96*mm])

    # Phase 4
    elems.append(sub('Phase 4 — KYC Réel + IBAN (4-6 semaines, en parallèle avec la Phase 3)'))
    elems.append(body(
        'Cette phase dépend de négociations commerciales avec des partenaires agréés. '
        'Elle peut avancer en parallèle du frontend.'))

    p4_data = [
        [
            Paragraph('<b>KYC — Synaps ou Fractal ID</b>',
                ParagraphStyle('kh', fontName='Helvetica-Bold', fontSize=10,
                               textColor=NAVY, leading=14, spaceAfter=6)),
            Paragraph('<b>IBAN — Monerium</b>',
                ParagraphStyle('ih', fontName='Helvetica-Bold', fontSize=10,
                               textColor=NAVY, leading=14, spaceAfter=6)),
        ],
        [
            Paragraph(
                '1. Accord commercial avec Attestor agréé KYC/AML\n'
                '2. Intégration API : webhook Synaps → attestation EAS\n'
                '3. Vote DAO : approveAttestor() on-chain\n'
                '4. Test E2E : vrai utilisateur → KYC → dépôt',
                ParagraphStyle('kb', fontName='Helvetica', fontSize=9,
                               textColor=GREY_DARK, leading=15)),
            Paragraph(
                '1. Accord commercial Monerium\n'
                '2. Intégration API : créer IBAN lié à wallet Base\n'
                '3. Flux entrant : EUR → EURC → Vault (auto)\n'
                '4. Flux sortant : Vault → EURC → EUR → banque',
                ParagraphStyle('ib', fontName='Helvetica', fontSize=9,
                               textColor=GREY_DARK, leading=15)),
        ]
    ]
    p4_t = Table(p4_data, colWidths=[83*mm, 83*mm])
    p4_t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,0), NAVY),
        ('BACKGROUND', (1,0), (1,0), BLUE),
        ('BACKGROUND', (0,1), (0,1), GREY_LIGHT),
        ('BACKGROUND', (1,1), (1,1), colors.HexColor('#EBF5FB')),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('BOX', (0,0), (-1,-1), 1, NAVY),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 10),
        ('TEXTCOLOR', (0,0), (-1,0), WHITE),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    elems.append(p4_t)
    elems.append(sp(6))

    # Phase 5
    elems.append(sub('Phase 5 — Audit Externe + Déploiement Mainnet (6-8 semaines)'))
    elems.append(body(
        'C\'est la phase la plus longue et la plus critique. '
        'Un audit de sécurité externe est obligatoire avant tout déploiement mainnet.'))

    p5_h = ['Étape', 'Description', 'Durée']
    p5_r = [
        ['Pré-audit', 'Invariants documentés + fuzz testing Foundry + sélection auditeur', '2 sem.'],
        ['Audit', 'Code4rena / Sherlock / Cantina — 6 contrats soumis', '4-6 sem.'],
        ['Correction', 'Tous les findings Critical + High corrigés (obligatoire)', '1-2 sem.'],
        ['Gnosis Safe', 'Trésorerie multisig DAO créée (3/5 ou 4/7 signataires)', '1 sem.'],
        ['Déploiement', 'forge script Deploy.s.sol --rpc-url BASE --broadcast --verify', '1 sem.'],
        ['Lancement', 'Waitlist 500+ freelances, partenariat pilote, referral $FBK', '2 sem.'],
    ]
    elems += make_table(p5_h, p5_r, [28*mm, 110*mm, 28*mm])

    # Phases 6-7
    elems.append(sub('Phases 6-7 — Croissance et vision long terme'))
    lt_h = ['Phase', 'Objectif', 'Indicateurs clés']
    lt_r = [
        ['Phase 6\n(6-12 mois)', 'Croissance + app mobile React Native',
         '10 000 utilisateurs actifs, $FBK sur DEX Aerodrome/Uniswap'],
        ['Phase 7\n(12-24 mois)', 'Licence EME + produits financiers avancés',
         'Avances factures, multi-devises (USDC), API B2B, zone SEPA complète'],
    ]
    elems += make_table(lt_h, lt_r, [25*mm, 75*mm, 66*mm])
    return elems


def build_section6():
    elems = []
    elems += section_header('6', 'Timeline synthétique')

    elems += code_block([
        'Aujourd\'hui (25 avril 2026)',
        '         │',
        '         ▼',
        '  Phase 3 ── Frontend MVP (Next.js + wagmi + shadcn)    3-4 semaines',
        '         │',
        '         ▼',
        '  Phase 4 ── KYC Synaps + IBAN Monerium                 4-6 semaines',
        '         │   (négociations en parallèle de la Phase 3)',
        '         │',
        '         ▼',
        '  Phase 5a── Audit externe (Code4rena / Sherlock)        4-6 semaines',
        '         │',
        '         ▼',
        '  Phase 5b── Déploiement Base Mainnet + Gnosis Safe      2 semaines',
        '         │',
        '         ▼',
        '  >>> LANCEMENT PUBLIC <<<                               ~4-5 mois',
        '         │',
        '         ▼',
        '  Phase 6 ── Croissance + app mobile                     continu',
        '         │',
        '         ▼',
        '  Phase 7 ── Licence EME + produits avancés              long terme',
    ])

    elems += callout_box(
        'De maintenant au Mainnet : environ 4 à 5 mois si tout va bien. '
        'La variable principale est la durée des négociations commerciales '
        'avec Synaps (KYC) et Monerium (IBAN).')
    return elems


def build_section7():
    elems = []
    elems += section_header('7', 'Pile technologique complète')

    tech_h = ['Couche', 'Technologie', 'Rôle']
    tech_r = [
        ['Blockchain', 'Base (L2 Ethereum / Coinbase)', 'Infrastructure — liquidité, onramp fiat natif'],
        ['Stablecoin', 'EURC (Circle)', 'Euro tokenisé, réserves auditées'],
        ['Yield', 'Morpho Blue', 'Marchés isolés, efficience maximale'],
        ['Standard vault', 'ERC-4626', 'Interopérabilité totale DeFi'],
        ['Smart contracts', 'Solidity + Foundry', 'Logique métier — 169 tests, 0 échec'],
        ['KYC', 'EAS + Synaps', 'Identité sans honeypot, RGPD-friendly'],
        ['IBAN', 'Monerium', 'Pont fiat ↔ on-chain (non-custodial)'],
        ['Wallet UX', 'Base Smart Wallet (ERC-4337)', 'Passkey / Face ID — zéro seed phrase'],
        ['Gouvernance', 'DAO + $FBK / $veFBK', 'Modèle Curve veCRV, Fair Launch'],
        ['Multisig', 'Gnosis Safe', 'Urgences + trésorerie DAO'],
        ['Frontend', 'Next.js 14 + wagmi + viem', 'Interface web'],
        ['UI', 'TailwindCSS + shadcn/ui', 'Composants professionnels'],
        ['Backend', 'Fastify + Prisma + PostgreSQL', 'API REST + indexeur d\'événements'],
        ['Base de données', 'Supabase (PostgreSQL managé)', 'Données off-chain, scaling automatique'],
    ]
    elems += make_table(tech_h, tech_r, [32*mm, 52*mm, 82*mm])
    return elems


def build_section8():
    elems = []
    elems += section_header('8', 'Risques et mitigations')

    risk_h = ['Risque', 'Proba.', 'Impact', 'Mitigation']
    risk_r = [
        ['Exploit Morpho Blue (protocole tiers)',
         'Faible', 'Élevé',
         'Fonds d\'assurance DAO + marchés isolés (pas de contamination croisée)'],
        ['Régulation MiCA défavorable sur $FBK',
         'Moyen', 'Élevé',
         'Validation juridique avant lancement — classification security token à clarifier'],
        ['Dépendance Monerium pour l\'IBAN',
         'Moyen', 'Moyen',
         'Architecture multi-fournisseur IBAN prévue en V2'],
        ['Concentration du pouvoir $veFBK',
         'Moyen', 'Moyen',
         'Mécanisme anti-concentration à concevoir (anti-whale)'],
        ['Lenteur négociations Synaps/Monerium',
         'Élevée', 'Faible',
         'Phase 3 frontend avance en parallèle — pas de bloquant'],
        ['Audit révèle des failles critiques',
         'Faible', 'Élevé',
         'Code ultra-reviewé (169 tests, audit interne, bug fixes complets)'],
        ['Marché DeFi baissier (APY Morpho < 2%)',
         'Moyen', 'Moyen',
         'Multi-stratégie prévu (vote DAO vers marchés plus rentables)'],
    ]
    elems += make_table(risk_h, risk_r, [52*mm, 14*mm, 14*mm, 86*mm])
    return elems


def build_section9():
    elems = []
    elems += section_header('9', 'Ce qu\'on ne fera jamais')

    nevers = [
        ('Frais cachés', 'Pas de frais de tenue de compte, pas d\'abonnement, pas de commission sur virements'),
        ('Vente de données', 'Pas de revente de données utilisateurs — FinBank ne détient même pas de données personnelles'),
        ('Publicité', 'Pas de publicité — le modèle économique ne dépend pas de l\'attention des membres'),
        ('Fermeture arbitraire', 'Pas de fermeture de compte arbitraire — techniquement impossible (décentralisé)'),
        ('Pré-vente VC', 'Pas de pré-vente de $FBK à des investisseurs VC — Fair Launch uniquement'),
        ('Bloquer un retrait', 'Jamais bloquer l\'accès aux fonds d\'un membre — même si le KYC expire'),
        ('Découverts à 20%', 'Pas de profit sur les difficultés financières des clients'),
    ]
    for title, desc in nevers:
        ndata = [[
            Paragraph(f'<b>NON — {title}</b>',
                ParagraphStyle('nt', fontName='Helvetica-Bold', fontSize=9,
                               textColor=colors.HexColor('#922B21'), leading=13)),
            Paragraph(desc,
                ParagraphStyle('nd', fontName='Helvetica', fontSize=9,
                               textColor=GREY_DARK, leading=13)),
        ]]
        nt = Table(ndata, colWidths=[45*mm, 121*mm])
        nt.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#FDEDEC')),
            ('BOX', (0,0), (-1,-1), 0.3, colors.HexColor('#E74C3C')),
            ('LINEBEFORE', (0,0), (0,-1), 3, colors.HexColor('#922B21')),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 8),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        elems.append(nt)
        elems.append(sp(2))

    elems.append(sp(8))
    elems += callout_box(
        'Vision finale : la première institution financière de l\'ère numérique '
        'construite sur les bons principes depuis le début. '
        'Transparence totale. Propriété collective. Fondations inviolables. '
        'N\'importe qui dans le monde peut détenir et transférer de la valeur sans permission, '
        'avec des règles identiques pour tous, vérifiables par chacun, '
        'et gouvernées collectivement par les membres — pas par des actionnaires.',
        NAVY)
    return elems


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    doc = SimpleDocTemplate(
        OUTPUT_PATH,
        pagesize=A4,
        topMargin=32*mm,
        bottomMargin=18*mm,
        leftMargin=18*mm,
        rightMargin=18*mm,
        title='FinBank — Plan Complet : Architecture, Vision & Roadmap',
        author='FinBank',
        subject='Document confidentiel fondateur',
    )

    hf = HeaderFooter('FinBank — Plan Complet')
    story = []

    # Cover (special page with no header/footer)
    story.append(NextPageTemplate('cover'))
    story.append(PageBreak())
    story.append(NextPageTemplate('normal'))
    story.append(PageBreak())

    # Sections
    for builder in [
        build_section1,
        build_section2,
        build_section3,
        build_section4,
        build_section5,
        build_section6,
        build_section7,
        build_section8,
        build_section9,
    ]:
        story += builder()
        story.append(PageBreak())

    frame_cover = Frame(0, 0, A4[0], A4[1], leftPadding=0, rightPadding=0,
                        topPadding=0, bottomPadding=0)
    frame_normal = Frame(18*mm, 18*mm, A4[0]-36*mm, A4[1]-50*mm,
                         leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)

    def cover_template(canvas, doc):
        cover_page(canvas, doc)

    def normal_template(canvas, doc):
        hf(canvas, doc)

    pt_cover  = PageTemplate(id='cover',  frames=[frame_cover],  onPage=cover_template)
    pt_normal = PageTemplate(id='normal', frames=[frame_normal], onPage=normal_template)

    doc2 = BaseDocTemplate(
        OUTPUT_PATH,
        pagesize=A4,
        pageTemplates=[pt_cover, pt_normal],
        title='FinBank — Plan Complet : Architecture, Vision & Roadmap',
        author='FinBank',
        subject='Document confidentiel fondateur',
    )

    story2 = [NextPageTemplate('cover'), PageBreak(),
              NextPageTemplate('normal'), PageBreak()]
    for builder in [
        build_section1, build_section2, build_section3,
        build_section4, build_section5, build_section6,
        build_section7, build_section8, build_section9,
    ]:
        story2 += builder()
        story2.append(PageBreak())

    doc2.build(story2)
    print(f'PDF genere : {OUTPUT_PATH}')

if __name__ == '__main__':
    main()
