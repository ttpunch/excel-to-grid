-- Create a function to search within sheet data
CREATE OR REPLACE FUNCTION search_sheet_data(search_text TEXT)
RETURNS TABLE(sheet_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT sd.sheet_id
  FROM sheet_data sd
  WHERE sd.data::text ILIKE '%' || search_text || '%';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;