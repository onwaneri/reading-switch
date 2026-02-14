import { UploadForm } from "@/components/UploadForm";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50">
      <div className="max-w-xl w-full px-8 py-12 text-center">
        <h1 className="text-4xl font-bold text-purple-800 mb-2">Reading SWItch</h1>
        <p className="text-gray-600 mb-8">
          Upload a picture book PDF to start exploring words.
        </p>
        <UploadForm />
      </div>
    </div>
  );
}
