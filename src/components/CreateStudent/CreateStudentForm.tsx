import { useState } from "react";
import { useNavigate } from "react-router";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Alert from "../ui/alert/Alert";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../configuration";
import { doc, setDoc } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid"; // Tambahkan jika pakai UUID
import { generateRandomPassword } from "../../utils/GetRandomPassword";
import GeneratedPasswordInformation from "../common/GeneratedPasswordInformation";

export default function CreateParkingStudentForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [nim, setNim] = useState("");

  const [plate, setPlate] = useState(""); // ← Tambah state plate kendaraan
  const [loading, setLoading] = useState(false);
  const [showLoginErrorAlert, setShowLoginErrorAlert] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowLoginErrorAlert("");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (name.trim() === "") {
      setShowLoginErrorAlert("Nama tidak boleh kosong!");
      return;
    }

    if (nim.trim() === "") {
      setShowLoginErrorAlert("NIM tidak boleh kosong!");
      return;
    }

    if (!emailRegex.test(email)) {
      setShowLoginErrorAlert("Format email tidak valid.");
      return;
    }

    if (plate.trim() === "") {
      setShowLoginErrorAlert("Nomor plat kendaraan tidak boleh kosong!");
      return;
    }

    try {
      setLoading(true);

      // 🔐 Auto generate password
      const generatedPassword = generateRandomPassword();

      const response = await fetch("http://localhost:5000/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password: generatedPassword,
          role: "mahasiswa",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gagal mengirim email:", errorText);
        throw new Error("Gagal mengirim email notifikasi");
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, generatedPassword);
      const user = userCredential.user;

      const studentId = user.uid;

      await setDoc(doc(db, "students", studentId), {
        id: studentId,
        qr_code_id: uuidv4(),
        name,
        nim,
        email,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Simpan data kendaraan
      const vehicleId = uuidv4();
      await setDoc(doc(db, "vehicles", vehicleId), {
        id: vehicleId,
        student_id: studentId,
        plate,
        created_at: new Date(),
        updated_at: new Date(),
      });

      navigate("/");
    } catch (error: any) {
      setShowLoginErrorAlert("Gagal membuat akun");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full overflow-y-auto no-scrollbar">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-3 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">Daftarkan Mahasiswa</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Isi data mahasiswa dan kendaraannya.</p>
            <GeneratedPasswordInformation />
            <form className="pt-5" onSubmit={handleSubmit}>
              <div className="space-y-5">
                <div>
                  <Label>
                    Nama Lengkap<span className="text-error-500">*</span>
                  </Label>
                  <Input type="text" placeholder="Masukkan nama lengkap" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <Label>
                    NIM<span className="text-error-500">*</span>
                  </Label>
                  <Input type="text" placeholder="Masukkan NIM" value={nim} onChange={(e) => setNim(e.target.value)} />
                </div>

                <div>
                  <Label>
                    Email<span className="text-error-500">*</span>
                  </Label>
                  <Input type="email" placeholder="Masukkan email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label>
                    Plat Kendaraan<span className="text-error-500">*</span>
                  </Label>
                  <Input type="text" placeholder="Contoh: B 1234 ABC" value={plate} onChange={(e) => setPlate(e.target.value)} />
                </div>
                {showLoginErrorAlert && (
                  <div className="my-5">
                    <Alert variant="error" title="Gagal Membuat Akun" message={showLoginErrorAlert} />
                  </div>
                )}

                <div>
                  <button type="submit" disabled={loading} className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600">
                    {loading ? "Mendaftarkan..." : "Daftar"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
