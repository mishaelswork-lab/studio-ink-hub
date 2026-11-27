-- Keep bookings and conversations intact if an associated design request is erased.
alter table public.bookings drop constraint if exists bookings_design_request_id_fkey;
alter table public.bookings add constraint bookings_design_request_id_fkey
  foreign key (design_request_id) references public.design_requests(id) on delete set null;

alter table public.conversations drop constraint if exists conversations_design_request_id_fkey;
alter table public.conversations add constraint conversations_design_request_id_fkey
  foreign key (design_request_id) references public.design_requests(id) on delete set null;
