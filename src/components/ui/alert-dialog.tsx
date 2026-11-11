"use client"

// Diálogo de confirmação (shadcn, estilo base-nova, sobre o AlertDialog do
// Base UI): a ação só acontece depois de um "Sim" explícito. Diferente do
// `window.confirm`, segue os tokens de `globals.css` (AD-039) e o e2e
// enxerga os botões por papel e nome.
import * as React from "react"
import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog"

import { cn } from "@/lib/utils"

const AlertDialog = AlertDialogPrimitive.Root

function AlertDialogContent({
  className,
  children,
  ...props
}: AlertDialogPrimitive.Popup.Props) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Backdrop
        data-slot="alert-dialog-backdrop"
        className="fixed inset-0 z-50 bg-foreground/40"
      />
      <AlertDialogPrimitive.Popup
        data-slot="alert-dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl border border-border bg-popover p-6 text-popover-foreground shadow-lg outline-none",
          className
        )}
        {...props}
      >
        {children}
      </AlertDialogPrimitive.Popup>
    </AlertDialogPrimitive.Portal>
  )
}

function AlertDialogTitle({ className, ...props }: AlertDialogPrimitive.Title.Props) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn("text-sm font-medium leading-relaxed", className)}
      {...props}
    />
  )
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn("flex justify-end gap-2", className)}
      {...props}
    />
  )
}

const AlertDialogClose = AlertDialogPrimitive.Close

export { AlertDialog, AlertDialogClose, AlertDialogContent, AlertDialogFooter, AlertDialogTitle }
