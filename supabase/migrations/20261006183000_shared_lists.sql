-- =============================================================================
-- Lista compartida tablet → celular ("Llevar lista a mi celular" con QR)
--
-- Flujo (detalle en docs/QR-TABLET-CELULAR.md):
--   1. La tablet (rol anon, sin login) INSERTA la lista con un id que genera ella
--      y muestra un QR con ese id.
--   2. El celular lee la lista con get_shared_list(id) y la toma con
--      claim_shared_list(id), que la marca como recibida.
--   3. La tablet pregunta shared_list_claimed(id) para mostrar "Lista recibida".
--
-- Nadie puede listar la tabla: no hay política SELECT. Solo se accede por id
-- (un uuid aleatorio) a través de las funciones, y las listas vencen a los 30 min.
-- =============================================================================

create table public.shared_lists (
  id          uuid primary key default gen_random_uuid(),
  brand_id    text not null check (char_length(brand_id) between 1 and 40),
  title       text not null default 'Mi compra' check (char_length(title) <= 120),
  -- [{ name, qty, qtyLabel?, aisle?, productId?, unitPrice?, offerPrice? }]
  items       jsonb not null check (
                jsonb_typeof(items) = 'array'
                and jsonb_array_length(items) between 1 and 200
              ),
  total       integer not null default 0 check (total >= 0),
  language    text not null default 'es' check (language in ('es', 'en', 'pt')),
  kiosk_id    text check (char_length(kiosk_id) <= 60),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '30 minutes',
  claimed_at  timestamptz,
  claimed_by  uuid references auth.users (id) on delete set null
);

create index shared_lists_expires_at_idx on public.shared_lists (expires_at);

alter table public.shared_lists enable row level security;

-- Permisos explícitos (funciona aunque "Automatically expose new tables" esté apagado):
-- los clientes solo pueden insertar; leer y marcar va por las funciones de abajo.
revoke all on public.shared_lists from anon, authenticated;
grant insert on public.shared_lists to anon, authenticated;

-- La tablet solo puede crear listas nuevas, sin recibir ni vencer más allá de 2 h.
-- (Sin políticas SELECT/UPDATE/DELETE: ningún cliente lee ni cambia la tabla directo.)
create policy "La tablet crea listas compartidas"
  on public.shared_lists
  for insert
  to anon, authenticated
  with check (
    claimed_at is null
    and claimed_by is null
    and expires_at > now()
    and expires_at <= now() + interval '2 hours'
  );

-- -----------------------------------------------------------------------------
-- Celular: leer una lista vigente por su id (con o sin sesión iniciada)
-- -----------------------------------------------------------------------------
create or replace function public.get_shared_list(list_id uuid)
returns table (
  id uuid,
  brand_id text,
  title text,
  items jsonb,
  total integer,
  language text,
  created_at timestamptz,
  expires_at timestamptz,
  claimed_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select l.id, l.brand_id, l.title, l.items, l.total, l.language,
         l.created_at, l.expires_at, l.claimed_at
    from public.shared_lists l
   where l.id = list_id
     and l.expires_at > now();
$$;

-- -----------------------------------------------------------------------------
-- Celular: tomar la lista. La marca como recibida (la tablet lo muestra) y, si
-- hay sesión, la asocia al usuario. Llamarla de nuevo no cambia quién la tomó.
-- -----------------------------------------------------------------------------
create or replace function public.claim_shared_list(list_id uuid)
returns table (
  id uuid,
  brand_id text,
  title text,
  items jsonb,
  total integer,
  language text,
  created_at timestamptz,
  expires_at timestamptz,
  claimed_at timestamptz
)
language sql
volatile
security definer
set search_path = ''
as $$
  update public.shared_lists l
     set claimed_at = coalesce(l.claimed_at, now()),
         claimed_by = coalesce(l.claimed_by, auth.uid())
   where l.id = list_id
     and l.expires_at > now()
  returning l.id, l.brand_id, l.title, l.items, l.total, l.language,
            l.created_at, l.expires_at, l.claimed_at;
$$;

-- -----------------------------------------------------------------------------
-- Tablet: saber si la lista ya llegó al celular, sin exponer su contenido
-- -----------------------------------------------------------------------------
create or replace function public.shared_list_claimed(list_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.shared_lists l
     where l.id = list_id
       and l.claimed_at is not null
  );
$$;

revoke all on function public.get_shared_list(uuid) from public;
revoke all on function public.claim_shared_list(uuid) from public;
revoke all on function public.shared_list_claimed(uuid) from public;
grant execute on function public.get_shared_list(uuid) to anon, authenticated;
grant execute on function public.claim_shared_list(uuid) to anon, authenticated;
grant execute on function public.shared_list_claimed(uuid) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Limpieza: borra listas vencidas hace más de un día. Solo para el servidor.
-- Programarla con pg_cron (Dashboard → Integrations → Cron), por ejemplo:
--   select cron.schedule('limpiar-listas-compartidas', '0 4 * * *',
--                        $$select public.purge_expired_shared_lists()$$);
-- -----------------------------------------------------------------------------
create or replace function public.purge_expired_shared_lists()
returns integer
language sql
volatile
security definer
set search_path = ''
as $$
  with deleted as (
    delete from public.shared_lists
     where expires_at < now() - interval '1 day'
    returning 1
  )
  select count(*)::integer from deleted;
$$;

revoke all on function public.purge_expired_shared_lists() from public, anon, authenticated;
