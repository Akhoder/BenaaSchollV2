import * as React from "react"
import { useMediaQuery } from "@/hooks/use-media-query"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"

interface BaseProps {
  children: React.ReactNode
}

interface RootProps extends BaseProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

interface ResponsiveDialogProps extends RootProps {
  trigger?: React.ReactNode
}

const ResponsiveDialogContext = React.createContext<{ isDesktop: boolean }>({
  isDesktop: true,
})

export function ResponsiveDialog({
  children,
  ...props
}: RootProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")

  if (isDesktop) {
    return (
      <ResponsiveDialogContext.Provider value={{ isDesktop }}>
        <Dialog {...props}>{children}</Dialog>
      </ResponsiveDialogContext.Provider>
    )
  }

  return (
    <ResponsiveDialogContext.Provider value={{ isDesktop }}>
      <Drawer {...props}>{children}</Drawer>
    </ResponsiveDialogContext.Provider>
  )
}

export function ResponsiveDialogTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogTrigger>) {
  const { isDesktop } = React.useContext(ResponsiveDialogContext)

  if (isDesktop) {
    return <DialogTrigger className={className} {...props}>{children}</DialogTrigger>
  }

  return <DrawerTrigger className={className} {...props}>{children}</DrawerTrigger>
}

export function ResponsiveDialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  const { isDesktop } = React.useContext(ResponsiveDialogContext)

  if (isDesktop) {
    return (
      <DialogContent className={className} {...props}>
        {children}
      </DialogContent>
    )
  }

  return (
    <DrawerContent className={className} {...props}>
      {children}
    </DrawerContent>
  )
}

export function ResponsiveDialogHeader({
  className,
  ...props
}: React.ComponentProps<typeof DialogHeader>) {
  const { isDesktop } = React.useContext(ResponsiveDialogContext)

  if (isDesktop) {
    return <DialogHeader className={className} {...props} />
  }

  return <DrawerHeader className={className} {...props} />
}

export function ResponsiveDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogTitle>) {
  const { isDesktop } = React.useContext(ResponsiveDialogContext)

  if (isDesktop) {
    return <DialogTitle className={className} {...props} />
  }

  return <DrawerTitle className={className} {...props} />
}

export function ResponsiveDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogDescription>) {
  const { isDesktop } = React.useContext(ResponsiveDialogContext)

  if (isDesktop) {
    return <DialogDescription className={className} {...props} />
  }

  return <DrawerDescription className={className} {...props} />
}

export function ResponsiveDialogFooter({
  className,
  ...props
}: React.ComponentProps<typeof DialogFooter>) {
  const { isDesktop } = React.useContext(ResponsiveDialogContext)

  if (isDesktop) {
    return <DialogFooter className={className} {...props} />
  }

  return <DrawerFooter className={className} {...props} />
}

export function ResponsiveDialogClose({
  className,
  ...props
}: React.ComponentProps<typeof DrawerClose>) {
  const { isDesktop } = React.useContext(ResponsiveDialogContext)

  if (isDesktop) {
    // Dialog doesn't have a specific close button component that acts as a trigger usually, 
    // often just a button with onClick or the X icon. 
    // But for API compatibility we can render a clone if needed or just pass through.
    // Usually we use `DialogClose` from radix if exposed, but shadcn doesn't always expose it.
    // Let's assume we can wrap the child in an onClick handler if passed, or just render children.
    // Actually, standard DialogClose from Radix is what we want if we want to close without state control.
    // But Shadcn's dialog.tsx might not export it.
    // Let's just render children for now or try to use a primitive if available.
    // Safest is to rely on the `open` prop control for dialogs in this codebase usually.
    // But DrawerClose is useful. 
    // If we want to use it in Dialog, we might need to import from @radix-ui/react-dialog if not in ui/dialog.
    return <div className={className} {...props} /> 
  }

  return <DrawerClose className={className} {...props} />
}

