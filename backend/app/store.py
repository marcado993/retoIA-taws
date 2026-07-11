"""Almacén en memoria con persistencia JSON opcional para la demo.

Guarda propuestas (con su ciclo de vida) y el registro de auditoría.
Cada decisión queda registrada con fecha, versión de reglas y responsable.
"""

import json
import os
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path

# ROBO_DB_PATH permite aislar los datos (p. ej. en pruebas e2e) sin tocar la demo.
DB_PATH = Path(os.environ.get("ROBO_DB_PATH") or Path(__file__).resolve().parent / "data" / "db.json")

_lock = threading.Lock()
_db = {"proposals": {}, "audit": []}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _persist() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(DB_PATH, "w", encoding="utf-8") as f:
        json.dump(_db, f, ensure_ascii=False, indent=2)


def load() -> None:
    if DB_PATH.exists():
        with open(DB_PATH, encoding="utf-8") as f:
            data = json.load(f)
        _db["proposals"] = data.get("proposals", {})
        _db["audit"] = data.get("audit", [])


def add_audit(action: str, actor: str, proposal_id: str, rules_version: str, detail: str = "") -> dict:
    entry = {
        "id": str(uuid.uuid4())[:8],
        "timestamp": _now(),
        "action": action,
        "actor": actor,
        "proposal_id": proposal_id,
        "rules_version": rules_version,
        "detail": detail,
    }
    _db["audit"].append(entry)
    return entry


def create_proposal(client_name: str, profile_result: dict, proposal: dict) -> dict:
    with _lock:
        pid = str(uuid.uuid4())[:8]
        record = {
            "id": pid,
            "version": 1,
            "created_at": _now(),
            "client_name": client_name,
            "status": "pendiente",
            "profile_result": profile_result,
            "proposal": proposal,
            "decision": None,
        }
        _db["proposals"][pid] = record
        add_audit("propuesta_generada", "agente:inversiones-ia", pid,
                  profile_result["rules_version"],
                  f"Perfil {profile_result['profile']['label']} (score {profile_result['score']}) para {client_name}")
        _persist()
        return record


def list_proposals() -> list:
    return sorted(_db["proposals"].values(), key=lambda p: p["created_at"], reverse=True)


def get_proposal(pid: str) -> dict | None:
    return _db["proposals"].get(pid)


def decide(pid: str, action: str, advisor: str, notes: str, edited_allocation: list | None = None) -> dict:
    with _lock:
        record = _db["proposals"].get(pid)
        if record is None:
            raise KeyError(pid)
        if record["status"] != "pendiente":
            raise ValueError(f"La propuesta ya fue resuelta ({record['status']})")

        if action == "editar" and edited_allocation:
            record["proposal"]["allocation_original"] = record["proposal"]["allocation"]
            record["proposal"]["allocation"] = edited_allocation
            record["version"] += 1

        status_map = {"aprobar": "aprobada", "rechazar": "rechazada", "editar": "aprobada_con_cambios"}
        record["status"] = status_map[action]
        record["decision"] = {
            "action": action,
            "advisor": advisor,
            "notes": notes,
            "timestamp": _now(),
            "proposal_version": record["version"],
            "rules_version": record["profile_result"]["rules_version"],
        }
        add_audit(f"propuesta_{record['status']}", f"asesor:{advisor}", pid,
                  record["profile_result"]["rules_version"], notes)
        _persist()
        return record


def audit_log() -> list:
    return sorted(_db["audit"], key=lambda a: a["timestamp"], reverse=True)
