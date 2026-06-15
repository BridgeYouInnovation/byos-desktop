# PowerSync setup — BYOS desktop sync

One-time provisioning to enable cloud sync between the desktop app's local SQLite
and the central Supabase Postgres. The desktop is **offline-first**; sync is a
background layer. The web-app side (auth + write-back endpoints) already lives on
the `feat/desktop-sync` branch of the `web` repo (not deployed yet).

Architecture: PowerSync Cloud replicates from Supabase → streams each tenant's
rows to its device. Custom RS256 JWTs (BYOS issues them — not Supabase Auth) are
validated by PowerSync against a **static JWKS** you paste into the instance.
Writes upload through the web app's `POST /api/sync/upload` (Prisma, tenant-scoped).

---

## 1. Prepare Supabase (SQL editor, run once)

```sql
-- Logical replication (Supabase: usually already on)
-- ALTER SYSTEM SET wal_level = logical;   -- only if self-managed

-- Dedicated replication role for PowerSync
CREATE ROLE powersync_role WITH REPLICATION LOGIN PASSWORD '<STRONG_PASSWORD>';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO powersync_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO powersync_role;

-- Publication PowerSync reads from
CREATE PUBLICATION powersync FOR ALL TABLES;
```

## 2. Create the PowerSync Cloud instance

1. Sign up / log in at https://powersync.com → **Create instance** (free tier is fine).
2. **Database Connections → Connect to Source Database → Postgres.**
   - Paste Supabase **Direct connection** URI (Supabase → Connect → Direct connection, port 5432).
   - Replace user/password with `powersync_role` / the password above.
   - **SSL mode: `verify-full`** (Supabase CA is bundled).
   - **Test Connection → Save.** Wait for deploy (~1–2 min).
3. Copy the **instance URL** (looks like `https://<id>.powersync.journeyapps.com`).
   **→ Send me this URL** — it goes into `POWERSYNC_URL` (web `.env` + desktop config)
   and is the JWT audience.

## 3. Client Auth (paste the static JWKS)

Instance → **Client Auth**:
- **JWKS**: paste exactly:

```json
{
  "keys": [
    {
      "kty": "RSA",
      "n": "37f7kIUtnx8_sebEUCPXEvuBgOJ-wYhuBpG3qViyAe9N9zP5VTj-6YjfxWNJtJ_VC6giqgfY3kIGBl4hp9MOXj1mbR2VZBENAOSaDBhOl9sUuERo0lZMeFTafSxr4ZFFVYNPm5PWk0QnOPo-SEUuV2q-_sPcamX2DXKU9s8_HMjb6TIWqrIobIL6C2Y2oExxywmQjHR3zzCUjuMCGwahaqVJlERdRTyojq5tDHL3q06NmwkYu4srvG10D_hCEHv5DFIHlHNnB30iCAsnxctVr9ok85818SEA3kHWZDL_lwAF8jYZ0qnhYmIRKsOq0acyv85hVW_9xtzv3iPp1DyzZw",
      "e": "AQAB",
      "kid": "byos-sync-a1c86961",
      "use": "sig",
      "alg": "RS256"
    }
  ]
}
```

- **Audience**: add the instance URL from step 2 (e.g. `https://<id>.powersync.journeyapps.com`).
- **Save and Deploy.**

> This public key was generated for the private signing key now in `web/.env`
> (`SYNC_JWT_PRIVATE_KEY_B64`, kid `byos-sync-a1c86961`). To rotate, run
> `node scripts/gen-sync-key.mjs` in `web/`, update `.env`, and re-paste the new JWKS.

## 4. Sync Rules

Instance → **Sync Rules** → paste, then **Deploy**. Each device syncs only its
own tenant's rows, keyed off the `tenant_id` JWT claim:

```yaml
bucket_definitions:
  tenant_data:
    parameters: SELECT request.jwt() ->> 'tenant_id' AS tenant_id
    data:
      - SELECT * FROM "Tenant"            WHERE id = bucket.tenant_id
      - SELECT * FROM "TenantUser"        WHERE "tenantId" = bucket.tenant_id
      - SELECT * FROM "Role"              WHERE "tenantId" = bucket.tenant_id
      - SELECT * FROM "Branch"            WHERE "tenantId" = bucket.tenant_id
      - SELECT * FROM "RecordCategory"    WHERE "tenantId" = bucket.tenant_id
      - SELECT * FROM "FinancialAccount"  WHERE "tenantId" = bucket.tenant_id
      - SELECT * FROM "TenantModule"      WHERE "tenantId" = bucket.tenant_id
      - SELECT * FROM "Contact"           WHERE "tenantId" = bucket.tenant_id
      - SELECT * FROM "Product"           WHERE "tenantId" = bucket.tenant_id
      - SELECT * FROM "InventoryBalance"  WHERE "tenantId" = bucket.tenant_id
      - SELECT * FROM "InventoryMovement" WHERE "tenantId" = bucket.tenant_id
      - SELECT * FROM "Record"            WHERE "tenantId" = bucket.tenant_id
      - SELECT * FROM "RecordItem"        WHERE "recordId" IN (SELECT id FROM "Record" WHERE "tenantId" = bucket.tenant_id)
      - SELECT * FROM "Subscription"      WHERE "tenantId" = bucket.tenant_id
```

> Note: Postgres table names are PascalCase (Prisma default), so they're quoted.
> The `User` row for login isn't synced here (the device already has it from the
> online login response); we can add a `global` bucket for templates later.

## 5. Wire the env

**web/.env** (already has the key) — set the instance URL:
```
POWERSYNC_URL="https://<id>.powersync.journeyapps.com"
```

**desktop** — I'll add `POWERSYNC_URL` + `SYNC_BACKEND_URL` (the web app base, e.g.
`http://localhost:3000` for local testing or `https://byos.bridgeyou.cm` once the
branch is deployed) to the desktop config in the next step.

## 6. What's next (my side, once you send the instance URL)

- Add `@powersync/node` to the desktop; migrate the repos to the PowerSync DB.
- Implement the connector (`fetchCredentials` → `/api/sync/token`, `uploadData` → `/api/sync/upload`).
- Online login flow (`/api/desktop/login`) → first sync pulls the tenant's data.
- Sync-status UI (last synced, pending count, "Sync now").
- Deploy the `feat/desktop-sync` web branch when you're ready (so the endpoints are reachable from installed apps).
