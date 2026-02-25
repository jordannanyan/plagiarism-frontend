import { Link } from "react-router-dom";

export default function ForbiddenPage() {
  return (
    <div style={{ padding: 20 }}>
      <h2>403 - Forbidden</h2>
      <p>Kamu tidak punya akses ke halaman ini.</p>
      <Link to="/">Kembali</Link>
    </div>
  );
}