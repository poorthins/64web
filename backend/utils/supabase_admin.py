import os
from supabase import create_client, Client

def get_supabase_admin() -> Client:
    """
    建立 Supabase admin client
    使用 service role key，僅限後端使用
    """
    url = os.getenv('SUPABASE_URL')
    service_role_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    if not url or not service_role_key:
        raise ValueError('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
    
    supabase: Client = create_client(url, service_role_key)
    return supabase