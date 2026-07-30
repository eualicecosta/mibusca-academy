create table if not exists "Categoria" (
  "id" text not null,
  "courseId" text not null,
  "title" text not null,
  "description" text,
  "coverImagePath" text,
  "order" integer not null,
  "status" "ContentStatus" not null default 'PUBLISHED',
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null default current_timestamp,
  constraint "Categoria_pkey" primary key ("id")
);

create unique index if not exists "Categoria_courseId_order_key"
on "Categoria" ("courseId", "order");

create index if not exists "Categoria_courseId_status_order_idx"
on "Categoria" ("courseId", "status", "order");

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'Categoria_courseId_fkey'
  ) then
    alter table "Categoria"
    add constraint "Categoria_courseId_fkey"
    foreign key ("courseId") references "Course"("id")
    on delete cascade on update cascade;
  end if;
end $$;

alter table "Module"
add column if not exists "categoriaId" text;

insert into "Categoria" ("id", "courseId", "title", "description", "order", "status", "createdAt", "updatedAt")
select
  'cat_' || substr(md5(c."id" || '-geral'), 1, 20),
  c."id",
  'Geral',
  'Categoria temporaria para organizar os modulos existentes.',
  1,
  'PUBLISHED',
  current_timestamp,
  current_timestamp
from "Course" c
where not exists (
  select 1
  from "Categoria" g
  where g."courseId" = c."id" and g."title" = 'Geral'
);

update "Module" m
set "categoriaId" = g."id"
from "Categoria" g
where m."courseId" = g."courseId"
  and g."title" = 'Geral'
  and m."categoriaId" is null;

alter table "Module"
alter column "categoriaId" set not null;

drop index if exists "Module_courseId_order_key";

create unique index if not exists "Module_categoriaId_order_key"
on "Module" ("categoriaId", "order");

create index if not exists "Module_categoriaId_status_order_idx"
on "Module" ("categoriaId", "status", "order");

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'Module_categoriaId_fkey'
  ) then
    alter table "Module"
    add constraint "Module_categoriaId_fkey"
    foreign key ("categoriaId") references "Categoria"("id")
    on delete restrict on update cascade;
  end if;
end $$;
