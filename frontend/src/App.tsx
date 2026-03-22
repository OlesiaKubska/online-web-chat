import { useEffect, useState } from "react";

function App() {
  const [status, setStatus] = useState("Loading...");

  useEffect(() => {
    fetch("http://localhost:8000/api/health/")
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("Error"));
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Online Chat Client</h1>
      <p>Backend status: {status}</p>
    </div>
  );
}

export default App;
