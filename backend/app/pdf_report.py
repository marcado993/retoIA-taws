"""Generación del Reporte de Idoneidad en PDF.

Implementación autocontenida con la biblioteca estándar para evitar
dependencias adicionales. El PDF incluye el timestamp, el disclaimer legal,
la versión de reglas, la justificación, la asignación de activos y el nombre
del asesor que validó la propuesta.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from app.agents import asesor_financiero


PAGE_WIDTH = 595.28
PAGE_HEIGHT = 841.89
MARGIN_X = 48
TOP_Y = 790
BOTTOM_Y = 84

DISCLAIMER_TEXT = (
    '"Este documento no constituye una recomendación personalizada, sino una '
    'propuesta sujeta a revisión humana."'
)

DISCLAIMER_NOTE = (
    'La IA genera esta propuesta como apoyo documental y no asume responsabilidad '
    'directa sobre la decisión final ni sobre su ejecución.'
)

TREEMAP_COLORS = [
    (0.06, 0.73, 0.51),  # Emerald (#10B981)
    (0.15, 0.39, 0.92),  # Trust Blue (#2563EB)
    (0.96, 0.60, 0.16),  # Amber (#F59E0B)
    (0.49, 0.23, 0.93),  # Purple (#7C3AED)
    (0.94, 0.27, 0.53),  # Pink (#F03A8E)
    (0.05, 0.58, 0.53),  # Teal (#0D9488)
    (0.47, 0.55, 0.65),  # Slate Grey (#64748B)
    (0.39, 0.29, 0.91),  # Indigo (#6366F1)
    (0.96, 0.38, 0.38),  # Rose/Coral (#F43F5E)
    (0.78, 0.66, 0.38)   # Gold/Sand (#D97706)
]


def _escape_pdf_text(text: str) -> str:
    return text.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')


def _wrap_text(text: str, max_chars: int) -> list[str]:
    words = text.split()
    if not words:
        return ['']

    lines: list[str] = []
    current = words[0]
    for word in words[1:]:
        candidate = f"{current} {word}"
        if len(candidate) <= max_chars:
            current = candidate
        else:
            lines.append(current)
            current = word
    lines.append(current)
    return lines


def _format_timestamp(value: datetime | None = None) -> str:
    stamp = value or datetime.now().astimezone()
    return stamp.strftime('%Y-%m-%d %H:%M:%S %z')


class _PdfBuilder:
    def __init__(self) -> None:
        self._pages: list[list[str]] = []
        self._current: list[str] = []
        self._images: list[tuple[bytes, int, int]] = []

    def start_page(self) -> None:
        if self._current:
            self._pages.append(self._current)
        self._current = []

    def add(self, command: str) -> None:
        self._current.append(command)

    def text(self, x: float, y: float, text: str, font: str = 'F1', size: int = 11) -> None:
        self.add(
            f"BT /{font} {size} Tf 1 0 0 1 {x:.2f} {y:.2f} Tm ({_escape_pdf_text(text)}) Tj ET"
        )

    def line(self, x1: float, y1: float, x2: float, y2: float, width: float = 1.0) -> None:
        self.add(f"q {width:.2f} w {x1:.2f} {y1:.2f} m {x2:.2f} {y2:.2f} l S Q")

    def rect(self, x: float, y: float, width: float, height: float, fill: bool = False) -> None:
        op = 'f' if fill else 'S'
        self.add(f"q {x:.2f} {y:.2f} {width:.2f} {height:.2f} re {op} Q")

    def register_image(self, jpeg_bytes: bytes, w: int, h: int) -> str:
        self._images.append((jpeg_bytes, w, h))
        return f"Im{len(self._images)}"

    def image(self, img_name: str, x: float, y: float, w: float, h: float) -> None:
        self.add(f"q {w:.2f} 0 0 {h:.2f} {x:.2f} {y:.2f} cm /{img_name} Do Q")

    def finish(self) -> bytes:
        if self._current:
            self._pages.append(self._current)

        objects: list[bytes] = []

        def add_object(payload: str | bytes) -> int:
            if isinstance(payload, str):
                payload = payload.encode('latin-1')
            objects.append(payload)
            return len(objects)

        # Add image payloads as PDF objects
        image_obj_ids = []
        for img_bytes, w, h in self._images:
            header = (
                f"<< /Type /XObject /Subtype /Image /Width {w} /Height {h} "
                f"/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode "
                f"/Length {len(img_bytes)} >>\nstream\n"
            ).encode('latin-1')
            footer = b"\nendstream"
            payload = header + img_bytes + footer
            image_obj_ids.append(add_object(payload))

        font_regular = add_object('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
        font_bold = add_object('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>')

        page_content_ids: list[int] = []
        page_ids: list[int] = []

        for page in self._pages:
            stream = '\n'.join(page).encode('latin-1')
            content = b'<< /Length ' + str(len(stream)).encode() + b' >>\nstream\n' + stream + b'\nendstream'
            page_content_ids.append(add_object(content))

        xobject_dict = ""
        if image_obj_ids:
            xobject_dict = "/XObject << " + " ".join(f"/Im{idx+1} {oid} 0 R" for idx, oid in enumerate(image_obj_ids)) + " >>"

        pages_placeholder = add_object('')
        for content_id in page_content_ids:
            page_obj = (
                f'<< /Type /Page /Parent {pages_placeholder} 0 R '
                f'/MediaBox [0 0 {PAGE_WIDTH:.2f} {PAGE_HEIGHT:.2f}] '
                f'/Resources << /Font << /F1 {font_regular} 0 R /F2 {font_bold} 0 R >> {xobject_dict} >> '
                f'/Contents {content_id} 0 R >>'
            )
            page_ids.append(add_object(page_obj))

        kids = ' '.join(f'{pid} 0 R' for pid in page_ids)
        objects[pages_placeholder - 1] = (
            f'<< /Type /Pages /Kids [{kids}] /Count {len(page_ids)} >>'.encode('latin-1')
        )
        catalog_id = add_object(f'<< /Type /Catalog /Pages {pages_placeholder} 0 R >>')

        pdf = [b'%PDF-1.4\n']
        offsets = [0]
        current_offset = len(pdf[0])

        for idx, payload in enumerate(objects, start=1):
            obj = f'{idx} 0 obj\n'.encode('latin-1') + payload + b'\nendobj\n'
            offsets.append(current_offset)
            pdf.append(obj)
            current_offset += len(obj)

        xref_start = current_offset
        xref = [b'xref\n', f'0 {len(objects) + 1}\n'.encode('latin-1'), b'0000000000 65535 f \n']
        for offset in offsets[1:]:
            xref.append(f'{offset:010d} 00000 n \n'.encode('latin-1'))
        pdf.extend(xref)
        pdf.append(
            (
                'trailer\n'
                f'<< /Size {len(objects) + 1} /Root {catalog_id} 0 R >>\n'
                f'startxref\n{xref_start}\n%%EOF'
            ).encode('latin-1')
        )
        return b''.join(pdf)


def _draw_box(builder: _PdfBuilder, x: float, y: float, width: float, height: float,
              fill_rgb: tuple[float, float, float], stroke_rgb: tuple[float, float, float],
              line_width: float = 0.5) -> None:
    fr, fg, fb = fill_rgb
    sr, sg, sb = stroke_rgb
    builder.add(
        f"q {fr:.3f} {fg:.3f} {fb:.3f} rg {sr:.3f} {sg:.3f} {sb:.3f} RG "
        f"{line_width:.2f} w {x:.2f} {y:.2f} {width:.2f} {height:.2f} re B Q"
    )


def _draw_distribution_bar(builder: _PdfBuilder, x: float, y: float, w: float, h: float, allocation: list,
                           ticker_colors: dict[str, tuple[float, float, float]]) -> None:
    # Sort allocation by weight descending
    sorted_alloc = sorted(allocation, key=lambda a: a.get('weight', 0), reverse=True)
    
    curr_x = x
    for line in sorted_alloc:
        weight = line.get('weight', 0)
        seg_w = (weight / 100.0) * w
        if seg_w <= 0:
            continue
            
        r, g, b = ticker_colors.get(line['ticker'], (0.47, 0.55, 0.65))
        
        # Fill segment rectangle
        builder.add(f"q {r:.3f} {g:.3f} {b:.3f} rg {curr_x:.2f} {y:.2f} {seg_w:.2f} {h:.2f} re f Q")
        
        # Border
        builder.add(f"q 1.0 1.0 1.0 RG 0.5 w {curr_x:.2f} {y:.2f} {seg_w:.2f} {h:.2f} re S Q")
        
        # Print label inside the segment (e.g. SPY 25%)
        if seg_w > 32:
            builder.add("1.0 1.0 1.0 rg")
            text_y = y + (h - 6) / 2
            builder.text(curr_x + 4, text_y, f"{line['ticker']} {weight}%", 'F2', 6.8)
            
        curr_x += seg_w


def _split_into_sentences(text: str) -> list[str]:
    parts = text.split('. ')
    sentences = []
    for p in parts:
        p = p.strip()
        if p:
            if not p.endswith('.'):
                p += '.'
            sentences.append(p)
    return sentences


ETF_DESCRIPTIONS = {
    "BIL": "Liquidez a muy corto plazo para preservar capital y aportar máxima estabilidad.",
    "AGG": "Bonos de grado de inversión que aportan estabilidad y flujo de renta fija.",
    "BND": "Renta fija de cobertura amplia en bonos gubernamentales y corporativos.",
    "SPY": "Renta variable americana (S&P 500) para participar en crecimiento de gran capitalización.",
    "QQQ": "Renta variable tecnológica americana de alto crecimiento.",
    "EFA": "Renta variable de mercados desarrollados internacionales fuera de EE.UU.",
    "VNQ": "Activos inmobiliarios (REITs) para diversificar con renta de bienes raíces.",
    "GLD": "Activo alternativo de oro físico que actúa como refugio e inflación."
}


def _draw_header(builder: _PdfBuilder, generated_at: str, advisor_name: str, page_str: str) -> None:
    # Logotipo: cuadro verde esmeralda (#10B981) de la página
    builder.add('q 0.06 0.73 0.51 rg 0.06 0.73 0.51 RG 1.2 w')
    # Outline rect
    builder.add('50.0 780.0 16.0 16.0 re S')
    # Inner logo path
    builder.line(53.8, 785.1, 57.2, 790.5, 1.2)
    builder.line(57.2, 790.5, 59.7, 787.2, 1.2)
    builder.line(59.7, 787.2, 62.2, 791.8, 1.2)
    builder.add('Q')

    # Nombre de la App: "InvertIA" (con "IA" en verde)
    builder.add('0.06 0.09 0.16 rg')
    builder.text(74, 783, 'Invert', 'F2', 13.5)
    builder.add('0.06 0.73 0.51 rg')
    builder.text(113, 783, 'IA', 'F2', 13.5)

    # Metadatos del encabezado en color Ink Mid (#475569) a la derecha, en una sola línea bien distribuida
    builder.add('0.28 0.33 0.41 rg')
    builder.text(280, 783, f'Fecha: {generated_at}', 'F1', 8.5)
    builder.text(420, 783, f'Asesor: {advisor_name}', 'F1', 8.5)
    builder.text(PAGE_WIDTH - MARGIN_X - 45, 783, page_str, 'F1', 8.5)

    # Línea divisoria en color Border (#E2E8F0)
    builder.add('0.89 0.91 0.94 RG')
    builder.line(MARGIN_X, 768, PAGE_WIDTH - MARGIN_X, 768, 0.6)


def _draw_footer(builder: _PdfBuilder, advisor_name: str, rules_version: str, page_str: str) -> None:
    builder.add("0.89 0.91 0.94 RG")
    builder.line(MARGIN_X, BOTTOM_Y, PAGE_WIDTH - MARGIN_X, BOTTOM_Y, 0.8)
    builder.add("0.28 0.33 0.41 rg")
    builder.text(MARGIN_X, 62, f'Aprobado por Asesor: {advisor_name}', 'F1', 8.5)
    builder.text(260, 62, f'Versión de reglas: Reglas v{rules_version}', 'F1', 8.5)
    builder.text(PAGE_WIDTH - MARGIN_X - 45, 62, page_str, 'F1', 8.5)


def _section_title(builder: _PdfBuilder, y: float, num: str, title: str) -> float:
    # Verde para el número
    builder.add("0.06 0.73 0.51 rg")
    builder.text(MARGIN_X, y, num, 'F2', 10)
    # Slate oscuro para el título
    builder.add("0.06 0.09 0.16 rg")
    builder.text(MARGIN_X + 16, y, title.upper(), 'F2', 10)
    # Línea delgada color Border (#E2E8F0)
    builder.add("0.89 0.91 0.94 RG")
    builder.line(MARGIN_X, y - 4, PAGE_WIDTH - MARGIN_X, y - 4, 0.5)
    return y - 20


def _add_wrapped(builder: _PdfBuilder, x: float, y: float, text: str, font: str = 'F1', size: int = 10,
                 width_chars: int = 92, leading: int = 14) -> float:
    builder.add("0.12 0.16 0.22 rg")
    for line in _wrap_text(text, width_chars):
        builder.text(x, y, line, font, size)
        y -= leading
    return y


def generate_suitability_report_pdf(record: dict[str, Any], generated_at: datetime | None = None) -> bytes:
    decision = record.get('decision') or {}
    if decision.get('action') not in {'aprobar', 'editar'}:
        raise ValueError('El reporte de idoneidad solo puede generarse después de la validación humana')

    proposal = record['proposal']
    profile_result = record['profile_result']
    advisor_name = decision.get('advisor') or 'Pendiente de firma'
    generated_stamp = _format_timestamp(generated_at)

    # Pre-map tickers to colors from TREEMAP_COLORS
    sorted_alloc = sorted(proposal['allocation'], key=lambda a: a.get('weight', 0), reverse=True)
    ticker_colors = {}
    for idx, line in enumerate(sorted_alloc):
        ticker_colors[line['ticker']] = TREEMAP_COLORS[idx % len(TREEMAP_COLORS)]

    builder = _PdfBuilder()

    # ==========================================
    # PÁGINA 1: PORTADA, RESUMEN Y DIAGNÓSTICO
    # ==========================================
    builder.start_page()
    _draw_header(builder, generated_stamp, advisor_name, "Pág. 1 de 2")

    # Título Principal
    builder.add("0.06 0.09 0.16 rg")
    builder.text(MARGIN_X, 725, "INFORME DE IDONEIDAD DE INVERSIONES", 'F2', 17)

    # Introducción
    intro = (
        "Este documento oficial certifica que se ha completado el diagnóstico del perfil de riesgo del cliente, "
        "aplicando las reglas determinísticas aprobadas de la plataforma InvertIA. A continuación se resume el "
        "perfil resultante, el cuestionario respondido y la propuesta de portafolio validada por el asesor."
    )
    y = 700
    y = _add_wrapped(builder, MARGIN_X, y, intro, size=9.5, width_chars=92, leading=13)

    # Ficha Técnica (Fondo Oscuro #0F172A)
    y -= 20
    _draw_box(builder, MARGIN_X, y - 68, PAGE_WIDTH - 2*MARGIN_X, 68,
              fill_rgb=(0.06, 0.09, 0.16), stroke_rgb=(0.12, 0.16, 0.23), line_width=0.8)

    builder.add("0.58 0.64 0.72 rg")
    builder.text(MARGIN_X + 16, y - 16, "CLIENTE:", 'F2', 8.5)
    builder.text(MARGIN_X + 16, y - 32, "REPORTE ID:", 'F2', 8.5)
    builder.text(MARGIN_X + 16, y - 48, "EMISIÓN:", 'F2', 8.5)

    builder.add("1.0 1.0 1.0 rg")
    builder.text(MARGIN_X + 90, y - 16, record['client_name'], 'F1', 8.5)
    builder.text(MARGIN_X + 90, y - 32, record.get('id') or 'N/A', 'F1', 8.5)
    builder.text(MARGIN_X + 90, y - 48, generated_stamp, 'F1', 8.5)

    # Column 2
    builder.add("0.58 0.64 0.72 rg")
    builder.text(MARGIN_X + 270, y - 16, "ASESOR RESPONSABLE:", 'F2', 8.5)
    builder.text(MARGIN_X + 270, y - 32, "ESTADO REVISIÓN:", 'F2', 8.5)
    builder.text(MARGIN_X + 270, y - 48, "REGLAS:", 'F2', 8.5)

    builder.add("1.0 1.0 1.0 rg")
    builder.text(MARGIN_X + 390, y - 16, advisor_name, 'F1', 8.5)
    builder.add("0.06 0.73 0.51 rg")
    builder.text(MARGIN_X + 390, y - 32, "APROBADO (HITL)", 'F2', 8.5)
    builder.add("1.0 1.0 1.0 rg")
    builder.text(MARGIN_X + 390, y - 48, f"Reglas v{profile_result['rules_version']}", 'F1', 8.5)

    y -= 68

    # Resumen Ejecutivo (1.)
    y -= 25
    y = _section_title(builder, y, '1. ', 'Resumen Ejecutivo')
    
    # Card 1: Perfil
    _draw_box(builder, MARGIN_X, y - 60, 150, 60, fill_rgb=(0.95, 0.96, 0.98), stroke_rgb=(0.89, 0.91, 0.94), line_width=0.5)
    builder.add("0.28 0.33 0.41 rg")
    builder.text(MARGIN_X + 12, y - 18, "Perfil de Riesgo", 'F2', 8.5)
    builder.add("0.06 0.73 0.51 rg")
    builder.text(MARGIN_X + 12, y - 36, profile_result['profile']['label'], 'F2', 12)
    builder.add("0.28 0.33 0.41 rg")
    builder.text(MARGIN_X + 12, y - 52, f"Score: {profile_result['score']}/100", 'F1', 8)

    # Card 2: Diversificación
    _draw_box(builder, MARGIN_X + 175, y - 60, 150, 60, fill_rgb=(0.95, 0.96, 0.98), stroke_rgb=(0.89, 0.91, 0.94), line_width=0.5)
    builder.add("0.28 0.33 0.41 rg")
    builder.text(MARGIN_X + 187, y - 18, "Diversificación", 'F2', 8.5)
    builder.add("0.06 0.09 0.16 rg")
    builder.text(MARGIN_X + 187, y - 36, "Alta", 'F2', 12)
    builder.add("0.28 0.33 0.41 rg")
    builder.text(MARGIN_X + 187, y - 52, f"{proposal['metrics']['diversification']} Clases de Activos", 'F1', 8)

    # Card 3: Volatilidad
    _draw_box(builder, MARGIN_X + 350, y - 60, 150, 60, fill_rgb=(0.95, 0.96, 0.98), stroke_rgb=(0.89, 0.91, 0.94), line_width=0.5)
    builder.add("0.28 0.33 0.41 rg")
    builder.text(MARGIN_X + 362, y - 18, "Volatilidad Est.", 'F2', 8.5)
    builder.add("0.06 0.09 0.16 rg")
    builder.text(MARGIN_X + 362, y - 36, f"{proposal['metrics']['volatility']}%", 'F2', 12)
    builder.add("0.28 0.33 0.41 rg")
    builder.text(MARGIN_X + 362, y - 52, "No garantizado", 'F1', 8)

    y -= 60

    # Diagnóstico del Inversionista (2.)
    y -= 25
    y = _section_title(builder, y, '2. ', 'Diagnóstico del Inversionista')

    # Info de puntuación
    builder.add("0.06 0.09 0.16 rg")
    builder.text(MARGIN_X, y, f"Score obtenido: {profile_result['score']}/100", 'F2', 9.5)
    builder.add("0.28 0.33 0.41 rg")
    builder.text(MARGIN_X + 180, y, f"Perfil Preliminar: {profile_result['raw_profile']['label']}", 'F1', 9)
    builder.text(MARGIN_X + 340, y, f"Perfil Asignado: {profile_result['profile']['label']}", 'F2', 9)
    y -= 14

    # Escala de perfiles dinámica
    rules = asesor_financiero.load_rules()
    scale_parts = []
    for p in rules["profiles"]:
        scale_parts.append(f"{p['min_score']}-{p['max_score']}% {p['label']}")
    scale_str = f"Escala de perfiles (Reglas v{rules['version']}): " + " | ".join(scale_parts)
    builder.add("0.47 0.55 0.65 rg")
    builder.text(MARGIN_X, y, scale_str, 'F1', 8)
    y -= 16

    # Tabla de desglose de respuestas
    _draw_box(builder, MARGIN_X, y - 14, PAGE_WIDTH - 2*MARGIN_X, 14,
              fill_rgb=(0.95, 0.96, 0.98), stroke_rgb=(0.89, 0.91, 0.94), line_width=0.4)
    builder.add("0.28 0.33 0.41 rg")
    builder.text(MARGIN_X + 10, y - 10, 'Pregunta / Concepto', 'F2', 8)
    builder.text(MARGIN_X + 250, y - 10, 'Respuesta del Cliente', 'F2', 8)
    builder.text(MARGIN_X + 440, y - 10, 'Puntos', 'F2', 8)
    y -= 14

    for item in profile_result['breakdown']:
        q_id = item["question_id"]
        q_text = item["question"]
        opt_label = item["answer"]
        pts = item["points"]

        builder.add("0.06 0.09 0.16 rg")
        builder.text(MARGIN_X + 10, y - 11, q_id.capitalize(), 'F2', 8)
        builder.add("0.28 0.33 0.41 rg")
        builder.text(MARGIN_X + 70, y - 11, f"· {q_text[:38]}...", 'F1', 7.5)

        opt_short = opt_label if len(opt_label) <= 35 else f"{opt_label[:32]}..."
        builder.text(MARGIN_X + 250, y - 11, opt_short, 'F1', 7.5)
        builder.text(MARGIN_X + 440, y - 11, str(pts), 'F2', 8)

        builder.add("0.89 0.91 0.94 RG")
        builder.line(MARGIN_X, y - 15, PAGE_WIDTH - MARGIN_X, y - 15, 0.3)
        y -= 19

    # Tarjeta de alerta o metodológica
    y -= 14
    if profile_result.get('capped'):
        _draw_box(builder, MARGIN_X, y - 40, PAGE_WIDTH - 2*MARGIN_X, 40,
                  fill_rgb=(0.99, 0.95, 0.95), stroke_rgb=(0.94, 0.27, 0.27), line_width=0.6)
        builder.add("0.94 0.27 0.27 rg")
        builder.text(MARGIN_X + 12, y - 13, "REGLA DE TOPE (KNOCKOUT) APLICADA", 'F2', 8)
        ko_reason = profile_result['knockouts_applied'][0]['reason']
        _add_wrapped(builder, MARGIN_X + 12, y - 25, ko_reason, size=7.2, width_chars=110, leading=9)
    else:
        _draw_box(builder, MARGIN_X, y - 40, PAGE_WIDTH - 2*MARGIN_X, 40,
                  fill_rgb=(0.97, 0.98, 0.99), stroke_rgb=(0.89, 0.91, 0.94), line_width=0.5)
        builder.add("0.28 0.33 0.41 rg")
        builder.text(MARGIN_X + 12, y - 13, "MÉTODO DE EVALUACIÓN Y CUMPLIMIENTO", 'F2', 8)
        meta_note = (
            "Las preguntas cubren objetivos de retorno, horizonte, tolerancia emocional e historial financiero, "
            "adaptadas de directrices internacionales del CFA Institute y el estándar FINRA Rule 2111."
        )
        _add_wrapped(builder, MARGIN_X + 12, y - 25, meta_note, size=7.2, width_chars=110, leading=9)

    _draw_footer(builder, advisor_name, profile_result['rules_version'], "Pág. 1 de 2")

    # ==========================================
    # PÁGINA 2: ASIGNACIÓN, JUSTIFICACIÓN, VALIDACIÓN Y COMPLIANCE
    # ==========================================
    builder.start_page()
    _draw_header(builder, generated_stamp, advisor_name, "Pág. 2 de 2")

    y = TOP_Y - 50
    y = _section_title(builder, y, '3. ', 'Asignación de Activos')

    # Grid de métricas
    _draw_box(builder, MARGIN_X, y - 36, PAGE_WIDTH - 2*MARGIN_X, 36,
              fill_rgb=(0.95, 0.96, 0.98), stroke_rgb=(0.89, 0.91, 0.94), line_width=0.5)
    
    # Fila 1: Etiquetas
    builder.add("0.28 0.33 0.41 rg")
    builder.text(MARGIN_X + 16, y - 11, "Rendimiento:", 'F1', 8.5)
    builder.text(MARGIN_X + 180, y - 11, "Volatilidad Estimada:", 'F1', 8.5)
    builder.text(MARGIN_X + 340, y - 11, "Nivel de Riesgo Portafolio:", 'F1', 8.5)

    # Fila 2: Valores
    builder.add("0.06 0.09 0.16 rg")
    builder.text(MARGIN_X + 16, y - 23, "Variable (No garantizado)", 'F2', 8.5)
    builder.text(MARGIN_X + 180, y - 23, f"{proposal['metrics']['volatility']}%", 'F2', 8.5)
    
    risk_val = float(proposal['metrics']['risk_level'])
    builder.text(MARGIN_X + 340, y - 23, f"{risk_val:.1f} / 5.0", 'F2', 8.5)
    
    # Indicador visual gráfico (5 cuadrados)
    indicator_x = MARGIN_X + 340 + 46
    indicator_y = y - 22.5
    for i in range(1, 6):
        if i <= round(risk_val):
            # Color dinámico de riesgo
            if risk_val <= 2.0:
                color = (0.06, 0.725, 0.506)  # Verde
            elif risk_val <= 3.5:
                color = (0.96, 0.60, 0.16)  # Ámbar
            else:
                color = (0.94, 0.27, 0.53)  # Rosa/Rojo
            _draw_box(builder, indicator_x, indicator_y, 4.5, 4.5, fill_rgb=color, stroke_rgb=color, line_width=0.1)
        else:
            _draw_box(builder, indicator_x, indicator_y, 4.5, 4.5, fill_rgb=(0.95, 0.96, 0.98), stroke_rgb=(0.796, 0.835, 0.882), line_width=0.4)
        indicator_x += 7.5

    # Fila 3: Escala explicativa
    builder.add("0.47 0.55 0.65 rg")
    builder.text(MARGIN_X + 340, y - 31, "Escala: 1=bajo, 5=alto", 'F1', 6.5)

    y -= 52

    # Gráfico de distribución del portafolio (barra horizontal segmentada)
    builder.add("0.28 0.33 0.41 rg")
    builder.text(MARGIN_X, y, "Distribución Visual del Portafolio:", 'F2', 8.5)
    y -= 14
    _draw_distribution_bar(builder, MARGIN_X, y - 16, PAGE_WIDTH - 2*MARGIN_X, 16, proposal['allocation'], ticker_colors)
    y -= 34

    # Cabecera de la tabla
    _draw_box(builder, MARGIN_X, y - 14, PAGE_WIDTH - 2*MARGIN_X, 14,
              fill_rgb=(0.06, 0.09, 0.16), stroke_rgb=(0.06, 0.09, 0.16), line_width=0.5)

    builder.add("1.0 1.0 1.0 rg")
    builder.text(MARGIN_X + 10, y - 10, 'ETF / Instrumento', 'F2', 8)
    builder.text(MARGIN_X + 270, y - 10, 'Clase de Activo', 'F2', 8)
    builder.text(MARGIN_X + 440, y - 10, 'Peso', 'F2', 8)
    y -= 14

    # Filas de la tabla (ordenadas por peso descendente para perfecta consistencia con el Treemap)
    for line in sorted_alloc:
        r, g, b = ticker_colors.get(line['ticker'], (0.47, 0.55, 0.65))
        
        # Pequeño indicador de color de leyenda (cuadrado 4x4)
        builder.add(f"q {r:.3f} {g:.3f} {b:.3f} rg {MARGIN_X + 10:.2f} {y - 9:.2f} 4 4 re f Q")

        builder.add("0.06 0.09 0.16 rg")
        builder.text(MARGIN_X + 20, y - 10, line['ticker'], 'F2', 8.5)
        builder.add("0.28 0.33 0.41 rg")
        builder.text(MARGIN_X + 52, y - 10, f"· {line['name']}", 'F1', 7.5)

        builder.text(MARGIN_X + 270, y - 10, line['asset_class'], 'F1', 8)

        builder.add("0.06 0.09 0.16 rg")
        builder.text(MARGIN_X + 440, y - 10, f"{line['weight']}%", 'F2', 8.5)
        
        # Descripción corta del ETF debajo
        desc = ETF_DESCRIPTIONS.get(line['ticker'], "Instrumento diversificado del portafolio.")
        builder.add("0.47 0.55 0.65 rg")
        builder.text(MARGIN_X + 10, y - 18, desc, 'F1', 7)

        # Línea divisoria entre filas
        builder.add("0.89 0.91 0.94 RG")
        builder.line(MARGIN_X, y - 21, PAGE_WIDTH - MARGIN_X, y - 21, 0.3)
        y -= 22

    y -= 20

    # Explicación de la recomendación (Justificación) (4.)
    y = _section_title(builder, y, '4. ', 'Justificación del Portafolio')
    
    # Construcción dinámica del párrafo de conexión
    breakdown = profile_result.get("breakdown", [])
    reaccion = next((b for b in breakdown if b["question_id"] == "reaccion"), None)
    horizonte = next((b for b in breakdown if b["question_id"] == "horizonte"), None)
    
    bil_agg_weight = sum(a["weight"] for a in proposal['allocation'] if a["ticker"] in ("BIL", "AGG"))
    spy_weight = sum(a["weight"] for a in proposal['allocation'] if a["ticker"] == "SPY")
    
    connection_text = ""
    if reaccion and reaccion["points"] <= 2:
        connection_text = (
            f"Dado que indicaste que tu reacción ante una caída del 20% sería '{reaccion['answer']}', "
            f"se prioriza BIL y AGG ({bil_agg_weight}% del portafolio) para minimizar la volatilidad y "
            f"reducir la probabilidad de que enfrentes ese escenario."
        )
    elif horizonte and horizonte["points"] <= 2:
        connection_text = (
            f"Dado que tu horizonte de inversión es de corto plazo ('{horizonte['answer']}'), "
            f"la asignación concentra un {bil_agg_weight}% en instrumentos líquidos y de renta fija (BIL/AGG) "
            f"para proteger tu capital antes de que necesites disponer de los fondos."
        )
    elif reaccion and reaccion["points"] >= 3:
        connection_text = (
            f"Como indicaste que tu reacción ante caídas es '{reaccion['answer']}', "
            f"la propuesta incluye un {spy_weight}% en SPY para capturar el crecimiento a largo plazo, "
            f"aprovechando tu tolerancia al riesgo voluntaria."
        )
    elif horizonte and horizonte["points"] >= 3:
        connection_text = (
            f"Dado que tienes un horizonte de inversión a largo plazo ('{horizonte['answer']}'), "
            f"se asigna una mayor proporción a activos de renta variable como SPY para maximizar la acumulación de riqueza en el tiempo."
        )
        
    explanation_text = proposal['explanation']
    if connection_text and connection_text not in explanation_text:
        explanation_text = connection_text + " " + explanation_text

    sentences = _split_into_sentences(explanation_text)
    for sent in sentences:
        # Dibujar viñeta
        builder.add("0.06 0.73 0.51 rg")
        builder.rect(MARGIN_X + 4, y + 2.5, 3, 3, fill=True)
        # Dibujar texto de la frase wrapped
        y = _add_wrapped(builder, MARGIN_X + 12, y, sent, size=8.2, width_chars=95, leading=10)
        y -= 3

    # Firma y Validación (5.)
    y -= 20
    y = _section_title(builder, y, '5. ', 'Validación del Asesor')

    # Tarjeta de firma (Fondo #F8FAFC, Borde #E2E8F0)
    _draw_box(builder, MARGIN_X, y - 56, PAGE_WIDTH - 2*MARGIN_X, 56,
              fill_rgb=(0.97, 0.98, 0.99), stroke_rgb=(0.89, 0.91, 0.94), line_width=0.6)

    # Datos
    builder.add("0.28 0.33 0.41 rg")
    builder.text(MARGIN_X + 12, y - 16, "Asesor que validó la gestión:", 'F2', 8.5)
    builder.text(MARGIN_X + 12, y - 30, "Fecha de validación:", 'F2', 8.5)
    builder.text(MARGIN_X + 12, y - 44, "Firma del Asesor:", 'F2', 8.5)

    builder.add("0.06 0.09 0.16 rg")
    builder.text(MARGIN_X + 155, y - 16, advisor_name, 'F1', 8.5)
    builder.text(MARGIN_X + 155, y - 30, generated_stamp, 'F1', 8.5)
    builder.add("0.47 0.55 0.65 RG")
    builder.line(MARGIN_X + 155, y - 46, MARGIN_X + 260, y - 46, 0.4)

    # Sello de aprobación digital (Stamp)
    _draw_box(builder, MARGIN_X + 290, y - 48, 170, 40,
              fill_rgb=(0.93, 0.99, 0.96), stroke_rgb=(0.06, 0.73, 0.51), line_width=1.2)
    builder.add("0.06 0.73 0.51 rg")
    builder.text(MARGIN_X + 310, y - 26, "APROBADO HITL", 'F2', 10.5)
    builder.text(MARGIN_X + 315, y - 40, "Human-In-The-Loop", 'F1', 7.5)

    # Compliance & Legal (6.)
    y -= 76
    y = _section_title(builder, y, '6. ', 'Cumplimiento y Disclaimer Legal')

    audit_text = f"Auditoría: ID Reporte {record.get('id') or 'N/A'} | Versión Reglas profile_rules_v{profile_result['rules_version']} | Emisión UTC: {generated_stamp} por Asesor {advisor_name}"
    y = _add_wrapped(builder, MARGIN_X, y, audit_text, font='F2', size=7.5, width_chars=110, leading=10)
    y -= 4

    y = _add_wrapped(builder, MARGIN_X, y, DISCLAIMER_TEXT, size=7.5, width_chars=110, leading=9)
    y = _add_wrapped(builder, MARGIN_X, y, DISCLAIMER_NOTE, size=7.5, width_chars=110, leading=9)

    _draw_footer(builder, advisor_name, profile_result['rules_version'], "Pág. 2 de 2")

    return builder.finish()