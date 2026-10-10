import type { Metadata } from "next";
import CustomRequestForm from "./_components/CustomRequestForm";

export const metadata: Metadata = {
  title: "Custom 3D Printing & Rapid Prototyping | Instant Quote | KASAR DIMENSIONS",
  description:
    "Upload your 3D CAD files (STL, OBJ, STEP), rough sketches, or photos for immediate engineer analysis and a free fabrication quotation.",
};

export default function CustomRequestPage() {
  return (
    <div className="min-h-screen bg-[#FAF9F5] py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <CustomRequestForm />
      </div>
    </div>
  );
}