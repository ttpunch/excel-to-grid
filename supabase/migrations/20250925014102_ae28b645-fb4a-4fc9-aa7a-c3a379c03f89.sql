-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Editors and admins can create sheets" ON public.data_sheets;
DROP POLICY IF EXISTS "Editors and admins can update sheets" ON public.data_sheets;
DROP POLICY IF EXISTS "Admins can delete sheets" ON public.data_sheets;

-- Create new policies allowing users to manage their own sheets
CREATE POLICY "Users can create their own sheets" 
ON public.data_sheets 
FOR INSERT 
WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can update their own sheets" 
ON public.data_sheets 
FOR UPDATE 
USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete their own sheets" 
ON public.data_sheets 
FOR DELETE 
USING (auth.uid() = uploaded_by);

-- Also update sheet_data policies to allow users to manage data for their own sheets
DROP POLICY IF EXISTS "Editors and admins can manage sheet data" ON public.sheet_data;

CREATE POLICY "Users can manage data for their own sheets" 
ON public.sheet_data 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.data_sheets 
    WHERE id = sheet_data.sheet_id 
    AND uploaded_by = auth.uid()
  )
);