import { supabase } from "@/integrations/supabase/client";

export type AuditAction = 'upload' | 'edit' | 'delete' | 'view' | 'download' | 'search';
export type ResourceType = 'sheet' | 'row' | 'profile' | 'settings';

interface CreateAuditLogParams {
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: string;
  details?: Record<string, any>;
}

export async function createAuditLog({
  action,
  resourceType,
  resourceId,
  details
}: CreateAuditLogParams) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('No user found for audit log');
      return null;
    }

    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action,
        resource_type: resourceType,
        resource_id: resourceId || null,
        details: details || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating audit log:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createAuditLog:', error);
    return null;
  }
}
