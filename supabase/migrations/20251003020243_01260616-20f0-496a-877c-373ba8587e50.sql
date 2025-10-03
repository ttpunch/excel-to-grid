-- Assign admin role to vinod418@gmail.com user
INSERT INTO user_roles (user_id, role) 
VALUES ('ec4ea03c-5ba6-43f2-8632-b916b80a2cee', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;