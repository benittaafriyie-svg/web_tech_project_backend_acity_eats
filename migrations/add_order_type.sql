-- Migration: Add order_type column to orders table
-- Run this script if the order_type column doesn't exist in your orders table

-- Check if column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'order_type'
    ) THEN
        ALTER TABLE orders 
        ADD COLUMN order_type VARCHAR(20) DEFAULT 'Inhouse';
        
        -- Update existing orders to have 'Inhouse' as default
        UPDATE orders 
        SET order_type = 'Inhouse' 
        WHERE order_type IS NULL;
    END IF;
END $$;
