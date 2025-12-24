-- Test data for Affordability Index
-- Maine and California places and ZIPs
-- Column names match Prisma schema (camelCase)

-- Insert Maine places
INSERT INTO geo_place ("placeGeoid", name, "stateAbbr", "stateFips", "countyFips") VALUES
('2360545', 'Portland', 'ME', '23', '005'),
('2310345', 'Cape Elizabeth', 'ME', '23', '005'),
('2378500', 'Yarmouth', 'ME', '23', '005'),
('2304460', 'Augusta', 'ME', '23', '011'),
('2313835', 'Brunswick', 'ME', '23', '005')
ON CONFLICT ("placeGeoid") DO NOTHING;

-- Insert California places
INSERT INTO geo_place ("placeGeoid", name, "stateAbbr", "stateFips", "countyFips") VALUES
('0667000', 'San Francisco', 'CA', '06', '075'),
('0653000', 'Oakland', 'CA', '06', '001'),
('0673080', 'Sunnyvale', 'CA', '06', '085'),
('0666000', 'San Diego', 'CA', '06', '073'),
('0664000', 'Sacramento', 'CA', '06', '067')
ON CONFLICT ("placeGeoid") DO NOTHING;

-- Insert Maine ZCTAs
INSERT INTO geo_zcta (zcta, "stateAbbr") VALUES
('04101', 'ME'),
('04102', 'ME'),
('04107', 'ME'),
('04330', 'ME'),
('04011', 'ME')
ON CONFLICT (zcta) DO NOTHING;

-- Insert California ZCTAs
INSERT INTO geo_zcta (zcta, "stateAbbr") VALUES
('94102', 'CA'),
('94607', 'CA'),
('94085', 'CA'),
('92101', 'CA'),
('95814', 'CA')
ON CONFLICT (zcta) DO NOTHING;

-- Insert metric snapshots for Maine places
INSERT INTO metric_snapshot (id, "geoType", "geoId", "asOfDate", "homeValue", income, ratio, sources) VALUES
('test_me_portland', 'PLACE', '2360545', '2024-10-31', 520000, 85000, 6.12, 'Zillow ZHVI + Census ACS'),
('test_me_cape_elizabeth', 'PLACE', '2310345', '2024-10-31', 650000, 143750, 4.52, 'Zillow ZHVI + Census ACS'),
('test_me_yarmouth', 'PLACE', '2378500', '2024-10-31', 485000, 95000, 5.11, 'Zillow ZHVI + Census ACS'),
('test_me_augusta', 'PLACE', '2304460', '2024-10-31', 245000, 58000, 4.22, 'Zillow ZHVI + Census ACS'),
('test_me_brunswick', 'PLACE', '2313835', '2024-10-31', 375000, 72000, 5.21, 'Zillow ZHVI + Census ACS');

-- Insert metric snapshots for California places
INSERT INTO metric_snapshot (id, "geoType", "geoId", "asOfDate", "homeValue", income, ratio, sources) VALUES
('test_ca_san_francisco', 'PLACE', '0667000', '2024-10-31', 1350000, 136500, 9.89, 'Zillow ZHVI + Census ACS'),
('test_ca_oakland', 'PLACE', '0653000', '2024-10-31', 875000, 92000, 9.51, 'Zillow ZHVI + Census ACS'),
('test_ca_sunnyvale', 'PLACE', '0673080', '2024-10-31', 1750000, 168000, 10.42, 'Zillow ZHVI + Census ACS'),
('test_ca_san_diego', 'PLACE', '0666000', '2024-10-31', 925000, 98500, 9.39, 'Zillow ZHVI + Census ACS'),
('test_ca_sacramento', 'PLACE', '0664000', '2024-10-31', 485000, 76000, 6.38, 'Zillow ZHVI + Census ACS');

-- Insert metric snapshots for Maine ZCTAs
INSERT INTO metric_snapshot (id, "geoType", "geoId", "asOfDate", "homeValue", income, ratio, sources) VALUES
('test_zip_04101', 'ZCTA', '04101', '2024-10-31', 465000, 72000, 6.46, 'Zillow ZHVI + Census ACS'),
('test_zip_04102', 'ZCTA', '04102', '2024-10-31', 385000, 68000, 5.66, 'Zillow ZHVI + Census ACS'),
('test_zip_04107', 'ZCTA', '04107', '2024-10-31', 675000, 148000, 4.56, 'Zillow ZHVI + Census ACS'),
('test_zip_04330', 'ZCTA', '04330', '2024-10-31', 235000, 57500, 4.09, 'Zillow ZHVI + Census ACS'),
('test_zip_04011', 'ZCTA', '04011', '2024-10-31', 395000, 78000, 5.06, 'Zillow ZHVI + Census ACS');

-- Insert metric snapshots for California ZCTAs
INSERT INTO metric_snapshot (id, "geoType", "geoId", "asOfDate", "homeValue", income, ratio, sources) VALUES
('test_zip_94102', 'ZCTA', '94102', '2024-10-31', 1250000, 125000, 10.00, 'Zillow ZHVI + Census ACS'),
('test_zip_94607', 'ZCTA', '94607', '2024-10-31', 825000, 88000, 9.38, 'Zillow ZHVI + Census ACS'),
('test_zip_94085', 'ZCTA', '94085', '2024-10-31', 2150000, 195000, 11.03, 'Zillow ZHVI + Census ACS'),
('test_zip_92101', 'ZCTA', '92101', '2024-10-31', 785000, 92000, 8.53, 'Zillow ZHVI + Census ACS'),
('test_zip_95814', 'ZCTA', '95814', '2024-10-31', 425000, 68000, 6.25, 'Zillow ZHVI + Census ACS')
ON CONFLICT (id) DO NOTHING;
