import { Welcome } from "../welcome/welcome";

export function meta() {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  // Note: kept loader-free so Android (SPA mode) builds can generate index.html.
  return <Welcome message={"Welcome"} />;
}
