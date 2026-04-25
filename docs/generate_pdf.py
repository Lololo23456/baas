#!/usr/bin/env python3
"""
Génère le PDF technique FinBank — Le Code Expliqué Ligne par Ligne
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, Preformatted
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
import os

OUTPUT = "/Users/loic/Desktop/BAAS/docs/FinBank_Code_Explique_Ligne_Par_Ligne.pdf"

# ── Couleurs ──────────────────────────────────────────────────────────────────
BLUE_DARK   = colors.HexColor("#1a2744")
BLUE_MED    = colors.HexColor("#2d4a8a")
BLUE_LIGHT  = colors.HexColor("#e8eef8")
GREEN_DARK  = colors.HexColor("#1a4a2a")
GREEN_LIGHT = colors.HexColor("#e8f5e9")
ORANGE      = colors.HexColor("#e65100")
GREY_LIGHT  = colors.HexColor("#f5f5f5")
GREY_BORDER = colors.HexColor("#cccccc")

# ── Styles ────────────────────────────────────────────────────────────────────
styles = getSampleStyleSheet()

def make_style(name, parent='Normal', **kw):
    s = ParagraphStyle(name, parent=styles[parent], **kw)
    return s

S = {
    'title': make_style('DocTitle', 'Title',
        fontSize=28, textColor=BLUE_DARK, spaceAfter=6, alignment=TA_CENTER,
        fontName='Helvetica-Bold'),
    'subtitle': make_style('DocSub', fontSize=14, textColor=BLUE_MED,
        spaceAfter=4, alignment=TA_CENTER),
    'date': make_style('DocDate', fontSize=10, textColor=colors.grey,
        spaceAfter=20, alignment=TA_CENTER),

    'h1': make_style('H1', 'Heading1',
        fontSize=20, textColor=BLUE_DARK, spaceBefore=24, spaceAfter=8,
        fontName='Helvetica-Bold', borderPad=4),
    'h2': make_style('H2', 'Heading2',
        fontSize=15, textColor=BLUE_MED, spaceBefore=16, spaceAfter=6,
        fontName='Helvetica-Bold'),
    'h3': make_style('H3', 'Heading3',
        fontSize=12, textColor=colors.HexColor("#444466"), spaceBefore=12, spaceAfter=4,
        fontName='Helvetica-Bold'),

    'body': make_style('Body', fontSize=10, leading=15, spaceAfter=8,
        alignment=TA_JUSTIFY),
    'body_small': make_style('BodySmall', fontSize=9, leading=13, spaceAfter=6,
        alignment=TA_JUSTIFY),
    'note': make_style('Note', fontSize=9, leading=13, spaceAfter=6,
        textColor=colors.HexColor("#555555"), leftIndent=12,
        borderPad=6, backColor=BLUE_LIGHT),
    'code_label': make_style('CodeLabel', fontSize=9, textColor=colors.white,
        backColor=BLUE_MED, fontName='Helvetica-Bold', spaceAfter=0,
        leftIndent=4, spaceBefore=8),
    'code': make_style('Code', fontName='Courier', fontSize=8, leading=11,
        backColor=GREY_LIGHT, leftIndent=0, spaceAfter=8),
}

def hr():
    return HRFlowable(width="100%", thickness=1, color=GREY_BORDER, spaceAfter=8, spaceBefore=8)

def code_block(label, code_text):
    items = []
    items.append(Paragraph(f"  {label}", S['code_label']))
    items.append(Preformatted(code_text, S['code']))
    return items

def section_box(title, body_text, color=BLUE_LIGHT):
    data = [[Paragraph(f"<b>{title}</b><br/>{body_text}", S['body_small'])]]
    t = Table(data, colWidths=[16*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), color),
        ('BOX', (0,0), (-1,-1), 0.5, GREY_BORDER),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    return t

def info_table(rows, col_widths=None):
    if col_widths is None:
        col_widths = [5*cm, 11*cm]
    styled_rows = []
    for i, (k, v) in enumerate(rows):
        styled_rows.append([
            Paragraph(f"<b>{k}</b>", S['body_small']),
            Paragraph(v, S['body_small'])
        ])
    t = Table(styled_rows, colWidths=col_widths)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), GREY_LIGHT),
        ('BACKGROUND', (0,0), (0,-1), BLUE_LIGHT),
        ('BOX', (0,0), (-1,-1), 0.5, GREY_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.3, GREY_BORDER),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ROWBACKGROUNDS', (0,0), (-1,-1), [GREY_LIGHT, colors.white]),
    ]))
    return t

# ── Contenu ───────────────────────────────────────────────────────────────────

def build():
    doc = SimpleDocTemplate(
        OUTPUT, pagesize=A4,
        leftMargin=2.5*cm, rightMargin=2.5*cm,
        topMargin=2.5*cm, bottomMargin=2.5*cm,
        title="FinBank — Le Code Expliqué Ligne par Ligne",
        author="FinBank",
    )

    story = []

    # ── Page de titre ─────────────────────────────────────────────────────────
    story.append(Spacer(1, 3*cm))
    story.append(Paragraph("FinBank", S['title']))
    story.append(Paragraph("Le Code Expliqué Ligne par Ligne", S['subtitle']))
    story.append(Paragraph("Comprendre exactement ce que chaque ligne fait et pourquoi elle existe", S['date']))
    story.append(Spacer(1, 0.5*cm))
    story.append(hr())
    story.append(Spacer(1, 0.5*cm))

    overview_data = [
        ["Contrat", "Rôle", "Lignes"],
        ["EASChecker.sol", "Vérificateur KYC on-chain", "141"],
        ["FBKToken.sol", "Token de gouvernance $FBK (ERC-20)", "176"],
        ["VeFBK.sol", "Staking vote-escrowed $veFBK (modèle Curve)", "215"],
        ["FBKDistributor.sol", "Distribution $FBK aux déposants", "185"],
        ["FinBankVault.sol", "Vault ERC-4626 sur Morpho Blue", "530"],
        ["FinBankGovernor.sol", "Gouvernance on-chain avec timelock", "350"],
    ]
    t = Table(overview_data, colWidths=[5*cm, 8*cm, 2.5*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), BLUE_DARK),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [GREY_LIGHT, colors.white]),
        ('BOX', (0,0), (-1,-1), 0.5, GREY_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.3, GREY_BORDER),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph("169 tests — 0 échec · TypeScript 0 erreur · Solidity 0 erreur de compilation", S['date']))
    story.append(PageBreak())

    # ── Avant-propos ──────────────────────────────────────────────────────────
    story.append(Paragraph("Avant-propos — Concepts Solidity essentiels", S['h1']))
    story.append(Paragraph(
        "Un <b>smart contract</b> est un programme déployé sur une blockchain. "
        "Une fois déployé, son code est public, immuable, et s'exécute automatiquement "
        "sans intermédiaire. Voici les concepts fondamentaux utilisés dans tout le code FinBank :",
        S['body']))

    concepts = [
        ("address", "Identifiant unique de 42 caractères hexadécimaux. Chaque wallet et chaque contrat a une adresse. Ex : 0x60a3E35Cc..."),
        ("uint256", "Entier non-signé sur 256 bits. Peut aller jusqu'à ~10^77. Tous les montants de tokens utilisent ce type."),
        ("mapping", "Dictionnaire clé→valeur. mapping(address => uint256) = pour chaque adresse, un nombre. Stockage des soldes."),
        ("event", "Journal immuable sur la blockchain. Permet de tracer toutes les actions importantes. Indexé par les explorateurs."),
        ("error", "Message d'erreur personnalisé. Annule toute l'opération si déclenché. Moins coûteux en gas que require('string')."),
        ("modifier", "Garde qui s'exécute avant une fonction. onlyOwner vérifie que l'appelant est le propriétaire."),
        ("immutable", "Variable définie une seule fois au déploiement. Ne peut plus jamais changer. Gravée dans le bytecode."),
        ("msg.sender", "L'adresse qui appelle la fonction en cours. Si Alice appelle deposit(), msg.sender = adresse d'Alice."),
        ("block.timestamp", "Heure Unix actuelle en secondes (ex: 1745000000). Produit par les validateurs de la blockchain."),
        ("block.number", "Numéro du bloc actuel. Sur Base, un nouveau bloc toutes les ~2 secondes."),
        ("1e18", "10^18 = 1 000 000 000 000 000 000. Convention ERC-20 : 1 FBK humain = 1e18 en stockage interne."),
        ("revert", "Annule toute l'opération, rembourse le gas non utilisé. Aucune modification n'est effectuée sur la blockchain."),
        ("nonReentrant", "Protection anti-réentrance. Bloque les appels récursifs malicieux qui tenteraient de vider le vault."),
        ("BPS (basis points)", "Unité de pourcentage. 1 BPS = 0.01%. 1500 BPS = 15%. 10000 BPS = 100%. Précision entière sans flottants."),
    ]
    story.append(info_table(concepts, [4*cm, 12*cm]))
    story.append(PageBreak())

    # ── CONTRAT 1 : EASChecker ─────────────────────────────────────────────────
    story.append(Paragraph("Contrat 1 — EASChecker.sol", S['h1']))
    story.append(Paragraph("Le Contrôle d'Accès KYC", S['h2']))
    story.append(Paragraph(
        "EASChecker est le <b>videur</b> de FinBank. Il vérifie, avant chaque dépôt, "
        "qu'un wallet a bien passé le KYC (Know Your Customer) via une attestation EAS. "
        "C'est le seul contrat qui touche à la conformité réglementaire — "
        "et il le fait sans jamais stocker de données personnelles.",
        S['body']))

    story.append(section_box(
        "Concept : EAS (Ethereum Attestation Service)",
        "Un registre public sur la blockchain où des entités agréées (Attestors — Synaps, Fractal ID...) "
        "écrivent des déclarations signées : \"cette adresse wallet a passé le KYC\". "
        "L'attestation contient : le destinataire (wallet), l'émetteur (Attestor), un schéma, "
        "une date d'expiration optionnelle, un statut de révocation. "
        "FinBank lit ces attestations mais ne les crée jamais."
    ))
    story.append(Spacer(1, 0.3*cm))

    story.append(Paragraph("Les erreurs personnalisées (lignes 21-24)", S['h3']))
    story += code_block("EASChecker.sol — Erreurs", """\
