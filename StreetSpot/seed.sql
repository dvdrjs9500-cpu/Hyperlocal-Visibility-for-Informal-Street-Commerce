INSERT INTO streetspot_vendors
(id, name, category, lat, lng, is_live, expires_at, avatar)
VALUES
('10000000-0000-4000-8000-000000000001',
 'Kumar''s Kothu Corner', 'Street Food',
 11.0168, 76.9558, true, now() + interval '2 hours', '🍲')
ON CONFLICT (id) DO NOTHING;

INSERT INTO streetspot_items (vendor_id, name, price)
SELECT
'10000000-0000-4000-8000-000000000001',
'Egg kothu parotta', 90
WHERE NOT EXISTS (
    SELECT 1 FROM streetspot_items
    WHERE vendor_id = '10000000-0000-4000-8000-000000000001'
    AND name = 'Egg kothu parotta'
);

INSERT INTO streetspot_vendors
(id, name, category, lat, lng, is_live, expires_at, avatar)
VALUES
('10000000-0000-4000-8000-000000000002',
 'Maya Fresh Juice', 'Street Food',
 11.0181, 76.9539, true, now() + interval '3 hours', '🥤')
ON CONFLICT (id) DO NOTHING;

INSERT INTO streetspot_items (vendor_id, name, price)
SELECT
'10000000-0000-4000-8000-000000000002',
'Watermelon juice', 50
WHERE NOT EXISTS (
    SELECT 1 FROM streetspot_items
    WHERE vendor_id = '10000000-0000-4000-8000-000000000002'
    AND name = 'Watermelon juice'
);
