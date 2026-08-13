-- Concede ao usuário 'spma' privilégio para criar/dropar quaisquer databases.
-- Necessário para o shadow database do `prisma migrate dev`.
-- ATENÇÃO: credenciais e privilégios amplos são APENAS para desenvolvimento local.
GRANT ALL PRIVILEGES ON *.* TO 'spma'@'%';
FLUSH PRIVILEGES;
