-- ============================================================================
-- Sample data — enough to see the app working end to end. Safe to re-run.
-- ============================================================================

update public.restaurant_settings
set restaurant_name = 'The Grand Table',
    wifi_ssid = 'TheGrandTable-Guest',
    wifi_password = 'welcome2026',
    wifi_security = 'WPA',
    google_review_url = 'https://g.page/r/REPLACE-WITH-YOUR-PLACE-ID/review',
    review_delay_minutes = 30
where id = 1;

insert into public.restaurant_tables (table_number, label)
select n, 'Table ' || n
from generate_series(1, 20) as n
on conflict (table_number) do nothing;

with cats as (
  insert into public.menu_categories (name, sort_order)
  values
    ('Starters', 1),
    ('Mains', 2),
    ('Desserts', 3),
    ('Drinks', 4)
  on conflict do nothing
  returning id, name
)
select 1;

-- Re-select categories (works whether or not the insert above hit the
-- on-conflict branch) so item inserts always have valid ids.
do $$
declare
  c_starters uuid;
  c_mains uuid;
  c_desserts uuid;
  c_drinks uuid;
begin
  select id into c_starters from public.menu_categories where name = 'Starters' limit 1;
  select id into c_mains from public.menu_categories where name = 'Mains' limit 1;
  select id into c_desserts from public.menu_categories where name = 'Desserts' limit 1;
  select id into c_drinks from public.menu_categories where name = 'Drinks' limit 1;

  if not exists (select 1 from public.menu_items where category_id = c_starters) then
    insert into public.menu_items (category_id, name, description, price, sort_order, is_featured) values
      (c_starters, 'Crispy Calamari', 'Lightly fried squid, served with lemon aioli and chili flakes.', 42, 1, true),
      (c_starters, 'Burrata & Tomato', 'Creamy burrata, heirloom tomatoes, basil oil, sourdough crostini.', 48, 2, false),
      (c_starters, 'Soup of the Day', 'Ask your server — changes daily with seasonal ingredients.', 32, 3, false);
  end if;

  if not exists (select 1 from public.menu_items where category_id = c_mains) then
    insert into public.menu_items (category_id, name, description, price, sort_order, is_featured) values
      (c_mains, 'Grilled Ribeye', '300g dry-aged ribeye, roasted potatoes, chimichurri.', 129, 1, true),
      (c_mains, 'Truffle Mushroom Risotto', 'Arborio rice, wild mushrooms, parmesan, black truffle oil.', 78, 2, false),
      (c_mains, 'Pan-Seared Salmon', 'Crispy skin salmon, charred asparagus, citrus beurre blanc.', 96, 3, false),
      (c_mains, 'Margherita Pizza', 'San Marzano tomato, fior di latte, fresh basil, olive oil.', 62, 4, false);
  end if;

  if not exists (select 1 from public.menu_items where category_id = c_desserts) then
    insert into public.menu_items (category_id, name, description, price, sort_order, is_featured) values
      (c_desserts, 'Molten Chocolate Cake', 'Warm chocolate cake, vanilla bean ice cream, raspberry coulis.', 38, 1, true),
      (c_desserts, 'Classic Tiramisu', 'Espresso-soaked ladyfingers, mascarpone cream, cocoa dust.', 34, 2, false);
  end if;

  if not exists (select 1 from public.menu_items where category_id = c_drinks) then
    insert into public.menu_items (category_id, name, description, price, sort_order, is_featured) values
      (c_drinks, 'Fresh Lemonade', 'House-made, lightly sparkling.', 22, 1, false),
      (c_drinks, 'Espresso', 'Double shot, single origin.', 16, 2, false),
      (c_drinks, 'House Red Wine', 'Glass of the sommelier''s pick.', 45, 3, false),
      (c_drinks, 'Sparkling Water', '500ml.', 14, 4, false);
  end if;
end $$;