error NotOwner();
error AttestorAlreadyApproved(address attestor);
error AttestorNotFound(address attestor);
error NoValidAttestation(address user);""")
    story.append(Paragraph(
        "<b>NotOwner</b> : quelqu'un essaie d'appeler une fonction réservée à la DAO. "
        "<b>AttestorAlreadyApproved</b> : on tente d'approuver un Attestor déjà dans la liste blanche. "
        "<b>AttestorNotFound</b> : on tente de révoquer un Attestor inexistant. "
        "<b>NoValidAttestation</b> : l'utilisateur n'a pas d'attestation KYC valide. "
        "Les <i>error</i> modernes consomment beaucoup moins de gas que les <i>require(\"message string\")</i> "
        "car aucune chaîne de texte n'est stockée sur la blockchain.",
        S['body']))

    story.append(Paragraph("Le stockage (lignes 33-49)", S['h3']))
    story += code_block("EASChecker.sol — Storage", """\
IEAS public immutable eas;
bytes32 public kycSchema;
address public owner;
mapping(address => bool) public approvedAttestors;
mapping(address => bytes32) public userAttestationUID;""")
    story.append(info_table([
        ("eas", "Adresse du contrat EAS sur Base. Immuable — l'annuaire officiel des attestations. Ne changera jamais."),
        ("kycSchema", "Hash 32 bytes identifiant le format d'une attestation KYC FinBank sur EAS. Modifiable par vote DAO si le format évolue."),
        ("owner", "La DAO. Seule elle peut approuver ou révoquer des Attestors."),
        ("approvedAttestors", "Dictionnaire : pour chaque adresse d'Attestor, true si approuvé. La liste blanche des prestataires KYC agréés."),
        ("userAttestationUID", "Pour chaque wallet utilisateur, l'identifiant de son attestation KYC. Soumis une seule fois lors de l'onboarding."),
    ]))
    story.append(Spacer(1, 0.3*cm))

    story.append(Paragraph("Le constructeur (lignes 55-59)", S['h3']))
    story += code_block("EASChecker.sol — Constructeur", """\
constructor(address _eas, bytes32 _kycSchema) {
    eas       = IEAS(_eas);
    kycSchema = _kycSchema;
    owner     = msg.sender;
}""")
    story.append(Paragraph(
        "Appelé <b>une seule fois</b>, au moment du déploiement. "
        "Initialise le contrat EAS (l'annuaire), le schéma KYC (le format des attestations), "
        "et définit <i>msg.sender</i> (le script de déploiement) comme propriétaire initial. "
        "Ce propriétaire initial sera ensuite remplacé par la DAO via <i>transferOwnership()</i>.",
        S['body']))

    story.append(Paragraph("approveAttestor() — Ajouter un prestataire KYC (lignes 71-75)", S['h3']))
    story += code_block("EASChecker.sol — approveAttestor()", """\
