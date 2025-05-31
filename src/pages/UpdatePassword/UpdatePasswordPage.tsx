import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import UpdatePasswordForm from "../../components/UpdatePassword/UpdatePasswordForm";

export default function UpdatePasswordPage() {
  return (
    <>
      <PageMeta title="Parky | Perbarui Password 🗝️" description="Update Password Parky" />
      <PageBreadcrumb pageTitle="Perbarui Password 🗝️" />
      <div className="space-y-6">
        <UpdatePasswordForm />
      </div>
    </>
  );
}
