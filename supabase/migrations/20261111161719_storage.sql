-- PediFlux · Storage de exames e documentos
-- Bucket privado. Caminho: <clinic_id>/<patient_id>/<uuid>-<nome-do-arquivo>
-- Médico acessa direto (RLS); a família só por URL assinada gerada no servidor.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exams', 'exams', false, 20 * 1024 * 1024,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

create policy exams_select on storage.objects for select to authenticated
  using (
    bucket_id = 'exams'
    and private.is_member(private.uuid_or_null((storage.foldername(name))[1]))
  );

create policy exams_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'exams'
    and private.can_write(private.uuid_or_null((storage.foldername(name))[1]))
  );

create policy exams_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'exams'
    and private.can_write(private.uuid_or_null((storage.foldername(name))[1]))
  );
