"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useLayoutEffect,
  useRef,
  useEffect,
} from "react";
import { createPortal } from "react-dom";

export interface MenuItem {
  label?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  separator?: boolean;
  disabled?: boolean;
}

interface MenuState {
  x: number;
  y: number;
  items: MenuItem[];
}

interface Ctx {
  open: (e: React.MouseEvent, items: MenuItem[]) => void;
  close: () => void;
}

const ContextMenuContext = createContext<Ctx>({
  open: () => {},
  close: () => {},
});

export const useContextMenu = () => useContext(ContextMenuContext);

export function ContextMenuProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [menu, setMenu] = useState<MenuState | null>(null);

  const open = useCallback((e: React.MouseEvent, items: MenuItem[]) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY, items });
  }, []);

  const close = useCallback(() => setMenu(null), []);

  return (
    <ContextMenuContext.Provider value={{ open, close }}>
      {children}
      {menu && <MenuView menu={menu} onClose={close} />}
    </ContextMenuContext.Provider>
  );
}

function MenuView({
  menu,
  onClose,
}: {
  menu: MenuState;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: menu.x, y: menu.y });
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let x = menu.x;
    let y = menu.y;
    if (x + rect.width > window.innerWidth - 8)
      x = window.innerWidth - rect.width - 8;
    if (y + rect.height > window.innerHeight - 8)
      y = window.innerHeight - rect.height - 8;
    setPos({ x: Math.max(4, x), y: Math.max(4, y) });
  }, [menu]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[90]"
        onMouseDown={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div
        ref={ref}
        style={{ left: pos.x, top: pos.y }}
        className="fixed z-[100] h-fit max-h-[80vh] min-w-[180px] overflow-y-auto rounded-md border border-pm-border2 bg-pm-bg2 py-1 shadow-2xl"
      >
        {menu.items.map((item, i) =>
          item.separator ? (
            <div key={i} className="my-1 h-px bg-pm-border" />
          ) : (
            <button
              key={i}
              disabled={item.disabled}
              onClick={() => {
                onClose();
                item.onClick?.();
              }}
              className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[12.5px] transition ${
                item.disabled
                  ? "cursor-default text-pm-muted/40"
                  : item.danger
                  ? "text-pm-red hover:bg-pm-red/10"
                  : "text-pm-text hover:bg-pm-bg3"
              }`}
            >
              {item.icon && (
                <span className="flex w-4 justify-center text-pm-muted">
                  {item.icon}
                </span>
              )}
              {item.label}
            </button>
          )
        )}
      </div>
    </>,
    document.body
  );
}
