import argparse
import re
import sys
import uuid
from collections import defaultdict
from pathlib import Path
from typing import Any

from sqlalchemy import text

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.db.session import engine


def table_exists(conn, table_name: str) -> bool:
    stmt = text(
        """
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = :table_name
        )
        """
    )
    return bool(conn.execute(stmt, {"table_name": table_name}).scalar_one())


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "tenant"


def generate_unique_slug(base_slug: str, used_slugs: set[str]) -> str:
    if base_slug not in used_slugs:
        used_slugs.add(base_slug)
        return base_slug

    index = 2
    while True:
        candidate = f"{base_slug}-{index}"
        if candidate not in used_slugs:
            used_slugs.add(candidate)
            return candidate
        index += 1


def backfill_tenants(conn) -> int:
    if not table_exists(conn, "empresas"):
        print("[backfill] Legacy table public.empresas not found. Skipping tenant creation.")
        return 0

    existing_tenant_ids = {
        row["id"] for row in conn.execute(text("SELECT id FROM public.tenants")).mappings().all()
    }
    used_slugs = {
        row["slug"] for row in conn.execute(text("SELECT slug FROM public.tenants")).mappings().all()
    }

    legacy_companies = conn.execute(
        text(
            """
            SELECT id, nome, cnpj, created_at, updated_at
            FROM public.empresas
            ORDER BY created_at ASC
            """
        )
    ).mappings().all()

    created = 0
    for company in legacy_companies:
        if company["id"] in existing_tenant_ids:
            continue

        base_slug = slugify(company["nome"] or "tenant")
        slug = generate_unique_slug(base_slug, used_slugs)

        conn.execute(
            text(
                """
                INSERT INTO public.tenants (id, name, slug, legal_name, tax_id, is_active, created_at, updated_at)
                VALUES (:id, :name, :slug, :legal_name, :tax_id, true, COALESCE(:created_at, NOW()), COALESCE(:updated_at, NOW()))
                """
            ),
            {
                "id": company["id"],
                "name": company["nome"] or "Tenant sem nome",
                "slug": slug,
                "legal_name": company["nome"],
                "tax_id": company["cnpj"],
                "created_at": company["created_at"],
                "updated_at": company["updated_at"],
            },
        )
        created += 1

    return created


def collect_membership_candidates(conn) -> tuple[set[tuple[str, str]], dict[str, str]]:
    candidates: set[tuple[str, str]] = set()
    profile_default_tenant: dict[str, str] = {}

    if table_exists(conn, "profiles"):
        profile_rows = conn.execute(
            text(
                """
                SELECT user_id, empresa_id
                FROM public.profiles
                WHERE empresa_id IS NOT NULL
                """
            )
        ).mappings().all()
        for row in profile_rows:
            candidates.add((str(row["user_id"]), str(row["empresa_id"])))
            profile_default_tenant[str(row["user_id"])] = str(row["empresa_id"])

    if table_exists(conn, "user_empresas"):
        user_company_rows = conn.execute(
            text(
                """
                SELECT user_id, empresa_id
                FROM public.user_empresas
                WHERE empresa_id IS NOT NULL
                """
            )
        ).mappings().all()
        for row in user_company_rows:
            candidates.add((str(row["user_id"]), str(row["empresa_id"])))

    return candidates, profile_default_tenant


def backfill_memberships(conn) -> int:
    candidates, profile_default_tenant = collect_membership_candidates(conn)
    if not candidates:
        print("[backfill] No legacy memberships found in profiles/user_empresas.")
        return 0

    existing_pairs = {
        (str(row["user_id"]), str(row["tenant_id"]))
        for row in conn.execute(
            text("SELECT user_id, tenant_id FROM public.user_tenant_memberships")
        ).mappings().all()
    }

    inserted = 0
    for user_id, tenant_id in sorted(candidates):
        if (user_id, tenant_id) in existing_pairs:
            continue

        conn.execute(
            text(
                """
                INSERT INTO public.user_tenant_memberships (
                    id, user_id, tenant_id, role, status, is_default, created_at, updated_at
                ) VALUES (
                    :id, :user_id, :tenant_id, 'member', 'active', false, NOW(), NOW()
                )
                """
            ),
            {"id": str(uuid.uuid4()), "user_id": user_id, "tenant_id": tenant_id},
        )
        inserted += 1

    membership_rows = conn.execute(
        text(
            """
            SELECT user_id, tenant_id, is_default
            FROM public.user_tenant_memberships
            ORDER BY user_id ASC, created_at ASC
            """
        )
    ).mappings().all()

    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in membership_rows:
        grouped[str(row["user_id"])].append(row)

    for user_id, rows in grouped.items():
        if any(bool(row["is_default"]) for row in rows):
            continue

        preferred_tenant = profile_default_tenant.get(user_id)
        chosen_tenant = preferred_tenant
        if chosen_tenant is None or all(str(r["tenant_id"]) != chosen_tenant for r in rows):
            chosen_tenant = str(rows[0]["tenant_id"])

        conn.execute(
            text(
                """
                UPDATE public.user_tenant_memberships
                SET is_default = true, updated_at = NOW()
                WHERE user_id = :user_id AND tenant_id = :tenant_id
                """
            ),
            {"user_id": user_id, "tenant_id": chosen_tenant},
        )

    return inserted


def print_consistency_report(conn) -> None:
    duplicated_defaults = conn.execute(
        text(
            """
            SELECT user_id, COUNT(*) AS total_defaults
            FROM public.user_tenant_memberships
            WHERE is_default = true
            GROUP BY user_id
            HAVING COUNT(*) > 1
            """
        )
    ).mappings().all()

    users_without_default = conn.execute(
        text(
            """
            SELECT user_id
            FROM public.user_tenant_memberships
            GROUP BY user_id
            HAVING SUM(CASE WHEN is_default = true THEN 1 ELSE 0 END) = 0
            """
        )
    ).mappings().all()

    print("[consistency] users with multiple default tenants:", len(duplicated_defaults))
    print("[consistency] users without default tenant:", len(users_without_default))


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill tenants and memberships from legacy schema.")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Execute validations and SQL statements but rollback changes at the end.",
    )
    args = parser.parse_args()

    with engine.connect() as conn:
        transaction = conn.begin()
        try:
            if not table_exists(conn, "tenants") or not table_exists(conn, "user_tenant_memberships"):
                raise RuntimeError(
                    "Required tables tenants/user_tenant_memberships do not exist. Run migrations first."
                )

            created_tenants = backfill_tenants(conn)
            created_memberships = backfill_memberships(conn)
            print_consistency_report(conn)

            print("[summary] created tenants:", created_tenants)
            print("[summary] created memberships:", created_memberships)

            if args.dry_run:
                transaction.rollback()
                print("[summary] dry-run mode enabled. Transaction rolled back.")
            else:
                transaction.commit()
                print("[summary] backfill committed.")
        except Exception:
            transaction.rollback()
            raise


if __name__ == "__main__":
    main()
