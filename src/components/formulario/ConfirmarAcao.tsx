"use client";

// Botão que pede "Sim"/"Não" antes de uma ação irreversível: concluir um
// questionário (RU-18), excluir uma formação (RU-22) ou um aluno (RU-29).
//
// `podeAbrir` existe para o Concluir: com alteração não salva a confirmação
// nem abre - quem chama mostra "Salve antes de concluir." (RU-02).
import { useState, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Texto literal do documento do cliente (doc 10), o mesmo nas duas
// exclusões: formação (RU-22) e aluno (RU-29).
export const PERGUNTA_EXCLUSAO =
  "Tem certeza que deseja excluir o cadastro? Após a exclusão não será possível recuperar os dados.";

export function ConfirmarAcao({
  rotulo,
  pergunta,
  aoConfirmar,
  podeAbrir,
  disabled,
  variant = "outline",
}: {
  /** Texto do botão que abre a confirmação ("Concluir", "Excluir"). */
  rotulo: string;
  /** Pergunta mostrada no diálogo, literal da spec. */
  pergunta: string;
  aoConfirmar: () => void;
  /** Devolve `false` para não abrir (e quem chama explica o porquê). */
  podeAbrir?: () => boolean;
  disabled?: boolean;
  variant?: ComponentProps<typeof Button>["variant"];
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        disabled={disabled}
        onClick={() => {
          if (podeAbrir?.() === false) {
            return;
          }
          setAberto(true);
        }}
      >
        {rotulo}
      </Button>
      <AlertDialog open={aberto} onOpenChange={setAberto}>
        <AlertDialogContent data-testid="confirmacao">
          <AlertDialogTitle>{pergunta}</AlertDialogTitle>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button type="button" variant="outline" />}>
              Não
            </AlertDialogClose>
            <Button
              type="button"
              onClick={() => {
                setAberto(false);
                aoConfirmar();
              }}
            >
              Sim
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
