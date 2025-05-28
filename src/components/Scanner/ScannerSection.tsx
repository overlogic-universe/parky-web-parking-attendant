import React, { useEffect, useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { collection, doc, getDoc, getDocs, query, where, addDoc, Timestamp, orderBy, limit } from "firebase/firestore";
import { auth, db } from "../../configuration";
import Toast from "../ui/toast";

const ScannerSection: React.FC = () => {
  const [attendantName, setAttendantName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [scannerKey, setScannerKey] = useState(0);

  useEffect(() => {
    const fetchAttendantName = async () => {
      const user = auth.currentUser;
      if (user) {
        const docRef = doc(db, "parking_attendants", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setAttendantName(data.name);
        }
      }
    };

    fetchAttendantName();
  }, []);

  const handleScan = async (detectedCodes: any[]) => {
    console.log("CODEL ", detectedCodes);
    try {
      if (isProcessing) return; // stop jika masih proses

      const result = detectedCodes[0]?.rawValue;
      if (!result) return;
      setIsProcessing(true);
      const qrCodeId = result.trim();

      // Cari student berdasarkan qr_code_id
      const studentQuery = query(collection(db, "students"), where("qr_code_id", "==", qrCodeId));
      const studentSnapshot = await getDocs(studentQuery);

      if (studentSnapshot.empty) {
        setToast({ message: "QR Code tidak valid.", type: "error" });
        return;
      }

      const studentDoc = studentSnapshot.docs[0];
      const studentData = studentDoc.data();
      const studentId = studentDoc.id;
      const studentName = studentData.name;

      // Cek aktivitas terakhir
      const activityQuery = query(collection(db, "parking_activities"), where("student_id", "==", studentId), orderBy("updated_at", "desc"), limit(1));
      const activitySnapshot = await getDocs(activityQuery);

      let status = "in";
      if (!activitySnapshot.empty) {
        const lastActivity = activitySnapshot.docs[0].data();
        const historyRef = doc(db, "parking_histories", lastActivity.parking_history_id);
        const historySnap = await getDoc(historyRef);
        if (historySnap.exists()) {
          const historyData = historySnap.data();
          status = historyData.status === "in" ? "out" : "in";
        }
      }

      // Dapatkan parking_lot_id dari jadwal dan assignment
      const today = new Date();
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const todayName = days[today.getDay()];

      const scheduleQuery = query(collection(db, "parking_schedules"), where("day_of_week", "==", todayName.toLowerCase()));
      const scheduleSnapshot = await getDocs(scheduleQuery);

      if (scheduleSnapshot.empty) {
        setToast({ message: "Tidak ada jadwal parkir untuk hari ini.", type: "error" });
        return;
      }

      let parkingLotId: string | null = null;

      for (const scheduleDoc of scheduleSnapshot.docs) {
        const scheduleId = scheduleDoc.id;

        const assignmentQuery = query(collection(db, "parking_assignments"), where("parking_schedule_id", "==", scheduleId), where("parking_attendant_id", "==", auth.currentUser?.uid));

        const assignmentSnapshot = await getDocs(assignmentQuery);

        if (!assignmentSnapshot.empty) {
          // Ambil parking_lot_id dari assignment pertama yang cocok
          parkingLotId = assignmentSnapshot.docs[0].data().parking_lot_id;
          break; // berhenti begitu menemukan assignment yang cocok
        }
      }

      if (!parkingLotId) {
        setToast({ message: "Tidak ada penugasan parkir untuk Anda hari ini.", type: "error" });
        return;
      }

      const now = Timestamp.now();

      // Ambil parking lot dan cek kapasitas maksimum
      const parkingLotRef = doc(db, "parking_lots", parkingLotId);
      const parkingLotSnap = await getDoc(parkingLotRef);
      if (!parkingLotSnap.exists()) {
        setToast({ message: "Data parkiran tidak ditemukan.", type: "error" });
        return;
      }
      const parkingLotData = parkingLotSnap.data();
      const maxCapacity = parkingLotData.max_capacity || 0;

      // Hitung kendaraan "in" hari ini
      const todayDateStr = new Date().toISOString().split("T")[0];
      const startOfDay = new Date(todayDateStr + "T00:00:00");
      const endOfDay = new Date(todayDateStr + "T23:59:59");

      const vehicleQuery = query(collection(db, "parking_activities"), where("parking_lot_id", "==", parkingLotId), where("created_at", ">=", Timestamp.fromDate(startOfDay)), where("created_at", "<=", Timestamp.fromDate(endOfDay)));
      const vehicleSnapshot = await getDocs(vehicleQuery);

      let currentVehicleInCount = 0;
      for (const docSnap of vehicleSnapshot.docs) {
        const activity = docSnap.data();
        const historySnap = await getDoc(doc(db, "parking_histories", activity.parking_history_id));
        if (historySnap.exists() && historySnap.data().status === "in") {
          currentVehicleInCount++;
        }
      }

      let newVehicleInCount = currentVehicleInCount;

      if (status === "in") {
        if (currentVehicleInCount >= maxCapacity) {
          setToast({ message: "Parkiran sudah penuh.", type: "error" });
          return;
        }
        newVehicleInCount++;
      } else if (status === "out") {
        newVehicleInCount = Math.max(currentVehicleInCount - 1, 0);
      }

      // Tambahkan parking_history
      const historyRef = await addDoc(collection(db, "parking_histories"), {
        status,
        parked_at: status === "in" ? now : null,
        exited_at: status === "out" ? now : null,
        created_at: now,
        updated_at: now,
      });

      // Tambahkan parking_activity
      await addDoc(collection(db, "parking_activities"), {
        student_id: studentId,
        parking_history_id: historyRef.id,
        parking_lot_id: parkingLotId,
        created_at: now,
        updated_at: now,
        vehicle_in_count: newVehicleInCount,
      });

      setToast({
        message: `${studentName} telah ${status === "in" ? "memasuki" : "keluar dari"} area parkir.`,
        type: "success",
      });
    } catch (error) {
      console.error(error);
      setToast({ message: "Terjadi kesalahan saat memproses QR Code.", type: "error" });
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        setScannerKey((prev) => prev + 1);
      }, 3000);
    }
  };

  return (
    <section className="py-5 overflow-x-scroll sm:overflow-x-hidden rounded-xl border border-gray-300 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-lg mx-auto p-6">
        <h1 className="text-center text-theme-sm mb-4 text-gray-500 font-bold dark:text-gray-400">SCAN DISINI</h1>

        <div className="w-full border-2 border-brand-400 rounded-xl overflow-hidden">
          <Scanner
            key={scannerKey}
            onScan={(result) => handleScan(result)}
            constraints={{
              facingMode: "user",
            }}
            styles={{
              container: { width: "100%" },
            }}
          />
        </div>

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </section>
  );
};

export default ScannerSection;
