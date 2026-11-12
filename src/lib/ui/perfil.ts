// Texto do Editar Perfil compartilhado pela página (Server Component) e pelo
// `PerfilForm` (Client Component). Fica fora dos dois porque uma constante
// importada de um módulo "use client" chega ao servidor como referência de
// cliente, não como o texto.

/** RU-53: decisão do usuário - a senha não se troca pelo próprio perfil. */
export const AVISO_SENHA = "A troca de senha deve ser pedida ao gestor do seu curso.";
