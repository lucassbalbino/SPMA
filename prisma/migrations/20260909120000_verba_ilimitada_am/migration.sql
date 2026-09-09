-- AD-040 — Verba ilimitada do Administrador Master.
--
-- Duas mudanças em TB_Verba e a linha da própria verba:
--  1. CD_Ofertante passa a aceitar NULL. Só a verba do AM usa isso: ela é
--     nacional (AD-012), não pertence a Ofertante nenhum e por isso não
--     entra no saldo de ninguém. A FK continua RESTRICT - apagar um
--     Ofertante segue barrado por suas verbas, e nunca as transforma em
--     verba nacional.
--  2. Ilimitada marca a verba sem teto (AD-016 não se aplica a ela).
--
-- A verba nasce aqui, não por rota: nenhuma API cria verba ilimitada.

-- AlterTable
ALTER TABLE `TB_Verba` MODIFY `CD_Ofertante` INTEGER NULL;

-- AlterTable
ALTER TABLE `TB_Verba` ADD COLUMN `Ilimitada` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX `TB_Verba_Ilimitada_idx` ON `TB_Verba`(`Ilimitada`);

-- A verba ilimitada do AM. Uma só: a coluna acabou de nascer com DEFAULT
-- false, então nenhuma linha existente é ilimitada e este INSERT não pode
-- duplicar nada. VL_Verba fica 0 porque numa verba sem teto o valor total
-- não significa nada - quem lê o saldo olha `Ilimitada`, não o número.
INSERT INTO `TB_Verba` (`CD_Ofertante`, `DT_Verba`, `VL_Verba`, `Ilimitada`)
VALUES (NULL, NULL, 0.00, true);
