import { useId, type ReactNode } from "react"
import { CircleX, Info, TriangleAlert } from "lucide-react"

import { cn } from "@/lib/utils"

type WindowProps = {
  /** Shown bold in the title bar. */
  title: string
  /** Content area. */
  children: ReactNode
  /**
   * Status line at the bottom; confirmations go here. Pass `null` or `""` to
   * keep the (empty) line mounted, so a later text is announced.
   */
  statusText?: ReactNode
  className?: string
  as?: "section" | "main" | "div"
}

/** Program window: raised frame, title bar, content, optional status line. */
export function Window({
  title,
  children,
  statusText,
  className,
  as: Tag = "section",
}: WindowProps) {
  const titleId = useId()

  return (
    <Tag
      aria-labelledby={titleId}
      className={cn(
        "edge-raised flex w-full flex-col bg-background p-1 text-foreground",
        className
      )}
    >
      <div className="titlebar flex min-h-7 items-center px-2 py-1">
        <h1 id={titleId} className="truncate text-base md:text-sm">
          {title}
        </h1>
      </div>
      <div className="flex-1 p-3 md:p-4">{children}</div>
      {statusText !== undefined && (
        <div
          role="status"
          aria-live="polite"
          className="edge-sunken min-h-6 px-2 py-1 text-sm text-muted-foreground"
        >
          {statusText}
        </div>
      )}
    </Tag>
  )
}

/** Group frame with a title, for related form fields. */
export function GroupBox({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <fieldset
      className={cn(
        "min-w-0 border border-edge-shadow px-3 pb-3 pt-1 shadow-[inset_1px_1px_0_var(--color-edge-light),1px_1px_0_var(--color-edge-light)]",
        className
      )}
    >
      <legend className="px-1">{title}</legend>
      {children}
    </fieldset>
  )
}

const messageIcons = {
  error: { Icon: CircleX, className: "text-destructive" },
  warning: { Icon: TriangleAlert, className: "text-warning" },
  info: { Icon: Info, className: "text-foreground" },
} as const

/** Inline message panel in dialog style: symbol plus text. */
export function MessageBox({
  kind,
  title,
  children,
}: {
  kind: "error" | "warning" | "info"
  title?: string
  children: ReactNode
}) {
  const { Icon, className: iconClassName } = messageIcons[kind]

  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className="edge-raised bg-background p-1 text-foreground"
    >
      {title && <div className="titlebar px-2 py-1">{title}</div>}
      <div
        className={cn(
          "flex items-start gap-3 p-3",
          kind === "warning" && "bg-warning-background text-warning"
        )}
      >
        <Icon aria-hidden="true" className={cn("size-6 shrink-0", iconClassName)} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}
