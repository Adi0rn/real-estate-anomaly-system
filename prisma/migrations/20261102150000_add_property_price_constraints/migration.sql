-- Add CHECK constraints for data integrity on Property and PriceHistory tables

-- 1. Property price must be strictly positive (> 0)
ALTER TABLE public."Property"
ADD CONSTRAINT property_price_positive_check
CHECK (price > 0);

-- 2. Property area must be strictly positive (> 0)
ALTER TABLE public."Property"
ADD CONSTRAINT property_area_positive_check
CHECK ("areaSqft" > 0);

-- 3. Property bedrooms must be non-negative (>= 0)
ALTER TABLE public."Property"
ADD CONSTRAINT property_bedrooms_non_negative_check
CHECK (bedrooms >= 0);

-- 4. Property bathrooms must be non-negative (>= 0)
ALTER TABLE public."Property"
ADD CONSTRAINT property_bathrooms_non_negative_check
CHECK (bathrooms >= 0);

-- 5. Property listingType must be either 'SALE' or 'RENT'
ALTER TABLE public."Property"
ADD CONSTRAINT property_listing_type_check
CHECK ("listingType" IN ('SALE', 'RENT'));

-- 6. Property propertyType must be 'APARTMENT', 'HOUSE', or 'VILLA'
ALTER TABLE public."Property"
ADD CONSTRAINT property_type_check
CHECK ("propertyType" IN ('APARTMENT', 'HOUSE', 'VILLA'));

-- 7. PriceHistory price must be strictly positive (> 0)
ALTER TABLE public."PriceHistory"
ADD CONSTRAINT price_history_price_positive_check
CHECK (price > 0);