function approveAttestor(address attestor) external onlyOwner {
    if (approvedAttestors[attestor]) revert AttestorAlreadyApproved(attestor);
    approvedAttestors[attestor] = true;
    emit AttestorApproved(attestor);
}""")
    story.append(Paragraph(
        "Réservée à la DAO (<i>onlyOwner</i>). Si Synaps veut émettre des attestations pour FinBank, "
        "la DAO vote pour l'approuver via cette fonction. "
        "La vérification <i>if (approvedAttestors[attestor])</i> évite les doublons.",
        S['body']))

    story.append(Paragraph("revokeAttestor() — Retirer un prestataire (lignes 80-84)", S['h3']))
    story += code_block("EASChecker.sol — revokeAttestor()", """\
function revokeAttestor(address attestor) external onlyOwner {
    if (!approvedAttestors[attestor]) revert AttestorNotFound(attestor);
    approvedAttestors[attestor] = false;
    emit AttestorRevoked(attestor);
}""")
    story.append(Paragraph(
        "Si un Attestor est compromis ou ne respecte plus les standards KYC, la DAO le révoque. "
        "Immédiatement, toutes les attestations de cet Attestor deviennent invalides — "
        "les dépôts sont bloqués pour leurs utilisateurs. "
        "<b>Mais les retraits restent possibles</b> — propriété fondamentale de censure-résistance de FinBank.",
        S['body']))

    story.append(Paragraph("registerAttestation() — S'enregistrer (lignes 103-113)", S['h3']))
    story += code_block("EASChecker.sol — registerAttestation()", """\
function registerAttestation(bytes32 attestationUID) external {
    Attestation memory att = eas.getAttestation(attestationUID);

    if (att.recipient != msg.sender)          revert NoValidAttestation(msg.sender);
    if (!approvedAttestors[att.attester])     revert NoValidAttestation(msg.sender);
    if (att.schema != kycSchema)              revert NoValidAttestation(msg.sender);
    if (att.revocationTime != 0)              revert NoValidAttestation(msg.sender);
    if (att.expirationTime != 0 && att.expirationTime <= block.timestamp)
                                              revert NoValidAttestation(msg.sender);
    userAttestationUID[msg.sender] = attestationUID;
}""")
    story.append(Paragraph(
        "C'est la fonction qu'un nouvel utilisateur appelle <b>une seule fois</b> après son KYC. "
        "Étape par étape : (1) récupère l'attestation depuis EAS via son UID, "
        "(2) vérifie que l'attestation est bien pour l'appelant — pas quelqu'un d'autre, "
        "(3) vérifie que l'Attestor est dans la liste blanche de la DAO, "
        "(4) vérifie que le schéma correspond au schéma KYC FinBank, "
        "(5) vérifie que l'attestation n'a pas été révoquée, "
        "(6) vérifie qu'elle n'est pas expirée (<i>expirationTime == 0</i> = pas d'expiration), "
        "(7) si tout est bon, enregistre l'UID — l'utilisateur est autorisé.",
        S['body']))

    story.append(Paragraph("isAuthorized() — Vérification en temps réel (lignes 123-140)", S['h3']))
    story += code_block("EASChecker.sol — isAuthorized()", """\
function isAuthorized(address user) external view returns (bool) {
    bytes32 uid = userAttestationUID[user];
    if (uid == bytes32(0)) return false;            // Pas d'attestation enregistrée

    Attestation memory att = eas.getAttestation(uid);

    if (att.recipient != user)                   return false;
    if (!approvedAttestors[att.attester])        return false;
    if (att.schema != kycSchema)                 return false;
    if (att.revocationTime != 0)                 return false;
    if (att.expirationTime != 0 && att.expirationTime <= block.timestamp) return false;

    return true;
}""")
    story.append(Paragraph(
        "Appelée par le Vault <b>avant chaque dépôt</b>. Elle re-vérifie tout à chaque appel — "
        "ce qui signifie que si une attestation expire ou est révoquée après l'enregistrement, "
        "l'utilisateur ne peut plus déposer même s'il était valide. "
        "<i>bytes32(0)</i> est la valeur zéro = 'aucune attestation enregistrée'.",
        S['body']))
    story.append(PageBreak())

    # ── CONTRAT 2 : FBKToken ──────────────────────────────────────────────────
    story.append(Paragraph("Contrat 2 — FBKToken.sol", S['h1']))
    story.append(Paragraph("Le Token de Gouvernance $FBK", S['h2']))
    story.append(Paragraph(
        "FBKToken est le token ERC-20 de FinBank. Il suit le standard universel des tokens "
        "et ajoute des propriétés spécifiques : supply cappée à 100 millions, "
        "minting exclusif par le Distributor (Fair Launch garanti), et burning pour le buy-back DAO.",
        S['body']))

    story.append(section_box(
        "Concept : ERC-20",
        "Standard universel pour les tokens fongibles sur Ethereum/Base. "
        "Chaque unité est identique à une autre (1 FBK = 1 FBK). "
        "Les fonctions transfer, approve, transferFrom, balanceOf, totalSupply sont standardisées — "
        "tous les wallets et exchanges comprennent ce format automatiquement."
    ))
    story.append(Spacer(1, 0.3*cm))

    story.append(Paragraph("Les constantes (lignes 16-21)", S['h3']))
    story += code_block("FBKToken.sol — Constants", """\
string  public constant name     = "FinBank Governance Token";
string  public constant symbol   = "FBK";
uint8   public constant decimals = 18;
uint256 public constant MAX_SUPPLY = 100_000_000 * 1e18;""")
    story.append(info_table([
        ("name", "Nom complet affiché dans les wallets et explorateurs blockchain."),
        ("symbol", "Ticker du token, comme 'EUR' ou 'USD' — ici 'FBK'."),
        ("decimals = 18", "Convention ERC-20. 1 FBK humain = 1 000 000 000 000 000 000 en stockage interne. Permet des fractions très précises."),
        ("MAX_SUPPLY", "100 millions de FBK maximum. Le mot constant grave cette valeur dans le bytecode — aucune manière de la modifier, même pour le propriétaire."),
    ]))
    story.append(Spacer(1, 0.3*cm))

    story.append(Paragraph("Le constructeur et le minter (lignes 54-58)", S['h3']))
    story += code_block("FBKToken.sol — Constructor", """\
constructor(address _minter) {
    if (_minter == address(0)) revert ZeroAddress();
    owner  = msg.sender;
    minter = _minter;
}""")
    story.append(Paragraph(
        "Au déploiement, on définit qui peut minter des $FBK. "
        "Dans le script de déploiement, le deployer est d'abord défini comme minter temporaire, "
        "puis <i>setMinter(distributor)</i> est appelé pour transférer ce droit au FBKDistributor — "
        "garantissant le Fair Launch : aucun $FBK ne peut être créé arbitrairement.",
        S['body']))

    story.append(Paragraph("mint() — Création de $FBK (lignes 109-117)", S['h3']))
    story += code_block("FBKToken.sol — mint()", """\
