import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";

export function RouteFrame() {
  const { pathname } = useLocation();
  const previousPath = useRef(pathname);
  useEffect(() => {
    // Move focus only after a completed navigation, never on query refresh or form edits.
    // Initial visits retain the normal tab order, starting with the skip link.
    if (previousPath.current !== pathname) document.getElementById("main-content")?.focus();
    previousPath.current = pathname;
  }, [pathname]);
  return <><a className="skip-link" href="#main-content" onClick={event => {
    const main = document.getElementById("main-content");
    if (main) { event.preventDefault(); main.focus(); }
  }}>Hopp til innhold</a><Outlet /></>;
}
