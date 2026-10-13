// /usuarios/novo - endereço antigo da criação de usuário (GU-02).
//
// A criação mudou para `/usuarios`, junto da lista, na "Gestão de usuários".
// Este endereço segue existindo só para não quebrar favorito nem link antigo:
// redireciona (307) e não renderiza nada.
//
// `connection()` antes do redirect pelo mesmo motivo de `src/app/page.tsx`:
// impede o Next de resolver a rota no build, e o redirect vira resposta de
// servidor.
import { connection } from "next/server";
import { redirect } from "next/navigation";

export default async function NovoUsuarioPage() {
  await connection();
  redirect("/usuarios");
}
