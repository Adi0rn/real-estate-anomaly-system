-- Drop legacy trigger and function if present to prevent duplicate PriceHistory rows
DROP TRIGGER IF EXISTS property_price_change_trigger ON public."Property";
DROP FUNCTION IF EXISTS public.record_price_change();

-- Create or replace trigger function to record Property price changes
CREATE OR REPLACE FUNCTION public.record_property_price_history()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public."PriceHistory" ("propertyId", "price", "recordedAt")
    VALUES (NEW."propertyId", NEW."price", CURRENT_TIMESTAMP);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists to allow safe re-execution
DROP TRIGGER IF EXISTS property_price_history_trigger ON public."Property";

-- Create trigger on Property table for price updates
CREATE TRIGGER property_price_history_trigger
AFTER UPDATE OF price ON public."Property"
FOR EACH ROW
WHEN (OLD.price IS DISTINCT FROM NEW.price)
EXECUTE FUNCTION public.record_property_price_history();
