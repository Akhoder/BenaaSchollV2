/**
 * Utility functions for Dialog/Modal management
 * Prevents page freezing when closing dialogs
 */

/**
 * Safe dialog close handler that prevents race conditions
 * Use this instead of directly calling setState(false)
 */
export function createSafeDialogHandler(
  setOpen: (open: boolean) => void,
  onClose?: () => void
) {
  return (open: boolean) => {
    if (!open) {
      // Call optional cleanup function
      onClose?.();
      
      // Use setTimeout to defer state update and prevent blocking
      setTimeout(() => {
        setOpen(false);
      }, 0);
    } else {
      setOpen(true);
    }
  };
}

/**
 * Safe button click handler for closing dialogs
 * Prevents event propagation issues
 */
export function createSafeCloseHandler(
  setOpen: (open: boolean) => void,
  onClose?: () => void
) {
  return (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Call optional cleanup function
    onClose?.();
    
    // Use setTimeout to defer state update
    setTimeout(() => {
      setOpen(false);
    }, 0);
  };
}
