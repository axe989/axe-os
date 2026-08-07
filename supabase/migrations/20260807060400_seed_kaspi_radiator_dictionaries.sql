-- Seed data only (no schema change): the seven attribute dictionaries
-- needed to publish "Heating radiators" to Kaspi, populated with the
-- REAL dropdown vocabulary extracted from docs/kaspi-template.xlsm
-- (sheet "values", columns C-I) -- nothing here is invented.
--
-- category_id is left null (channel-wide translation) for now: these
-- values are only meaningful for the Heating Radiators category today,
-- so a category-scoped override isn't needed until a second category
-- reuses one of these dictionary_codes with different Kaspi vocabulary.

insert into public.attribute_dictionaries (dictionary_code, name) values
  ('radiator_category', 'Тип радиатора (Kaspi: Тип)'),
  ('construction', 'Конструкция радиатора'),
  ('connection', 'Тип подключения радиатора'),
  ('material', 'Материал радиатора'),
  ('color', 'Цвет'),
  ('section_number', 'Число секций/панелей'),
  ('equipment', 'Комплектация (бандл)')
on conflict (dictionary_code) do nothing;

-- radiator_category (values!C2:C5): монолитный / панельный / секционный / трубчатый
insert into public.attribute_dictionary_values (dictionary_code, value_code, display_label) values
  ('radiator_category', 'monolithic', 'Монолитный радиатор'),
  ('radiator_category', 'panel', 'Панельный радиатор'),
  ('radiator_category', 'sectional', 'Секционный радиатор'),
  ('radiator_category', 'tubular', 'Трубчатый радиатор')
on conflict (dictionary_code, value_code) do nothing;

-- construction (values!D2:D4): напольная / настенная / универсальная
insert into public.attribute_dictionary_values (dictionary_code, value_code, display_label) values
  ('construction', 'floor', 'Напольная конструкция'),
  ('construction', 'wall', 'Настенная конструкция'),
  ('construction', 'universal', 'Универсальная конструкция')
on conflict (dictionary_code, value_code) do nothing;

-- connection (values!E2:E4): боковое / нижнее / универсальное
insert into public.attribute_dictionary_values (dictionary_code, value_code, display_label) values
  ('connection', 'side', 'Боковое подключение'),
  ('connection', 'bottom', 'Нижнее подключение'),
  ('connection', 'universal', 'Универсальное подключение')
on conflict (dictionary_code, value_code) do nothing;

-- material (values!F2:F6): биметаллический / алюминиевый / стальной / чугунный / медный
insert into public.attribute_dictionary_values (dictionary_code, value_code, display_label) values
  ('material', 'bimetal', 'Биметаллический'),
  ('material', 'aluminium', 'Алюминиевый'),
  ('material', 'steel', 'Стальной'),
  ('material', 'cast_iron', 'Чугунный'),
  ('material', 'copper', 'Медный')
on conflict (dictionary_code, value_code) do nothing;

-- color (values!G2:G19): 18 fixed colour names
insert into public.attribute_dictionary_values (dictionary_code, value_code, display_label) values
  ('color', 'black', 'Черный'),
  ('color', 'gray', 'Серый'),
  ('color', 'silver', 'Серебристый'),
  ('color', 'white', 'Белый'),
  ('color', 'gold', 'Золотистый'),
  ('color', 'red', 'Красный'),
  ('color', 'beige', 'Бежевый'),
  ('color', 'blue', 'Синий'),
  ('color', 'yellow', 'Желтый'),
  ('color', 'light_blue', 'Голубой'),
  ('color', 'pink', 'Розовый'),
  ('color', 'bronze', 'Бронза'),
  ('color', 'light_gray', 'Светло-серый'),
  ('color', 'dark_gray', 'Темно-серый'),
  ('color', 'copper', 'Медный'),
  ('color', 'violet', 'Фиолетовый'),
  ('color', 'green', 'Зеленый'),
  ('color', 'brown', 'Коричневый')
on conflict (dictionary_code, value_code) do nothing;

-- section_number (values!H2:H34): "1".."30", "36", "42", "без секций (монолитный)"
insert into public.attribute_dictionary_values (dictionary_code, value_code, display_label)
select 'section_number', n::text, n::text
from generate_series(1, 30) as n
on conflict (dictionary_code, value_code) do nothing;

insert into public.attribute_dictionary_values (dictionary_code, value_code, display_label) values
  ('section_number', '36', '36'),
  ('section_number', '42', '42'),
  ('section_number', 'none', 'Без секций (монолитный)')
on conflict (dictionary_code, value_code) do nothing;

