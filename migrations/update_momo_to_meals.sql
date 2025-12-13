-- Migration: Update category from "Momo" to "Meals"
-- Run this script to update existing menu items in your database

-- Update all menu items with category "Momo" to "Meals"
UPDATE menu_items 
SET category = 'Meals' 
WHERE category = 'Momo';

-- Verify the update (optional - run this to see how many items were updated)
-- SELECT COUNT(*) FROM menu_items WHERE category = 'Meals';
-- SELECT COUNT(*) FROM menu_items WHERE category = 'Momo';
