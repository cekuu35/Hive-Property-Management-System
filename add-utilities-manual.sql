-- Add comprehensive utilities to the utilities table
-- Run this in your Supabase SQL Editor

INSERT INTO utilities (name) VALUES 
    ('Water'),
    ('Electricity'),
    ('Internet'),
    ('Garbage Collection'),
    ('Sewer'),
    ('Gas'),
    ('Security'),
    ('Maintenance'),
    ('Parking'),
    ('Cable TV'),
    ('Trash'),
    ('Cleaning'),
    ('Laundry'),
    ('Heating'),
    ('Cooling'),
    ('Elevator'),
    ('Gym'),
    ('Pool'),
    ('Garden'),
    ('Pet Fee'),
    ('Storage'),
    ('Other')
ON CONFLICT (name) DO NOTHING;

-- Verify the utilities were added
SELECT * FROM utilities ORDER BY name;
