/*
# Remove Demo Admin Auto-Promotion

Removes the admin@smartwaste.ke email from the handle_new_user trigger
so it no longer auto-grants admin role on signup. Only the real admin
(iamellyokello@gmail.com) retains auto-promotion.

Also demotes any existing admin@smartwaste.ke account back to 'user'.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role text := 'user';
  v_partner_id uuid := NULL;
BEGIN
  IF NEW.email = 'iamellyokello@gmail.com' THEN
    v_role := 'admin';
  ELSIF NEW.email IN ('partner@boomlights.co.ke') THEN
    v_role := 'partner';
    SELECT id INTO v_partner_id FROM public.collection_partners WHERE name = 'Boom Lights' LIMIT 1;
  END IF;

  INSERT INTO public.profiles (id, full_name, username, role, partner_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    v_role,
    v_partner_id
  )
  ON CONFLICT (id) DO UPDATE
    SET role = EXCLUDED.role,
        partner_id = COALESCE(EXCLUDED.partner_id, profiles.partner_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Demote any existing demo admin account
UPDATE public.profiles
SET role = 'user'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'admin@smartwaste.ke'
);
