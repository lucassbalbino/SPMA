// Mensagens padrão do Zod em português (RU-04).
//
// A configuração é global por instância do Zod, mas o navegador e o servidor
// têm instâncias separadas. Por isso todo arquivo de schema importa este
// módulo pelo efeito colateral, e não só a camada de rotas: as duas pontas
// passam a falar português sem depender de quem importou primeiro.
//
// Vale só para as regras sem mensagem própria. As mensagens escritas à mão
// nos schemas continuam como estão.
import { z } from "zod";

z.config(z.locales.pt());
