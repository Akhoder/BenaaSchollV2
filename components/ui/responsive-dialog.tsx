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
  DialogClose,
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
  onOpenChange,
  open,
  ...props
}: RootProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  
  // ✅ FIX: Prevent freezing by using ref to track if component is mounted
  const isMountedRef = React.useRef(true);
  
  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ✅ FIX: Monitor open state and force cleanup when closed
  React.useEffect(() => {
    // Track dialog state on html/body
    if (open) {
      document.documentElement.setAttribute('data-dialog-open', 'true');
      document.body.setAttribute('data-dialog-open', 'true');
    } else {
      document.documentElement.removeAttribute('data-dialog-open');
      document.body.removeAttribute('data-dialog-open');
      
      // Force cleanup when dialog closes
      const cleanup = () => {
        // Remove body styles
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('padding-right');
        document.body.style.removeProperty('margin-right');
        document.body.removeAttribute('data-scroll-locked');
        
        // Remove stuck overlays
        const overlays = document.querySelectorAll('[data-radix-dialog-overlay]');
        overlays.forEach(overlay => {
          const state = overlay.getAttribute('data-state');
          if (state === 'closed' || !state) {
            (overlay as HTMLElement).style.display = 'none';
            (overlay as HTMLElement).style.pointerEvents = 'none';
            overlay.remove();
          }
        });
        
        // Remove stuck portals
        const portals = document.querySelectorAll('[data-radix-portal]');
        portals.forEach(portal => {
          const content = portal.querySelector('[data-state="closed"]');
          if (content && !portal.querySelector('[data-state="open"]')) {
            portal.remove();
          }
        });
        
        // Force reflow
        void document.body.offsetHeight;
      };
      
      // Cleanup immediately and after delays
      cleanup();
      requestAnimationFrame(cleanup);
      setTimeout(cleanup, 0);
      setTimeout(cleanup, 50);
      setTimeout(cleanup, 100);
      setTimeout(cleanup, 200);
    }
    
    return () => {
      // Cleanup on unmount
      document.documentElement.removeAttribute('data-dialog-open');
      document.body.removeAttribute('data-dialog-open');
    };
  }, [open]);

  // ✅ FIX: Wrap onOpenChange to prevent state updates after unmount and ensure body scroll unlock
  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    if (!newOpen && isMountedRef.current) {
      // ✅ FIX: Force unlock body scroll when closing
      const unlockScroll = () => {
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('padding-right');
        document.body.style.removeProperty('margin-right');
        document.body.removeAttribute('data-scroll-locked');
        
        // Force remove any stuck overlays
        document.querySelectorAll('[data-radix-dialog-overlay][data-state="closed"]').forEach(el => {
          (el as HTMLElement).style.display = 'none';
          (el as HTMLElement).style.pointerEvents = 'none';
        });
      };
      
      // Unlock immediately and also after delays
      unlockScroll();
      requestAnimationFrame(unlockScroll);
      setTimeout(unlockScroll, 0);
      setTimeout(unlockScroll, 50);
      setTimeout(unlockScroll, 100);
    }
    
    // Call onOpenChange directly
    if (onOpenChange && isMountedRef.current) {
      onOpenChange(newOpen);
    }
  }, [onOpenChange]);

  if (isDesktop) {
    return (
      <ResponsiveDialogContext.Provider value={{ isDesktop }}>
        <Dialog {...props} open={open} onOpenChange={handleOpenChange}>{children}</Dialog>
      </ResponsiveDialogContext.Provider>
    )
  }

  return (
    <ResponsiveDialogContext.Provider value={{ isDesktop }}>
      <Drawer {...props} open={open} onOpenChange={handleOpenChange}>{children}</Drawer>
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
  children,
  ...props
}: React.ComponentProps<typeof DrawerClose>) {
  const { isDesktop } = React.useContext(ResponsiveDialogContext)

  if (isDesktop) {
    // ✅ FIX: Use DialogClose from dialog component
    return <DialogClose className={className} {...(props as any)}>{children}</DialogClose>
  }

  return <DrawerClose className={className} {...props}>{children}</DrawerClose>
}

