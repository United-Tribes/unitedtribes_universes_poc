import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ContentTestPage from "./components/content/TestPage";

const isContentTest = new URLSearchParams(window.location.search).has("test", "content");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isContentTest ? <ContentTestPage /> : <App />}
  </React.StrictMode>
);
