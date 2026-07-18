/*
# Demo Role Auto-Promotion

Updates the handle_new_user trigger to automatically assign roles
to demo accounts based on email, enabling immediate demo without
manual database edits.

- admin@smartwaste.ke → role: admin
- partner@boomlights.co.ke → role: partner, partner_id: Boom Lights
- All others → role: user (default)

This is for demo/development purposes. In production, role changes
should be done by an existing admin through the management interface.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role text := 'user';
  v_partner_id uuid := NULL;
BEGIN
  -- Auto-assign demo roles
  IF NEW.email = 'admin@smartwaste.ke' THEN
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
