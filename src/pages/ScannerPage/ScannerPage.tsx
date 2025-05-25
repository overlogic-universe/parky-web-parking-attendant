import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ScannerSection from "../../components/Scanner/ScannerSection";

export default function ScannerPage() {
  return (
    <>
      <PageMeta title="Parky | Scanner 📲" description="Parking Scanner Parky" />
      <PageBreadcrumb pageTitle="Pindai QR Code 📲" />
      <div className="space-y-6">
        <ScannerSection />
      </div>
    </>
  );
}
