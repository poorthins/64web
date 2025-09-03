import os
import requests
from typing import Optional, Dict

def get_user_from_token(access_token: str) -> Optional[Dict]:
    """
    從 access token 取得用戶資訊
    使用 Supabase Auth API
    """
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_anon_key = os.getenv('SUPABASE_ANON_KEY')
    
    if not supabase_url or not supabase_anon_key:
        return None
    
    try:
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
            return {
                'id': user_data.get('id'),
                'email': user_data.get('email')
            }
        else:
            return None
            
    except Exception as e:
        print(f"Error getting user from token: {e}")
        return None