import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import VehicleTable from "../../components/tables/VehicleTables/VehicleTable";

export default function StudentTablePage() {
  return (
    <>
      <PageMeta title="Parky | Vehicle 🚘" description="This is the vehicle table of Parky" />
      <PageBreadcrumb pageTitle="Kendaraan 🚘" />
      <div className="space-y-6">
        <VehicleTable />
      </div>
    </>
  );
}
