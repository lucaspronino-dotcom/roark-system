import { ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

const containerClassName =
  "group/interactive-cell flex h-8 min-w-0 items-stretch overflow-hidden rounded-md border border-border/80 bg-muted/45 text-primary shadow-[inset_0_1px_0_color-mix(in_oklab,var(--color-background)_55%,transparent)] transition-colors hover:border-foreground/25 hover:bg-muted/75 focus-within:border-ring focus-within:bg-muted/60 focus-within:ring-2 focus-within:ring-ring/30 dark:bg-muted/30 dark:hover:bg-muted/55 dark:focus-within:bg-muted/45"

const actionClassName =
  "flex min-w-0 flex-1 cursor-pointer items-center gap-2 px-2 text-left text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"

function InteractiveCell({
  className,
  href,
  icon: Icon,
  iconLabel,
  label,
  onClick,
  onIconClick,
  showChevron = true,
}) {
  const Action = href ? "a" : "button"
  const actionProps = href
    ? { href, onClick }
    : { onClick, type: "button" }

  const content = (
    <>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {showChevron ? (
        <ChevronRight
          aria-hidden="true"
          className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover/interactive-cell:translate-x-0.5 group-hover/interactive-cell:text-foreground"
        />
      ) : null}
    </>
  )

  if (Icon && onIconClick) {
    return (
      <div className={cn(containerClassName, className)}>
        <button
          aria-label={iconLabel}
          className="flex w-8 shrink-0 cursor-pointer items-center justify-center border-r border-border/80 bg-background/35 text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50 dark:bg-background/20"
          onClick={onIconClick}
          type="button"
        >
          <Icon aria-hidden="true" className="size-4" />
        </button>
        <Action className={actionClassName} {...actionProps}>
          {content}
        </Action>
      </div>
    )
  }

  return (
    <Action
      className={cn(containerClassName, actionClassName, className)}
      {...actionProps}
    >
      {Icon ? <Icon aria-hidden="true" className="size-4 shrink-0" /> : null}
      {content}
    </Action>
  )
}

export { InteractiveCell }
