import { redirect } from "next/navigation";

export default function Home() {
  // El middleware ya protege "/"; aquí solo encaminamos al panel.
  redirect("/dashboard");
}
