import { json } from "@remix-run/node";

export const loader = () => json({ ok: true });

export default function Health() {
  return <pre>OK</pre>;
}
