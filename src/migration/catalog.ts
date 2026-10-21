import type { Client } from "pg";
import { digest } from "./source";

/** Compare definitions against a separately migrated, data-free Neon baseline. */
export async function catalogFingerprint(client: Client): Promise<string> {
  const parts = [];
  for (const query of [
    "select current_setting('server_version') as version, current_setting('server_encoding') as encoding",
    "select extname, extversion from pg_extension order by extname",
    `select c.relname, c.relkind, c.relrowsecurity, c.relforcerowsecurity, pg_get_userbyid(c.relowner) as owner,
      a.attname, a.attnum, format_type(a.atttypid,a.atttypmod) as type, a.attnotnull,
      pg_get_expr(d.adbin,d.adrelid) as default_value, a.attidentity, a.attgenerated
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
      left join pg_attribute a on a.attrelid=c.oid and a.attnum>0 and not a.attisdropped
      left join pg_attrdef d on d.adrelid=c.oid and d.adnum=a.attnum
      where n.nspname in ('public','drizzle') order by n.nspname,c.relname,a.attnum`,
    `select n.nspname,c.relname,k.conname,k.contype,pg_get_constraintdef(k.oid,true) as definition
      from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace
      where n.nspname in ('public','drizzle') order by n.nspname,c.relname,k.conname`,
    "select schemaname,tablename,indexname,indexdef from pg_indexes where schemaname in ('public','drizzle') order by schemaname,tablename,indexname",
    `select n.nspname,c.relname,t.tgname,pg_get_triggerdef(t.oid,true) as definition from pg_trigger t
      join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
      where not t.tgisinternal and n.nspname in ('public','drizzle') order by n.nspname,c.relname,t.tgname`,
    "select * from pg_policies where schemaname in ('public','drizzle') order by schemaname,tablename,policyname",
    `select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) as arguments,pg_get_functiondef(p.oid) as definition
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f'
      order by n.nspname,p.proname,arguments`,
    "select hash,created_at from drizzle.__drizzle_migrations order by created_at,id",
  ])
    parts.push((await client.query(query)).rows);
  return digest(JSON.stringify(parts));
}
