import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ContentTestPage from "./components/content/TestPage";
import VisualizationTestPage from "./components/visualization/TestPage";

const params = new URLSearchParams(window.location.search);
const testParam = params.get("test");

function Root() {
  if (testParam === "content") return <ContentTestPage />;
  if (testParam === "visualization") return <VisualizationTestPage />;
  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