-- equipment (values!I2:I9): bundle_components dictionary
insert into public.attribute_dictionary_values (dictionary_code, value_code, display_label) values
  ('equipment', 'base_radiator', 'Радиатор'),
  ('equipment', 'bracket_kit', 'Комплект кронштейнов'),
  ('equipment', 'connection_kit_3_4', 'Присоединительный набор 3/4"'),
  ('equipment', 'connection_kit_1', 'Присоединительный набор 1"'),
  ('equipment', 'connection_kit_1_2', 'Присоединительный набор 1/2"'),
  ('equipment', 'air_vent_valve', 'Кран Маевского'),
  ('equipment', 'thermostatic_valve', 'Термостатический клапан'),
  ('equipment', 'plug', 'Заглушка')
on conflict (dictionary_code, value_code) do nothing;

-- Kaspi translations: for these seven dictionaries the canonical
-- display_label already carries the Kaspi wording in Russian for most
-- entries, but the *translated_value* stored below is what actually goes
-- into the CSV and matches the template's dropdown text exactly
-- (lowercase, no trailing punctuation, as Kaspi expects it).
insert into public.attribute_channel_translations (attribute_dictionary_value_id, sales_channel, category_id, translated_value)
select id, 'kaspi', null, case
  when dictionary_code = 'radiator_category' and value_code = 'monolithic' then 'монолитный'
  when dictionary_code = 'radiator_category' and value_code = 'panel' then 'панельный'
  when dictionary_code = 'radiator_category' and value_code = 'sectional' then 'секционный'
  when dictionary_code = 'radiator_category' and value_code = 'tubular' then 'трубчатый'
  when dictionary_code = 'construction' and value_code = 'floor' then 'напольная'
  when dictionary_code = 'construction' and value_code = 'wall' then 'настенная'
  when dictionary_code = 'construction' and value_code = 'universal' then 'универсальная'
  when dictionary_code = 'connection' and value_code = 'side' then 'боковое'
  when dictionary_code = 'connection' and value_code = 'bottom' then 'нижнее'
  when dictionary_code = 'connection' and value_code = 'universal' then 'универсальное'
  when dictionary_code = 'material' and value_code = 'bimetal' then 'биметаллический'
  when dictionary_code = 'material' and value_code = 'aluminium' then 'алюминиевый'
  when dictionary_code = 'material' and value_code = 'steel' then 'стальной'
  when dictionary_code = 'material' and value_code = 'cast_iron' then 'чугунный'
  when dictionary_code = 'material' and value_code = 'copper' then 'медный'
  when dictionary_code = 'color' and value_code = 'black' then 'черный'
  when dictionary_code = 'color' and value_code = 'gray' then 'серый'
  when dictionary_code = 'color' and value_code = 'silver' then 'серебристый'
  when dictionary_code = 'color' and value_code = 'white' then 'белый'
  when dictionary_code = 'color' and value_code = 'gold' then 'золотистый'
  when dictionary_code = 'color' and value_code = 'red' then 'красный'
  when dictionary_code = 'color' and value_code = 'beige' then 'бежевый'
  when dictionary_code = 'color' and value_code = 'blue' then 'синий'
  when dictionary_code = 'color' and value_code = 'yellow' then 'желтый'
  when dictionary_code = 'color' and value_code = 'light_blue' then 'голубой'
  when dictionary_code = 'color' and value_code = 'pink' then 'розовый'
  when dictionary_code = 'color' and value_code = 'bronze' then 'бронза'
  when dictionary_code = 'color' and value_code = 'light_gray' then 'светло-серый'
  when dictionary_code = 'color' and value_code = 'dark_gray' then 'темно-серый'
  when dictionary_code = 'color' and value_code = 'copper' then 'медный'
  when dictionary_code = 'color' and value_code = 'violet' then 'фиолетовый'
  when dictionary_code = 'color' and value_code = 'green' then 'зеленый'
  when dictionary_code = 'color' and value_code = 'brown' then 'коричневый'
  when dictionary_code = 'section_number' and value_code = 'none' then 'без секций (монолитный)'
  when dictionary_code = 'section_number' then value_code
  when dictionary_code = 'equipment' and value_code = 'base_radiator' then 'радиатор'
  when dictionary_code = 'equipment' and value_code = 'bracket_kit' then 'комплект кронштейнов'
  when dictionary_code = 'equipment' and value_code = 'connection_kit_3_4' then 'присоединительный набор 3/4'
  when dictionary_code = 'equipment' and value_code = 'connection_kit_1' then 'присоединительный набор 1"'
  when dictionary_code = 'equipment' and value_code = 'connection_kit_1_2' then 'присоединительный набор 1/2'
  when dictionary_code = 'equipment' and value_code = 'air_vent_valve' then 'кран маевского'
  when dictionary_code = 'equipment' and value_code = 'thermostatic_valve' then 'термостатический клапан'
  when dictionary_code = 'equipment' and value_code = 'plug' then 'заглушка'
end
from public.attribute_dictionary_values
where dictionary_code in ('radiator_category', 'construction', 'connection', 'material', 'color', 'section_number', 'equipment')
on conflict do nothing;
