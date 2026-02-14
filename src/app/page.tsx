import { UploadForm } from "@/components/UploadForm";

export default function Home() {
  return (
    <div style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
      <h1>PDF Word Extractor</h1>
      <p>Upload a PDF to extract all words with their page and location.</p>
      <hr style={{ margin: "1rem 0" }} />
      <UploadForm />
    </div>
  );
}
