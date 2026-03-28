import { Outlet } from "react-router-dom";
import { usePresence } from "./lib/usePresence";

function ProtectedLayout() {
  usePresence();

  return <Outlet />;
}

export default ProtectedLayout;
