'use client';

import React, { useState } from 'react';
import { Menu, X, Home, BookOpen, Users, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  active?: boolean;
  onClick?: () => void;
}

interface MobileNavProps {
  items: NavItem[];
  logo?: React.ReactNode;
  userSection?: React.ReactNode;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  items,
  logo,
  userSection
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 glass-card border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <div className="flex-shrink-0">
            {logo || <span className="text-xl font-bold text-primary">Logo</span>}
          </div>

          {/* Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(!isOpen)}
            className="relative z-50"
          >
            {isOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </Button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Menu */}
      <nav
        className={`
          fixed top-0 right-0 h-full w-80 max-w-full
          bg-card border-l border-border shadow-xl
          transform transition-transform duration-300 ease-out
          z-40 lg:hidden
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        dir="rtl"
      >
        <div className="flex flex-col h-full pt-20 pb-6">
          {/* User Section */}
          {userSection && (
            <div className="px-6 pb-6 border-b border-border">
              {userSection}
            </div>
          )}

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto py-6 px-4 scrollbar-thin">
            <div className="space-y-2">
              {items.map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    item.onClick?.();
                    setIsOpen(false);
                  }}
                  className={`
                    w-full nav-link text-right
                    ${item.active ? 'nav-link-active' : ''}
                  `}
                >
                  <span className="flex items-center gap-3">
                    {item.icon}
                    <span>{item.label}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              مدرسة البناء العلمي © 2024
            </p>
          </div>
        </div>
      </nav>

      {/* Bottom Navigation for Mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass-card border-t border-border">
        <div className="grid grid-cols-4 gap-1 p-2">
          {items.slice(0, 4).map((item, index) => (
            <button
              key={index}
              onClick={item.onClick}
              className={`
                flex flex-col items-center gap-1 py-2 px-3 rounded-lg
                transition-all duration-200
                ${item.active 
                  ? 'text-primary bg-primary/10' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }
              `}
            >
              {item.icon}
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
};

export default MobileNav;

