import os
import requests
from typing import Optional, Dict
from .supabase_admin import get_supabase_admin

def get_user_from_token(auth_header: str) -> Optional[Dict]:
    """
    從 Authorization header 中解析 token 並取得用戶資料（包含角色）
    """
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    
    access_token = auth_header.replace('Bearer ', '')
    
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_anon_key = os.getenv('SUPABASE_ANON_KEY')
    
    if not supabase_url or not supabase_anon_key:
        return None
    
    try:
        # 先從 Supabase Auth API 取得基本用戶資訊
        headers = {
            'Authorization': f'Bearer {access_token}',
            'apikey': supabase_anon_key,
            'Content-Type': 'application/json'
        }
        
        response = requests.get(
            f'{supabase_url}/auth/v1/user',
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            user_data = response.json()
            user_id = user_data.get('id')
            
            if user_id:
                # 使用 admin client 取得 profile 資料（包含角色）
                supabase = get_supabase_admin()
                profile_result = supabase.table('profiles').select('*').eq('id', user_id).single().execute()
                
                if profile_result.data:
                    return {
                        'id': user_id,
                        'email': user_data.get('email'),
                        'role': profile_result.data.get('role', 'user'),
                        'display_name': profile_result.data.get('display_name'),
                        'is_active': profile_result.data.get('is_active', True),
                        'company': profile_result.data.get('company')
                    }
        
        return None
            
    except Exception as e:
        print(f"Error getting user from token: {e}")
        return None