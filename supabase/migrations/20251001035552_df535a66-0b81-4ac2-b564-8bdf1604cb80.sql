-- Drop the old function and create a new one that returns row details
DROP FUNCTION IF EXISTS search_sheet_data(TEXT);

CREATE OR REPLACE FUNCTION search_sheet_data_detailed(search_text TEXT)
RETURNS TABLE(
  sheet_id UUID,
  row_id UUID,
  row_index INTEGER,
  row_data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sd.sheet_id,
    sd.id as row_id,
    sd.row_index,
    sd.data as row_data
  FROM sheet_data sd
  WHERE sd.data::text ILIKE '%' || search_text || '%'
  ORDER BY sd.sheet_id, sd.row_index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;