import CustomRequestForm from "./_components/CustomRequestForm";

export const metadata = {
  title: "अपना आइडिया बताइए | KASAR DIMENSIONS",
  description:
    "अपना आइडिया या फोटो भेजें, हम आपके लिए सामान तैयार करने में मदद करेंगे।",
};

export default function CustomRequestPage() {
  return (
    <div className="site-shell">
      <main className="site-main custom-request-page">
        <div className="custom-request-container">
          <CustomRequestForm />
        </div>
      </main>
    </div>
  );
}