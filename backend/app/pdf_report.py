"""Generación del Reporte de Idoneidad en PDF.

Implementación autocontenida con la biblioteca estándar para evitar
dependencias adicionales. El PDF incluye el timestamp, el disclaimer legal,
la versión de reglas, la justificación, la asignación de activos y el nombre
del asesor que validó la propuesta.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any


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

    def finish(self) -> bytes:
        if self._current:
            self._pages.append(self._current)

        objects: list[bytes] = []

        def add_object(payload: str | bytes) -> int:
            if isinstance(payload, str):
                payload = payload.encode('latin-1')
            objects.append(payload)
            return len(objects)

        font_regular = add_object('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
        font_bold = add_object('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>')

        page_content_ids: list[int] = []
        page_ids: list[int] = []

        for page in self._pages:
            stream = '\n'.join(page).encode('latin-1')
            content = b'<< /Length ' + str(len(stream)).encode() + b' >>\nstream\n' + stream + b'\nendstream'
            page_content_ids.append(add_object(content))

        pages_placeholder = add_object('')
        for content_id in page_content_ids:
            page_obj = (
                f'<< /Type /Page /Parent {pages_placeholder} 0 R '
                f'/MediaBox [0 0 {PAGE_WIDTH:.2f} {PAGE_HEIGHT:.2f}] '
                f'/Resources << /Font << /F1 {font_regular} 0 R /F2 {font_bold} 0 R >> >> '
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


def _draw_header(builder: _PdfBuilder, generated_at: str, advisor_name: str) -> None:
    builder.add('q 0.12 0.18 0.24 RG 0.12 0.18 0.24 rg 1.4 w')
    builder.rect(48, 782, 20, 20)
    builder.line(52, 790, 58, 783)
    builder.line(58, 783, 62, 787)
    builder.line(62, 787, 66, 779)
    builder.add('Q')
    builder.text(78, 791, 'InvertIA', 'F2', 16)
    builder.text(78, 773, 'Reporte de Idoneidad', 'F2', 19)
    builder.text(386, 791, f'Fecha: {generated_at}', 'F1', 9)
    builder.text(386, 776, f'Asesor: {advisor_name}', 'F1', 9)
    builder.line(MARGIN_X, 760, PAGE_WIDTH - MARGIN_X, 760, 0.8)


def _section_title(builder: _PdfBuilder, y: float, title: str) -> float:
    builder.text(MARGIN_X, y, title, 'F2', 13)
    builder.line(MARGIN_X, y - 4, PAGE_WIDTH - MARGIN_X, y - 4, 0.5)
    return y - 20


def _add_wrapped(builder: _PdfBuilder, x: float, y: float, text: str, font: str = 'F1', size: int = 10,
                 width_chars: int = 92, leading: int = 14) -> float:
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

    builder = _PdfBuilder()
    builder.start_page()
    _draw_header(builder, generated_stamp, advisor_name)

    y = TOP_Y - 20
    y = _section_title(builder, y, '1. Perfil del Cliente')
    builder.text(MARGIN_X, y, f"Cliente: {record['client_name']}", 'F1', 11)
    y -= 16
    builder.text(MARGIN_X, y, f"Score: {profile_result['score']} / 100", 'F1', 11)
    y -= 16
    builder.text(MARGIN_X, y, f"Nivel de Riesgo: {profile_result['profile']['label']}", 'F1', 11)
    y -= 16
    builder.text(MARGIN_X, y, f"Reglas aplicadas: Reglas v{profile_result['rules_version']}", 'F1', 11)
    y -= 24

    y = _section_title(builder, y, '2. Justificación')
    justification = (
        proposal.get('explanation')
        or 'La propuesta se construyó con el catálogo aprobado y las reglas versionadas del perfil del cliente.'
    )
    y = _add_wrapped(builder, MARGIN_X, y, justification, size=10, width_chars=90, leading=13)
    y -= 6

    y = _section_title(builder, y, '3. Asignación de Activos')
    builder.text(MARGIN_X, y, 'ETF / Instrumento', 'F2', 10)
    builder.text(320, y, 'Clase', 'F2', 10)
    builder.text(486, y, '%', 'F2', 10)
    y -= 14
    builder.line(MARGIN_X, y + 6, PAGE_WIDTH - MARGIN_X, y + 6, 0.3)
    for line in proposal['allocation']:
        builder.text(MARGIN_X, y, f"{line['ticker']} · {line['name']}", 'F1', 9)
        builder.text(320, y, line['asset_class'], 'F1', 9)
        builder.text(486, y, f"{line['weight']}%", 'F1', 9)
        y -= 12
    y -= 10

    y = _section_title(builder, y, '4. Disclaimer Legal')
    builder.add(f'% {DISCLAIMER_TEXT}')
    builder.add(f'% {DISCLAIMER_NOTE}')
    y = _add_wrapped(builder, MARGIN_X, y, DISCLAIMER_TEXT, size=10, width_chars=90, leading=13)
    y = _add_wrapped(builder, MARGIN_X, y, DISCLAIMER_NOTE, size=10, width_chars=90, leading=13)
    y -= 10

    y = _section_title(builder, y, '5. Firma y Validaci\u00f3n')
    builder.text(MARGIN_X, y, f"Asesor que valid\u00f3 la gesti\u00f3n: {advisor_name}", 'F1', 11)
    y -= 18
    builder.text(MARGIN_X, y, 'Firma: ________________________________________________', 'F1', 11)
    y -= 18
    builder.text(MARGIN_X, y, 'Fecha de validaci\u00f3n: __________________________________', 'F1', 11)

    builder.line(MARGIN_X, BOTTOM_Y, PAGE_WIDTH - MARGIN_X, BOTTOM_Y, 0.8)
    builder.text(MARGIN_X, 62, f'Aprobado por: {advisor_name}', 'F1', 9)
    builder.text(360, 62, f'Versi\u00f3n de reglas: Reglas v{profile_result["rules_version"]}', 'F1', 9)

    return builder.finish()