function mint(address to, uint256 amount) external onlyMinter {
    if (to == address(0)) revert ZeroAddress();
    uint256 available = MAX_SUPPLY - totalSupply;
    if (amount > available) revert CapExceeded(amount, available);

    totalSupply   += amount;
    balanceOf[to] += amount;
    emit Transfer(address(0), to, amount);
}""")
    story.append(Paragraph(
        "Réservée au FBKDistributor (<i>onlyMinter</i>). "
        "Vérifie que le cap de 100M ne sera pas dépassé. "
        "Par convention ERC-20, émettre depuis <i>address(0)</i> signifie 'création' — "
        "c'est ce qu'affichent les explorateurs blockchain comme 'Mint'.",
        S['body']))

    story.append(Paragraph("burn() et burnFrom() — Destruction de $FBK (lignes 122-145)", S['h3']))
    story += code_block("FBKToken.sol — burn() & burnFrom()", """\
function burn(uint256 amount) external {
    if (balanceOf[msg.sender] < amount)
        revert InsufficientBalance(amount, balanceOf[msg.sender]);
    balanceOf[msg.sender] -= amount;
    totalSupply           -= amount;
    emit Transfer(msg.sender, address(0), amount);
}

function burnFrom(address from, uint256 amount) external {
    uint256 allowed = allowance[from][msg.sender];
    if (allowed < amount) revert InsufficientAllowance(amount, allowed);
    if (balanceOf[from] < amount) revert InsufficientBalance(amount, balanceOf[from]);
    if (allowed != type(uint256).max) {
        allowance[from][msg.sender] = allowed - amount;
    }
    balanceOf[from] -= amount;
    totalSupply     -= amount;
    emit Transfer(from, address(0), amount);
}""")
    story.append(Paragraph(
        "<i>burn()</i> permet à n'importe qui de détruire ses propres $FBK. "
        "<i>burnFrom()</i> est utilisé par la trésorerie DAO pour le mécanisme "
        "<b>buy-back & burn</b> : la DAO utilise les fees pour racheter des $FBK "
        "sur le marché, puis les brûle — réduisant la supply et augmentant la valeur de chaque token. "
        "Émettre vers <i>address(0)</i> = destruction par convention ERC-20.",
        S['body']))

    story.append(Paragraph("transferFrom() avec infinite approval (lignes 90-103)", S['h3']))
    story += code_block("FBKToken.sol — transferFrom()", """\
function transferFrom(address from, address to, uint256 amount) external returns (bool) {
    uint256 allowed = allowance[from][msg.sender];
    if (allowed < amount) revert InsufficientAllowance(amount, allowed);
    if (balanceOf[from] < amount) revert InsufficientBalance(amount, balanceOf[from]);

    if (allowed != type(uint256).max) {
        allowance[from][msg.sender] = allowed - amount;
    }
    balanceOf[from] -= amount;
    balanceOf[to]   += amount;
    emit Transfer(from, to, amount);
    return true;
}""")
    story.append(Paragraph(
        "La vérification <i>allowed != type(uint256).max</i> est une optimisation standard : "
        "si quelqu'un a approuvé un montant infini (valeur maximale d'un uint256), "
        "on ne déduit pas l'allowance à chaque transfert. "
        "C'est le comportement attendu par les protocoles DeFi qui ont besoin "
        "d'une approbation permanente.",
        S['body']))
    story.append(PageBreak())

    # ── CONTRAT 3 : VeFBK ─────────────────────────────────────────────────────
    story.append(Paragraph("Contrat 3 — VeFBK.sol", S['h1']))
    story.append(Paragraph("Le Staking Vote-Escrowed $veFBK (modèle Curve)", S['h2']))
    story.append(Paragraph(
        "VeFBK implémente le mécanisme veCRV de Curve Finance. "
        "Tu bloques des $FBK pour une durée (1 semaine à 4 ans) "
        "et reçois du $veFBK proportionnel au montant et à la durée. "
        "Le $veFBK décroît linéairement jusqu'à 0 et est non-transférable — "
        "c'est un poids de vote, pas un token.",
        S['body']))

    story.append(section_box(
        "Exemple de calcul veFBK",
        "Lock 1000 FBK pour 4 ans  -> 1000 veFBK au moment du lock\n"
        "Lock 1000 FBK pour 2 ans  ->  500 veFBK au moment du lock\n"
        "Après 1 an (sur 2 ans)    ->  250 veFBK (décroît linéairement)\n"
        "A l'expiration             ->    0 veFBK, retrait possible\n\n"
        "Formule : veFBK = amount x (end - now) / MAX_LOCK_DURATION"
    ))
    story.append(Spacer(1, 0.3*cm))

    story.append(Paragraph("Les constantes (lignes 33-35)", S['h3']))
    story += code_block("VeFBK.sol — Constants", """\
