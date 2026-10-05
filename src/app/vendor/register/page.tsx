import VendorRegistrationForm from "@/components/forms/VendorRegistrationForm";

export const metadata = {
  title: "Join as a Vendor — ALshowUhow",
  description: "Register your business and get connected with customers looking for services in your area.",
};

export default function VendorRegisterPage() {
  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <VendorRegistrationForm />
      </div>
    </div>
  );
}
