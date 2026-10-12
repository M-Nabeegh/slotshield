import { useEffect, useState } from "react";
import { StagingAdapter } from "./adapter/StagingAdapter";
import { WebsiteCheck } from "./check/WebsiteCheck";
import { Lab } from "./lab/Lab";
import { Mark } from "./ui/Mark";

const routes = [
  { path: "#/lab", label: "Lab", title: "SlotShield · Booking reliability lab" },
  { path: "#/check", label: "Page check", title: "SlotShield · Check a booking page" },
  { path: "#/staging", label: "Staging", title: "SlotShield · Staging adapter" },
] as const;

type Route = (typeof routes)[number]["path"];

function readRoute(): Route {
  const hash = window.location.hash.split("?")[0];
  return routes.find((route) => route.path === hash)?.path ?? "#/lab";
}

export function App() {
  const [route, setRoute] = useState<Route>(readRoute);

  useEffect(() => {
    const onHash = () => {
      setRoute(readRoute());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    document.title = routes.find((item) => item.path === route)?.title ?? "SlotShield";
  }, [route]);

  return (
    <div className="frame">
      <header className="topbar">
        <a className="brand" href="#/lab" aria-label="SlotShield, go to the lab">
          <Mark />
          <span>SlotShield</span>
        </a>
        <nav className="tabs" aria-label="Sections">
          {routes.map((item) => (
            <a
              key={item.path}
              className="tab"
              href={item.path}
              aria-current={item.path === route ? "page" : undefined}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="topbar-end">
          <a href="https://gitlab.com/M-Nabeegh/slotshield" target="_blank" rel="noreferrer noopener">
            Source
          </a>
        </div>
      </header>

      <main className="page">
        {route === "#/lab" ? <Lab /> : null}
        {route === "#/check" ? <WebsiteCheck /> : null}
        {route === "#/staging" ? <StagingAdapter /> : null}
      </main>

      <footer className="footer">
        <span>Harbor Street Dental and its patients are fictional. No real bookings or payments are made.</span>
        <span>Built by Muhammad Nabeegh</span>
      </footer>
    </div>
  );
}