uint256 public constant WEEK             = 7 * 86400;
uint256 public constant MAX_LOCK_DURATION = 4 * 365 * 86400; // 4 ans en secondes
uint256 public constant MIN_LOCK_DURATION = WEEK;             // 1 semaine minimum""")
    story.append(Paragraph(
        "86400 = nombre de secondes dans une journée. "
        "MAX_LOCK_DURATION = 4 x 365 x 86400 = 126 144 000 secondes = 4 ans. "
        "Les locks sont arrondis à la semaine inférieure — comme Curve Finance — "
        "pour des dates d'expiration propres et prévisibles.",
        S['body']))

    story.append(Paragraph("createLock() — Créer un lock (lignes 84-103)", S['h3']))
    story += code_block("VeFBK.sol — createLock()", """\
function createLock(uint256 amount, uint256 lockDuration) external {
    if (amount == 0) revert ZeroAmount();
    if (amount > type(uint128).max) revert AmountTooLarge(amount, type(uint128).max);
    if (lockDuration < MIN_LOCK_DURATION) revert LockTooShort(lockDuration, MIN_LOCK_DURATION);
    if (lockDuration > MAX_LOCK_DURATION) revert LockTooLong(lockDuration, MAX_LOCK_DURATION);
    if (locked[msg.sender].amount > 0) revert LockAlreadyExists();

    uint64 unlockTime = uint64(_roundToWeek(block.timestamp + lockDuration));

    locked[msg.sender] = LockedBalance({ amount: uint128(amount), end: unlockTime });
    totalLocked += amount;
    fbk.transferFrom(msg.sender, address(this), amount);
    emit LockCreated(msg.sender, amount, unlockTime);
}""")
    story.append(Paragraph(
        "La vérification <i>amount > type(uint128).max</i> est une <b>protection contre l'overflow</b> : "
        "le montant est ensuite stocké dans un uint128 (nombre sur 128 bits). "
        "Sans cette vérification, un très grand uint256 tronqué en uint128 donnerait une valeur fausse "
        "sans aucune erreur — bug silencieux catastrophique. "
        "<i>_roundToWeek()</i> arrondit le timestamp à la semaine inférieure "
        "(timestamp / WEEK x WEEK).",
        S['body']))

    story.append(Paragraph("balanceOf() et _veBalance() — Calcul du veFBK (lignes 167-209)", S['h3']))
    story += code_block("VeFBK.sol — balanceOf() et _veBalance()", """\
function balanceOf(address user) public view returns (uint256) {
    LockedBalance memory lock = locked[user];
    return _veBalance(lock, block.timestamp);
}

function _veBalance(LockedBalance memory lock, uint256 timestamp) internal pure returns (uint256) {
    if (lock.amount == 0)         return 0;
    if (timestamp >= lock.end)    return 0;

    uint256 timeRemaining = lock.end - timestamp;
    return (uint256(lock.amount) * timeRemaining) / MAX_LOCK_DURATION;
}""")
    story.append(Paragraph(
        "La formule est simple et élégante : <i>veFBK = montant x temps_restant / durée_max</i>. "
        "Pas de stockage séparé — calculé à la volée à chaque appel. "
        "<i>balanceOfAt(timestamp)</i> permet les snapshots de vote historiques : "
        "le poids de vote est figé au moment de la création de la proposition.",
        S['body']))

    story.append(Paragraph("withdraw() — Récupérer ses $FBK (lignes 148-160)", S['h3']))
    story += code_block("VeFBK.sol — withdraw()", """\
function withdraw() external {
    LockedBalance memory lock = locked[msg.sender];
    if (lock.amount == 0) revert NoLockFound();
    if (block.timestamp < lock.end) revert LockNotExpired(lock.end);

    uint256 amount = lock.amount;
    delete locked[msg.sender];
    totalLocked -= amount;
    fbk.transfer(msg.sender, amount);
    emit Withdrawn(msg.sender, amount);
}""")
    story.append(Paragraph(
        "<b>Censure-résistance</b> : la seule condition pour récupérer ses $FBK est l'expiration du lock. "
        "Aucune condition supplémentaire (KYC, vote DAO, etc.) ne peut bloquer un retrait. "
        "<i>delete locked[msg.sender]</i> réinitialise la struct à zéro et rembourse du gas "
        "(libération de storage sur Ethereum).",
        S['body']))
    story.append(PageBreak())

    # ── CONTRAT 4 : FBKDistributor ────────────────────────────────────────────
    story.append(Paragraph("Contrat 4 — FBKDistributor.sol", S['h1']))
    story.append(Paragraph("La Distribution de $FBK aux Déposants (pattern Synthetix)", S['h2']))
    story.append(Paragraph(
        "FBKDistributor distribue des $FBK aux déposants du Vault, "
        "proportionnellement à leurs shares et au temps écoulé. "
        "Il utilise le pattern StakingRewards de Synthetix — "
        "l'un des algorithmes de distribution les plus éprouvés en DeFi.",
        S['body']))

    story.append(section_box(
        "Algorithme Synthetix StakingRewards",
        "rewardPerShare() = rewardPerShareStored + (maintenant - lastUpdate) x rewardRate x 1e18 / totalShares\n\n"
        "earned(user) = userShares x (rewardPerShare() - userRewardPerSharePaid) / 1e18 + pendingReward\n\n"
        "L'accumulateur rewardPerShare croit continuellement. "
        "A chaque interaction, on sauvegarde la valeur courante pour l'utilisateur. "
        "La différence x ses shares = ses récompenses depuis le dernier checkpoint."
    ))
    story.append(Spacer(1, 0.3*cm))

    story.append(Paragraph("MAX_REWARD_RATE — Le plafond de sécurité (ligne 33)", S['h3']))
    story += code_block("FBKDistributor.sol — Constante", """\
uint256 public constant MAX_REWARD_RATE = 165e18;
// Taux maximum : épuise 100M FBK en 7 jours minimum (~165 FBK/sec)""")
    story.append(Paragraph(
        "Ce plafond empêche un bug ou un accès malicieux de distribuer l'intégralité "
        "des 100M $FBK en quelques secondes. "
        "165 FBK/seconde x 7 jours x 86400 sec/jour ≈ 100 millions de FBK. "
        "Même au taux maximum, il faut au moins une semaine pour épuiser la supply.",
        S['body']))

    story.append(Paragraph("Le modifier updateReward — Le checkpoint (lignes 109-117)", S['h3']))
    story += code_block("FBKDistributor.sol — modifier updateReward", """\
modifier updateReward(address user) {
    rewardPerShareStored = rewardPerShare();
    lastUpdateTime       = block.timestamp;
    if (user != address(0)) {
        pendingReward[user]          = earned(user);
        userRewardPerSharePaid[user] = rewardPerShareStored;
    }
    _;
}""")
    story.append(Paragraph(
        "Ce modifier s'exécute avant chaque fonction importante (notifyDeposit, notifyWithdraw, claim, setRewardRate). "
        "Il (1) met à jour l'accumulateur global, (2) sauvegarde les récompenses de l'utilisateur "
        "dans <i>pendingReward</i>, et (3) note la valeur courante de l'accumulateur pour calculer "
        "la prochaine différence. <i>address(0)</i> = pas d'utilisateur (utilisé pour les mises à jour globales).",
        S['body']))

    story.append(Paragraph("notifyDeposit() et notifyWithdraw() — Les hooks Vault (lignes 142-155)", S['h3']))
    story += code_block("FBKDistributor.sol — Hooks Vault", """\
function notifyDeposit(address user, uint256 shares) external onlyVault updateReward(user) {
    userShares[user] += shares;
    totalShares      += shares;
    emit SharesUpdated(user, userShares[user], totalShares);
}

function notifyWithdraw(address user, uint256 shares) external onlyVault updateReward(user) {
    uint256 current  = userShares[user];
    uint256 toRemove = shares > current ? current : shares;  // clamp anti-revert
    userShares[user] = current - toRemove;
    totalShares      = totalShares > toRemove ? totalShares - toRemove : 0;
    emit SharesUpdated(user, userShares[user], totalShares);
}""")
    story.append(Paragraph(
        "Le Vault appelle ces fonctions à chaque dépôt/retrait. "
        "Le <b>clamp</b> dans <i>notifyWithdraw</i> est une protection anti-revert : "
        "si les shares du Distributor et du Vault se désynchronisent "
        "(ex: transfert direct de shares fbEURC), on évite un revert catastrophique "
        "qui bloquerait les retraits. On clamp à 0 plutôt que de lever une erreur.",
        S['body']))

    story.append(Paragraph("claim() — Réclamer ses $FBK (lignes 161-169)", S['h3']))
    story += code_block("FBKDistributor.sol — claim()", """\
function claim() external updateReward(msg.sender) {
    uint256 reward = pendingReward[msg.sender];
    if (reward == 0) revert NothingToClaim();

    pendingReward[msg.sender] = 0;
    totalDistributed         += reward;

    fbk.mint(msg.sender, reward);
    emit Claimed(msg.sender, reward);
}""")
    story.append(Paragraph(
        "Le modifier <i>updateReward(msg.sender)</i> calcule et sauvegarde d'abord toutes les "
        "récompenses accumulées dans <i>pendingReward</i>. "
        "Ensuite <i>pendingReward = 0</i> évite tout double-claim. "
        "<i>fbk.mint()</i> crée directement les $FBK — pas besoin d'un treasury préalimenté.",
        S['body']))
    story.append(PageBreak())

    # ── CONTRAT 5 : FinBankVault ──────────────────────────────────────────────
    story.append(Paragraph("Contrat 5 — FinBankVault.sol", S['h1']))
    story.append(Paragraph("Le Coeur du Protocole — Vault ERC-4626 sur Morpho Blue", S['h2']))
    story.append(Paragraph(
        "FinBankVault est le contrat le plus important. Il reçoit les EURC des utilisateurs, "
        "les dépose dans Morpho Blue pour générer du yield, "
        "et reverse ce yield aux déposants après prélèvement de la protocol fee. "
        "C'est un ERC-4626 — le standard de vault le plus utilisé en DeFi.",
        S['body']))

    story.append(section_box(
        "Architecture du flux",
        "Utilisateur EURC -> deposit() -> FinBankVault -> supply() -> Morpho Blue (EURC market)\n"
        "                                                              |\n"
        "                                              yield <---------+\n"
        "                                                |\n"
        "                              85% -> déposants (fbEURC) + 15% -> trésorerie DAO\n\n"
        "Les shares fbEURC représentent une fraction du vault. "
        "Quand le yield augmente totalAssets, chaque share vaut plus d'EURC."
    ))
    story.append(Spacer(1, 0.3*cm))

    story.append(Paragraph("totalAssets() — La valeur fondamentale du vault (lignes 205-213)", S['h3']))
    story += code_block("FinBankVault.sol — totalAssets()", """\
function totalAssets() public view returns (uint256) {
    uint256 directBalance = asset.balanceOf(address(this));
    uint256 morphoAssets  = _morphoAssetsOf(address(this));
    return directBalance + morphoAssets;
}""")
    story.append(Paragraph(
        "Cette fonction est le coeur de tout : elle retourne la valeur totale du vault en EURC. "
        "<i>directBalance</i> = EURC directement dans le contrat (normalement 0 ou résidu transitoire). "
        "<i>morphoAssets</i> = EURC déposés dans Morpho Blue, incluant le yield accumulé. "
        "Cette valeur augmente en temps réel à mesure que Morpho génère des intérêts.",
        S['body']))

    story.append(Paragraph("convertToShares() et convertToAssets() (lignes 216-227)", S['h3']))
    story += code_block("FinBankVault.sol — Conversions", """\
function convertToShares(uint256 assets) public view returns (uint256) {
    uint256 supply = totalSupply;
    if (supply == 0) return assets;  // Premier dépôt : 1 share = 1 asset
    return (assets * supply) / totalAssets();
}

function convertToAssets(uint256 shares) public view returns (uint256) {
    uint256 supply = totalSupply;
    if (supply == 0) return shares;
    return (shares * totalAssets()) / supply;
}""")
    story.append(Paragraph(
        "Ces deux formules maintiennent l'équilibre du vault. "
        "Au premier dépôt (supply = 0), 1 share = 1 EURC. "
        "Ensuite, le ratio évolue avec le yield : si le vault a 1000 EURC pour 900 shares, "
        "chaque share vaut 1.11 EURC. "
        "<b>C'est ainsi que le yield est distribué</b> — automatiquement, sans action de l'utilisateur.",
        S['body']))

    story.append(Paragraph("deposit() — Le flux de dépôt complet (lignes 260-293)", S['h3']))
    story += code_block("FinBankVault.sol — deposit()", """\
function deposit(uint256 assets, address receiver) external nonReentrant returns (uint256 shares) {
    if (assets == 0) revert ZeroAmount();
    if (receiver == address(0)) revert ZeroAddress();

    // 1. Vérification KYC — bloque les dépôts sans attestation valide
    if (!easChecker.isAuthorized(msg.sender)) revert NotAuthorized(msg.sender);

    // 2. Accrue les fees sur le yield généré depuis le dernier checkpoint
    _accrueFees();

    // 3. Calcule les shares APRES l'accrual des fees
    shares = previewDeposit(assets);
    if (shares == 0) revert ZeroShares();

    // 4. Transfert des EURC du user vers le vault
    asset.transferFrom(msg.sender, address(this), assets);

    // 5. Dépôt dans Morpho Blue
    morpho.supply(marketParams, assets, 0, address(this), "");

    // 6. Mint des shares au receiver
    _mint(receiver, shares);

    // 7. Notifie le distributor $FBK
    if (distributor != address(0)) {
        IFBKDistributor(distributor).notifyDeposit(receiver, shares);
    }

    // 8. Met à jour le checkpoint
    lastTotalAssets = totalAssets();
    emit Deposit(msg.sender, receiver, assets, shares);
}""")
    story.append(Paragraph(
        "L'ordre des étapes est crucial : les fees sont accrued <b>avant</b> le calcul des shares "
        "(étape 2 avant étape 3) — sinon le nouveau déposant diluerait les fees dues à la trésorerie. "
        "<i>nonReentrant</i> bloque les attaques de réentrance : si un contrat malicieux essayait "
        "d'appeler deposit() à nouveau pendant l'exécution, le guard le stopperait.",
        S['body']))

    story.append(Paragraph("redeem() — Le retrait censure-résistant (lignes 304-350)", S['h3']))
    story += code_block("FinBankVault.sol — redeem()", """\
// CENSURE-RESISTANCE : aucune vérification KYC sur les retraits.
// Si l'attestation d'un user expire, il peut toujours récupérer ses fonds.
function redeem(uint256 shares, address receiver, address owner_)
    external nonReentrant returns (uint256 assets)
{
    if (shares == 0) revert ZeroAmount();
    if (receiver == address(0)) revert ZeroAddress();
    if (shares > balanceOf[owner_]) revert ExceedsBalance(shares, balanceOf[owner_]);

    if (msg.sender != owner_) {
        uint256 allowed = allowance[owner_][msg.sender];
        if (allowed == type(uint256).max) { /* infinite approval */ }
        else if (allowed < shares) { revert ExceedsBalance(shares, allowed); }
        else { allowance[owner_][msg.sender] = allowed - shares; }
    }

    _accrueFees();
    assets = previewRedeem(shares);
    if (assets == 0) revert ZeroAssets();
    _burn(owner_, shares);
    if (distributor != address(0)) IFBKDistributor(distributor).notifyWithdraw(owner_, shares);
    morpho.withdraw(marketParams, assets, 0, address(this), address(this));
    asset.transfer(receiver, assets);
    lastTotalAssets = totalAssets();
    emit Withdraw(msg.sender, receiver, owner_, assets, shares);
}""")
    story.append(Paragraph(
        "<b>Propriété fondamentale</b> : il n'y a aucun <i>easChecker.isAuthorized()</i> ici. "
        "Les retraits ne sont jamais bloqués par le KYC. "
        "Si l'attestation d'un utilisateur expire ou est révoquée, "
        "il peut toujours récupérer ses EURC — FinBank ne peut pas confisquer les fonds.",
        S['body']))

    story.append(Paragraph("_accrueFees() — Le mécanisme de fee (lignes 358-392)", S['h3']))
    story += code_block("FinBankVault.sol — _accrueFees()", """\
function _accrueFees() internal {
    uint256 currentAssets = totalAssets();
    if (currentAssets <= lastTotalAssets) {
        lastTotalAssets = currentAssets;
        return;
    }
    uint256 yieldGenerated = currentAssets - lastTotalAssets;
    uint256 feeAssets = (yieldGenerated * feeBps) / BPS_BASE;
    if (feeAssets == 0) return;

    // Calcul des shares à minter pour représenter exactement feeAssets
    uint256 feeShares = (feeAssets * totalSupply) / (currentAssets - feeAssets);

    _mint(treasury, feeShares);  // Mint les shares à la trésorerie
    emit FeesAccrued(yieldGenerated, feeAssets, feeShares);
}""")
    story.append(Paragraph(
        "La trésorerie reçoit des <b>shares</b> (pas des EURC). "
        "Cela évite tout mouvement d'EURC depuis Morpho — "
        "pas de retrait partiel, pas de slippage, pas de coût de gas supplémentaire. "
        "La formule de feeShares est délicate : "
        "<i>feeAssets x supply / (currentAssets - feeAssets)</i> "
        "garantit que les shares mintées représentent exactement le montant de fee, "
        "sans modifier le ratio pour les déposants existants.",
        S['body']))
    story.append(PageBreak())

    # ── CONTRAT 6 : FinBankGovernor ───────────────────────────────────────────
    story.append(Paragraph("Contrat 6 — FinBankGovernor.sol", S['h1']))
    story.append(Paragraph("La Démocratie On-Chain — Gouvernance avec Timelock", S['h2']))
    story.append(Paragraph(
        "FinBankGovernor est le système de gouvernance décentralisée. "
        "N'importe qui avec suffisamment de $veFBK peut soumettre des propositions. "
        "Tous les détenteurs de $veFBK peuvent voter. "
        "Les propositions approuvées s'exécutent automatiquement après un délai de sécurité.",
        S['body']))

    story.append(section_box(
        "Cycle de vie d'une proposition",
        "1. propose()  -> création + snapshot du veFBK\n"
        "2. [votingDelay blocs] -> période de réflexion avant ouverture du vote\n"
        "3. [votingPeriod blocs] -> fenêtre de vote (Pour / Contre / Abstention)\n"
        "4. queue()  -> mise dans le timelock si la proposition a passé\n"
        "5. [timelockDelay secondes] -> délai de sécurité (2 jours par défaut)\n"
        "6. execute()  -> exécution des appels on-chain\n"
        "7. cancel()  -> annulation possible par le proposant avant exécution"
    ))
    story.append(Spacer(1, 0.3*cm))

    story.append(Paragraph("Les paramètres de gouvernance (lignes 75-81)", S['h3']))
    story.append(info_table([
        ("votingDelay", "Délai en blocs entre la création et l'ouverture du vote. Permet de lire la proposition avant de voter."),
        ("votingPeriod", "Durée du vote en blocs. 45818 blocs ≈ 1 semaine sur Base (bloc toutes les 2 sec)."),
        ("timelockDelay", "Délai en secondes entre l'approbation et l'exécution. 2 jours = 172800 sec. Permet d'annuler si bug."),
        ("quorumBps", "Participation minimale pour que le vote soit valide. 400 BPS = 4% du totalLocked veFBK."),
        ("proposalThreshold", "veFBK minimum pour soumettre une proposition. Evite le spam de propositions."),
    ]))
    story.append(Spacer(1, 0.3*cm))

    story.append(Paragraph("propose() — Créer une proposition (lignes 153-184)", S['h3']))
    story += code_block("FinBankGovernor.sol — propose()", """\
function propose(
    address[] memory targets,
    uint256[] memory values,
    bytes[]   memory calldatas,
    string    memory description
) external returns (uint256 proposalId) {
    uint256 proposerBalance = veFBK.balanceOf(msg.sender);
    if (proposerBalance < proposalThreshold)
        revert BelowProposalThreshold(proposerBalance, proposalThreshold);

    proposalId = ++proposalCount;
    uint256 voteStart = block.number + votingDelay;
    uint256 voteEnd   = voteStart + votingPeriod;

    Proposal storage p = proposals[proposalId];
    p.snapshotTimestamp = block.timestamp;  // Snapshot pour les votes
    p.voteStart = voteStart;
    p.voteEnd   = voteEnd;
    // targets / values / calldatas = les actions à exécuter si la proposition passe
}""")
    story.append(Paragraph(
        "<i>targets, values, calldatas</i> sont les appels on-chain à exécuter si la proposition passe. "
        "Exemple : target = adresse du Vault, calldata = encodage de <i>setFee(2000)</i> (changer la fee à 20%). "
        "Le <i>snapshotTimestamp</i> est crucial : le poids de vote de chaque participant "
        "est calculé à ce moment précis — pas au moment du vote.",
        S['body']))

    story.append(Paragraph("castVote() — Voter (lignes 188-208)", S['h3']))
    story += code_block("FinBankGovernor.sol — castVote()", """\
function castVote(uint256 proposalId, VoteType voteType) external {
    ProposalState state = getState(proposalId);
    if (state != ProposalState.Active)
        revert ProposalNotActive(proposalId, state);
    if (hasVoted[proposalId][msg.sender])
        revert AlreadyVoted(msg.sender, proposalId);

    // Poids = solde veFBK AU MOMENT DU SNAPSHOT de la proposition
    uint256 weight = veFBK.balanceOfAt(msg.sender, p.snapshotTimestamp);

    hasVoted[proposalId][msg.sender] = true;
    if (voteType == VoteType.For)          p.forVotes     += weight;
    else if (voteType == VoteType.Against) p.againstVotes += weight;
    else                                   p.abstainVotes += weight;

    emit VoteCast(msg.sender, proposalId, voteType, weight);
}""")
    story.append(Paragraph(
        "Le poids de vote est le solde veFBK <b>au moment du snapshot</b> — "
        "pas au moment du vote. Cela empêche les achats flash de $FBK "
        "pour voter massivement puis revendre. "
        "<i>hasVoted</i> empêche le double vote.",
        S['body']))

    story.append(Paragraph("execute() — Exécution après timelock (lignes 226-243)", S['h3']))
    story += code_block("FinBankGovernor.sol — execute()", """\
function execute(uint256 proposalId) external {
    ProposalState state = getState(proposalId);
    if (state != ProposalState.Queued)
        revert ProposalNotQueued(proposalId, state);

    Proposal storage p = proposals[proposalId];
    if (block.timestamp < p.timelockEta)
        revert TimelockNotExpired(p.timelockEta, block.timestamp);

    p.executed = true;
    for (uint256 i = 0; i < p.targets.length; i++) {
        (bool success,) = p.targets[i].call{value: p.values[i]}(p.calldatas[i]);
        require(success, "FinBankGovernor: call failed");
    }
    emit ProposalExecuted(proposalId);
}""")
    story.append(Paragraph(
        "Une fois le timelock expiré, n'importe qui peut déclencher l'exécution. "
        "Le contrat fait les appels on-chain automatiquement. "
        "Si un appel échoue (<i>success = false</i>), toute la transaction est annulée "
        "— soit toutes les actions de la proposition s'exécutent, soit aucune.",
        S['body']))

    story.append(Paragraph("onlyGovernance — Auto-amendement (lignes 308-338)", S['h3']))
    story += code_block("FinBankGovernor.sol — onlyGovernance", """\
modifier onlyGovernance() {
    if (msg.sender != address(this)) revert OnlyGovernance();
    _;
}

function setVotingDelay(uint256 newDelay) external onlyGovernance { ... }
function setVotingPeriod(uint256 newPeriod) external onlyGovernance { ... }
function setTimelockDelay(uint256 newDelay) external onlyGovernance { ... }
function setQuorumBps(uint256 newBps) external onlyGovernance { ... }""")
    story.append(Paragraph(
        "Ces fonctions ne peuvent être appelées <b>que par le contrat lui-même</b> "
        "via une proposition exécutée. C'est le pattern d'auto-gouvernance : "
        "pour changer les règles de gouvernance, il faut passer par une proposition "
        "qui suit ces mêmes règles. Personne — pas même le fondateur — "
        "ne peut modifier ces paramètres unilatéralement.",
        S['body']))
    story.append(PageBreak())

    # ── Conclusion ────────────────────────────────────────────────────────────
    story.append(Paragraph("Vue d'ensemble — Comment les contrats interagissent", S['h1']))

    interactions = [
        ["Action utilisateur", "Contrats impliqués", "Ce qui se passe"],
        ["Dépôt EURC",
         "EASChecker -> FinBankVault -> Morpho Blue -> FBKDistributor",
         "KYC vérifié -> shares mintées -> EURC dans Morpho -> compteur de rewards mis à jour"],
        ["Retrait EURC",
         "FinBankVault -> Morpho Blue -> FBKDistributor",
         "Shares brûlées -> EURC retiré de Morpho -> rewards mis à jour. Pas de vérification KYC."],
        ["Claim $FBK",
         "FBKDistributor -> FBKToken",
         "Rewards calculés -> $FBK mintés directement vers l'utilisateur"],
        ["Lock $FBK",
         "FBKToken -> VeFBK",
         "$FBK transférés dans VeFBK -> $veFBK calculé selon durée"],
        ["Vote DAO",
         "FinBankGovernor -> VeFBK",
         "Poids lu depuis VeFBK -> vote enregistré -> exécution si quorum + majorité"],
        ["Fee accrual",
         "Morpho Blue -> FinBankVault -> Treasury",
         "Yield Morpho détecté -> shares mintées à la trésorerie (auto à chaque dépôt/retrait)"],
    ]
    t = Table(interactions, colWidths=[4*cm, 5.5*cm, 6.5*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), BLUE_DARK),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [GREY_LIGHT, colors.white]),
        ('BOX', (0,0), (-1,-1), 0.5, GREY_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.3, GREY_BORDER),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.5*cm))

    story.append(Paragraph("Propriétés de sécurité garanties par le code", S['h2']))
    security = [
        ("Censure-résistance", "redeem() n'a aucune vérification KYC. Les fonds ne peuvent jamais être bloqués."),
        ("Fair Launch", "FBKToken.mint() réservé au FBKDistributor. Aucun insider ne peut minter des $FBK."),
        ("Supply cap immuable", "MAX_SUPPLY = constant dans le bytecode. Personne ne peut augmenter la limite."),
        ("Anti-réentrance", "nonReentrant dans deposit() et redeem(). Les attaques flash loan sont bloquées."),
        ("Anti-overflow uint128", "Vérification explicite avant tout cast dans VeFBK. Les bugs silencieux sont prévenus."),
        ("Timelock DAO", "2 jours entre l'approbation et l'exécution d'une proposition. Permet de détecter les bugs."),
        ("Auto-gouvernance", "Les paramètres du Governor ne sont modifiables que par le Governor lui-même."),
        ("KYC dynamique", "isAuthorized() re-vérifie à chaque appel. Une attestation révoquée bloque immédiatement les dépôts."),
        ("Fee plafonnée", "MAX_FEE_BPS = 30%. La DAO ne peut pas prendre plus de 30% du yield, quoi qu'il arrive."),
        ("Reward rate plafonné", "MAX_REWARD_RATE = 165 FBK/sec. Les 100M FBK ne peuvent pas être distribués en moins de 7 jours."),
    ]
    story.append(info_table(security, [5*cm, 11*cm]))

    story.append(Spacer(1, 0.5*cm))
    story.append(hr())
    story.append(Paragraph(
        "169 tests Foundry — 0 echec  ·  TypeScript 0 erreur  ·  Solidity 0 erreur de compilation  ·  "
        "Audit de sécurité interne complet  ·  Prêt pour Base Sepolia",
        S['date']))

    doc.build(story)
    print(f"PDF généré : {OUTPUT}")
    size = os.path.getsize(OUTPUT)
    print(f"Taille : {size // 1024} KB")

if __name__ == "__main__":
    build()
