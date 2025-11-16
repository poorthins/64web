-- 檢查所有用戶的 SF6 權限
SELECT 
  u.id,
  u.email,
  u.display_name,
  up.energy_categories,
  CASE 
    WHEN up.energy_categories::jsonb ? 'sf6' THEN '✅ 有 SF6 權限'
    ELSE '❌ 無 SF6 權限'
  END as sf6_status
FROM auth.users u
LEFT JOIN public.user_permissions up ON u.id = up.user_id
WHERE u.role = 'user'
ORDER BY u.email;

-- 如果要給所有用戶加上 SF6 權限，執行以下語句（請謹慎使用）:
-- UPDATE public.user_permissions 
-- SET energy_categories = energy_categories || '["sf6"]'::jsonb
-- WHERE NOT (energy_categories::jsonb ? 'sf6');
